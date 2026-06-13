import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, FileText } from 'lucide-react';
import { deleteClientFile, getSignedUrl } from '@/lib/clientFilesUpload';
import { useToast } from '@/hooks/use-toast';

export interface UploadRow {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

interface Props {
  engagementId: string;
  templateId?: string | null;
  sampleType?: string | null;
  sampleId?: string | null;
  refreshKey?: number;
  emptyHint?: string;
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadList({ engagementId, templateId = null, sampleType = null, sampleId = null, refreshKey = 0, emptyHint }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId, templateId, sampleType, sampleId, refreshKey]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('client_files_uploads')
      .select('id, filename, storage_path, file_size, file_type, created_at')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: false });
    if (templateId) q = q.eq('template_id', templateId);
    if (sampleType) q = q.eq('sample_type', sampleType);
    if (sampleId) q = q.eq('sample_id', sampleId);
    const { data, error } = await q;
    if (error) {
      toast({ title: 'Failed to load files', description: error.message, variant: 'destructive' });
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  const handleDownload = async (row: UploadRow) => {
    const url = await getSignedUrl(row.storage_path);
    if (!url) {
      toast({ title: 'Could not generate download link', variant: 'destructive' });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (row: UploadRow) => {
    if (!confirm(`Delete "${row.filename}"?`)) return;
    const res = await deleteClientFile(row.id, row.storage_path);
    if (!res.ok) {
      toast({ title: 'Delete failed', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'File deleted' });
      void load();
    }
  };

  if (loading) return <div className="text-xs text-muted-foreground">Loading files…</div>;
  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground italic">{emptyHint ?? 'No files uploaded yet.'}</div>;
  }

  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/40 border border-border"
        >
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate font-medium text-foreground">{r.filename}</span>
          {r.file_size != null && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{fmtSize(r.file_size)}</Badge>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(r)}>
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(r)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
