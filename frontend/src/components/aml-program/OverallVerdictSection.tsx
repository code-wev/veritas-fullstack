import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Gavel, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  FINDING_TYPE_META,
  FINDING_TYPES,
  highestFindingType,
  getFindingTypeMeta,
  type FindingType,
} from '@/lib/findingClassification';
import {
  syncWorkingPaperFindings,
  type Question,
  type ResponseRow,
} from './WorkingPaperSection';

interface ClientContext {
  entityType: string | null;
  msbActivities: string[];
  isMsb: boolean;
  isFi: boolean;
}

interface OverallVerdictSectionProps {
  ppReviewId: string;
  ppReview: {
    id: string;
    summary_narrative: string | null;
    overall_design_rating: string | null;
    overall_finding_type?: string | null;
    overall_finding_type_overridden?: boolean | null;
  };
  engagementId: string;
  clientContext?: ClientContext;
  onUpdate: (updates: Record<string, any>) => Promise<void>;
}

export function OverallVerdictSection({
  ppReviewId,
  ppReview,
  engagementId,
  clientContext,
  onUpdate,
}: OverallVerdictSectionProps) {
  const queryClient = useQueryClient();
  const [narrative, setNarrative] = useState(ppReview.summary_narrative ?? '');
  const [overrideEnabled, setOverrideEnabled] = useState(!!ppReview.overall_finding_type_overridden);
  const [overrideType, setOverrideType] = useState<FindingType>(
    (ppReview.overall_finding_type as FindingType) ?? 'partial_moderate'
  );

  useEffect(() => {
    setNarrative(ppReview.summary_narrative ?? '');
    setOverrideEnabled(!!ppReview.overall_finding_type_overridden);
    if (ppReview.overall_finding_type) {
      setOverrideType(ppReview.overall_finding_type as FindingType);
    }
  }, [ppReview.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active P&P questions — used for incomplete-section detection AND for the
  // findings sync that fires on verdict save. Filtered to applicable rows
  // (so MSB-Registration / Correspondent-Banking don't get flagged when the
  // client isn't an MSB / FI).
  const { data: questions = [] } = useQuery({
    queryKey: ['aml-pp-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aml_program_question_templates')
        .select('*')
        .eq('submodule', 'policies_procedures')
        .eq('control_area', 'core_controls')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as Question[];
    },
  });

  const applicableQuestions = useMemo(() => {
    const isMsb = !!clientContext?.isMsb;
    const isFi = !!clientContext?.isFi;
    return questions.filter((q: any) => {
      if (q.applicability === 'msb_required') return isMsb;
      if (q.applicability === 'fi_only') return isFi && !isMsb;
      return true;
    });
  }, [questions, clientContext?.isMsb, clientContext?.isFi]);

  const { data: serverRows = [] } = useQuery({
    queryKey: ['aml-pp-results', ppReviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aml_pp_control_results')
        .select('*')
        .eq('pp_review_id', ppReviewId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!ppReviewId,
  });

  // Per-section completion: a question counts as complete when ANY response
  // is set (including N/A); incomplete when no response is recorded.
  const incompleteSections = useMemo(() => {
    const responseByQn = new Map<number, string | null>();
    for (const r of serverRows) {
      responseByQn.set(r.question_number, r.response ?? null);
    }
    const bySection = new Map<string, { code: string; name: string; incomplete: number; total: number }>();
    for (const q of applicableQuestions) {
      const code = q.section_code ?? '?';
      const entry = bySection.get(code) ?? { code, name: q.section_name ?? '—', incomplete: 0, total: 0 };
      entry.total += 1;
      const response = responseByQn.get(q.question_number);
      if (!response) entry.incomplete += 1;
      bySection.set(code, entry);
    }
    return Array.from(bySection.values())
      .filter((s) => s.incomplete > 0)
      .sort((a, b) => Number(a.code) - Number(b.code));
  }, [applicableQuestions, serverRows]);

  // Derive verdict from saved rows.
  const derivedVerdict = useMemo(() => {
    const rows = serverRows as Array<{ finding_type: FindingType | null; response: string | null }>;
    const deficiencies = rows
      .map((r) => r.finding_type)
      .filter((t): t is FindingType => !!t && t !== 'observation');
    const observationsOnly = rows.some((r) => r.finding_type === 'observation');
    const completed = rows.filter((r) => !!r.response).length;
    const failing = rows.filter((r) => r.response === 'no' || r.response === 'partially').length;
    const recommended: FindingType | null =
      deficiencies.length > 0
        ? highestFindingType(deficiencies)
        : observationsOnly
          ? 'observation'
          : null;
    return { recommended, completed, failing, totalRows: applicableQuestions.length };
  }, [serverRows, applicableQuestions.length]);

  const recommended = derivedVerdict.recommended;
  const recommendedMeta = recommended ? getFindingTypeMeta(recommended) : null;
  const effective: FindingType | null = overrideEnabled ? overrideType : recommended;
  const effectiveMeta = effective ? getFindingTypeMeta(effective) : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Persist the verdict on the parent review row.
      await onUpdate({
        summary_narrative: narrative || null,
        overall_finding_type: effective,
        overall_finding_type_overridden: overrideEnabled,
        overall_design_rating: effectiveMeta?.label ?? null,
      });

      // 2. Mint / update / clear findings from the saved working-paper rows
      //    so the Findings module reflects this review in one action.
      const rowsByQn = new Map<number, Partial<ResponseRow>>();
      for (const r of serverRows) {
        rowsByQn.set(r.question_number, {
          id: r.id,
          question_id: r.question_id,
          question_number: r.question_number,
          question_text: r.question_text,
          response: r.response ?? null,
          notes: r.notes ?? null,
          doc_reference: r.doc_reference ?? null,
          finding_type: (r.finding_type as FindingType | null) ?? null,
          observation_best_practice: r.observation_best_practice ?? null,
          evidence_reviewed: r.evidence_reviewed ?? null,
          deficiency_explanation: r.deficiency_explanation ?? null,
          reviewer_recommendation: r.reviewer_recommendation ?? null,
          remediation_notes: r.remediation_notes ?? null,
        });
      }
      await syncWorkingPaperFindings(engagementId, ppReviewId, applicableQuestions, rowsByQn);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aml-pp-results', ppReviewId] });
      queryClient.invalidateQueries({ queryKey: ['findings', engagementId] });
      toast.success('Verdict saved & findings pushed to the Findings module');
    },
    onError: (e: any) => {
      toast.error(`Save failed: ${e?.message ?? 'unknown error'}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Overall P&P Verdict</CardTitle>
            <CardDescription>
              Auto-derived from the highest Deficiency Severity classification across the working paper. Override if your judgement differs. Saving the verdict also pushes findings to the Findings module.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Incomplete sections — flagged any time a section has questions
            without a response (N/A counts as complete). */}
        {incompleteSections.length > 0 && (
          <div className="rounded-md border border-amber-400/50 bg-amber-50 p-3 dark:bg-amber-950/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  {incompleteSections.length} section{incompleteSections.length === 1 ? '' : 's'} not yet complete
                </p>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                  Each listed section has questions without a recorded response. N/A counts as complete — mark the rest before finalising the verdict.
                </p>
                <ul className="space-y-1 mt-2">
                  {incompleteSections.map((s) => (
                    <li key={s.code} className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                      <Badge variant="outline" className="border-amber-500/40 text-amber-800 dark:text-amber-200 text-[10px] font-mono">
                        {s.code}
                      </Badge>
                      <span className="flex-1">{s.name}</span>
                      <span className="font-medium">{s.incomplete} / {s.total} unanswered</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Stat label="Controls answered" value={`${derivedVerdict.completed} / ${derivedVerdict.totalRows}`} />
          <Stat label="Deficiencies / observations" value={`${derivedVerdict.failing}`} tone={derivedVerdict.failing ? 'warn' : 'ok'} />
          <Stat
            label="Recommended verdict"
            value={recommendedMeta ? recommendedMeta.shortLabel : 'Pass'}
            tone={recommendedMeta?.isDeficiency ? 'warn' : 'ok'}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm">Override the recommended verdict</Label>
            <p className="text-xs text-muted-foreground">
              Use the analyst's judgement instead of the highest-severity rule.
            </p>
          </div>
          <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} />
        </div>

        {overrideEnabled && (
          <div className="space-y-1.5">
            <Label className="text-sm">Override verdict</Label>
            <Select value={overrideType} onValueChange={(v) => setOverrideType(v as FindingType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINDING_TYPES.map((m) => (
                  <SelectItem key={m.type} value={m.type}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {effectiveMeta && (
          <div className={`rounded-md border p-3 ${effectiveMeta.badge}`}>
            <div className="text-xs uppercase tracking-wide opacity-70">Effective verdict</div>
            <div className="text-sm font-semibold mt-0.5">{effectiveMeta.label}</div>
            <p className="text-xs mt-1">{effectiveMeta.description}</p>
          </div>
        )}

        <div>
          <Label className="text-sm">Summary narrative</Label>
          <Textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Auditor's overall conclusion on the P&P design adequacy, themes, and key remediation priorities…"
            rows={5}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save verdict &amp; push findings</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'ok' | 'warn' | 'neutral' }) {
  return (
    <div className="rounded-md border p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          'text-base font-semibold mt-1 ' +
          (tone === 'warn'
            ? 'text-amber-700'
            : tone === 'ok'
              ? 'text-emerald-700'
              : 'text-foreground')
        }
      >
        {value}
      </div>
    </div>
  );
}
