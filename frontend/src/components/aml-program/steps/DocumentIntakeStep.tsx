import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentIntakeStepProps {
  ppReview: {
    id: string;
    approval_present: string | null;
    version_control_present: string | null;
  };
  onUpdate: (updates: Record<string, any>) => Promise<void>;
  saving: boolean;
}

interface PPDocument {
  id: string;
  pp_review_id: string;
  name: string;
  version_number: string | null;
  date_prepared: string | null;
  date_approved: string | null;
  approval_authority: string | null;
  scope: string | null;
  sort_order: number;
}

interface DocumentDraft {
  /** Persisted uuid or local "new-…" id */
  id: string;
  name: string;
  version_number: string;
  date_prepared: string;
  date_approved: string;
  approval_authority: string;
  scope: string;
  sort_order: number;
}

function tempId() {
  return `new-${Math.random().toString(36).slice(2, 10)}`;
}

function blankDoc(sort_order: number): DocumentDraft {
  return {
    id: tempId(),
    name: '',
    version_number: '',
    date_prepared: '',
    date_approved: '',
    approval_authority: '',
    scope: '',
    sort_order,
  };
}

export function DocumentIntakeStep({ ppReview, onUpdate, saving }: DocumentIntakeStepProps) {
  const queryClient = useQueryClient();
  const [docs, setDocs] = useState<DocumentDraft[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [approvalPresent, setApprovalPresent] = useState(ppReview.approval_present || '');
  const [versionControlPresent, setVersionControlPresent] = useState(ppReview.version_control_present || '');

  // Fetch persisted documents for this P&P review
  const { data: persistedDocs = [], isLoading } = useQuery({
    queryKey: ['aml-pp-documents', ppReview.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aml_pp_documents')
        .select('*')
        .eq('pp_review_id', ppReview.id)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PPDocument[];
    },
    enabled: !!ppReview.id,
  });

  // Hydrate local state from persisted rows; if none, start with a single
  // empty card so the analyst has something to fill in.
  useEffect(() => {
    if (persistedDocs.length > 0) {
      setDocs(persistedDocs.map((d, idx) => ({
        id: d.id,
        name: d.name ?? '',
        version_number: d.version_number ?? '',
        date_prepared: d.date_prepared ?? '',
        date_approved: d.date_approved ?? '',
        approval_authority: d.approval_authority ?? '',
        scope: d.scope ?? '',
        sort_order: d.sort_order ?? idx,
      })));
    } else {
      setDocs([blankDoc(0)]);
    }
    setRemovedIds([]);
  }, [persistedDocs]);

  useEffect(() => {
    setApprovalPresent(ppReview.approval_present || '');
    setVersionControlPresent(ppReview.version_control_present || '');
  }, [ppReview.approval_present, ppReview.version_control_present]);

  const addDocument = () => {
    setDocs((prev) => [...prev, blankDoc(prev.length)]);
  };

  const removeDocument = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const updateDoc = (id: string, patch: Partial<DocumentDraft>) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const saveDocsMutation = useMutation({
    mutationFn: async () => {
      // Hard-delete any persisted rows the analyst removed
      const persistedRemovals = removedIds.filter((id) => !id.startsWith('new-'));
      if (persistedRemovals.length > 0) {
        const { error } = await supabase
          .from('aml_pp_documents')
          .delete()
          .in('id', persistedRemovals);
        if (error) throw error;
      }

      // Skip blank rows (no name)
      const rows = docs
        .map((d, idx) => ({ ...d, sort_order: idx }))
        .filter((d) => d.name.trim().length > 0);

      // Update existing rows
      for (const r of rows.filter((d) => !d.id.startsWith('new-'))) {
        const { error } = await supabase
          .from('aml_pp_documents')
          .update({
            name: r.name,
            version_number: r.version_number || null,
            date_prepared: r.date_prepared || null,
            date_approved: r.date_approved || null,
            approval_authority: r.approval_authority || null,
            scope: r.scope || null,
            sort_order: r.sort_order,
          })
          .eq('id', r.id);
        if (error) throw error;
      }

      // Insert new rows
      const inserts = rows
        .filter((d) => d.id.startsWith('new-'))
        .map((d) => ({
          pp_review_id: ppReview.id,
          name: d.name,
          version_number: d.version_number || null,
          date_prepared: d.date_prepared || null,
          date_approved: d.date_approved || null,
          approval_authority: d.approval_authority || null,
          scope: d.scope || null,
          sort_order: d.sort_order,
        }));
      if (inserts.length > 0) {
        const { error } = await supabase.from('aml_pp_documents').insert(inserts);
        if (error) throw error;
      }

      // Save the two overall radio answers on the parent review row
      await onUpdate({
        approval_present: approvalPresent || null,
        version_control_present: versionControlPresent || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aml-pp-documents', ppReview.id] });
      setRemovedIds([]);
      toast.success('Document intake saved');
    },
    onError: (e: any) => {
      toast.error(`Save failed: ${e?.message ?? 'unknown error'}`);
    },
  });

  const showApprovalWarning = approvalPresent === 'no';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Document Intake
        </CardTitle>
        <CardDescription>
          List every AML / ATF policy and procedure document under review. Capture each one's version and prepared / approved dates separately — firms often maintain more than one document.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Per-document repeater */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">P&P Documents</Label>
            <Badge variant="outline" className="text-xs">
              {docs.filter((d) => d.name.trim().length > 0).length} document{docs.filter((d) => d.name.trim().length > 0).length === 1 ? '' : 's'}
            </Badge>
          </div>

          {isLoading ? (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading documents…
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((d, idx) => (
                <div key={d.id} className="rounded-md border p-3 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Document #{idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeDocument(d.id)}
                      title="Remove document"
                      disabled={docs.length === 1 && !d.name.trim()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Document name</Label>
                      <Input
                        value={d.name}
                        onChange={(e) => updateDoc(d.id, { name: e.target.value })}
                        placeholder="e.g. AML Compliance Manual"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Version</Label>
                      <Input
                        value={d.version_number}
                        onChange={(e) => updateDoc(d.id, { version_number: e.target.value })}
                        placeholder="e.g. v7"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date prepared</Label>
                      <Input
                        type="date"
                        value={d.date_prepared}
                        onChange={(e) => updateDoc(d.id, { date_prepared: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date approved</Label>
                      <Input
                        type="date"
                        value={d.date_approved}
                        onChange={(e) => updateDoc(d.id, { date_approved: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Approval authority</Label>
                      <Input
                        value={d.approval_authority}
                        onChange={(e) => updateDoc(d.id, { approval_authority: e.target.value })}
                        placeholder="e.g. Board / CO / Sr Mgmt"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Scope</Label>
                    <Input
                      value={d.scope}
                      onChange={(e) => updateDoc(d.id, { scope: e.target.value })}
                      placeholder="e.g. All Canadian MSB operations; or KYC + transaction monitoring only"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" onClick={addDocument} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add document
          </Button>
        </div>

        {/* Overall version control / approval radios — apply to the firm's
            P&P regime as a whole, not to each individual document. */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Version control present (firm-wide)?</Label>
          <RadioGroup
            value={versionControlPresent}
            onValueChange={setVersionControlPresent}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="vc-yes" />
              <Label htmlFor="vc-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="vc-no" />
              <Label htmlFor="vc-no">No</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partial" id="vc-partial" />
              <Label htmlFor="vc-partial">Partial</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">Approval evidence present (firm-wide)?</Label>
          <p className="text-sm text-muted-foreground">
            Evidence of approval by senior management or Board (minutes, signature page, email) covering the documents above.
          </p>
          <RadioGroup
            value={approvalPresent}
            onValueChange={setApprovalPresent}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="ap-yes" />
              <Label htmlFor="ap-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="ap-no" />
              <Label htmlFor="ap-no">No</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partial" id="ap-partial" />
              <Label htmlFor="ap-partial">Partial</Label>
            </div>
          </RadioGroup>
        </div>

        {showApprovalWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              Auto-Flag Triggered
              <Badge variant="destructive">Medium Severity</Badge>
            </AlertTitle>
            <AlertDescription>
              Missing approval evidence — AML policies and procedures should be formally approved by senior management or the Board. This is also tested per-document in DCG-03 in the working paper.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={() => saveDocsMutation.mutate()} disabled={saveDocsMutation.isPending || saving}>
            {saveDocsMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save document intake</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
