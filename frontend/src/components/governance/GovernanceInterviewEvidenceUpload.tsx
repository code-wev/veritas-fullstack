import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, Download, Trash2, FileIcon, Loader2, Mic, FileText, NotebookPen, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';

type EvidenceKind = 'transcript' | 'recording' | 'notes' | 'other';

interface EvidenceFile {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  content_type: string | null;
  evidence_kind: EvidenceKind;
  uploaded_at: string;
}

interface GovernanceInterviewEvidenceUploadProps {
  engagementId: string;
  interviewId: string;
}

const BUCKET = 'client-files';

const KIND_META: Record<EvidenceKind, { label: string; icon: typeof FileIcon }> = {
  transcript: { label: 'Teams Transcript', icon: FileText },
  recording:  { label: 'Recording',        icon: Mic },
  notes:      { label: 'Auditor Notes',    icon: NotebookPen },
  other:      { label: 'Other',            icon: Paperclip },
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function GovernanceInterviewEvidenceUpload({
  engagementId,
  interviewId,
}: GovernanceInterviewEvidenceUploadProps) {
  const queryClient = useQueryClient();
  const { user } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nextKind, setNextKind] = useState<EvidenceKind>('transcript');

  const { data: files, isLoading } = useQuery({
    queryKey: ['governance-interview-evidence', interviewId],
    queryFn: async (): Promise<EvidenceFile[]> => {
      const { data, error } = await supabase
        .from('governance_interview_evidence')
        .select('id, filename, storage_path, file_size, content_type, evidence_kind, uploaded_at')
        .eq('interview_id', interviewId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data as EvidenceFile[]) || [];
    },
    enabled: !!interviewId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: EvidenceKind }) => {
      const safeName = sanitizeFilename(file.name);
      const path = `${engagementId}/governance/${interviewId}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase
        .from('governance_interview_evidence')
        .insert({
          interview_id: interviewId,
          storage_path: path,
          filename: file.name,
          file_size: file.size,
          content_type: file.type || null,
          evidence_kind: kind,
          uploaded_by: user?.id ?? null,
        } as any);
      if (insertErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-interview-evidence', interviewId] });
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
        .from('governance_interview_evidence')
        .delete()
        .eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-interview-evidence', interviewId] });
      toast.success('Evidence removed');
    },
    onError: (err: any) => {
      toast.error(`Delete failed: ${err?.message ?? 'unknown error'}`);
    },
  });

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate({ file, kind: nextKind });
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Interview Evidence</CardTitle>
        <p className="text-xs text-muted-foreground">
          Attach the Teams transcript, recording, or auditor notes for this interview. Files are stored under the engagement and available to other reviewers.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading evidence…
          </div>
        ) : files && files.length > 0 ? (
          <ul className="space-y-1.5">
            {files.map((f) => {
              const meta = KIND_META[f.evidence_kind] ?? KIND_META.other;
              const Icon = meta.icon;
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-2 text-xs border border-border rounded-md px-2 py-1.5 bg-muted/30"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="shrink-0 text-muted-foreground">{meta.label}</span>
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
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">No evidence attached yet.</p>
        )}

        <div className="flex flex-wrap items-end gap-2 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Evidence kind</Label>
            <Select value={nextKind} onValueChange={(v) => setNextKind(v as EvidenceKind)}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_META) as EvidenceKind[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">{KIND_META[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFilePick}
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
              <><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
