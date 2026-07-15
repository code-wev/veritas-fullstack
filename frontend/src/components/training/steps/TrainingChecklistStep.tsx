import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Template {
  id: string;
  section_code: string;
  section_name: string;
  control_area: string;
  control_objective: string;
  test_procedure: string | null;
  expected_outcome: string | null;
  max_points: number;
  sort_order: number;
}

interface ControlResult {
  id: string;
  template_id: string | null;
  section_code: string;
  section_name: string;
  control_area: string;
  control_objective: string;
  test_procedure: string | null;
  expected_outcome: string | null;
  response: string | null;
  points_achieved: number | null;
  max_points: number;
  comments: string | null;
  observation_best_practice: string | null;
  evidence_reviewed: string | null;
  deficiency_flag: boolean | null;
  sort_order: number;
}

const RESPONSE_OPTIONS = [
  { value: 'pass', label: 'Pass', points: 2 },
  { value: 'partial', label: 'Partial', points: 1 },
  { value: 'fail', label: 'Fail', points: 0 },
  { value: 'na', label: 'N/A', points: 0 },
];

export function TrainingChecklistStep({ reviewId }: { reviewId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ControlResult[]>([]);

  useEffect(() => {
    void loadOrSeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const loadOrSeed = async () => {
    setLoading(true);
    try {
      const { data: existing, error: existingErr } = await supabase
        .from('training_control_results')
        .select('*')
        .eq('review_id', reviewId)
        .order('sort_order');
      if (existingErr) throw existingErr;

      if (existing && existing.length > 0) {
        setResults(existing as ControlResult[]);
      } else {
        const { data: templates, error: tplErr } = await supabase
          .from('training_question_templates')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (tplErr) throw tplErr;
        const rows = (templates as Template[]).map((t) => ({
          review_id: reviewId,
          template_id: t.id,
          section_code: t.section_code,
          section_name: t.section_name,
          control_area: t.control_area,
          control_objective: t.control_objective,
          test_procedure: t.test_procedure,
          expected_outcome: t.expected_outcome,
          max_points: t.max_points,
          sort_order: t.sort_order,
        }));
        const { data: inserted, error: insErr } = await supabase
          .from('training_control_results')
          .insert(rows)
          .select();
        if (insErr) throw insErr;
        setResults((inserted ?? []) as ControlResult[]);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load checklist', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateResult = async (id: string, updates: Partial<ControlResult>) => {
    const next: Partial<ControlResult> = { ...updates };
    if (updates.response !== undefined) {
      const opt = RESPONSE_OPTIONS.find((o) => o.value === updates.response);
      next.points_achieved = opt?.points ?? 0;
      next.deficiency_flag = updates.response === 'fail' || updates.response === 'partial';
    }
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
    const { error } = await supabase
      .from('training_control_results')
      .update(next)
      .eq('id', id);
    if (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    }
  };

  const grouped = results.reduce<Record<string, { name: string; items: ControlResult[] }>>((acc, r) => {
    if (!acc[r.section_code]) acc[r.section_code] = { name: r.section_name, items: [] };
    acc[r.section_code].items.push(r);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const totalAnswered = results.filter((r) => r.response).length;
  const totalDeficiencies = results.filter((r) => r.deficiency_flag).length;
  const totalPoints = results.reduce((sum, r) => sum + (r.points_achieved ?? 0), 0);
  const maxPoints = results.reduce((sum, r) => sum + r.max_points, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Answered</div><div className="text-2xl font-bold">{totalAnswered}/{results.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Deficiencies</div><div className="text-2xl font-bold text-destructive">{totalDeficiencies}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Score</div><div className="text-2xl font-bold">{totalPoints}/{maxPoints}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sections</div><div className="text-2xl font-bold">{Object.keys(grouped).length}</div></CardContent></Card>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {Object.entries(grouped).map(([code, group]) => {
          const sectionDeficiencies = group.items.filter((i) => i.deficiency_flag).length;
          const sectionAnswered = group.items.filter((i) => i.response).length;
          return (
            <AccordionItem key={code} value={code} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                     <Badge variant="outline" className="font-mono">{code}</Badge>
                    <span className="font-semibold text-primary">{group.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{sectionAnswered}/{group.items.length} answered</span>
                    {sectionDeficiencies > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {sectionDeficiencies}
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {group.items.map((item) => (
                    <Card key={item.id} className={item.deficiency_flag ? 'border-destructive/50' : ''}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-sm text-primary">{item.control_area}</div>
                            <div className="text-sm text-primary/80 mt-1">{item.control_objective}</div>
                          </div>
                          {item.response && (
                            item.deficiency_flag ? (
                              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            )
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 text-xs bg-muted/40 rounded-md p-3">
                          {item.test_procedure && (
                            <div><span className="font-semibold">Test Procedure:</span> {item.test_procedure}</div>
                          )}
                          {item.expected_outcome && (
                            <div><span className="font-semibold">Expected (FINTRAC):</span> {item.expected_outcome}</div>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-primary">Result</Label>
                            <Select value={item.response ?? ''} onValueChange={(v) => updateResult(item.id, { response: v })}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {RESPONSE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-primary">Points</Label>
                            <div className="h-10 flex items-center px-3 border rounded-md bg-muted/50 text-sm font-mono">
                              {item.points_achieved ?? 0} / {item.max_points}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-primary">Document Reference</Label>
                          <Input
                            placeholder="e.g. Training Policy v1.3, Section 4.2..."
                            value={item.evidence_reviewed ?? ''}
                            onChange={(e) => updateResult(item.id, { evidence_reviewed: e.target.value })}
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-primary">Comments / Deficiency Notes</Label>
                            <Textarea
                              rows={2}
                              placeholder="Factual notes about deficiencies..."
                              value={item.comments ?? ''}
                              onChange={(e) => updateResult(item.id, { comments: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-primary">Observation / Best Practice</Label>
                            <Textarea
                              rows={2}
                              placeholder="Improvement opportunities (not deficiencies)..."
                              value={item.observation_best_practice ?? ''}
                              onChange={(e) => updateResult(item.id, { observation_best_practice: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
