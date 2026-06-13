import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Users,
  UserCheck,
  Shield,
  Building2,
  UserCog,
  FileText,
  Flag
} from 'lucide-react';
import { toast } from 'sonner';

interface GovernanceSummarySectionProps {
  engagementId: string;
}

const submoduleConfig = [
  { id: 'board_oversight', label: 'Board Oversight', icon: Users },
  { id: 'senior_management', label: 'Senior Management', icon: UserCheck },
  { id: 'compliance_officer', label: 'Compliance Officer', icon: Shield },
  { id: 'compliance_function', label: 'Compliance Function', icon: Building2 },
  { id: 'frontline_oversight', label: 'Frontline Oversight', icon: UserCog },
  { id: 'change_management', label: 'Change Management', icon: RefreshCw },
];

export function GovernanceSummarySection({ engagementId }: GovernanceSummarySectionProps) {
  const queryClient = useQueryClient();
  const [summaryData, setSummaryData] = useState({
    overall_assessment: '',
    summary_narrative: '',
    key_strengths: '',
    key_gaps: ''
  });

  // Fetch all interviews for this engagement
  const { data: interviews = [] } = useQuery({
    queryKey: ['governance-interviews-all', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governance_interviews')
        .select('*')
        .eq('engagement_id', engagementId);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch all responses with auto-flags
  const { data: flaggedResponses = [] } = useQuery({
    queryKey: ['governance-flagged-responses', engagementId],
    queryFn: async () => {
      const interviewIds = interviews.map(i => i.id);
      if (interviewIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('governance_responses')
        .select('*')
        .in('interview_id', interviewIds)
        .eq('auto_flag', true);
      
      if (error) throw error;
      return data;
    },
    enabled: interviews.length > 0
  });

  // Fetch governance changes
  const { data: changes = [] } = useQuery({
    queryKey: ['governance-changes', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governance_changes')
        .select('*')
        .eq('engagement_id', engagementId);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch or create summary
  const { data: summary } = useQuery({
    queryKey: ['governance-summary', engagementId],
    queryFn: async () => {
      const { data: existing, error: fetchError } = await supabase
        .from('governance_summary')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (existing) return existing;

      const { data: newSummary, error: createError } = await supabase
        .from('governance_summary')
        .insert({ engagement_id: engagementId })
        .select()
        .single();
      
      if (createError) throw createError;
      return newSummary;
    }
  });

  useEffect(() => {
    if (summary) {
      setSummaryData({
        overall_assessment: summary.overall_assessment || '',
        summary_narrative: summary.summary_narrative || '',
        key_strengths: summary.key_strengths || '',
        key_gaps: summary.key_gaps || ''
      });
    }
  }, [summary]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!summary?.id) return;
      
      const { error } = await supabase
        .from('governance_summary')
        .update({
          overall_assessment: summaryData.overall_assessment || null,
          summary_narrative: summaryData.summary_narrative || null,
          key_strengths: summaryData.key_strengths || null,
          key_gaps: summaryData.key_gaps || null,
          total_interviews: interviews.length,
          total_changes_detected: changes.length,
          total_auto_flags: flaggedResponses.length
        })
        .eq('id', summary.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-summary'] });
      toast.success('Summary saved successfully');
    },
    onError: () => {
      toast.error('Failed to save summary');
    }
  });

  const getSubmoduleStatus = (submoduleId: string) => {
    const interview = interviews.find(i => i.interview_type === submoduleId);
    if (!interview) return { status: 'not_started', assessment: null };
    return { 
      status: interview.status, 
      assessment: interview.overall_assessment 
    };
  };

  const completedInterviews = interviews.filter(i => i.status !== 'draft').length;

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{interviews.length}</p>
                <p className="text-sm text-muted-foreground">Interviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedInterviews}/{6}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Flag className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{flaggedResponses.length}</p>
                <p className="text-sm text-muted-foreground">Auto-Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <RefreshCw className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{changes.length}</p>
                <p className="text-sm text-muted-foreground">Changes Detected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submodule Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submodule Status</CardTitle>
          <CardDescription>Progress across all governance review areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {submoduleConfig.map((submodule) => {
              const { status, assessment } = getSubmoduleStatus(submodule.id);
              const Icon = submodule.icon;
              
              return (
                <div 
                  key={submodule.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{submodule.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={status === 'draft' ? 'secondary' : status === 'approved' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {status === 'not_started' ? 'Not Started' : status}
                      </Badge>
                      {assessment && (
                        <Badge 
                          variant={assessment === 'Effective' ? 'default' : assessment === 'Ineffective' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {assessment}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Flags Summary */}
      {flaggedResponses.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Auto-Flagged Issues
            </CardTitle>
            <CardDescription>
              These items require analyst commentary before module can be approved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flaggedResponses.map((response) => (
                <div 
                  key={response.id}
                  className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
                >
                  <Flag className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{response.auto_flag_reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Q{response.question_number}: {response.question_text}
                    </p>
                    {response.analyst_commentary ? (
                      <p className="text-xs text-foreground mt-2 p-2 bg-background rounded">
                        <span className="font-medium">Commentary:</span> {response.analyst_commentary}
                      </p>
                    ) : (
                      <Badge variant="outline" className="mt-2 text-xs text-destructive">
                        Commentary Required
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Governance Changes Summary */}
      {changes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-600" />
              Governance Changes Detected
            </CardTitle>
            <CardDescription>
              Changes identified during interviews that may require FINTRAC notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {changes.map((change) => (
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <RefreshCw className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{change.change_type}</Badge>
                      {change.reportable_to_fintrac && (
                        <Badge 
                          variant={change.reportable_to_fintrac === 'Yes' ? 'destructive' : 'secondary'}
                        >
                          {change.reportable_to_fintrac === 'Yes' ? 'Reportable' : change.reportable_to_fintrac}
                        </Badge>
                      )}
                    </div>
                    {change.change_description && (
                      <p className="text-sm text-muted-foreground mt-2">{change.change_description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Narrative */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Governance Summary</CardTitle>
          <CardDescription>
            Overall assessment and narrative for the audit report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Overall Governance Assessment</Label>
            <Select
              value={summaryData.overall_assessment}
              onValueChange={(value) => setSummaryData(prev => ({ ...prev, overall_assessment: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select overall assessment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Effective">Effective</SelectItem>
                <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
                <SelectItem value="Ineffective">Ineffective</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Key Strengths Identified</Label>
            <Textarea
              value={summaryData.key_strengths}
              onChange={(e) => setSummaryData(prev => ({ ...prev, key_strengths: e.target.value }))}
              placeholder="Document key governance strengths observed during the review..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label>Key Gaps and Weaknesses</Label>
            <Textarea
              value={summaryData.key_gaps}
              onChange={(e) => setSummaryData(prev => ({ ...prev, key_gaps: e.target.value }))}
              placeholder="Document governance gaps, control weaknesses, and areas for improvement..."
              className="mt-1"
              rows={3}
            />
          </div>

          <Separator />

          <div>
            <Label>Summary Narrative</Label>
            <Textarea
              value={summaryData.summary_narrative}
              onChange={(e) => setSummaryData(prev => ({ ...prev, summary_narrative: e.target.value }))}
              placeholder="Provide a comprehensive narrative summarizing the governance review findings for the audit report..."
              className="mt-1"
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save Summary
        </Button>
      </div>
    </div>
  );
}
