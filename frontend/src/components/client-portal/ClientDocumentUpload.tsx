import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Clock, CheckCircle, Loader2, Trash2, File } from 'lucide-react';

const DOCUMENT_CATEGORIES = [
  { value: 'policies', label: 'Policies & Procedures' },
  { value: 'kyc_records', label: 'KYC Records' },
  { value: 'transaction_reports', label: 'Transaction Reports' },
  { value: 'training_records', label: 'Training Records' },
  { value: 'risk_assessment', label: 'Risk Assessment' },
  { value: 'registration', label: 'Registration Documents' },
  { value: 'governance', label: 'Governance Documents' },
  { value: 'general', label: 'General / Other' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'outline' }> = {
  uploaded: { label: 'Uploaded', icon: Clock, variant: 'secondary' },
  under_review: { label: 'Under Review', icon: Clock, variant: 'default' },
  accepted: { label: 'Accepted', icon: CheckCircle, variant: 'outline' },
};

interface ClientDocumentUploadProps {
  engagementIds: string[];
  invitations: any[];
}

export function ClientDocumentUpload({ engagementIds, invitations }: ClientDocumentUploadProps) {
  const { user } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('general');
  const [notes, setNotes] = useState('');
  const [selectedEngagement, setSelectedEngagement] = useState(engagementIds[0] || '');

  // Fetch uploaded documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', engagementIds],
    queryFn: async () => {
      if (engagementIds.length === 0) return [];
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .in('engagement_id', engagementIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: engagementIds.length > 0,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !user || !selectedEngagement) throw new Error('Missing required data');

      const invitation = invitations.find((i: any) => i.engagement_id === selectedEngagement);
      if (!invitation) throw new Error('No invitation found for this engagement');

      const fileExt = selectedFile.name.split('.').pop();
      const storagePath = `${selectedEngagement}/${Date.now()}_${selectedFile.name}`;

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .upload(storagePath, selectedFile);
      if (storageError) throw storageError;

      // Create record
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          engagement_id: selectedEngagement,
          client_id: invitation.client_id,
          uploaded_by: user.id,
          filename: selectedFile.name,
          file_type: selectedFile.type || fileExt,
          file_size: selectedFile.size,
          storage_path: storagePath,
          category,
          notes: notes || null,
        });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
      toast({ title: 'Document uploaded', description: 'Your document has been submitted for review.' });
      setSelectedFile(null);
      setNotes('');
      setCategory('general');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Submit requested documents such as policies, KYC records, and training materials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {engagementIds.length > 1 && (
            <div className="space-y-2">
              <Label>Engagement</Label>
              <Select value={selectedEngagement} onValueChange={setSelectedEngagement}>
                <SelectTrigger>
                  <SelectValue placeholder="Select engagement" />
                </SelectTrigger>
                <SelectContent>
                  {invitations.map((inv: any) => (
                    <SelectItem key={inv.engagement_id} value={inv.engagement_id}>
                      {(inv.engagements as any)?.name || inv.engagement_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any context about this document..."
              rows={2}
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
              <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!selectedFile || !selectedEngagement || uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Uploaded Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? 's' : ''} submitted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No documents uploaded yet. Use the form above to submit your documents.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: any) => {
                const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.uploaded;
                const StatusIcon = statusCfg.icon;
                const catLabel = DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{catLabel}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        {doc.file_size && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)}
                            </span>
                          </>
                        )}
                      </div>
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{doc.notes}</p>
                      )}
                    </div>
                    <Badge variant={statusCfg.variant} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
