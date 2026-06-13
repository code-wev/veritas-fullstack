import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, AlertTriangle, Info, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoreControlsStepProps {
  ppReviewId: string;
  onFlagsChange: () => void;
}

interface AutoFlagCondition {
  trigger_on?: string;
  flag_reason?: string;
}

interface ControlQuestion {
  id: string;
  question_number: number;
  question_text: string;
  regulatory_reference: string | null;
  evidence_required: boolean;
  auto_flag_condition: AutoFlagCondition | null;
  control_category: string;
  regulatory_category: string | null;
  test_procedure: string | null;
  analyst_guidance: string | null;
  pass_criteria: string | null;
  max_points: number | null;
  section_code: string | null;
  section_name: string | null;
  question_code: string | null;
  is_new_or_updated: boolean | null;
}

interface ControlResponse {
  question_number: number;
  response: string | null;
  notes: string | null;
  doc_reference: string | null;
  deficiency_flag: boolean;
  auto_flag_reason: string | null;
  severity_suggested: string | null;
  risk_rating: string | null;
  points_achieved: number;
  observation_best_practice: string | null;
  evidence_reviewed: string | null;
}

const RESPONSE_OPTIONS = [
  { value: 'yes', label: 'Yes', points: 2 },
  { value: 'partially', label: 'Partially', points: 1 },
  { value: 'no', label: 'No', points: 0 },
  { value: 'na', label: 'N/A', points: 0 },
];

const RISK_RATINGS = ['Low', 'Medium', 'High', 'Critical'];

function emptyResponse(questionNum: number): ControlResponse {
  return {
    question_number: questionNum,
    response: null,
    notes: null,
    doc_reference: null,
    deficiency_flag: false,
    auto_flag_reason: null,
    severity_suggested: null,
    risk_rating: null,
    points_achieved: 0,
    observation_best_practice: null,
    evidence_reviewed: null,
  };
}

function responseColor(value: string | null): string {
  switch (value) {
    case 'yes':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'partially':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'no':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'na':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return '';
  }
}

export function CoreControlsStep({ ppReviewId, onFlagsChange }: CoreControlsStepProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<ControlQuestion[]>([]);
  const [responses, setResponses] = useState<Map<number, ControlResponse>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    loadQuestionsAndResponses();
  }, [ppReviewId]);

  const loadQuestionsAndResponses = async () => {
    setLoading(true);
    try {
      const { data: questionsData, error: qError } = await supabase
        .from('aml_program_question_templates')
        .select('*')
        .eq('submodule', 'policies_procedures')
        .eq('control_area', 'core_controls')
        .eq('is_active', true)
        .order('sort_order');

      if (qError) throw qError;
      setQuestions(questionsData as unknown as ControlQuestion[]);

      const { data: responsesData, error: rError } = await supabase
        .from('aml_pp_control_results')
        .select('*')
        .eq('pp_review_id', ppReviewId)
        .eq('control_area', 'core_controls');

      if (rError) throw rError;

      const responseMap = new Map<number, ControlResponse>();
      responsesData?.forEach((r: any) => {
        responseMap.set(r.question_number, {
          question_number: r.question_number,
          response: r.response,
          notes: r.notes,
          doc_reference: r.doc_reference,
          deficiency_flag: r.deficiency_flag,
          auto_flag_reason: r.auto_flag_reason,
          severity_suggested: r.severity_suggested,
          risk_rating: r.risk_rating,
          points_achieved: r.points_achieved ?? 0,
          observation_best_practice: r.observation_best_practice,
          evidence_reviewed: r.evidence_reviewed,
        });
      });
      setResponses(responseMap);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load control questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (
    questionNum: number,
    updates: Partial<ControlResponse>
  ) => {
    const current = responses.get(questionNum) || emptyResponse(questionNum);
    const next: ControlResponse = { ...current, ...updates };

    // Auto-calculate points and deficiency from response
    if (updates.response !== undefined) {
      const opt = RESPONSE_OPTIONS.find(o => o.value === updates.response);
      next.points_achieved = opt?.points ?? 0;
      next.deficiency_flag = updates.response === 'no' || updates.response === 'partially';

      const question = questions.find(q => q.question_number === questionNum);
      if (next.deficiency_flag && question) {
        next.auto_flag_reason = `${question.question_code || ''} – ${question.question_text} marked as ${opt?.label}`;
        next.severity_suggested = updates.response === 'no' ? 'high' : 'medium';
      } else {
        next.auto_flag_reason = null;
        next.severity_suggested = null;
      }
    }

    setResponses(new Map(responses.set(questionNum, next)));
  };

  const saveResponses = async () => {
    setSaving(true);
    try {
      const upserts = Array.from(responses.entries()).map(([questionNum, response]) => {
        const question = questions.find(q => q.question_number === questionNum);
        return {
          pp_review_id: ppReviewId,
          control_area: 'core_controls',
          control_category: question?.control_category || 'unknown',
          question_number: questionNum,
          question_text: question?.question_text || '',
          response: response.response,
          notes: response.notes,
          doc_reference: response.doc_reference,
          deficiency_flag: response.deficiency_flag,
          auto_flag_reason: response.auto_flag_reason,
          severity_suggested: response.severity_suggested,
          risk_rating: response.risk_rating,
          points_achieved: response.points_achieved,
          observation_best_practice: response.observation_best_practice,
          evidence_reviewed: response.evidence_reviewed,
        };
      });

      if (upserts.length === 0) {
        toast({ title: 'Nothing to save', description: 'No responses entered yet.' });
        return;
      }

      const { error } = await supabase
        .from('aml_pp_control_results')
        .upsert(upserts, {
          onConflict: 'pp_review_id,control_area,question_number',
        });

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Working paper responses saved successfully',
      });

      onFlagsChange();
    } catch (error) {
      console.error('Error saving responses:', error);
      toast({
        title: 'Error',
        description: 'Failed to save responses',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Group questions by section
  const sections = useMemo(() => {
    const map = new Map<string, { code: string; name: string; questions: ControlQuestion[] }>();
    for (const q of questions) {
      const key = `${q.section_code ?? '?'}|${q.section_name ?? 'Other'}`;
      if (!map.has(key)) {
        map.set(key, { code: q.section_code ?? '?', name: q.section_name ?? 'Other', questions: [] });
      }
      map.get(key)!.questions.push(q);
    }
    return Array.from(map.values()).sort((a, b) => Number(a.code) - Number(b.code));
  }, [questions]);

  const stats = useMemo(() => {
    const total = questions.length;
    const answered = Array.from(responses.values()).filter(r => r.response).length;
    const flags = Array.from(responses.values()).filter(r => r.deficiency_flag).length;
    const pointsAchieved = Array.from(responses.values()).reduce((s, r) => s + (r.points_achieved || 0), 0);
    const maxPoints = questions
      .filter(q => {
        const r = responses.get(q.question_number);
        return r?.response && r.response !== 'na';
      })
      .reduce((s, q) => s + (q.max_points ?? 2), 0);
    return { total, answered, flags, pointsAchieved, maxPoints };
  }, [questions, responses]);

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
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Step 2: AML Policy & Procedures Working Paper
              </CardTitle>
              <CardDescription>
                Mirrors the firm's manual working paper. Use Yes / No / Partially / N/A for each control.
                Comments capture deficiencies; Observation captures best-practice opportunities.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{stats.answered}/{stats.total} Answered</Badge>
              <Badge variant="outline">
                Score: {stats.pointsAchieved}/{stats.maxPoints || 0}
              </Badge>
              {stats.flags > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {stats.flags} Flag{stats.flags !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            defaultValue={sections.length > 0 ? [`section-${sections[0].code}`] : []}
            className="space-y-3"
          >
            {sections.map((section) => {
              const sectionFlags = section.questions.filter(
                q => responses.get(q.question_number)?.deficiency_flag
              ).length;
              const sectionAnswered = section.questions.filter(
                q => responses.get(q.question_number)?.response
              ).length;

              return (
                <AccordionItem
                  key={section.code}
                  value={`section-${section.code}`}
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <span className="font-semibold text-left">
                        {section.code}. {section.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {sectionAnswered}/{section.questions.length}
                        </Badge>
                        {sectionFlags > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {sectionFlags} flag{sectionFlags !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2 pb-4">
                    {section.questions.map((question) => {
                      const response = responses.get(question.question_number) || emptyResponse(question.question_number);
                      const hasFlag = response.deficiency_flag;
                      const isBestPractice = question.regulatory_category === 'Best Practice';
                      const isNew = question.is_new_or_updated;

                      return (
                        <div
                          key={question.question_number}
                          className={cn(
                            'rounded-lg border p-4 space-y-3 transition-colors',
                            hasFlag && 'border-destructive/40 bg-destructive/5',
                            !hasFlag && isBestPractice && 'border-amber-500/30 bg-amber-500/5',
                            !hasFlag && isNew && !isBestPractice && 'border-primary/30 bg-primary/5',
                            !hasFlag && !isBestPractice && !isNew && 'border-border'
                          )}
                        >
                          {/* Header row */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {question.question_code}
                                </code>
                                <span className="font-medium">{question.question_text}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                {question.regulatory_category && (
                                  <Badge
                                    variant={isBestPractice ? 'secondary' : 'outline'}
                                    className="text-[10px] uppercase tracking-wide"
                                  >
                                    {question.regulatory_category}
                                  </Badge>
                                )}
                                {isNew && (
                                  <Badge className="text-[10px] uppercase bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                                    New / Updated
                                  </Badge>
                                )}
                                {question.regulatory_reference && (
                                  <span className="text-muted-foreground inline-flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    {question.regulatory_reference}
                                  </span>
                                )}
                                {question.evidence_required && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Evidence Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Test procedure & guidance */}
                          {(question.test_procedure || question.analyst_guidance || question.pass_criteria) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-muted/40 rounded-md p-3">
                              {question.test_procedure && (
                                <div>
                                  <p className="font-semibold text-foreground mb-1">Test Procedure</p>
                                  <p className="text-muted-foreground">{question.test_procedure}</p>
                                </div>
                              )}
                              {question.analyst_guidance && (
                                <div>
                                  <p className="font-semibold text-foreground mb-1">Analyst Guidance</p>
                                  <p className="text-muted-foreground">{question.analyst_guidance}</p>
                                </div>
                              )}
                              {question.pass_criteria && (
                                <div>
                                  <p className="font-semibold text-foreground mb-1">Pass Criteria</p>
                                  <p className="text-muted-foreground">{question.pass_criteria}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Result + Risk Rating + Points */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Result</Label>
                              <Select
                                value={response.response || ''}
                                onValueChange={(v) => updateResponse(question.question_number, { response: v })}
                              >
                                <SelectTrigger className={cn('h-9', responseColor(response.response))}>
                                  <SelectValue placeholder="Select result..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {RESPONSE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Risk Rating</Label>
                              <Select
                                value={response.risk_rating || ''}
                                onValueChange={(v) => updateResponse(question.question_number, { risk_rating: v })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select rating..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {RISK_RATINGS.map(r => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Points</Label>
                              <div className="h-9 px-3 rounded-md border bg-muted/40 flex items-center text-sm">
                                <span className="font-semibold">{response.points_achieved}</span>
                                <span className="text-muted-foreground mx-1">/</span>
                                <span>{question.max_points ?? 2}</span>
                              </div>
                            </div>
                          </div>

                          {hasFlag && response.auto_flag_reason && (
                            <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{response.auto_flag_reason}</span>
                            </div>
                          )}

                          {/* Comments + Observation */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">
                                Comments / Deficiency Notes
                              </Label>
                              <Textarea
                                placeholder="Factual notes or deficiencies identified…"
                                value={response.notes || ''}
                                onChange={(e) =>
                                  updateResponse(question.question_number, { notes: e.target.value })
                                }
                                rows={2}
                                className="resize-none text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">
                                Observation / Best Practice
                              </Label>
                              <Textarea
                                placeholder="Improvement opportunities (not deficiencies)…"
                                value={response.observation_best_practice || ''}
                                onChange={(e) =>
                                  updateResponse(question.question_number, {
                                    observation_best_practice: e.target.value,
                                  })
                                }
                                rows={2}
                                className="resize-none text-sm"
                              />
                            </div>
                          </div>

                          {/* Evidence + Doc reference */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Document Reference</Label>
                              <Input
                                placeholder="e.g., Section 3.2, Page 15"
                                value={response.doc_reference || ''}
                                onChange={(e) =>
                                  updateResponse(question.question_number, { doc_reference: e.target.value })
                                }
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Evidence Reviewed</Label>
                              <Input
                                placeholder="Evidence files or sources reviewed"
                                value={response.evidence_reviewed || ''}
                                onChange={(e) =>
                                  updateResponse(question.question_number, { evidence_reviewed: e.target.value })
                                }
                                className="h-9"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <div className="flex justify-end mt-6">
            <Button onClick={saveResponses} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Working Paper'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
