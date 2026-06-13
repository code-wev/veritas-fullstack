import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, AlertTriangle, FileText, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FindingsSummarySectionProps {
  reviewId: string;
  engagementId: string;
  review: {
    overall_assessment: string | null;
    summary_for_report: string | null;
    rba_exists: boolean | null;
    document_titles: string | null;
    version_number: string | null;
    approved_by_senior_mgmt: string | null;
  };
  onUpdate: (updates: any) => void;
}

type IssueSeverity = 'low' | 'medium' | 'high';

interface Issue {
  id: string;
  issue_category: string;
  severity: IssueSeverity;
  title: string;
  observation: string | null;
  recommendation: string | null;
  management_response: string | null;
  target_completion_date: string | null;
  status: string;
  is_auto_generated: boolean;
  source_response_id: string | null;
}

interface AutoFlag {
  id: string;
  section: number;
  question_number: number;
  auto_flag_reason: string;
}

const ISSUE_CATEGORIES = [
  { value: 'existence', label: 'Existence' },
  { value: 'methodology', label: 'Methodology' },
  { value: 'business_based', label: 'Business-Based' },
  { value: 'relationship_based', label: 'Relationship-Based' },
  { value: 'operationalization', label: 'Operationalization' },
  { value: 'consistency', label: 'Consistency' },
];

const SEVERITIES = [
  { value: 'high', label: 'High', color: 'destructive' },
  { value: 'medium', label: 'Medium', color: 'secondary' },
  { value: 'low', label: 'Low', color: 'outline' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

export function FindingsSummarySection({ reviewId, engagementId, review, onUpdate }: FindingsSummarySectionProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [autoFlags, setAutoFlags] = useState<AutoFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [reviewId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load existing issues
      const { data: issuesData, error: issuesError } = await supabase
        .from('rba_issues')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at');

      if (issuesError) throw issuesError;
      setIssues(issuesData || []);

      // Load auto-flagged responses
      const { data: flagsData, error: flagsError } = await supabase
        .from('rba_responses')
        .select('id, section, question_number, auto_flag_reason')
        .eq('review_id', reviewId)
        .eq('auto_flag', true);

      if (flagsError) throw flagsError;
      setAutoFlags(flagsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Failed to load findings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createIssueFromFlag = async (flag: AutoFlag) => {
    try {
      const { data, error } = await supabase
        .from('rba_issues')
        .insert({
          review_id: reviewId,
          engagement_id: engagementId,
          source_response_id: flag.id,
          issue_category: 'existence',
          severity: 'medium',
          title: flag.auto_flag_reason,
          observation: `Auto-generated from Section ${flag.section}, Question ${flag.question_number}: ${flag.auto_flag_reason}`,
          is_auto_generated: true,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      setIssues([...issues, data]);
      toast({ title: 'Issue Created', description: 'Finding created from auto-flag' });
    } catch (error) {
      console.error('Error creating issue:', error);
      toast({ title: 'Error', description: 'Failed to create issue', variant: 'destructive' });
    }
  };

  const addManualIssue = async () => {
    try {
      const { data, error } = await supabase
        .from('rba_issues')
        .insert({
          review_id: reviewId,
          engagement_id: engagementId,
          issue_category: 'existence',
          severity: 'medium',
          title: 'New Finding',
          is_auto_generated: false,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      setIssues([...issues, data]);
    } catch (error) {
      console.error('Error adding issue:', error);
      toast({ title: 'Error', description: 'Failed to add issue', variant: 'destructive' });
    }
  };

  const updateIssue = async (id: string, updates: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('rba_issues')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setIssues(prev => prev.map(i => i.id === id ? { ...i, ...updates } as Issue : i));
    } catch (error) {
      console.error('Error updating issue:', error);
      toast({ title: 'Error', description: 'Failed to update issue', variant: 'destructive' });
    }
  };

  const deleteIssue = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rba_issues')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setIssues(prev => prev.filter(i => i.id !== id));
      toast({ title: 'Deleted', description: 'Issue removed' });
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast({ title: 'Error', description: 'Failed to delete issue', variant: 'destructive' });
    }
  };

  const generateSummary = () => {
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    let summary = `## Risk Assessment Review Summary\n\n`;
    summary += `**Document Reviewed:** ${review.document_titles || 'Not specified'}\n`;
    summary += `**Version:** ${review.version_number || 'Not specified'}\n`;
    summary += `**RBA Exists:** ${review.rba_exists === true ? 'Yes' : 'No'}\n`;
    summary += `**Approved by Senior Management:** ${review.approved_by_senior_mgmt === 'yes' ? 'Yes' : review.approved_by_senior_mgmt === 'no' ? 'No' : 'N/A'}\n\n`;
    summary += `### Findings Summary\n`;
    summary += `- **High Severity:** ${highCount}\n`;
    summary += `- **Medium Severity:** ${mediumCount}\n`;
    summary += `- **Low Severity:** ${lowCount}\n\n`;
    
    if (issues.length > 0) {
      summary += `### Key Issues\n`;
      issues.forEach((issue, idx) => {
        summary += `${idx + 1}. **[${issue.severity.toUpperCase()}]** ${issue.title}\n`;
      });
    }

    onUpdate({ summary_for_report: summary });
    toast({ title: 'Summary Generated', description: 'Report summary has been updated' });
  };

  const severityCounts = {
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };

  const unflaggedAutoFlags = autoFlags.filter(
    flag => !issues.some(i => i.source_response_id === flag.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-destructive">{severityCounts.high}</div>
            <div className="text-sm text-muted-foreground">High Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{severityCounts.medium}</div>
            <div className="text-sm text-muted-foreground">Medium Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{severityCounts.low}</div>
            <div className="text-sm text-muted-foreground">Low Severity</div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Flags to Convert */}
      {unflaggedAutoFlags.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Auto-Flagged Issues ({unflaggedAutoFlags.length})
            </CardTitle>
            <CardDescription>
              These issues were auto-detected. Click to create findings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unflaggedAutoFlags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                <span className="text-sm">
                  <Badge variant="outline" className="mr-2">S{flag.section} Q{flag.question_number}</Badge>
                  {flag.auto_flag_reason}
                </span>
                <Button size="sm" onClick={() => createIssueFromFlag(flag)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create Issue
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Issues List */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Documented Issues ({issues.length})</h3>
        <Button onClick={addManualIssue} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Manual Issue
        </Button>
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No issues documented yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <Card key={issue.id}>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={issue.severity === 'high' ? 'destructive' : issue.severity === 'medium' ? 'secondary' : 'outline'}>
                      {issue.severity}
                    </Badge>
                    {issue.is_auto_generated && (
                      <Badge variant="outline" className="text-xs">Auto</Badge>
                    )}
                    <Badge variant="outline">{issue.status}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteIssue(issue.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={issue.title}
                      onChange={(e) => updateIssue(issue.id, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={issue.issue_category}
                      onValueChange={(value) => updateIssue(issue.id, { issue_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select
                      value={issue.severity}
                      onValueChange={(value) => updateIssue(issue.id, { severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Observation</Label>
                  <Textarea
                    value={issue.observation || ''}
                    onChange={(e) => updateIssue(issue.id, { observation: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Recommendation</Label>
                  <Textarea
                    value={issue.recommendation || ''}
                    onChange={(e) => updateIssue(issue.id, { recommendation: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={issue.status}
                      onValueChange={(value) => updateIssue(issue.id, { status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target Completion Date</Label>
                    <Input
                      type="date"
                      value={issue.target_completion_date || ''}
                      onChange={(e) => updateIssue(issue.id, { target_completion_date: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Separator />

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Report Summary
          </CardTitle>
          <CardDescription>
            Generate or edit the summary narrative for the audit report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Overall Assessment</Label>
            <Select
              value={review.overall_assessment || ''}
              onValueChange={(value) => onUpdate({ overall_assessment: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assessment..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="effective">Effective</SelectItem>
                <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                <SelectItem value="ineffective">Ineffective</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Summary for Report</Label>
              <Button variant="outline" size="sm" onClick={generateSummary}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Summary
              </Button>
            </div>
            <Textarea
              value={review.summary_for_report || ''}
              onChange={(e) => onUpdate({ summary_for_report: e.target.value })}
              rows={10}
              placeholder="Summary narrative for audit report..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
