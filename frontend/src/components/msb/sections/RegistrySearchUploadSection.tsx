import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, FileText, Trash2, Download, Loader2, Camera } from 'lucide-react';
import { format } from 'date-fns';

interface RegistrySearchUploadSectionProps {
  registrationId: string;
  engagementId: string;
  registryLabel: string; // "FINTRAC" or "Revenu Québec"
}

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/jpg,image/webp,application/pdf';
const MAX_SIZE_MB = 20;

export function RegistrySearchUploadSection({
  registrationId,
  engagementId,
  registryLabel,
}: RegistrySearchUploadSectionProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchDate, setSearchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reviewerNote, setReviewerNote] = useState('');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const { data: screenshots = [], isLoading } = useQuery({
    queryKey: ['msb-registry-screenshots', registrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msb_registry_screenshots')
        .select('*')
        .eq('registration_id', registrationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Generate signed URLs for previews
  const ensureSignedUrl = async (storagePath: string) => {
    if (signedUrls[storagePath]) return signedUrls[storagePath];
    const { data, error } = await supabase.storage
      .from('msb-registry-screenshots')
      .createSignedUrl(storagePath, 3600);
    if (error || !data) return '';
    setSignedUrls((prev) => ({ ...prev, [storagePath]: data.signedUrl }));
    return data.signedUrl;
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!pendingFile) throw new Error('No file selected');
      if (pendingFile.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`File exceeds ${MAX_SIZE_MB}MB limit`);
      }

      const ext = pendingFile.name.split('.').pop() || 'bin';
      const safeName = `${Date.now()}-${pendingFile.name.replace(/[^a-z0-9.\\-_]/gi, '_')}`;
      const path = `${engagementId}/${registrationId}/${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('msb-registry-screenshots')
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertErr } = await supabase.from('msb_registry_screenshots').insert({
        registration_id: registrationId,
        engagement_id: engagementId,
        storage_path: path,
        filename: pendingFile.name,
        file_type: pendingFile.type,
        file_size: pendingFile.size,
        search_date: searchDate || null,
        reviewer_note: reviewerNote || null,
        uploaded_by: user?.id,
      });
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      toast.success(`${registryLabel} registry screenshot uploaded`);
      setPendingFile(null);
      setReviewerNote('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['msb-registry-screenshots', registrationId] });
    },
    onError: (err: any) => toast.error('Upload failed: ' + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: any) => {
      const { error: storageErr } = await supabase.storage
        .from('msb-registry-screenshots')
        .remove([item.storage_path]);
      if (storageErr) throw storageErr;
      const { error: dbErr } = await supabase
        .from('msb_registry_screenshots')
        .delete()
        .eq('id', item.id);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      toast.success('Screenshot deleted');
      queryClient.invalidateQueries({ queryKey: ['msb-registry-screenshots', registrationId] });
    },
    onError: (err: any) => toast.error('Delete failed: ' + err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPendingFile(file);
  };

  const handleDownload = async (item: any) => {
    const url = await ensureSignedUrl(item.storage_path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {registryLabel} Registry Search Evidence
        </CardTitle>
        <CardDescription>
          Upload screenshots or PDF prints of the {registryLabel} registry search performed for this client.
          Accepted formats: PNG, JPG, WEBP, PDF (max {MAX_SIZE_MB}MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload form */}
        <div className="border rounded-md p-4 space-y-4 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="screenshot-file">Select file</Label>
              <Input
                ref={fileInputRef}
                id="screenshot-file"
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-date">Date of search</Label>
              <Input
                id="search-date"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewer-note">Reviewer note (optional)</Label>
            <Textarea
              id="reviewer-note"
              value={reviewerNote}
              onChange={(e) => setReviewerNote(e.target.value)}
              placeholder="e.g., Searched by registration number M12345678; result confirms active registration."
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!pendingFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Screenshot</>
              )}
            </Button>
          </div>
        </div>

        {/* Existing screenshots */}
        <div>
          <h4 className="font-medium mb-3 text-sm">
            Uploaded evidence ({screenshots.length})
          </h4>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...
            </div>
          ) : screenshots.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-md p-6 text-center">
              No registry search evidence uploaded yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {screenshots.map((item: any) => (
                <ScreenshotCard
                  key={item.id}
                  item={item}
                  ensureSignedUrl={ensureSignedUrl}
                  onDownload={() => handleDownload(item)}
                  onDelete={() => deleteMutation.mutate(item)}
                  deleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScreenshotCard({
  item,
  ensureSignedUrl,
  onDownload,
  onDelete,
  deleting,
}: {
  item: any;
  ensureSignedUrl: (path: string) => Promise<string>;
  onDownload: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const isImage = (item.file_type || '').startsWith('image/');
  const [thumbUrl, setThumbUrl] = useState<string>('');

  // Lazy load thumbnail
  useState(() => {
    if (isImage) {
      ensureSignedUrl(item.storage_path).then(setThumbUrl);
    }
  });

  return (
    <div className="border rounded-md overflow-hidden bg-card">
      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {isImage && thumbUrl ? (
          <img src={thumbUrl} alt={item.filename} className="w-full h-full object-cover" />
        ) : isImage ? (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        ) : (
          <FileText className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium truncate" title={item.filename}>
          {item.filename}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {item.search_date
              ? `Searched ${format(new Date(item.search_date), 'MMM d, yyyy')}`
              : `Uploaded ${format(new Date(item.created_at), 'MMM d, yyyy')}`}
          </span>
          <span>{item.file_size ? `${(item.file_size / 1024).toFixed(0)} KB` : ''}</span>
        </div>
        {item.reviewer_note && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
            "{item.reviewer_note}"
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={onDownload}>
            <Download className="h-3 w-3 mr-1" /> View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
