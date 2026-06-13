import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Plus, CheckCircle, Loader2, Trash2 } from 'lucide-react';

interface AutoFindingsStepProps {
  ppReviewId: string;
  engagementId: string;
  autoFlags: Array<{ question: string; reason: string; severity: string }>;
}

interface Finding {
  id: string;
  finding_title: string;
  finding_description: string | null;
  severity: string;
  status: string;
  recommendation: string | null;
  is_auto_generated: boolean;
}

export function AutoFindingsStep({ ppReviewId, engagementId, autoFlags }: AutoFindingsStepProps) {
  const [loading, setLoading] = useState(true);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<typeof autoFlags[0] | null>(null);
  const [newFinding, setNewFinding] = useState({
    title: '',
    description: '',
    severity: 'medium',
    recommendation: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFindings();
  }, [ppReviewId]);

  const loadFindings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aml_program_findings')
        .select('*')
        .eq('pp_review_id', ppReviewId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFindings(data as Finding[]);
    } catch (error) {
      console.error('Error loading findings:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateFromFlag = (flag: typeof autoFlags[0]) => {
    setSelectedFlag(flag);
    setNewFinding({
      title: flag.reason,
      description: `Control deficiency identified: ${flag.question}`,
      severity: flag.severity || 'medium',
      recommendation: '',
    });
    setCreateDialogOpen(true);
  };

  const openCreateNew = () => {
    setSelectedFlag(null);
    setNewFinding({
      title: '',
      description: '',
      severity: 'medium',
      recommendation: '',
    });
    setCreateDialogOpen(true);
  };

  const createFinding = async () => {
    if (!newFinding.title.trim()) {
      toast({
        title: 'Error',
        description: 'Finding title is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('aml_program_findings')
        .insert({
          pp_review_id: ppReviewId,
          engagement_id: engagementId,
          finding_title: newFinding.title,
          finding_description: newFinding.description || null,
          severity: newFinding.severity,
          recommendation: newFinding.recommendation || null,
          is_auto_generated: !!selectedFlag,
        });

      if (error) throw error;

      toast({
        title: 'Finding Created',
        description: 'The finding has been added to the register',
      });

      setCreateDialogOpen(false);
      loadFindings();
    } catch (error) {
      console.error('Error creating finding:', error);
      toast({
        title: 'Error',
        description: 'Failed to create finding',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteFinding = async (findingId: string) => {
    try {
      const { error } = await supabase
        .from('aml_program_findings')
        .delete()
        .eq('id', findingId);

      if (error) throw error;

      toast({
        title: 'Finding Deleted',
        description: 'The finding has been removed',
      });

      loadFindings();
    } catch (error) {
      console.error('Error deleting finding:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete finding',
        variant: 'destructive',
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Flags Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Step 4: Auto-Flagged Deficiencies
          </CardTitle>
          <CardDescription>
            Review automatically flagged control deficiencies and create findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {autoFlags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No Auto-Flags Detected</p>
              <p className="text-sm">All core controls and topic coverage items passed review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {autoFlags.map((flag, index) => {
                const existingFinding = findings.find(
                  f => f.finding_title === flag.reason && f.is_auto_generated
                );

                return (
                  <div
                    key={index}
                    className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="font-medium text-destructive">{flag.reason}</span>
                          <Badge variant={getSeverityColor(flag.severity)}>
                            {flag.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.question}</p>
                      </div>
                      {existingFinding ? (
                        <Badge variant="outline" className="shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Finding Created
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCreateFromFlag(flag)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Create Finding
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Findings List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Drafted Findings</CardTitle>
              <CardDescription>
                Findings created from this P&P review
              </CardDescription>
            </div>
            <Button onClick={openCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Finding
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No findings created yet</p>
              <p className="text-sm">Create findings from auto-flags or add manually</p>
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{finding.finding_title}</span>
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity.toUpperCase()}
                        </Badge>
                        {finding.is_auto_generated && (
                          <Badge variant="outline" className="text-xs">Auto</Badge>
                        )}
                      </div>
                      {finding.finding_description && (
                        <p className="text-sm text-muted-foreground">
                          {finding.finding_description}
                        </p>
                      )}
                      {finding.recommendation && (
                        <p className="text-sm mt-2">
                          <span className="font-medium">Recommendation:</span> {finding.recommendation}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteFinding(finding.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Finding Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Finding</DialogTitle>
            <DialogDescription>
              {selectedFlag
                ? 'Create a finding from the auto-flagged deficiency'
                : 'Add a new finding to the P&P review'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Finding Title *</Label>
              <Input
                id="title"
                value={newFinding.title}
                onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })}
                placeholder="e.g., Core AML Program Design Deficiency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newFinding.description}
                onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                placeholder="Describe the finding..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={newFinding.severity}
                onValueChange={(value) => setNewFinding({ ...newFinding, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recommendation">Recommendation</Label>
              <Textarea
                id="recommendation"
                value={newFinding.recommendation}
                onChange={(e) => setNewFinding({ ...newFinding, recommendation: e.target.value })}
                placeholder="Recommended remediation..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFinding} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Finding'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
