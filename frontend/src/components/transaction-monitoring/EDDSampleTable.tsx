import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Sample {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  high_risk_identified: boolean | null;
  high_risk_reason: string | null;
  source_of_funds_obtained: boolean | null;
  source_of_wealth_obtained: boolean | null;
  source_of_wealth_required: boolean | null;
  transaction_review_conducted: boolean | null;
  senior_mgmt_approval: boolean | null;
  supporting_docs_retained: boolean | null;
  evidence_aligns_policy: boolean | null;
  adverse_media_conducted: boolean | null;
  enhanced_monitoring: boolean | null;
  policy_compliance_result: string | null;
  best_practice_result: string | null;
  notes: string | null;
}

interface Props { reviewId: string; }

export function EDDSampleTable({ reviewId }: Props) {
  const { toast } = useToast();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [reviewId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_edd_samples').select('*').eq('review_id', reviewId).order('created_at');
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setSamples((data as Sample[]) ?? []);
    setLoading(false);
  };

  const add = async () => {
    const { data, error } = await supabase.from('tm_edd_samples').insert({ review_id: reviewId }).select('*').single();
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setSamples((s) => [...s, data as Sample]);
  };

  const update = (id: string, patch: Partial<Sample>) =>
    setSamples((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const compute = (s: Sample): { policy: string; best: string } => {
    const policyChecks: boolean[] = [
      !!s.high_risk_identified,
      !!s.source_of_funds_obtained,
      !!s.transaction_review_conducted,
      !!s.senior_mgmt_approval,
      !!s.supporting_docs_retained,
      !!s.evidence_aligns_policy,
    ];
    if (s.source_of_wealth_required) policyChecks.push(!!s.source_of_wealth_obtained);
    const policyPassed = policyChecks.filter(Boolean).length;
    const policy = policyPassed === policyChecks.length ? 'pass' : policyPassed >= Math.ceil(policyChecks.length / 2) ? 'partial' : 'fail';

    const bestChecks = [!!s.source_of_wealth_obtained, !!s.adverse_media_conducted, !!s.enhanced_monitoring];
    const bestPassed = bestChecks.filter(Boolean).length;
    const best = bestPassed === bestChecks.length ? 'pass' : bestPassed >= 1 ? 'partial' : 'fail';

    return { policy, best };
  };

  const saveRow = async (s: Sample) => {
    const { policy, best } = compute(s);
    const { error } = await supabase.from('tm_edd_samples').update({
      ...s, policy_compliance_result: policy, best_practice_result: best,
    }).eq('id', s.id);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    update(s.id, { policy_compliance_result: policy, best_practice_result: best });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('tm_edd_samples').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setSamples((rows) => rows.filter((r) => r.id !== id));
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">High-Risk Customer (EDD) Samples — All Tests</CardTitle>
            <CardDescription>
              One row per high-risk customer. Columns cover identification, policy compliance (primary test),
              documentation, and best-practice second layer. Hover headers for full descriptions.
            </CardDescription>
          </div>
          <Button size="sm" onClick={add}><Plus className="w-4 h-4 mr-1"/>Add customer</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-20" title="Customer identified as high risk">HR identified</TableHead>
              <TableHead className="min-w-[180px]" title="Reason for classification documented">High-risk reason</TableHead>
              <TableHead className="w-20" title="Source of funds obtained">SoF</TableHead>
              <TableHead className="w-20" title="Source of wealth required by policy">SoW req'd</TableHead>
              <TableHead className="w-20" title="Source of wealth obtained">SoW obt.</TableHead>
              <TableHead className="w-20" title="Transaction review conducted">Tx review</TableHead>
              <TableHead className="w-20" title="Senior management approval obtained">SM approval</TableHead>
              <TableHead className="w-20" title="Supporting documents retained">Docs ret.</TableHead>
              <TableHead className="w-20" title="Evidence aligns with policy">Aligns</TableHead>
              <TableHead className="w-20" title="Adverse media conducted (best practice)">Adverse media</TableHead>
              <TableHead className="w-20" title="Ongoing monitoring enhanced (best practice)">Enh. mon.</TableHead>
              <TableHead className="min-w-[160px]">Notes</TableHead>
              <TableHead className="w-28">Policy</TableHead>
              <TableHead className="w-28">Best practice</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((s) => (
              <TableRow key={s.id}>
                <TableCell><Input value={s.customer_id ?? ''} onChange={(e) => update(s.id, { customer_id: e.target.value })}/></TableCell>
                <TableCell><Input value={s.customer_name ?? ''} onChange={(e) => update(s.id, { customer_name: e.target.value })}/></TableCell>
                <TableCell><Checkbox checked={!!s.high_risk_identified} onCheckedChange={(v) => update(s.id, { high_risk_identified: !!v })}/></TableCell>
                <TableCell><Textarea rows={1} className="min-h-[40px]" value={s.high_risk_reason ?? ''} onChange={(e) => update(s.id, { high_risk_reason: e.target.value })}/></TableCell>
                <TableCell><Checkbox checked={!!s.source_of_funds_obtained} onCheckedChange={(v) => update(s.id, { source_of_funds_obtained: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.source_of_wealth_required} onCheckedChange={(v) => update(s.id, { source_of_wealth_required: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.source_of_wealth_obtained} onCheckedChange={(v) => update(s.id, { source_of_wealth_obtained: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.transaction_review_conducted} onCheckedChange={(v) => update(s.id, { transaction_review_conducted: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.senior_mgmt_approval} onCheckedChange={(v) => update(s.id, { senior_mgmt_approval: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.supporting_docs_retained} onCheckedChange={(v) => update(s.id, { supporting_docs_retained: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.evidence_aligns_policy} onCheckedChange={(v) => update(s.id, { evidence_aligns_policy: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.adverse_media_conducted} onCheckedChange={(v) => update(s.id, { adverse_media_conducted: !!v })}/></TableCell>
                <TableCell><Checkbox checked={!!s.enhanced_monitoring} onCheckedChange={(v) => update(s.id, { enhanced_monitoring: !!v })}/></TableCell>
                <TableCell><Textarea rows={1} className="min-h-[40px]" value={s.notes ?? ''} onChange={(e) => update(s.id, { notes: e.target.value })}/></TableCell>
                <TableCell>{s.policy_compliance_result && <Badge variant={s.policy_compliance_result === 'pass' ? 'default' : s.policy_compliance_result === 'partial' ? 'secondary' : 'destructive'} className="uppercase">{s.policy_compliance_result}</Badge>}</TableCell>
                <TableCell>{s.best_practice_result && <Badge variant={s.best_practice_result === 'pass' ? 'default' : s.best_practice_result === 'partial' ? 'secondary' : 'destructive'} className="uppercase">{s.best_practice_result}</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => saveRow(s)}><Save className="w-4 h-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {samples.length === 0 && (
              <TableRow><TableCell colSpan={17} className="text-center text-muted-foreground text-sm py-6">No EDD samples yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
