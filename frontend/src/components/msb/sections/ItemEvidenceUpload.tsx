import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, Download, Trash2, FileIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';

interface EvidenceFile {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_at: string;
}

interface ItemEvidenceUploadProps {
  registrationId: string;
  engagementId: string;
  itemKey: string;
  /** Optional caption shown above the upload list. */
  caption?: string;
}

const BUCKET = 'client-files';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ItemEvidenceUpload({ registrationId, engagementId, itemKey, caption }: ItemEvidenceUploadProps) {
  const queryClient = useQueryClient();
  const { user } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: files, isLoading } = useQuery({
    queryKey: ['msb-validation-evidence', registrationId, itemKey],
    queryFn: async (): Promise<EvidenceFile[]> => {
      const { data, error } = await supabase
        .from('msb_validation_evidence')
        .select('id, filename, storage_path, file_size, content_type, uploaded_at')
        .eq('registration_id', registrationId)
        .eq('item_key', itemKey)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data as EvidenceFile[]) || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const safeName = sanitizeFilename(file.name);
      const path = `${engagementId}/msb-validation/${registrationId}/${itemKey}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase
        .from('msb_validation_evidence')
        .insert({
          registration_id: registrationId,
          item_key: itemKey,
          storage_path: path,
          filename: file.name,
          file_size: file.size,
          content_type: file.type || null,
          uploaded_by: user?.id ?? null,
        } as any);
      if (insertErr) {
        // Best-effort cleanup if the DB insert failed after the storage upload
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-validation-evidence', registrationId, itemKey] });
      toast.success('Evidence uploaded');
    },
    onError: (err: any) => {
      toast.error(`Upload failed: ${err?.message ?? 'unknown error'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (file: EvidenceFile) => {
      await supabase.storage.from(BUCKET).remove([file.storage_path]);
      const { error } = await supabase
        .from('msb_validation_evidence')
        .delete()
        .eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-validation-evidence', registrationId, itemKey] });
      toast.success('Evidence removed');
    },
    onError: (err: any) => {
      toast.error(`Delete failed: ${err?.message ?? 'unknown error'}`);
    },
  });

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (file: EvidenceFile) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(file.storage_path, 60 * 10);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      toast.error(`Couldn't open file: ${err?.message ?? 'unknown error'}`);
    }
  };

  return (
    <div className="space-y-2">
      {caption && (
        <p className="text-xs text-muted-foreground">{caption}</p>
      )}

      {isLoading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading evidence…
        </div>
      ) : files && files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-xs border border-border rounded-md px-2 py-1.5 bg-muted/30">
              <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button
                type="button"
                onClick={() => handleDownload(f)}
                className="flex-1 text-left truncate text-foreground hover:text-primary"
                title={f.filename}
              >
                {f.filename}
              </button>
              <span className="text-muted-foreground shrink-0">{formatSize(f.file_size)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Download"
                onClick={() => handleDownload(f)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                title="Delete"
                onClick={() => deleteMutation.mutate(f)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground italic">No evidence uploaded yet.</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFilePick}
        // Accept anything — auditors upload PDFs, screenshots, Word/Excel
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading…</>
        ) : (
          <><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload evidence</>
        )}
      </Button>
    </div>
  );
}
