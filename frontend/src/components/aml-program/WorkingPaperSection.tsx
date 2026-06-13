import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Save,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Loader2,
  Filter,
  Ban,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  FINDING_TYPE_META,
  findingTypeToSeverity,
  type FindingType,
} from '@/lib/findingClassification';

interface WorkingPaperSectionProps {
  ppReviewId: string;
  engagementId: string;
  clientContext?: {
    entityType: string | null;
    msbActivities: string[];
    isMsb: boolean;
    isFi: boolean;
  };
}

export interface Question {
  id: string;
  question_number: number;
  question_code: string | null;
  question_text: string;
  regulatory_reference: string | null;
  analyst_guidance: string | null;
  pass_criteria: string | null;
  /** Concise operational statement of how the entity executes the policy. */
  procedure_statement: string | null;
  section_code: string | null;
  section_name: string | null;
  subsection: string | null;
  is_new_or_updated: boolean | null;
  sort_order: number;
  /** Firm-set Deficiency Severity classification suggestion used to auto-fill when
   *  the analyst marks the control "No" / "Partial". Analyst can override. */
  suggested_finding_type: FindingType | null;
  /**
   * Section applicability gate.
   *   'msb_required' — hidden unless the client has MSB activities or
   *                    an MSB-related entity type.
   *   'fi_only'      — hidden unless the client is a financial entity.
   *   null           — always shown.
   */
  applicability: string | null;
}

type ResponseValue = 'yes' | 'partially' | 'no' | 'na';

export interface ResponseRow {
  id?: string;
  question_id?: string;
  question_number: number;
  question_text?: string;
  response: ResponseValue | null;
  notes: string | null;
  doc_reference: string | null;
  finding_type: FindingType | null;
  observation_best_practice: string | null;
  evidence_reviewed: string | null;
  /** New workpaper-style fields (right panel). */
  deficiency_explanation: string | null;
  reviewer_recommendation: string | null;
  remediation_notes: string | null;
}

type StatusFilter = 'all' | 'incomplete' | 'pass' | 'findings';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pass', label: 'Pass / N/A' },
  { value: 'findings', label: 'Findings' },
];

const RESPONSE_OPTIONS: { value: ResponseValue; label: string }[] = [
  { value: 'yes',       label: 'Yes' },
  { value: 'partially', label: 'Partially' },
  { value: 'no',        label: 'No' },
  { value: 'na',        label: 'N/A' },
];

function statusFor(r?: Partial<ResponseRow>): 'incomplete' | 'pass' | 'finding' | 'observation' {
  if (!r?.response) return 'incomplete';
  if (r.response === 'yes' || r.response === 'na') {
    return r.finding_type === 'observation' ? 'observation' : 'pass';
  }
  return 'finding';
}

function StatusChip({ status }: { status: ReturnType<typeof statusFor> }) {
  switch (status) {
    case 'incomplete':
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <CircleDot className="h-3 w-3" /> Incomplete
        </Badge>
      );
    case 'pass':
      return (
        <Badge variant="outline" className="text-xs gap-1 border-emerald-500/40 text-emerald-700 bg-emerald-500/10">
          <CheckCircle2 className="h-3 w-3" /> Pass
        </Badge>
      );
    case 'observation':
      return (
        <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary bg-primary/5">
          Observation
        </Badge>
      );
    case 'finding':
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertTriangle className="h-3 w-3" /> Finding
        </Badge>
      );
  }
}

/**
 * Mint / update / clear findings keyed by aml-pp:{pp_review_id}:{question_id}.
 *
 * Only rows whose response is no/partially AND whose finding_type is a deficiency
 * (complete_nc / partial_*) get pushed. Observations (finding_type='observation')
 * are also pushed so they appear in the firm-wide findings ledger.
 *
 * Rows whose finding_type is null OR whose response is yes/na with no observation
 * have their finding (if any) cleared.
 */
export async function syncWorkingPaperFindings(
  engagementId: string,
  ppReviewId: string,
  questions: Question[],
  rowsByQuestionNumber: Map<number, Partial<ResponseRow>>,
) {
  const submodulePrefix = `aml-pp:${ppReviewId}:`;
  const { data: existing } = await supabase
    .from('findings')
    .select('id, submodule')
    .eq('engagement_id', engagementId)
    .eq('module', 'aml_program')
    .like('submodule', `${submodulePrefix}%`);

  const existingMap = new Map((existing || []).map((f) => [f.submodule, f.id]));
  const stillNeeded = new Set<string>();

  for (const q of questions) {
    const r = rowsByQuestionNumber.get(q.question_number);
    if (!r) continue;
    const findingType = r.finding_type as FindingType | null | undefined;
    if (!findingType) continue;

    const submoduleKey = `${submodulePrefix}${q.id}`;
    stillNeeded.add(submoduleKey);

    const isDeficiency = findingType !== 'observation';
    const title = `${q.question_code ?? `Q${q.question_number}`} — ${q.question_text}`;
    const responseLabel = r.response ? r.response.toUpperCase() : 'N/R';
    const description = [
      `Analyst test: ${q.analyst_guidance ?? '—'}`,
      `Pass criteria: ${q.pass_criteria ?? '—'}`,
      q.procedure_statement ? `Procedure: ${q.procedure_statement}` : null,
      `Response: ${responseLabel}.`,
      r.doc_reference ? `Client doc reference: ${r.doc_reference}.` : null,
      r.notes ? `Notes: ${r.notes}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const payload = {
      engagement_id: engagementId,
      module: 'aml_program',
      submodule: submoduleKey,
      title,
      severity: findingTypeToSeverity(findingType),
      finding_type: findingType,
      status: 'open',
      description,
      observation: isDeficiency
        ? (r.notes ?? null)
        : (r.observation_best_practice ?? r.notes ?? null),
      recommendation: r.reviewer_recommendation ?? null,
      regulation_reference: q.regulatory_reference ?? 'PCMLTFA / PCMLTFR',
      nature_of_obligation: `Policies & Procedures — ${q.section_name ?? 'AML Program'}`,
      date_identified: new Date().toISOString().split('T')[0],
    } as any;

    if (existingMap.has(submoduleKey)) {
      await supabase.from('findings').update({
        title: payload.title,
        severity: payload.severity,
        finding_type: payload.finding_type,
        description: payload.description,
        observation: payload.observation,
        recommendation: payload.recommendation,
      }).eq('id', existingMap.get(submoduleKey)!);
    } else {
      await supabase.from('findings').insert(payload);
    }
  }

  for (const [submoduleKey, id] of existingMap.entries()) {
    if (!stillNeeded.has(submoduleKey)) {
      await supabase.from('findings').delete().eq('id', id);
    }
  }
}

export function WorkingPaperSection({ ppReviewId, engagementId, clientContext }: WorkingPaperSectionProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [localRows, setLocalRows] = useState<Map<number, Partial<ResponseRow>>>(new Map());
  const [bulkNADialog, setBulkNADialog] = useState<
    | {
        scope: 'section' | 'subsection';
        sectionCode: string;
        sectionName: string;
        subsection: string;
        count: number;
        rationale: string;
      }
    | null
  >(null);

  const { data: questions = [], isLoading: qLoading } = useQuery({
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

  // Hydrate local state from server rows on load
  useEffect(() => {
    const m = new Map<number, Partial<ResponseRow>>();
    for (const r of serverRows) {
      m.set(r.question_number, {
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
    setLocalRows(m);
  }, [serverRows]);

  // Drop questions whose section is not applicable to the engaged client
  // (e.g. MSB Registration for a non-MSB; Correspondent Banking only for
  // financial entities that are NOT MSBs — MSBs don't have correspondent
  // banking obligations even if they're tagged with an FI keyword).
  const applicableQuestions = useMemo(() => {
    const isMsb = !!clientContext?.isMsb;
    const isFi = !!clientContext?.isFi;
    return questions.filter((q) => {
      if (q.applicability === 'msb_required') return isMsb;
      if (q.applicability === 'fi_only') return isFi && !isMsb;
      return true;
    });
  }, [questions, clientContext?.isMsb, clientContext?.isFi]);

  // Group questions by section_code → subsection → questions
  const sectionsTree = useMemo(() => {
    const bySection = new Map<string, { code: string; name: string; subs: Map<string, Question[]> }>();
    for (const q of applicableQuestions) {
      const code = q.section_code ?? '?';
      if (!bySection.has(code)) {
        bySection.set(code, { code, name: q.section_name ?? '—', subs: new Map() });
      }
      const sec = bySection.get(code)!;
      const sub = q.subsection ?? '';
      if (!sec.subs.has(sub)) sec.subs.set(sub, []);
      sec.subs.get(sub)!.push(q);
    }
    return Array.from(bySection.values())
      .sort((a, b) => Number(a.code) - Number(b.code))
      .map((s) => ({
        code: s.code,
        name: s.name,
        subsections: Array.from(s.subs.entries()).map(([name, qs]) => ({
          name,
          questions: qs.sort((a, b) => a.sort_order - b.sort_order),
        })),
      }));
  }, [applicableQuestions]);

  // Default-open the first section once questions arrive
  useEffect(() => {
    if (sectionsTree.length > 0 && openSections.length === 0) {
      setOpenSections([sectionsTree[0].code]);
    }
  }, [sectionsTree]); // eslint-disable-line react-hooks/exhaustive-deps

  const questionMatchesFilter = (q: Question) => {
    if (sectionFilter !== 'all' && q.section_code !== sectionFilter) return false;
    if (statusFilter === 'all') return true;
    const s = statusFor(localRows.get(q.question_number));
    if (statusFilter === 'incomplete') return s === 'incomplete';
    if (statusFilter === 'pass') return s === 'pass';
    if (statusFilter === 'findings') return s === 'finding' || s === 'observation';
    return true;
  };

  const updateLocal = (qn: number, patch: Partial<ResponseRow>) => {
    setLocalRows((prev) => {
      const next = new Map(prev);
      const existing = next.get(qn) ?? { question_number: qn };
      const merged = { ...existing, ...patch };
      // Auto-clear finding_type when response flips to Yes/N/A unless it's an observation
      if (
        patch.response &&
        (patch.response === 'yes' || patch.response === 'na') &&
        merged.finding_type &&
        merged.finding_type !== 'observation'
      ) {
        merged.finding_type = null;
      }
      // Auto-fill classification from the firm's suggested value when the
      // analyst marks a control failing and hasn't picked one yet.
      if (
        patch.response &&
        (patch.response === 'no' || patch.response === 'partially') &&
        !merged.finding_type
      ) {
        const q = questions.find((qq) => qq.question_number === qn);
        if (q?.suggested_finding_type) {
          merged.finding_type = q.suggested_finding_type;
        }
      }
      next.set(qn, merged);
      return next;
    });
  };

  /** Bulk-mark every question in a subsection N/A with one shared rationale. */
  const markSubsectionNA = (sectionCode: string, subsection: string, rationale: string) => {
    setLocalRows((prev) => {
      const next = new Map(prev);
      for (const q of questions) {
        if (q.section_code !== sectionCode) continue;
        if ((q.subsection ?? '') !== subsection) continue;
        const existing = next.get(q.question_number) ?? { question_number: q.question_number };
        next.set(q.question_number, {
          ...existing,
          response: 'na',
          notes: rationale || existing.notes || 'Not applicable to this entity.',
          finding_type: null,
        });
      }
      return next;
    });
  };

  /** Bulk-mark every question in a whole section N/A. Useful for splitting
   *  Individual / Corporate KYC when the entity only onboards one type. */
  const markSectionNA = (sectionCode: string, rationale: string) => {
    setLocalRows((prev) => {
      const next = new Map(prev);
      for (const q of applicableQuestions) {
        if (q.section_code !== sectionCode) continue;
        const existing = next.get(q.question_number) ?? { question_number: q.question_number };
        next.set(q.question_number, {
          ...existing,
          response: 'na',
          notes: rationale || existing.notes || 'Not applicable to this entity.',
          finding_type: null,
        });
      }
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Upsert every local row that has any data, then sync findings. We
      // only consider questions that apply to the engaged client — rows for
      // hidden sections (e.g. MSB Registration for a non-MSB) are ignored.
      for (const q of applicableQuestions) {
        const r = localRows.get(q.question_number);
        if (!r) continue;
        if (!r.response && !r.notes && !r.doc_reference && !r.finding_type) continue;

        const payload = {
          pp_review_id: ppReviewId,
          question_id: q.id,
          question_number: q.question_number,
          question_text: q.question_text,
          response: r.response ?? null,
          notes: r.notes ?? null,
          doc_reference: r.doc_reference ?? null,
          finding_type: r.finding_type ?? null,
          deficiency_flag:
            r.finding_type !== null && r.finding_type !== undefined && r.finding_type !== 'observation',
          observation_best_practice: r.observation_best_practice ?? null,
          evidence_reviewed: r.evidence_reviewed ?? null,
          deficiency_explanation: r.deficiency_explanation ?? null,
          reviewer_recommendation: r.reviewer_recommendation ?? null,
          remediation_notes: r.remediation_notes ?? null,
        } as any;

        if (r.id) {
          const { error } = await supabase
            .from('aml_pp_control_results')
            .update(payload)
            .eq('id', r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('aml_pp_control_results').insert(payload);
          if (error) throw error;
        }
      }

      await syncWorkingPaperFindings(engagementId, ppReviewId, applicableQuestions, localRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aml-pp-results', ppReviewId] });
      queryClient.invalidateQueries({ queryKey: ['aml-pp-overall', ppReviewId] });
      queryClient.invalidateQueries({ queryKey: ['findings', engagementId] });
      toast.success('Working paper saved & findings synced');
    },
    onError: (e: any) => {
      toast.error(`Save failed: ${e?.message ?? 'unknown error'}`);
    },
  });

  if (qLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Per-section progress for the accordion header
  const sectionProgress = (sectionCode: string) => {
    const sectionQs = applicableQuestions.filter((q) => q.section_code === sectionCode);
    const done = sectionQs.filter((q) => !!localRows.get(q.question_number)?.response).length;
    return { done, total: sectionQs.length };
  };

  const sectionFindingsCount = (sectionCode: string) =>
    applicableQuestions
      .filter((q) => q.section_code === sectionCode)
      .filter((q) => statusFor(localRows.get(q.question_number)) === 'finding').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Working Paper</CardTitle>
            <CardDescription>
              Run each control against the AML document. Pick a Deficiency Severity classification for No / Partial responses.
            </CardDescription>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save & sync findings</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Every control tests both the policy and the procedure.</p>
            <p className="text-muted-foreground">
              <span className="font-medium">Policy</span> = what the regulation requires the document to state.{' '}
              <span className="font-medium">Procedure</span> = how staff actually operationalize it. A control passes only when both are documented.
              The reference to PCMLTFR 71(1)(b) signals that P&P deficiencies are penalised obligations; the Deficiency Severity classification you pick is the firm's internal severity grading, not a FINTRAC determination.
            </p>
            {clientContext && !clientContext.isMsb && !clientContext.isFi && clientContext.entityType && (
              <p className="text-muted-foreground italic mt-1">
                Client is <span className="font-medium">{clientContext.entityType}</span> — MSB Registration and Correspondent Banking sections are hidden.
              </p>
            )}
            {clientContext?.isMsb && (
              <p className="text-muted-foreground italic mt-1">
                Client is an MSB — Correspondent Banking section is hidden (MSBs do not have correspondent banking obligations).
              </p>
            )}
            {clientContext && !clientContext.isMsb && clientContext.isFi && (
              <p className="text-muted-foreground italic mt-1">
                Client is a financial entity — MSB Registration section is hidden.
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Status:</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Section:</Label>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="h-8 w-64 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All sections</SelectItem>
                {sectionsTree.map((s) => (
                  <SelectItem key={s.code} value={s.code} className="text-xs">
                    {s.code}. {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sections */}
        <Accordion type="multiple" value={openSections} onValueChange={setOpenSections}>
          {sectionsTree.map((sec) => {
            const visibleSubsections = sec.subsections
              .map((sub) => ({
                ...sub,
                questions: sub.questions.filter(questionMatchesFilter),
              }))
              .filter((sub) => sub.questions.length > 0);
            if (sectionFilter !== 'all' && sec.code !== sectionFilter) return null;
            if (visibleSubsections.length === 0 && statusFilter !== 'all') return null;

            const { done, total } = sectionProgress(sec.code);
            const findingsCount = sectionFindingsCount(sec.code);

            return (
              <AccordionItem value={sec.code} key={sec.code}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 flex-1 text-left">
                    <span className="text-sm font-medium">
                      {sec.code}. {sec.name}
                    </span>
                    <Badge variant="outline" className="text-xs ml-2">
                      {done}/{total}
                    </Badge>
                    {findingsCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {findingsCount} finding{findingsCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {visibleSubsections.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-2">No questions match the current filter.</p>
                  ) : (
                    visibleSubsections.map((sub) => (
                      <div key={`${sec.code}-${sub.name}`} className="space-y-2">
                        <div className="flex items-center justify-between pl-1">
                          {sub.name ? (
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {sub.name}
                            </div>
                          ) : <span />}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setBulkNADialog({
                                scope: 'subsection',
                                sectionCode: sec.code,
                                sectionName: sec.name,
                                subsection: sub.name,
                                count: sub.questions.length,
                                rationale: '',
                              })
                            }
                            title="Mark every question in this subsection as N/A with one shared rationale"
                          >
                            <Ban className="h-3 w-3 mr-1" /> Mark subsection N/A
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {sub.questions.map((q) => (
                            <QuestionRow
                              key={q.id}
                              q={q}
                              row={localRows.get(q.question_number)}
                              onChange={(patch) => updateLocal(q.question_number, patch)}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="flex justify-end pt-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save & sync findings</>
            )}
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={!!bulkNADialog}
        onOpenChange={(open) => { if (!open) setBulkNADialog(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkNADialog?.scope === 'section' ? 'Mark section N/A' : 'Mark subsection N/A'}
            </DialogTitle>
            <DialogDescription>
              Marking all {bulkNADialog?.count} questions in
              {' '}<span className="font-medium">{bulkNADialog?.sectionName}</span>
              {bulkNADialog?.scope === 'subsection' && bulkNADialog?.subsection
                ? <> → <span className="font-medium">{bulkNADialog.subsection}</span></>
                : null}
              {' '}as N/A. A rationale is required — it will be saved as the note on every row.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkNADialog?.rationale ?? ''}
            onChange={(e) => bulkNADialog && setBulkNADialog({ ...bulkNADialog, rationale: e.target.value })}
            placeholder={
              bulkNADialog?.scope === 'section'
                ? 'e.g. The reporting entity only onboards corporate / entity clients and does not service individual customers.'
                : 'e.g. The entity does not onboard corporate clients, so corporate verification methods are scoped out.'
            }
            rows={3}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkNADialog(null)}>Cancel</Button>
            <Button
              disabled={!bulkNADialog?.rationale.trim()}
              onClick={() => {
                if (!bulkNADialog) return;
                const reason = bulkNADialog.rationale.trim();
                if (!reason) return;
                if (bulkNADialog.scope === 'section') {
                  markSectionNA(bulkNADialog.sectionCode, reason);
                } else {
                  markSubsectionNA(bulkNADialog.sectionCode, bulkNADialog.subsection, reason);
                }
                setBulkNADialog(null);
              }}
            >
              <Ban className="h-4 w-4 mr-2" /> Mark all N/A
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface QuestionRowProps {
  q: Question;
  row: Partial<ResponseRow> | undefined;
  onChange: (patch: Partial<ResponseRow>) => void;
}

function QuestionRow({ q, row, onChange }: QuestionRowProps) {
  const status = statusFor(row);
  const isFailingResponse = row?.response === 'no' || row?.response === 'partially';
  const requiresFindingType = isFailingResponse && !row?.finding_type;
  const suggestedMeta = q.suggested_finding_type ? FINDING_TYPE_META[q.suggested_finding_type] : null;

  // Available classification values: deficiency severities + observation; plus a "clear" sentinel
  const classificationOptions: { value: 'clear' | FindingType; label: string }[] = [
    { value: 'clear', label: 'No Issue Identified' },
    ...(Object.values(FINDING_TYPE_META).map((m) => ({
      value: m.type as FindingType,
      label: m.label,
    }))),
  ];

  return (
    <div
      className={cn(
        'border rounded-md',
        status === 'finding' && 'border-destructive/40 bg-destructive/5',
        status === 'observation' && 'border-primary/30 bg-primary/5',
        requiresFindingType && 'ring-1 ring-amber-400/60'
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <span className="text-xs font-mono text-muted-foreground w-16 shrink-0 mt-0.5">
          {q.question_code ?? `Q${q.question_number}`}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{q.question_text}</p>
          {q.is_new_or_updated && (
            <Badge variant="outline" className="mt-1 text-[10px] uppercase border-amber-500/40 text-amber-700">
              Updated
            </Badge>
          )}
        </div>
        <StatusChip status={status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 px-4 pb-4 pt-3 border-t bg-background/50">
        {/* LEFT — testing & assessment */}
        <div className="space-y-3 lg:border-r lg:pr-6">
          {q.analyst_guidance && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Analyst testing steps</Label>
              <p className="text-sm mt-0.5">{q.analyst_guidance}</p>
            </div>
          )}
          {q.pass_criteria && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Policy (Pass criteria)</Label>
              <p className="text-sm mt-0.5">{q.pass_criteria}</p>
            </div>
          )}
          {q.procedure_statement && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Procedure</Label>
              <p className="text-sm mt-0.5">{q.procedure_statement}</p>
            </div>
          )}
          {q.regulatory_reference && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reference</Label>
              <p className="text-xs mt-0.5">{q.regulatory_reference}</p>
            </div>
          )}

          <div>
            <Label className="text-sm">Response</Label>
            <RadioGroup
              value={row?.response ?? ''}
              onValueChange={(v) => onChange({ response: v as ResponseValue })}
              className="flex flex-wrap gap-4 mt-1"
            >
              {RESPONSE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`${q.id}-${opt.value}`} />
                  <Label htmlFor={`${q.id}-${opt.value}`} className="text-sm font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Deficiency Severity classification</Label>
              {suggestedMeta && (
                <span
                  className="text-[11px] text-muted-foreground inline-flex items-center gap-1"
                  title="Default classification suggested by the firm. Override if your judgement differs."
                >
                  <Sparkles className="h-3 w-3" />
                  Suggested: {suggestedMeta.shortLabel}
                </span>
              )}
            </div>
            <Select
              value={(row?.finding_type as string) ?? 'clear'}
              onValueChange={(v) => onChange({ finding_type: v === 'clear' ? null : (v as FindingType) })}
            >
              <SelectTrigger className={cn('mt-1', requiresFindingType && 'border-amber-500')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classificationOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-sm">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {requiresFindingType && (
              <p className="text-xs text-amber-700 mt-1">
                Pick a classification — "No" / "Partial" responses must be classified.
              </p>
            )}
            {row?.finding_type && (
              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{FINDING_TYPE_META[row.finding_type as FindingType].description}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — evidence, commentary, findings */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Client doc reference</Label>
            <Input
              value={row?.doc_reference ?? ''}
              onChange={(e) => onChange({ doc_reference: e.target.value })}
              onFocus={(e) => {
                if (!row?.doc_reference) {
                  onChange({ doc_reference: 'Policy document, page ' });
                  requestAnimationFrame(() => {
                    const el = e.target as HTMLInputElement;
                    el.setSelectionRange(el.value.length, el.value.length);
                  });
                }
              }}
              placeholder="Policy document, page __"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm">Notes / commentary</Label>
            <Textarea
              value={row?.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Deficiency explanation, observations, rationale and reviewer comments — this is what surfaces in the audit-report finding description."
              rows={isFailingResponse ? 4 : 2}
              className="mt-1"
            />
          </div>

          {isFailingResponse && (
            <div>
              <Label className="text-sm">Reviewer recommendation</Label>
              <Textarea
                value={row?.reviewer_recommendation ?? ''}
                onChange={(e) => onChange({ reviewer_recommendation: e.target.value })}
                placeholder="What the client should do to remediate (recorded against the finding)."
                rows={2}
                className="mt-1"
              />
            </div>
          )}

          {row?.finding_type === 'observation' && (
            <div>
              <Label className="text-sm">Best-practice observation</Label>
              <Textarea
                value={row?.observation_best_practice ?? ''}
                onChange={(e) => onChange({ observation_best_practice: e.target.value })}
                placeholder="What better practice you'd recommend, with rationale…"
                rows={2}
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
