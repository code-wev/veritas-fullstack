import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Sample {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  risk_factors_defined: boolean | null;
  scoring_logic_documented: boolean | null;
  triggers_defined: boolean | null;
  trigger_type: string | null;
  trigger_description: string | null;
  str_upgrade_applied: boolean | null;
  volume_trigger_applied: boolean | null;
  other_triggers_consistent: boolean | null;
  system_risk_rating: string | null;
  manual_risk_rating: string | null;
  ratings_match: boolean | null;
  test_result: string | null;
  notes: string | null;
}

interface Props { reviewId: string; }

export function RiskRecalcSampleTable({ reviewId }: Props) {
  const { toast } = useToast();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [reviewId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_risk_recalc_samples').select('*').eq('review_id', reviewId).order('created_at');
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setSamples((data as Sample[]) ?? []);
    setLoading(false);
  };

  const add = async () => {
    const { data, error } = await supabase.from('tm_risk_recalc_samples').insert({ review_id: reviewId }).select('*').single();
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setSamples((s) => [...s, data as Sample]);
  };

  const update = (id: string, patch: Partial<Sample>) =>
    setSamples((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const saveRow = async (s: Sample) => {
    const ratings_match = !!s.system_risk_rating && !!s.manual_risk_rating
      ? s.system_risk_rating.toLowerCase() === s.manual_risk_rating.toLowerCase() : s.ratings_match;
    const test_result = ratings_match == null ? null : ratings_match ? 'pass' : 'fail';
    const { error } = await supabase.from('tm_risk_recalc_samples').update({ ...s, ratings_match, test_result }).eq('id', s.id);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    update(s.id, { ratings_match, test_result });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('tm_risk_recalc_samples').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setSamples((rows) => rows.filter((r) => r.id !== id));
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Risk Rating Recalculation Samples — All Tests</CardTitle>
            <CardDescription>
              One row per customer recalculated. Columns cover methodology understanding, trigger validation,
              and the manual vs system rating comparison. Result = pass when system rating matches manual recalc.
            </CardDescription>
          </div>
          <Button size="sm" onClick={add}><Plus className="w-4 h-4 mr-1"/>Add sample</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-20" title="Risk factors defined in methodology">Factors def.</TableHead>
              <TableHead className="w-20" title="Scoring logic documented">Scoring doc.</TableHead>
              <TableHead className="w-20" title="High-risk triggers defined">Triggers def.</TableHead>
              <TableHead title="Trigger type for this case">Trigger</TableHead>
              <TableHead className="min-w-[180px]">Trigger description</TableHead>
              <TableHead className="w-20" title="STR filed → customer upgraded to high risk">STR upg.</TableHead>
              <TableHead className="w-20" title="High transaction volume → risk updated">Vol. upd.</TableHead>
              <TableHead className="w-20" title="Other triggers applied consistently">Other cons.</TableHead>
              <TableHead>System rating</TableHead>
              <TableHead>Manual rating</TableHead>
              <TableHead className="min-w-[160px]">Notes</TableHead>
              <TableHead className="w-24">Result</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((s) => (
              <TableRow key={s.id}>
                <TableCell><Input value={s.customer_id ?? ''} onChange={(e) => update(s.id, { customer_id: e.target.value })}/></TableCell>
                <TableCell><Input value={s.customer_name ?? ''} onChange={(e) => update(s.id, { customer_name: e.target.value })}/></TableCell>
                <TableCell><Checkbox checked={!!s.risk_factors_defined} onCheckedChange={(v) => update(s.id, { risk_factors_defined: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.scoring_logic_documented} onCheckedChange={(v) => update(s.id, { scoring_logic_documented: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.triggers_defined} onCheckedChange={(v) => update(s.id, { triggers_defined: !!v })}/></TableCell>
                <TableCell>
                  <Select value={s.trigger_type ?? ''} onValueChange={(v) => update(s.id, { trigger_type: v })}>
                    <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="str_filed">STR filed</SelectItem>
                      <SelectItem value="high_volume">High transaction volume</SelectItem>
                      <SelectItem value="adverse_media">Adverse media</SelectItem>
                      <SelectItem value="pep_match">PEP match</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Textarea rows={1} className="min-h-[40px]" value={s.trigger_description ?? ''} onChange={(e) => update(s.id, { trigger_description: e.target.value })}/></TableCell>
                <TableCell><Checkbox checked={!!s.str_upgrade_applied} onCheckedChange={(v) => update(s.id, { str_upgrade_applied: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.volume_trigger_applied} onCheckedChange={(v) => update(s.id, { volume_trigger_applied: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.other_triggers_consistent} onCheckedChange={(v) => update(s.id, { other_triggers_consistent: !!v })}/></TableCell>
                <TableCell><Input value={s.system_risk_rating ?? ''} onChange={(e) => update(s.id, { system_risk_rating: e.target.value })} placeholder="e.g. High"/></TableCell>
                <TableCell><Input value={s.manual_risk_rating ?? ''} onChange={(e) => update(s.id, { manual_risk_rating: e.target.value })} placeholder="e.g. High"/></TableCell>
                <TableCell><Textarea rows={1} className="min-h-[40px]" value={s.notes ?? ''} onChange={(e) => update(s.id, { notes: e.target.value })}/></TableCell>
                <TableCell>{s.test_result && <Badge variant={s.test_result === 'pass' ? 'default' : 'destructive'} className="uppercase">{s.test_result}</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => saveRow(s)}><Save className="w-4 h-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {samples.length === 0 && (
              <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground text-sm py-6">No samples yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
