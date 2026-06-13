import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Sample {
  id: string;
  alert_id: string | null;
  alert_type: string | null;
  alert_date: string | null;
  reviewed_date: string | null;
  sla_days: number | null;
  within_sla: boolean | null;
  reviewed_per_process: boolean | null;
  disposition: string | null;
  rationale: string | null;
  rationale_quality: string | null;
  test_result: string | null;
}

interface Props { reviewId: string; }

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export function AlertSampleTable({ reviewId }: Props) {
  const { toast } = useToast();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [reviewId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_alert_samples').select('*').eq('review_id', reviewId).order('created_at');
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    // Map DB rows to our simplified Sample interface
    const mapped: Sample[] = (data ?? []).map((r: any) => ({
      id: r.id,
      alert_id: r.alert_id,
      alert_type: r.alert_type,
      alert_date: r.alert_date,
      reviewed_date: r.reviewed_date,
      sla_days: r.sla_days,
      within_sla: r.within_sla,
      reviewed_per_process: r.reviewed_per_process ?? null,
      disposition: r.disposition,
      rationale: r.rationale,
      rationale_quality: r.rationale_quality,
      test_result: r.test_result,
    }));
    setSamples(mapped);
    setLoading(false);
  };

  const add = async () => {
    const { data, error } = await supabase
      .from('tm_alert_samples').insert({ review_id: reviewId, sla_days: 30 }).select('*').single();
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    const r = data as any;
    setSamples((s) => [...s, {
      id: r.id, alert_id: r.alert_id, alert_type: r.alert_type, alert_date: r.alert_date,
      reviewed_date: r.reviewed_date, sla_days: r.sla_days, within_sla: r.within_sla,
      reviewed_per_process: r.reviewed_per_process ?? null, disposition: r.disposition,
      rationale: r.rationale, rationale_quality: r.rationale_quality, test_result: r.test_result,
    }]);
  };

  const update = (id: string, patch: Partial<Sample>) =>
    setSamples((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const computeResult = (s: Sample): string | null => {
    if (s.within_sla == null && !s.disposition) return null;
    const checks = [s.within_sla, s.reviewed_per_process, s.rationale_quality === 'adequate'];
    const passed = checks.filter((c) => c === true).length;
    if (passed === checks.length) return 'pass';
    if (passed >= Math.ceil(checks.length * 0.6)) return 'partial';
    return 'fail';
  };

  const saveRow = async (s: Sample) => {
    const elapsed = daysBetween(s.alert_date, s.reviewed_date);
    const within_sla = elapsed != null && s.sla_days != null ? elapsed <= s.sla_days : s.within_sla;
    const test_result = computeResult({ ...s, within_sla });
    const { error } = await supabase.from('tm_alert_samples').update({
      alert_id: s.alert_id, alert_type: s.alert_type, alert_date: s.alert_date,
      reviewed_date: s.reviewed_date, sla_days: s.sla_days, within_sla,
      reviewed_per_process: s.reviewed_per_process,
      disposition: s.disposition, rationale: s.rationale, rationale_quality: s.rationale_quality,
      test_result,
    }).eq('id', s.id);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    update(s.id, { within_sla, test_result });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('tm_alert_samples').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setSamples((rows) => rows.filter((r) => r.id !== id));
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Alert Samples — All Tests</CardTitle>
            <CardDescription>
              One row per alert tested. Each column covers: alert type, SLA timeliness,
              process adherence, disposition, and rationale quality.
            </CardDescription>
          </div>
          <Button size="sm" onClick={add}><Plus className="w-4 h-4 mr-1"/>Add alert</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert ID</TableHead>
              <TableHead title="Alert population type (TM / sanctions / PEP / adverse media)">Type</TableHead>
              <TableHead>Alert date</TableHead>
              <TableHead>Reviewed date</TableHead>
              <TableHead className="w-20" title="Internal SLA (days)">SLA</TableHead>
              <TableHead className="w-16" title="Reviewed within SLA">In SLA</TableHead>
              <TableHead className="w-24" title="Was the alert reviewed in line with internal processes?">Process adherence</TableHead>
              <TableHead title="Final disposition">Disposition</TableHead>
              <TableHead title="Quality of rationale">Rationale qual.</TableHead>
              <TableHead className="min-w-[200px]">Rationale</TableHead>
              <TableHead className="w-24">Result</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((s) => (
              <TableRow key={s.id}>
                <TableCell><Input value={s.alert_id ?? ''} onChange={(e) => update(s.id, { alert_id: e.target.value })}/></TableCell>
                <TableCell>
                  <Select value={s.alert_type ?? ''} onValueChange={(v) => update(s.id, { alert_type: v })}>
                    <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transaction_monitoring">Transaction monitoring</SelectItem>
                      <SelectItem value="sanctions">Sanctions</SelectItem>
                      <SelectItem value="pep">PEP</SelectItem>
                      <SelectItem value="adverse_media">Adverse media</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input type="date" value={s.alert_date ?? ''} onChange={(e) => update(s.id, { alert_date: e.target.value || null })}/></TableCell>
                <TableCell><Input type="date" value={s.reviewed_date ?? ''} onChange={(e) => update(s.id, { reviewed_date: e.target.value || null })}/></TableCell>
                <TableCell><Input type="number" value={s.sla_days ?? ''} onChange={(e) => update(s.id, { sla_days: e.target.value ? +e.target.value : null })}/></TableCell>
                <TableCell><Checkbox checked={!!s.within_sla} onCheckedChange={(v) => update(s.id, { within_sla: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.reviewed_per_process} onCheckedChange={(v) => update(s.id, { reviewed_per_process: !!v })}/></TableCell>
                <TableCell>
                  <Select value={s.disposition ?? ''} onValueChange={(v) => update(s.id, { disposition: v })}>
                    <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suspicious">Suspicious</SelectItem>
                      <SelectItem value="not_suspicious">Not suspicious</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="str_filed">STR filed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={s.rationale_quality ?? ''} onValueChange={(v) => update(s.id, { rationale_quality: v })}>
                    <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adequate">Adequate</SelectItem>
                      <SelectItem value="generic">Generic</SelectItem>
                      <SelectItem value="missing">Missing</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Textarea rows={1} className="min-h-[40px]" value={s.rationale ?? ''} onChange={(e) => update(s.id, { rationale: e.target.value })}/></TableCell>
                <TableCell>
                  {s.test_result && <Badge variant={s.test_result === 'pass' ? 'default' : s.test_result === 'partial' ? 'secondary' : 'destructive'} className="uppercase">{s.test_result}</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => saveRow(s)}><Save className="w-4 h-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {samples.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground text-sm py-6">No alert samples yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
