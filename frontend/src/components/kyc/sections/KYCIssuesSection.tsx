import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, AlertTriangle, AlertCircle, Info, Bot, User } from 'lucide-react';

interface KYCIssuesSectionProps {
  reviewId: string;
}

interface KYCIssue {
  id: string;
  issue_category: string;
  issue_title: string;
  issue_description: string | null;
  severity: string;
  status: string;
  is_auto_generated: boolean | null;
  auto_flag_reason: string | null;
  recommendation: string | null;
  management_response: string | null;
  target_completion_date: string | null;
}

const emptyIssue: Partial<KYCIssue> = {
  issue_category: 'mandatory',
  issue_title: '',
  issue_description: '',
  severity: 'medium',
  status: 'open',
  is_auto_generated: false,
  recommendation: '',
  management_response: '',
  target_completion_date: '',
};

const categories = [
  { value: 'mandatory', label: 'Mandatory Requirements' },
  { value: 'reasonable_measures', label: 'Reasonable Measures' },
  { value: 'bo_verification', label: 'Beneficial Ownership' },
  { value: 'transaction_records', label: 'Transaction Records' },
  { value: 'other', label: 'Other' },
];

export function KYCIssuesSection({ reviewId }: KYCIssuesSectionProps) {
  const [issues, setIssues] = useState<KYCIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<KYCIssue | null>(null);
  const [formData, setFormData] = useState<Partial<KYCIssue>>(emptyIssue);
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    high: 0,
    medium: 0,
    low: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });

  useEffect(() => {
    loadIssues();
  }, [reviewId]);

  const loadIssues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kyc_issues')
      .select('*')
      .eq('review_id', reviewId)
      .order('severity', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setIssues(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  };

  const calculateStats = (data: KYCIssue[]) => {
    setStats({
      high: data.filter(i => i.severity === 'high').length,
      medium: data.filter(i => i.severity === 'medium').length,
      low: data.filter(i => i.severity === 'low').length,
      open: data.filter(i => i.status === 'open').length,
      inProgress: data.filter(i => i.status === 'in_progress').length,
      closed: data.filter(i => i.status === 'closed').length,
    });
  };

  const saveIssue = async () => {
    try {
      if (editingIssue) {
        const { error } = await supabase
          .from('kyc_issues')
          .update(formData as any)
          .eq('id', editingIssue.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kyc_issues')
          .insert({ ...formData, review_id: reviewId } as any);

        if (error) throw error;
      }

      toast({ title: 'Saved', description: 'Issue saved successfully.' });
      setDialogOpen(false);
      setEditingIssue(null);
      setFormData(emptyIssue);
      loadIssues();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteIssue = async (id: string) => {
    const { error } = await supabase.from('kyc_issues').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Issue removed.' });
      loadIssues();
    }
  };

  const openEditDialog = (issue: KYCIssue) => {
    setEditingIssue(issue);
    setFormData(issue);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingIssue(null);
    setFormData(emptyIssue);
    setDialogOpen(true);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" />Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="gap-1"><Info className="w-3 h-3" />Low</Badge>;
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
        return <Badge className="bg-green-500">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.high}</div>
            <div className="text-xs text-muted-foreground">High Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-xs text-muted-foreground">Medium Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.low}</div>
            <div className="text-xs text-muted-foreground">Low Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.open}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.closed}</div>
            <div className="text-xs text-muted-foreground">Closed</div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Findings, Observations & Recommendations</CardTitle>
            <CardDescription>
              Deficiencies captured on samples flow here automatically. Add additional findings or observations manually below.
              All entries sync to the engagement Findings register and the Audit Report.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Finding / Observation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingIssue ? 'Edit' : 'Add'} Finding / Observation</DialogTitle>
                <DialogDescription>
                  Document a KYC finding, observation, or deficiency. It will be mirrored into the central Findings register.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.issue_category || 'mandatory'}
                      onValueChange={(value) => setFormData({ ...formData, issue_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={formData.severity || 'medium'}
                      onValueChange={(value) => setFormData({ ...formData, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Issue Title</Label>
                  <Input
                    value={formData.issue_title || ''}
                    onChange={(e) => setFormData({ ...formData, issue_title: e.target.value })}
                    placeholder="Brief title for the finding"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.issue_description || ''}
                    onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                    placeholder="Detailed description of the finding..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recommendation</Label>
                  <Textarea
                    value={formData.recommendation || ''}
                    onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                    placeholder="Recommended corrective action..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status || 'open'}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Completion Date</Label>
                    <Input
                      type="date"
                      value={formData.target_completion_date || ''}
                      onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Management Response</Label>
                  <Textarea
                    value={formData.management_response || ''}
                    onChange={(e) => setFormData({ ...formData, management_response: e.target.value })}
                    placeholder="Management's response to the finding..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={saveIssue}>Save Issue</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No findings recorded yet. Add a deficiency to any sample and it will appear here automatically, or click "Add Finding / Observation" to log one manually.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      {issue.is_auto_generated ? (
                        <Badge variant="outline" className="gap-1">
                          <Bot className="w-3 h-3" />Auto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <User className="w-3 h-3" />Manual
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {categories.find(c => c.value === issue.issue_category)?.label || issue.issue_category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{issue.issue_title}</div>
                        {issue.issue_description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {issue.issue_description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(issue.severity)}</TableCell>
                    <TableCell>{getStatusBadge(issue.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(issue)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteIssue(issue.id)}>
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
    </div>
  );
}
