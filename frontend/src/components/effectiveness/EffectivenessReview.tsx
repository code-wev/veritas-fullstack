import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Calendar, Save } from 'lucide-react';

interface Props {
  engagementId: string;
}

interface EffectivenessReview {
  id: string;
  engagement_id: string;
  status: string;
  is_first_review: boolean | null;
  msb_registration_date: string | null;
  operations_commenced_date: string | null;
  prev_start_basis: string | null;
  prev_engagement_letter_date: string | null;
  prev_first_correspondence_date: string | null;
  prev_start_date: string | null;
  prev_completion_date: string | null;
  curr_engagement_letter_date: string | null;
  curr_first_correspondence_date: string | null;
  curr_start_basis: string | null;
  curr_start_date: string | null;
  elapsed_months: number | null;
  test_result: string | null;
  points_achieved: number | null;
  max_points: number;
  deficiency_flag: boolean | null;
  evidence_reviewed: string | null;
  document_reference: string | null;
  comments: string | null;
  observation_best_practice: string | null;
  summary_for_report: string | null;
}

const RESULT_POINTS: Record<string, number> = { pass: 2, partial: 1, fail: 0, na: 0 };

function monthsBetween(a: string, b: string): number {
  const d1 = new Date(a);
  const d2 = new Date(b);
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  const dayDiff = (d2.getDate() - d1.getDate()) / 30;
  return Math.round((months + dayDiff) * 10) / 10;
}

function earliestDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d);
  if (valid.length === 0) return null;
  return valid.reduce((min, d) => (new Date(d) < new Date(min) ? d : min));
}

function latestDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d);
  if (valid.length === 0) return null;
  return valid.reduce((max, d) => (new Date(d) > new Date(max) ? d : max));
}

export function EffectivenessReview({ engagementId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<EffectivenessReview | null>(null);

  useEffect(() => {
    void loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  const loadOrCreate = async () => {
    setLoading(true);
    try {
      const { data: existing, error } = await supabase
        .from('effectiveness_reviews')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;

      if (existing) {
        setReview(existing as EffectivenessReview);
      } else {
        const { data: created, error: insErr } = await supabase
          .from('effectiveness_reviews')
          .insert({ engagement_id: engagementId, status: 'draft', max_points: 2 })
          .select()
          .single();
        if (insErr) throw insErr;
        setReview(created as EffectivenessReview);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load effectiveness review', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const update = (patch: Partial<EffectivenessReview>) => {
    if (!review) return;
    setReview({ ...review, ...patch });
  };

  const recompute = (r: EffectivenessReview): Partial<EffectivenessReview> => {
    // Resolve previous start date
    let prevStart: string | null = null;
    if (r.is_first_review) {
      if (r.prev_start_basis === 'msb_registration') prevStart = r.msb_registration_date;
      else if (r.prev_start_basis === 'operations_commenced') prevStart = r.operations_commenced_date;
      else prevStart = latestDate([r.msb_registration_date, r.operations_commenced_date]);
    } else if (r.prev_start_basis === 'engagement_letter') {
      prevStart = r.prev_engagement_letter_date;
    } else if (r.prev_start_basis === 'first_correspondence') {
      prevStart = r.prev_first_correspondence_date;
    } else {
      prevStart = earliestDate([r.prev_engagement_letter_date, r.prev_first_correspondence_date]);
    }

    // Resolve current start date
    let currStart: string | null = null;
    if (r.curr_start_basis === 'engagement_letter') currStart = r.curr_engagement_letter_date;
    else if (r.curr_start_basis === 'first_correspondence') currStart = r.curr_first_correspondence_date;
    else currStart = earliestDate([r.curr_engagement_letter_date, r.curr_first_correspondence_date]);

    let elapsed: number | null = null;
    let result: string | null = r.test_result;
    let timelineRule = false; // ≤ 24 months
    let completionRule = false; // previous completed before current starts

    if (prevStart && currStart) {
      elapsed = monthsBetween(prevStart, currStart);
      timelineRule = elapsed <= 24;
    }
    if (r.prev_completion_date && currStart) {
      completionRule = new Date(r.prev_completion_date) <= new Date(currStart);
    } else if (r.is_first_review) {
      // First review — no previous review to complete
      completionRule = true;
    }

    if (prevStart && currStart && (r.prev_completion_date || r.is_first_review)) {
      if (timelineRule && completionRule) result = 'pass';
      else if (timelineRule || completionRule) result = 'partial';
      else result = 'fail';
    }

    const points = result ? RESULT_POINTS[result] ?? 0 : null;
    const deficiency = result === 'fail' || result === 'partial';
    return {
      prev_start_date: prevStart,
      curr_start_date: currStart,
      elapsed_months: elapsed,
      test_result: result,
      points_achieved: points,
      deficiency_flag: deficiency,
    };
  };

  const handleSave = async () => {
    if (!review) return;
    setSaving(true);
    try {
      const recomputed = recompute(review);
      const merged = { ...review, ...recomputed };
      setReview(merged);
      const { id, engagement_id, ...updates } = merged;
      const { error } = await supabase
        .from('effectiveness_reviews')
        .update(updates)
        .eq('id', review.id);
      if (error) throw error;
      toast({ title: 'Saved', description: 'Effectiveness review updated.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !review) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const preview = recompute(review);
  const elapsed = preview.elapsed_months ?? null;
  const result = preview.test_result ?? null;

  const resultBadge = result ? (
    result === 'pass' ? (
      <Badge className="gap-1 bg-primary"><CheckCircle2 className="w-3 h-3" />Pass — Compliant</Badge>
    ) : result === 'partial' ? (
      <Badge variant="secondary" className="gap-1"><AlertTriangle className="w-3 h-3" />Partial — Marginal</Badge>
    ) : (
      <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Fail — Non-compliant</Badge>
    )
  ) : (
    <Badge variant="outline">Pending inputs</Badge>
  );

  return (
    <div className="space-y-6">
      {/* Objective */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Prescribed Timeline — Two-Year Effectiveness Review
          </CardTitle>
          <CardDescription>
            The new effectiveness review must start no later than 24 months from the start of the previous review, and the previous review must be completed before the next one begins. For first reviews, the baseline is the MSB registration or operations commencement date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3 w-1/3">Description</th>
                  <th className="text-left p-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr><td className="p-3 font-medium">Previous Review Start Date</td><td className="p-3 font-mono">{preview.prev_start_date ?? '—'}</td></tr>
                <tr><td className="p-3 font-medium">Previous Review Completion Date</td><td className="p-3 font-mono">{review.prev_completion_date ?? (review.is_first_review ? 'N/A — first review' : '—')}</td></tr>
                <tr><td className="p-3 font-medium">Current Review Start Date</td><td className="p-3 font-mono">{preview.curr_start_date ?? '—'}</td></tr>
                <tr><td className="p-3 font-medium">Elapsed Time (Months)</td><td className="p-3 font-mono">{elapsed ?? '—'}</td></tr>
                <tr>
                  <td className="p-3 font-medium">Compliance Status</td>
                  <td className="p-3">
                    {result === 'pass' && <Badge className="gap-1 bg-primary"><CheckCircle2 className="w-3 h-3" />Compliant</Badge>}
                    {result === 'partial' && <Badge variant="secondary" className="gap-1"><AlertTriangle className="w-3 h-3" />Partially Compliant</Badge>}
                    {result === 'fail' && <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Non-Compliant</Badge>}
                    {!result && <Badge variant="outline">Pending inputs</Badge>}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Pass / Fail</td>
                  <td className="p-3">
                    {result === 'pass' ? <span className="font-semibold text-primary">PASS</span>
                      : result === 'fail' ? <span className="font-semibold text-destructive">FAIL</span>
                      : result === 'partial' ? <span className="font-semibold text-secondary-foreground">PARTIAL</span>
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium align-top">Other Comments</td>
                  <td className="p-3">
                    <Textarea
                      rows={2}
                      placeholder="Any additional context (delays, mitigating factors, etc.)..."
                      value={review.comments ?? ''}
                      onChange={(e) => update({ comments: e.target.value })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Pass</strong> = Both rules met (≤24 months AND previous review completed before current starts) ·{' '}
            <strong>Partial</strong> = Only one rule met · <strong>Fail</strong> = Neither rule met
          </p>
        </CardContent>
      </Card>

      {/* First review context */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Context</CardTitle>
          <CardDescription>Indicate whether this is the entity's first AML effectiveness review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Is this the entity's first effectiveness review?</Label>
            <RadioGroup
              className="flex gap-6 mt-2"
              value={review.is_first_review === null ? '' : review.is_first_review ? 'yes' : 'no'}
              onValueChange={(v) => update({ is_first_review: v === 'yes' })}
            >
              <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="first-yes" /><Label htmlFor="first-yes">Yes — first review (new MSB)</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="no" id="first-no" /><Label htmlFor="first-no">No — subsequent review</Label></div>
            </RadioGroup>
          </div>

          {review.is_first_review && (
            <div className="grid md:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">MSB Registration Date (FINTRAC)</Label>
                <Input
                  type="date"
                  value={review.msb_registration_date ?? ''}
                  onChange={(e) => update({ msb_registration_date: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operations Commenced Date (if different)</Label>
                <Input
                  type="date"
                  value={review.operations_commenced_date ?? ''}
                  onChange={(e) => update({ operations_commenced_date: e.target.value || null })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous review start */}
      <Card>
        <CardHeader>
          <CardTitle>Previous Review — Start Date</CardTitle>
          <CardDescription>
            {review.is_first_review
              ? 'For first reviews, the baseline is the MSB registration date or the operations commencement date.'
              : 'Whichever occurred first: (i) engagement letter signed, OR (ii) first correspondence indicating intent to proceed.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!review.is_first_review && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Engagement Letter Date</Label>
                <Input
                  type="date"
                  value={review.prev_engagement_letter_date ?? ''}
                  onChange={(e) => update({ prev_engagement_letter_date: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">First Correspondence Date</Label>
                <Input
                  type="date"
                  value={review.prev_first_correspondence_date ?? ''}
                  onChange={(e) => update({ prev_first_correspondence_date: e.target.value || null })}
                />
              </div>
            </div>
          )}
          {!review.is_first_review && (
            <div className="space-y-1">
              <Label className="text-xs">Previous Review Completion Date</Label>
              <Input
                type="date"
                value={review.prev_completion_date ?? ''}
                onChange={(e) => update({ prev_completion_date: e.target.value || null })}
              />
              <p className="text-xs text-muted-foreground">FINTRAC requires the previous review to be completed before the next one starts.</p>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Basis used for previous start date</Label>
            <Select
              value={review.prev_start_basis ?? ''}
              onValueChange={(v) => update({ prev_start_basis: v })}
            >
              <SelectTrigger><SelectValue placeholder={review.is_first_review ? 'Auto (latest of available dates)' : 'Auto (earliest of available dates)'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{review.is_first_review ? 'Auto — latest available (operations baseline)' : 'Auto — earliest available'}</SelectItem>
                {!review.is_first_review && <SelectItem value="engagement_letter">Engagement letter date</SelectItem>}
                {!review.is_first_review && <SelectItem value="first_correspondence">First correspondence date</SelectItem>}
                {review.is_first_review && <SelectItem value="msb_registration">MSB registration date</SelectItem>}
                {review.is_first_review && <SelectItem value="operations_commenced">Operations commenced date</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Current review start */}
      <Card>
        <CardHeader>
          <CardTitle>Current Review — Start Date</CardTitle>
          <CardDescription>Whichever occurred first: engagement letter signed, OR first correspondence indicating intent to proceed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Engagement Letter Date</Label>
              <Input
                type="date"
                value={review.curr_engagement_letter_date ?? ''}
                onChange={(e) => update({ curr_engagement_letter_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">First Correspondence Date</Label>
              <Input
                type="date"
                value={review.curr_first_correspondence_date ?? ''}
                onChange={(e) => update({ curr_first_correspondence_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Basis used for current start date</Label>
            <Select
              value={review.curr_start_basis ?? ''}
              onValueChange={(v) => update({ curr_start_basis: v })}
            >
              <SelectTrigger><SelectValue placeholder="Auto (earliest of the two)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto — earliest of the two</SelectItem>
                <SelectItem value="engagement_letter">Engagement letter date</SelectItem>
                <SelectItem value="first_correspondence">First correspondence date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Result + documentation */}
      <Card className={preview.deficiency_flag ? 'border-destructive/50' : ''}>
        <CardHeader>
          <CardTitle>Test Result & Documentation</CardTitle>
          <CardDescription>Pass = ≤ 24 months · Partial = 25–26 months · Fail = &gt; 26 months. You can override the auto result.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Result (override)</Label>
              <Select value={review.test_result ?? ''} onValueChange={(v) => update({ test_result: v })}>
                <SelectTrigger><SelectValue placeholder="Auto-suggested from elapsed months" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass (2 pts)</SelectItem>
                  <SelectItem value="partial">Partial (1 pt)</SelectItem>
                  <SelectItem value="fail">Fail (0 pts)</SelectItem>
                  <SelectItem value="na">N/A (0 pts)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points</Label>
              <div className="h-10 flex items-center px-3 border rounded-md bg-muted/50 text-sm font-mono">
                {preview.points_achieved ?? 0} / {review.max_points}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Document Reference</Label>
            <Input
              placeholder="e.g. Engagement Letter v2 dated 2024-03-15, Email thread 2024-02-20..."
              value={review.document_reference ?? ''}
              onChange={(e) => update({ document_reference: e.target.value })}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Comments / Deficiency Notes</Label>
              <Textarea
                rows={3}
                placeholder="Factual notes about the timeline, any delays, mitigating factors..."
                value={review.comments ?? ''}
                onChange={(e) => update({ comments: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observation / Best Practice</Label>
              <Textarea
                rows={3}
                placeholder="Improvement opportunities (not deficiencies)..."
                value={review.observation_best_practice ?? ''}
                onChange={(e) => update({ observation_best_practice: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Summary for Audit Report</Label>
            <Textarea
              rows={3}
              placeholder="Concluding narrative for the audit report..."
              value={review.summary_for_report ?? ''}
              onChange={(e) => update({ summary_for_report: e.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Recompute'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
