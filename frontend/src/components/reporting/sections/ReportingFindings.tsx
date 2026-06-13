import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, AlertTriangle, AlertCircle, Info, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  classifyReportingSample,
  ClassifiableSample,
} from '@/lib/classifyTransactionReport';

interface ReportingFindingsProps {
  reviewId: string;
  engagementId: string;
}

interface Finding {
  id: string;
  review_id: string | null;
  sample_id: string | null;
  engagement_id: string;
  report_type: string;
  issue_category: string;
  severity: string;
  status: string;
  finding_title: string;
  finding_description: string | null;
  root_cause: string | null;
  recommendation: string | null;
  management_response: string | null;
  is_auto_generated: boolean;
  auto_flag_reason: string | null;
  target_completion_date: string | null;
}

/**
 * Subset of `reporting_samples` fields needed by both the existing failed-row
 * preview and the FINTRAC auto-classifier. Mirrors ClassifiableSample.
 */
type FailedSample = ClassifiableSample & {
  id: string;
};

const issueCategories = [
  { value: 'missing_report', label: 'Missing Report' },
  { value: 'incomplete_report', label: 'Incomplete Report' },
  { value: 'late_submission', label: 'Late Submission' },
  { value: 'inaccurate_data', label: 'Inaccurate Data' },
  { value: 'str_decision_weakness', label: 'STR Decision Weakness' },
  { value: 'governance_gap', label: 'Governance Gap' },
];

const severities = [
  { value: 'low', label: 'Low', icon: Info, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'medium', label: 'Medium', icon: AlertCircle, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'high', label: 'High', icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'critical', label: 'Critical', icon: AlertTriangle, color: 'bg-destructive/10 text-destructive border-destructive/20' },
];

const statuses = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const emptyFinding = (engagementId: string, reviewId: string): Partial<Finding> => ({
  engagement_id: engagementId,
  review_id: reviewId,
  report_type: 'lctr',
  issue_category: 'incomplete_report',
  severity: 'medium',
  status: 'open',
  finding_title: '',
  finding_description: null,
  root_cause: null,
  recommendation: null,
  management_response: null,
  is_auto_generated: false,
  target_completion_date: null,
});

function deriveFailedAreas(sample: FailedSample): string[] {
  const areas: string[] = [];
  if (sample.completeness_result === 'fail') areas.push('Completeness');
  if (sample.accuracy_overall === 'fail') areas.push('Accuracy');
  if (sample.timeliness_result === 'fail') areas.push('Timeliness');
  if (areas.length === 0 && sample.overall_result === 'fail') areas.push('Overall');
  return areas;
}

function deriveSeverity(sample: FailedSample): string {
  const failCount = [sample.completeness_result, sample.accuracy_overall, sample.timeliness_result]
    .filter(r => r === 'fail').length;
  if (failCount >= 3) return 'high';
  if (failCount >= 2) return 'medium';
  return 'medium';
}

function deriveCategory(sample: FailedSample): string {
  if (sample.completeness_result === 'fail') return 'incomplete_report';
  if (sample.accuracy_overall === 'fail') return 'inaccurate_data';
  if (sample.timeliness_result === 'fail') return 'late_submission';
  return 'incomplete_report';
}

export function ReportingFindings({ reviewId, engagementId }: ReportingFindingsProps) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [failedSamples, setFailedSamples] = useState<FailedSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<Partial<Finding> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, [engagementId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [findingsRes, samplesRes] = await Promise.all([
        supabase
          .from('reporting_findings')
          .select('*')
          .eq('engagement_id', engagementId)
          .order('created_at', { ascending: false }),
        // The classifier needs every per-field boolean. Fetch the full row.
        supabase
          .from('reporting_samples')
          .select('*')
          .eq('engagement_id', engagementId)
          .or('overall_result.eq.fail,completeness_result.eq.fail,accuracy_overall.eq.fail,timeliness_result.eq.fail'),
      ]);

      if (findingsRes.error) throw findingsRes.error;
      if (samplesRes.error) throw samplesRes.error;

      setFindings(findingsRes.data || []);
      setFailedSamples((samplesRes.data || []) as FailedSample[]);
    } catch (error: any) {
      toast({ title: 'Error loading findings', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFinding = () => {
    setEditingFinding(emptyFinding(engagementId, reviewId));
    setDialogOpen(true);
  };

  const handleEditFinding = (finding: Finding) => {
    setEditingFinding(finding);
    setDialogOpen(true);
  };

  const handleSaveFinding = async () => {
    if (!editingFinding?.finding_title) {
      toast({ title: 'Please enter a finding title', variant: 'destructive' });
      return;
    }

    try {
      if (editingFinding.id) {
        const { error } = await supabase
          .from('reporting_findings')
          .update(editingFinding as any)
          .eq('id', editingFinding.id);
        if (error) throw error;
        setFindings(findings.map(f => f.id === editingFinding.id ? editingFinding as Finding : f));
      } else {
        const { data, error } = await supabase
          .from('reporting_findings')
          .insert(editingFinding as any)
          .select()
          .single();
        if (error) throw error;
        setFindings([data, ...findings]);
      }
      setDialogOpen(false);
      setEditingFinding(null);
      toast({ title: 'Finding saved' });
    } catch (error: any) {
      toast({ title: 'Error saving finding', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteFinding = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reporting_findings')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setFindings(findings.filter(f => f.id !== id));
      toast({ title: 'Finding deleted' });
    } catch (error: any) {
      toast({ title: 'Error deleting finding', description: error.message, variant: 'destructive' });
    }
  };

  const pushToFindings = async () => {
    setPushing(true);
    try {
      // Pre-fetch existing transaction_reporting findings for the engagement so
      // we can detect STR recurrence (first-miss vs. recurrent-miss per FINTRAC).
      // Cross-engagement history would require the RE's full STR filing log;
      // for now we treat the engagement as the unit of analysis.
      const { data: priorFindings } = await supabase
        .from('findings')
        .select('id, module, submodule, finding_type, source_reporting_sample_id')
        .eq('engagement_id', engagementId)
        .eq('module', 'transaction_reporting');
      const priorStrCompleteNc = (priorFindings ?? []).some(
        (f: any) => f.submodule === 'STR' && f.finding_type === 'complete_nc',
      );

      // Build rows from failed samples using the FINTRAC-aligned classifier
      const autoRows = failedSamples.map((s) => {
        const cls = classifyReportingSample(s);
        const isFirstMiss = cls.is_first_miss != null
          ? (priorStrCompleteNc ? false : cls.is_first_miss)
          : null;
        return {
          engagement_id: engagementId,
          module: 'transaction_reporting',
          submodule: s.report_type.toUpperCase(),
          title: cls.title,
          observation: s.deficiencies || cls.description,
          description: cls.description,
          recommendation: cls.recommendation,
          finding_type: cls.finding_type,
          severity: cls.severity,
          original_severity: cls.severity,
          compliance_dimension: cls.compliance_dimension,
          is_first_miss: isFirstMiss,
          auto_flag_weaknesses: cls.weaknesses as any,
          status: 'draft',
          date_identified: new Date().toISOString().slice(0, 10),
          source_reporting_sample_id: s.id,
        };
      });

      // Also push manual reporting_findings that haven't been pushed yet
      const manualRows = findings
        .filter(f => !f.is_auto_generated && f.finding_title.trim())
        .map(f => ({
          engagement_id: engagementId,
          module: 'transaction_reporting',
          submodule: f.report_type.toUpperCase(),
          title: f.finding_title,
          observation: f.finding_description,
          description: f.finding_description,
          recommendation: f.recommendation,
          severity: f.severity,
          original_severity: f.severity,
          status: 'draft',
          date_identified: new Date().toISOString().slice(0, 10),
        }));

      const all = [...autoRows, ...manualRows];
      if (all.length === 0) {
        toast({ title: 'Nothing to push', description: 'No failed samples or manual findings to send.' });
        setPushing(false);
        return;
      }

      const { error } = await supabase.from('findings').insert(all as any);
      if (error) throw error;
      toast({ title: 'Pushed', description: `${all.length} findings sent to the Findings module.` });
    } catch (err: any) {
      console.error('[pushToFindings] failed:', err);
      const detail =
        err?.message ||
        err?.details ||
        err?.hint ||
        (typeof err === 'string' ? err : 'Unknown error');
      const code = err?.code ? ` [${err.code}]` : '';
      toast({
        title: 'Failed to push findings',
        description: `${detail}${code}. See browser console for full error.`,
        variant: 'destructive',
      });
    } finally {
      setPushing(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const config = severities.find(s => s.value === severity) || severities[1];
    return (
      <Badge variant="outline" className={config.color}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = statuses.find(s => s.value === status);
    return <Badge variant="secondary">{config?.label || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Generated Deficiencies from Failed Samples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Auto-Detected Failures ({failedSamples.length})
          </CardTitle>
          <CardDescription>
            Samples with failed completeness, accuracy, or timeliness tests. These flow into the Findings module and Audit Report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failedSamples.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No failed samples detected. Complete testing in the report type tabs.
            </div>
          ) : (
            <div className="space-y-3">
              {failedSamples.map((s) => {
                const failedAreas = deriveFailedAreas(s);
                return (
                  <div key={s.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="mr-2">{s.report_type.toUpperCase()}</Badge>
                        <span className="font-semibold text-sm">{s.report_reference_id || 'No Reference'}</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {failedAreas.map(area => (
                          <Badge key={area} variant="destructive" className="text-xs">{area} Fail</Badge>
                        ))}
                      </div>
                    </div>
                    {s.deficiencies && (
                      <div className="text-sm text-muted-foreground">{s.deficiencies}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Findings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manual Findings</CardTitle>
              <CardDescription>
                Additional deficiencies not captured by sample testing
              </CardDescription>
            </div>
            <Button onClick={handleAddFinding}>
              <Plus className="w-4 h-4 mr-2" />
              Add Finding
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No manual findings recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((finding) => (
                  <TableRow
                    key={finding.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditFinding(finding)}
                  >
                    <TableCell className="font-medium">
                      {finding.finding_title}
                      {finding.is_auto_generated && (
                        <Badge variant="outline" className="ml-2 text-xs">Auto</Badge>
                      )}
                    </TableCell>
                    <TableCell className="uppercase">{finding.report_type}</TableCell>
                    <TableCell>
                      {issueCategories.find(c => c.value === finding.issue_category)?.label || finding.issue_category}
                    </TableCell>
                    <TableCell>{getSeverityBadge(finding.severity)}</TableCell>
                    <TableCell>{getStatusBadge(finding.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFinding(finding.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Push to Findings Module */}
      <div className="flex justify-end">
        <Button onClick={pushToFindings} disabled={pushing || (failedSamples.length === 0 && findings.length === 0)}>
          <FileCheck className="w-4 h-4 mr-1" />
          {pushing ? 'Pushing...' : 'Push to Findings Module'}
        </Button>
      </div>

      {/* Finding Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFinding?.id ? 'Edit Finding' : 'Add Finding'}
            </DialogTitle>
            <DialogDescription>
              Document a reporting deficiency identified during testing
            </DialogDescription>
          </DialogHeader>

          {editingFinding && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Finding Title *</Label>
                <Input
                  value={editingFinding.finding_title || ''}
                  onChange={(e) => setEditingFinding({ ...editingFinding, finding_title: e.target.value })}
                  placeholder="e.g., Missing EFTR for international transfer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select
                    value={editingFinding.report_type || 'lctr'}
                    onValueChange={(v) => setEditingFinding({ ...editingFinding, report_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lctr">LCTR</SelectItem>
                      <SelectItem value="eftr">EFTR</SelectItem>
                      <SelectItem value="str">STR</SelectItem>
                      <SelectItem value="lvctr">LVCTR</SelectItem>
                      <SelectItem value="lpepr">LPEPR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Issue Category</Label>
                  <Select
                    value={editingFinding.issue_category || 'incomplete_report'}
                    onValueChange={(v) => setEditingFinding({ ...editingFinding, issue_category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {issueCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={editingFinding.severity || 'medium'}
                    onValueChange={(v) => setEditingFinding({ ...editingFinding, severity: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {severities.map((sev) => (
                        <SelectItem key={sev.value} value={sev.value}>{sev.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingFinding.status || 'open'}
                    onValueChange={(v) => setEditingFinding({ ...editingFinding, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((stat) => (
                        <SelectItem key={stat.value} value={stat.value}>{stat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingFinding.finding_description || ''}
                  onChange={(e) => setEditingFinding({ ...editingFinding, finding_description: e.target.value })}
                  placeholder="Describe the deficiency in detail..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Root Cause</Label>
                <Textarea
                  value={editingFinding.root_cause || ''}
                  onChange={(e) => setEditingFinding({ ...editingFinding, root_cause: e.target.value })}
                  placeholder="What caused this deficiency?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Recommendation</Label>
                <Textarea
                  value={editingFinding.recommendation || ''}
                  onChange={(e) => setEditingFinding({ ...editingFinding, recommendation: e.target.value })}
                  placeholder="Recommended corrective action..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Management Response</Label>
                <Textarea
                  value={editingFinding.management_response || ''}
                  onChange={(e) => setEditingFinding({ ...editingFinding, management_response: e.target.value })}
                  placeholder="Management's response to the finding..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Target Completion Date</Label>
                <Input
                  type="date"
                  value={editingFinding.target_completion_date || ''}
                  onChange={(e) => setEditingFinding({ ...editingFinding, target_completion_date: e.target.value || null })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFinding}>Save Finding</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
