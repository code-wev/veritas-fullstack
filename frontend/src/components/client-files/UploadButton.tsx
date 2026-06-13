import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { uploadClientFile } from '@/lib/clientFilesUpload';
import { useToast } from '@/hooks/use-toast';

interface Props {
  engagementId: string;
  clientId: string;
  templateId?: string | null;
  sampleType?: string | null;
  sampleId?: string | null;
  sampleLabel?: string | null;
  onUploaded?: () => void;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  label?: string;
  multiple?: boolean;
}

export function UploadButton({
  engagementId,
  clientId,
  templateId = null,
  sampleType = null,
  sampleId = null,
  sampleLabel = null,
  onUploaded,
  size = 'sm',
  variant = 'outline',
  label = 'Upload',
  multiple = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let okCount = 0;
    let dupCount = 0;
    let errCount = 0;
    for (const file of Array.from(files)) {
      const res = await uploadClientFile({
        file, engagementId, clientId, templateId, sampleType, sampleId, sampleLabel,
      });
      if (res.ok) okCount++;
      else if (res.duplicate) dupCount++;
      else errCount++;
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    if (okCount) toast({ title: `${okCount} file${okCount > 1 ? 's' : ''} uploaded` });
    if (dupCount) toast({ title: `${dupCount} duplicate${dupCount > 1 ? 's' : ''} skipped`, description: 'Same file content already exists for this engagement.', variant: 'destructive' });
    if (errCount) toast({ title: `${errCount} upload${errCount > 1 ? 's' : ''} failed`, variant: 'destructive' });
    if ((okCount || dupCount) && onUploaded) onUploaded();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
        {busy ? 'Uploading…' : label}
      </Button>
    </>
  );
}
