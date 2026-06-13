import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface TrainingFindingsSectionProps {
  reviewId: string;
  engagementId: string;
}

interface TrainingIssue {
  id: string;
  issue_title: string;
  issue_description: string | null;
  category: string | null;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  recommendation: string | null;
  management_response: string | null;
  target_completion_date: string | null;
  is_auto_generated: boolean | null;
}

const CATEGORIES = ['governance', 'design', 'delivery', 'effectiveness', 'records'];
const SEVERITIES = ['high', 'medium', 'low'] as const;
const STATUSES = ['open', 'in_progress', 'closed'] as const;

export function TrainingFindingsSection({ reviewId, engagementId }: TrainingFindingsSectionProps) {
  const [issues, setIssues] = useState<TrainingIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<TrainingIssue | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    issue_title: string;
    issue_description: string;
    category: string;
    severity: 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'closed';
    recommendation: string;
    management_response: string;
    target_completion_date: string;
  }>({
    issue_title: '',
    issue_description: '',
    category: '',
    severity: 'medium',
    status: 'open',
    recommendation: '',
    management_response: '',
    target_completion_date: '',
  });

  useEffect(() => {
    loadIssues();
  }, [reviewId]);

  const loadIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('training_issues')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues((data || []) as TrainingIssue[]);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingIssue) {
        const { error } = await supabase
          .from('training_issues')
          .update({
            issue_title: formData.issue_title,
            issue_description: formData.issue_description || null,
            category: formData.category || null,
            severity: formData.severity,
            status: formData.status,
            recommendation: formData.recommendation || null,
            management_response: formData.management_response || null,
            target_completion_date: formData.target_completion_date || null,
          })
          .eq('id', editingIssue.id);

        if (error) throw error;
        toast({ title: 'Issue updated successfully' });
      } else {
        const { error } = await supabase
          .from('training_issues')
          .insert({
            review_id: reviewId,
            engagement_id: engagementId,
            issue_title: formData.issue_title,
            issue_description: formData.issue_description || null,
            category: formData.category || null,
            severity: formData.severity,
            status: formData.status,
            recommendation: formData.recommendation || null,
            management_response: formData.management_response || null,
            target_completion_date: formData.target_completion_date || null,
            is_auto_generated: false,
          });

        if (error) throw error;
        toast({ title: 'Issue created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      loadIssues();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_issues')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Issue deleted' });
      loadIssues();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      issue_title: '',
      issue_description: '',
      category: '',
      severity: 'medium',
      status: 'open',
      recommendation: '',
      management_response: '',
      target_completion_date: '',
    });
    setEditingIssue(null);
  };

  const openEditDialog = (issue: TrainingIssue) => {
    setEditingIssue(issue);
    setFormData({
      issue_title: issue.issue_title,
      issue_description: issue.issue_description || '',
      category: issue.category || '',
      severity: issue.severity,
      status: issue.status,
      recommendation: issue.recommendation || '',
      management_response: issue.management_response || '',
      target_completion_date: issue.target_completion_date || '',
    });
    setDialogOpen(true);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="flex items-center gap-1 bg-amber-500/20 text-amber-600"><AlertCircle className="w-3 h-3" />Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="flex items-center gap-1"><Info className="w-3 h-3" />Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Open</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-green-500/20 text-green-600">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Summary counts
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;
  const openCount = issues.filter(i => i.status === 'open').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Section 6: Findings and Report Output</CardTitle>
            <CardDescription>
              Auto-generated and manual training issues
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Finding
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingIssue ? 'Edit Finding' : 'Add Finding'}</DialogTitle>
                <DialogDescription>
                  Document a training-related finding or issue
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Issue Title *</Label>
                  <Input
                    value={formData.issue_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_title: e.target.value }))}
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity *</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value: 'high' | 'medium' | 'low') => setFormData(prev => ({ ...prev, severity: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map(sev => (
                          <SelectItem key={sev} value={sev}>
                            {sev.charAt(0).toUpperCase() + sev.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'open' | 'in_progress' | 'closed') => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.issue_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_description: e.target.value }))}
                    placeholder="Detailed description of the finding..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recommendation</Label>
                  <Textarea
                    value={formData.recommendation}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
                    placeholder="Recommended remediation steps..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Management Response</Label>
                    <Textarea
                      value={formData.management_response}
                      onChange={(e) => setFormData(prev => ({ ...prev, management_response: e.target.value }))}
                      placeholder="Optional management response..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Completion Date</Label>
                    <Input
                      type="date"
                      value={formData.target_completion_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, target_completion_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={!formData.issue_title}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-destructive/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{highCount}</div>
            <div className="text-sm text-muted-foreground">High Severity</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{mediumCount}</div>
            <div className="text-sm text-muted-foreground">Medium Severity</div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{lowCount}</div>
            <div className="text-sm text-muted-foreground">Low Severity</div>
          </div>
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">{openCount}</div>
            <div className="text-sm text-muted-foreground">Open Issues</div>
          </div>
        </div>

        {/* Issues Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No findings recorded yet. Click "Add Finding" to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="font-medium">{issue.issue_title}</TableCell>
                  <TableCell className="capitalize">{issue.category || '-'}</TableCell>
                  <TableCell>{getSeverityBadge(issue.severity)}</TableCell>
                  <TableCell>{getStatusBadge(issue.status)}</TableCell>
                  <TableCell>{issue.is_auto_generated ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(issue)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(issue.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
