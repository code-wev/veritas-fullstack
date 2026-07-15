import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Flag,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useApp } from '@/contexts/AppContext';
import { findingTypeToSeverity, type FindingType } from '@/lib/findingClassification';
import { GovernanceInterviewEvidenceUpload } from './GovernanceInterviewEvidenceUpload';

interface GovernanceInterviewFormProps {
  engagementId: string;
  submodule: string;
  title: string;
  description: string;
}

interface AutoFlagCondition {
  trigger_on: string | string[];
  flag_reason: string;
  /** FINTRAC harm-done classification minted on the findings row when this flag fires. */
  finding_type?: FindingType;
  /** Title used for the auto-created finding (defaults to flag_reason when absent). */
  finding_title?: string;
}

interface QuestionTemplate {
  id: string;
  submodule: string;
  question_number: number;
  question_text: string;
  response_type: string;
  response_options: string[] | null;
  evidence_required: boolean;
  auto_flag_condition: AutoFlagCondition | null;
  creates_change_event: string | null;
  guidance: string | null;
  sort_order: number;
}

interface Interview {
  id: string;
  engagement_id: string;
  interview_type: string;
  interviewee_name: string | null;
  interviewee_title: string | null;
  interview_date: string | null;
  interview_summary: string | null;
  overall_assessment: string | null;
  status: string;
}

interface Response {
  id: string;
  interview_id: string;
  question_id: string | null;
  submodule: string;
  question_number: number;
  question_text: string;
  response: string | null;
  response_details: string | null;
  evidence_required: boolean;
  evidence_provided: boolean;
  auto_flag: boolean;
  auto_flag_reason: string | null;
  analyst_commentary: string | null;
}

interface Interviewee {
  id: string;
  interview_id: string;
  name: string;
  title: string | null;
  role_context: string | null;
  sort_order: number;
}

interface InterviewerDraft {
  /** uuid if persisted, otherwise a local temp id prefixed with "new-". */
  id: string;
  name: string;
  title: string;
  role_context: string;
  sort_order: number;
}

function tempId() {
  return `new-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Mint / update / clear findings for every governance question whose response
 * trips its auto_flag_condition. Findings are keyed by submodule
 * `governance:{interview_id}:{question_id}` so they stay tied to the row that
 * created them and survive question edits.
 *
 * - Inserts when a response trips the trigger and no finding exists yet.
 * - Updates description / observation when one already exists.
 * - Deletes findings whose response no longer trips (analyst flipped the answer).
 *
 * Writes both `severity` (legacy) and `finding_type` (new) so either consumer
 * sees a consistent row.
 */
async function syncGovernanceFindings(
  engagementId: string,
  interviewId: string,
  submoduleLabel: string,
  questions: QuestionTemplate[],
  localResponses: Record<number, Partial<Response>>,
  serverResponses: Response[],
) {
  // Pull all governance findings already minted for this interview.
  const submodulePrefix = `governance:${interviewId}:`;
  const { data: existing } = await supabase
    .from('findings')
    .select('id, submodule')
    .eq('engagement_id', engagementId)
    .eq('module', 'governance')
    .like('submodule', `${submodulePrefix}%`);

  const existingMap = new Map((existing || []).map(f => [f.submodule, f.id]));
  const stillNeeded = new Set<string>();

  for (const q of questions) {
    const condition = q.auto_flag_condition;
    if (!condition) continue;

    const local = localResponses[q.question_number];
    const server = serverResponses.find(r => r.question_number === q.question_number);
    const responseValue = local?.response ?? server?.response ?? null;
    if (!responseValue) continue;

    const triggerValues = Array.isArray(condition.trigger_on)
      ? condition.trigger_on
      : [condition.trigger_on];
    if (!triggerValues.includes(responseValue)) continue;

    const submoduleKey = `${submodulePrefix}${q.id}`;
    stillNeeded.add(submoduleKey);

    const findingType: FindingType = condition.finding_type ?? 'partial_moderate';
    const title = condition.finding_title ?? condition.flag_reason ?? q.question_text;
    const commentary = local?.analyst_commentary ?? server?.analyst_commentary ?? null;
    const detail = local?.response_details ?? server?.response_details ?? null;
    const description = [
      `${q.question_text} — Response: "${responseValue}".`,
      condition.flag_reason ? `Auto-flag: ${condition.flag_reason}.` : null,
      detail ? `Interviewee detail: ${detail}` : null,
    ].filter(Boolean).join(' ');

    const payload = {
      engagement_id: engagementId,
      module: 'governance',
      submodule: submoduleKey,
      title,
      severity: findingTypeToSeverity(findingType),
      finding_type: findingType,
      status: 'open',
      description,
      observation: commentary,
      regulation_reference: 'PCMLTFA / PCMLTFR — Compliance Program (Part V)',
      nature_of_obligation: submoduleLabel,
      date_identified: new Date().toISOString().split('T')[0],
    } as any;

    if (existingMap.has(submoduleKey)) {
      await supabase.from('findings').update({
        title: payload.title,
        severity: payload.severity,
        finding_type: payload.finding_type,
        description: payload.description,
        observation: payload.observation,
      }).eq('id', existingMap.get(submoduleKey)!);
    } else {
      await supabase.from('findings').insert(payload);
    }
  }

  // Clear any previously-minted findings whose flag no longer fires.
  for (const [submoduleKey, id] of existingMap.entries()) {
    if (!stillNeeded.has(submoduleKey)) {
      await supabase.from('findings').delete().eq('id', id);
    }
  }
}

export function GovernanceInterviewForm({
  engagementId,
  submodule,
  title,
  description
}: GovernanceInterviewFormProps) {
  const queryClient = useQueryClient();
  const { user } = useApp();
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [localResponses, setLocalResponses] = useState<Record<number, Partial<Response>>>({});
  const [interviewData, setInterviewData] = useState({
    interview_date: '',
    interview_summary: '',
    overall_assessment: ''
  });
  const [interviewees, setInterviewees] = useState<InterviewerDraft[]>([]);
  const [removedIntervieweeIds, setRemovedIntervieweeIds] = useState<string[]>([]);

  // Fetch question templates
  const { data: questions = [] } = useQuery({
    queryKey: ['governance-questions', submodule],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governance_question_templates')
        .select('*')
        .eq('submodule', submodule)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        auto_flag_condition: item.auto_flag_condition as unknown as AutoFlagCondition | null,
        response_options: item.response_options as unknown as string[] | null
      })) as QuestionTemplate[];
    }
  });

  // Fetch or create interview
  const { data: interview, isLoading: interviewLoading } = useQuery({
    queryKey: ['governance-interview', engagementId, submodule],
    queryFn: async () => {
      // First try to find existing interview
      const { data: existing, error: fetchError } = await supabase
        .from('governance_interviews')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('interview_type', submodule)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (existing) return existing as Interview;

      // Create new interview if none exists
      const { data: newInterview, error: createError } = await supabase
        .from('governance_interviews')
        .insert({
          engagement_id: engagementId,
          interview_type: submodule,
          conducted_by: user?.id,
          status: 'draft'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      return newInterview as Interview;
    },
    enabled: !!engagementId && !!user
  });

  // Fetch responses
  const { data: responses = [] } = useQuery({
    queryKey: ['governance-responses', interview?.id],
    queryFn: async () => {
      if (!interview?.id) return [];
      
      const { data, error } = await supabase
        .from('governance_responses')
        .select('*')
        .eq('interview_id', interview.id)
        .order('question_number');
      
      if (error) throw error;
      return data as Response[];
    },
    enabled: !!interview?.id
  });

  // Fetch interviewees for this interview
  const { data: persistedInterviewees = [] } = useQuery({
    queryKey: ['governance-interviewees', interview?.id],
    queryFn: async () => {
      if (!interview?.id) return [];
      const { data, error } = await supabase
        .from('governance_interviewees')
        .select('*')
        .eq('interview_id', interview.id)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Interviewee[];
    },
    enabled: !!interview?.id,
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (interview) {
      setInterviewData({
        interview_date: interview.interview_date || '',
        interview_summary: interview.interview_summary || '',
        overall_assessment: interview.overall_assessment || ''
      });
    }
  }, [interview]);

  // Seed interviewees from persisted rows, falling back to the legacy single-
  // interviewee fields so existing data isn't lost on first open.
  useEffect(() => {
    if (persistedInterviewees.length > 0) {
      setInterviewees(persistedInterviewees.map((i, idx) => ({
        id: i.id,
        name: i.name,
        title: i.title ?? '',
        role_context: i.role_context ?? '',
        sort_order: i.sort_order ?? idx,
      })));
    } else if (interview?.interviewee_name) {
      setInterviewees([{
        id: tempId(),
        name: interview.interviewee_name,
        title: interview.interviewee_title ?? '',
        role_context: '',
        sort_order: 0,
      }]);
    } else {
      setInterviewees([]);
    }
    setRemovedIntervieweeIds([]);
  }, [persistedInterviewees, interview?.interviewee_name, interview?.interviewee_title]);

  useEffect(() => {
    if (responses.length > 0) {
      const responseMap: Record<number, Partial<Response>> = {};
      responses.forEach(r => {
        responseMap[r.question_number] = r;
      });
      setLocalResponses(responseMap);
    }
  }, [responses]);

  // Save mutations
  const saveInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!interview?.id) return;

      // Mirror the first interviewee into the legacy columns so older
      // consumers / reports keep working until they're migrated.
      const primary = interviewees.find(i => i.name.trim()) ?? null;

      const { error } = await supabase
        .from('governance_interviews')
        .update({
          interviewee_name: primary?.name || null,
          interviewee_title: primary?.title || null,
          interview_date: interviewData.interview_date || null,
          interview_summary: interviewData.interview_summary || null,
          overall_assessment: interviewData.overall_assessment || null
        })
        .eq('id', interview.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-interview'] });
    }
  });

  // Persist interviewee list (upsert new/edited + delete removed)
  const saveIntervieweesMutation = useMutation({
    mutationFn: async () => {
      if (!interview?.id) return;

      // Hard-delete any removed rows that were previously persisted
      const persistedRemovals = removedIntervieweeIds.filter(id => !id.startsWith('new-'));
      if (persistedRemovals.length > 0) {
        const { error } = await supabase
          .from('governance_interviewees')
          .delete()
          .in('id', persistedRemovals);
        if (error) throw error;
      }

      // Skip blank rows
      const rows = interviewees
        .map((i, idx) => ({ ...i, sort_order: idx }))
        .filter(i => i.name.trim().length > 0);

      // Update existing rows
      for (const row of rows.filter(r => !r.id.startsWith('new-'))) {
        const { error } = await supabase
          .from('governance_interviewees')
          .update({
            name: row.name,
            title: row.title || null,
            role_context: row.role_context || null,
            sort_order: row.sort_order,
          })
          .eq('id', row.id);
        if (error) throw error;
      }

      // Insert new rows
      const inserts = rows
        .filter(r => r.id.startsWith('new-'))
        .map(r => ({
          interview_id: interview.id,
          name: r.name,
          title: r.title || null,
          role_context: r.role_context || null,
          sort_order: r.sort_order,
        }));
      if (inserts.length > 0) {
        const { error } = await supabase.from('governance_interviewees').insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-interviewees', interview?.id] });
      setRemovedIntervieweeIds([]);
    },
  });

  const saveResponseMutation = useMutation({
    mutationFn: async ({ questionNumber, questionId, questionText, data }: { 
      questionNumber: number; 
      questionId: string;
      questionText: string;
      data: Partial<Response> 
    }) => {
      if (!interview?.id) return;

      // Check for auto-flag
      const question = questions.find(q => q.question_number === questionNumber);
      let autoFlag = false;
      let autoFlagReason = null;

      if (question?.auto_flag_condition && data.response) {
        const condition = question.auto_flag_condition;
        const triggerValues = Array.isArray(condition.trigger_on) 
          ? condition.trigger_on 
          : [condition.trigger_on];
        
        if (triggerValues.includes(data.response)) {
          autoFlag = true;
          autoFlagReason = condition.flag_reason;
        }
      }

      // Check if response exists
      const existing = responses.find(r => r.question_number === questionNumber);
      
      if (existing) {
        const { error } = await supabase
          .from('governance_responses')
          .update({
            response: data.response,
            response_details: data.response_details,
            analyst_commentary: data.analyst_commentary,
            auto_flag: autoFlag,
            auto_flag_reason: autoFlagReason
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('governance_responses')
          .insert({
            interview_id: interview.id,
            question_id: questionId,
            submodule,
            question_number: questionNumber,
            question_text: questionText,
            response: data.response,
            response_details: data.response_details,
            analyst_commentary: data.analyst_commentary,
            evidence_required: question?.evidence_required || false,
            auto_flag: autoFlag,
            auto_flag_reason: autoFlagReason
          });
        
        if (error) throw error;
      }

      // Create governance change if needed
      if (question?.creates_change_event && data.response === 'Yes') {
        const { data: existingChange } = await supabase
          .from('governance_changes')
          .select('id')
          .eq('engagement_id', engagementId)
          .eq('change_type', question.creates_change_event)
          .eq('source_interview_id', interview.id)
          .maybeSingle();

        if (!existingChange) {
          await supabase.from('governance_changes').insert({
            engagement_id: engagementId,
            source_interview_id: interview.id,
            change_type: question.creates_change_event,
            change_occurred: true
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-responses'] });
      queryClient.invalidateQueries({ queryKey: ['governance-changes'] });
    }
  });

  const addInterviewee = () => {
    setInterviewees(prev => [
      ...prev,
      { id: tempId(), name: '', title: '', role_context: '', sort_order: prev.length },
    ]);
  };

  const updateInterviewee = (id: string, field: 'name' | 'title' | 'role_context', value: string) => {
    setInterviewees(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeInterviewee = (id: string) => {
    setInterviewees(prev => prev.filter(i => i.id !== id));
    setRemovedIntervieweeIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const handleSaveAll = async () => {
    try {
      await saveInterviewMutation.mutateAsync();
      await saveIntervieweesMutation.mutateAsync();

      // Save all local responses
      for (const question of questions) {
        const localResponse = localResponses[question.question_number];
        if (localResponse?.response) {
          await saveResponseMutation.mutateAsync({
            questionNumber: question.question_number,
            questionId: question.id,
            questionText: question.question_text,
            data: localResponse
          });
        }
      }

      // Mint / update / clear findings based on auto-flagged responses
      if (interview?.id) {
        await syncGovernanceFindings(
          engagementId,
          interview.id,
          title,
          questions,
          localResponses,
          responses,
        );
        queryClient.invalidateQueries({ queryKey: ['findings', engagementId] });
      }

      toast.success('Interview saved & findings synced');
    } catch (error) {
      toast.error('Failed to save interview');
      console.error(error);
    }
  };

  const updateLocalResponse = (questionNumber: number, field: string, value: string) => {
    setLocalResponses(prev => ({
      ...prev,
      [questionNumber]: {
        ...prev[questionNumber],
        [field]: value
      }
    }));
  };

  const toggleQuestion = (questionNumber: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionNumber)) {
        next.delete(questionNumber);
      } else {
        next.add(questionNumber);
      }
      return next;
    });
  };

  const getResponseOptions = (responseType: string, options: string[] | null) => {
    switch (responseType) {
      case 'yes_no':
        return ['Yes', 'No'];
      case 'yes_no_partial':
        return ['Yes', 'No', 'Partially'];
      case 'yes_no_unknown':
        return ['Yes', 'No', 'Unknown'];
      case 'yes_no_na':
        return ['Yes', 'No', 'N/A'];
      case 'select':
        return options || [];
      default:
        return ['Yes', 'No'];
    }
  };

  const autoFlagCount = Object.values(localResponses).filter(r => {
    const question = questions.find(q => q.question_number === (responses.find(resp => resp.id === r.id)?.question_number || 0));
    if (!question?.auto_flag_condition || !r.response) return false;
    const triggerValues = Array.isArray(question.auto_flag_condition.trigger_on) 
      ? question.auto_flag_condition.trigger_on 
      : [question.auto_flag_condition.trigger_on];
    return triggerValues.includes(r.response);
  }).length + responses.filter(r => r.auto_flag).length;

  const completedCount = questions.filter(q => 
    localResponses[q.question_number]?.response || 
    responses.find(r => r.question_number === q.question_number)?.response
  ).length;

  if (interviewLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Interview Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {completedCount}/{questions.length}
              </Badge>
              {autoFlagCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <Flag className="h-3 w-3" />
                  {autoFlagCount} Flags
                </Badge>
              )}
              <Badge variant={interview?.status === 'draft' ? 'secondary' : 'default'}>
                {interview?.status || 'Draft'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label>Interview Date</Label>
            <Input
              type="date"
              value={interviewData.interview_date}
              onChange={(e) => setInterviewData(prev => ({ ...prev, interview_date: e.target.value }))}
            />
          </div>

          {/* Interviewees repeater — supports multiple people in the room */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <UsersIcon className="h-3.5 w-3.5" />
                Interviewees
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInterviewee}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Add interviewee
              </Button>
            </div>
            {interviewees.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Add at least one interviewee (e.g. a board member, the Compliance Officer, a frontline staffer).
              </p>
            ) : (
              <div className="space-y-2">
                {interviewees.map((i) => (
                  <div
                    key={i.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        value={i.name}
                        onChange={(e) => updateInterviewee(i.id, 'name', e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Title</Label>
                      <Input
                        value={i.title}
                        onChange={(e) => updateInterviewee(i.id, 'title', e.target.value)}
                        placeholder="e.g. Director, CO, Teller"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Role context</Label>
                      <Input
                        value={i.role_context}
                        onChange={(e) => updateInterviewee(i.id, 'role_context', e.target.value)}
                        placeholder="e.g. Audit Committee Chair, Branch 2"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInterviewee(i.id)}
                      className="text-destructive hover:text-destructive"
                      title="Remove interviewee"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interview Evidence (Teams transcript, recording, notes) */}
      {interview?.id && (
        <GovernanceInterviewEvidenceUpload
          engagementId={engagementId}
          interviewId={interview.id}
        />
      )}

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interview Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((question, index) => {
            const response = localResponses[question.question_number] || 
              responses.find(r => r.question_number === question.question_number);
            const isExpanded = expandedQuestions.has(question.question_number);
            
            // Check if this response triggers auto-flag
            let hasFlag = false;
            if (question.auto_flag_condition && response?.response) {
              const triggerValues = Array.isArray(question.auto_flag_condition.trigger_on) 
                ? question.auto_flag_condition.trigger_on 
                : [question.auto_flag_condition.trigger_on];
              hasFlag = triggerValues.includes(response.response);
            }

            return (
              <Collapsible
                key={question.id}
                open={isExpanded}
                onOpenChange={() => toggleQuestion(question.question_number)}
              >
                <div className={`border rounded-lg ${hasFlag ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50">
                      <span className="text-sm font-bold text-primary w-6">
                        {question.question_number}.
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-primary">{question.question_text}</p>
                        {question.evidence_required && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Evidence Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasFlag && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {question.auto_flag_condition?.flag_reason}
                          </Badge>
                        )}
                        {response?.response && (
                          <Badge variant="secondary" className="text-xs">
                            {response.response}
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t">
                      <div className="pt-4">
                        <Label className="text-sm font-semibold text-primary">Response</Label>
                        <RadioGroup
                          value={response?.response || ''}
                          onValueChange={(value) => updateLocalResponse(question.question_number, 'response', value)}
                          className="flex flex-wrap gap-4 mt-2"
                        >
                          {getResponseOptions(question.response_type, question.response_options as string[] | null).map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                              <Label htmlFor={`${question.id}-${option}`} className="text-sm font-normal">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-primary">Response Details / Notes</Label>
                        <Textarea
                          value={response?.response_details || ''}
                          onChange={(e) => updateLocalResponse(question.question_number, 'response_details', e.target.value)}
                          placeholder="Add supporting details or observations..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>

                      {hasFlag && (
                        <div>
                          <Label className="text-sm font-semibold text-destructive">Analyst Commentary (Required for Flags)</Label>
                          <Textarea
                            value={response?.analyst_commentary || ''}
                            onChange={(e) => updateLocalResponse(question.question_number, 'analyst_commentary', e.target.value)}
                            placeholder="Explain the flag and any mitigating factors..."
                            className="mt-1 border-destructive/50"
                            rows={2}
                          />
                        </div>
                      )}

                      {question.creates_change_event && response?.response === 'Yes' && (
                        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded text-sm">
                          <RefreshCw className="h-4 w-4 text-primary" />
                          <span>This response will create a Governance Change event ({question.creates_change_event})</span>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Interview Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interview Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Summary Notes</Label>
            <Textarea
              value={interviewData.interview_summary}
              onChange={(e) => setInterviewData(prev => ({ ...prev, interview_summary: e.target.value }))}
              placeholder="Summarize key findings from this interview..."
              rows={4}
            />
          </div>
          <div>
            <Label>Overall Assessment</Label>
            <Select
              value={interviewData.overall_assessment}
              onValueChange={(value) => setInterviewData(prev => ({ ...prev, overall_assessment: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assessment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Effective">Effective</SelectItem>
                <SelectItem value="Partially Effective">Partially Effective</SelectItem>
                <SelectItem value="Ineffective">Ineffective</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveAll} disabled={saveInterviewMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save Interview
        </Button>
      </div>
    </div>
  );
}
