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

interface Item {
  id: string;
  source: string;
  source_reference: string | null;
  finding_description: string;
  recommendation: string | null;
  remediation_plan: string | null;
  target_date: string | null;
  actual_completion_date: string | null;
  implementation_status: string | null;
  evidence_available: boolean | null;
  timeline_met: boolean | null;
  effectiveness_status: string | null;
  residual_risk_notes: string | null;
  test_result: string | null;
  notes: string | null;
}

interface Props {
  reviewId: string;
  source: 'fintrac_exam' | 'prior_aml_review';
}

export function RemediationItemTable({ reviewId, source }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [reviewId, source]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_remediation_items').select('*')
      .eq('review_id', reviewId).eq('source', source).order('created_at');
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setItems((data as Item[]) ?? []);
    setLoading(false);
  };

  const add = async () => {
    const { data, error } = await supabase.from('tm_remediation_items')
      .insert({ review_id: reviewId, source, finding_description: 'New finding' }).select('*').single();
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setItems((s) => [...s, data as Item]);
  };

  const update = (id: string, patch: Partial<Item>) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const compute = (i: Item): string | null => {
    if (!i.implementation_status && !i.effectiveness_status) return null;
    const completed = i.implementation_status === 'completed';
    const evidence = !!i.evidence_available;
    const timeline = i.timeline_met !== false;
    const fully = i.effectiveness_status === 'fully_resolved';
    if (completed && evidence && timeline && fully) return 'pass';
    if (completed && evidence) return 'partial';
    return 'fail';
  };

  const saveRow = async (i: Item) => {
    const test_result = compute(i);
    const timeline_met = i.target_date && i.actual_completion_date
      ? new Date(i.actual_completion_date) <= new Date(i.target_date) : i.timeline_met;
    const { error } = await supabase.from('tm_remediation_items').update({ ...i, timeline_met, test_result }).eq('id', i.id);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    update(i.id, { timeline_met, test_result });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('tm_remediation_items').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setItems((rows) => rows.filter((r) => r.id !== id));
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const sourceLabel = source === 'fintrac_exam' ? 'FINTRAC Examination' : 'Previous AML Review';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">{sourceLabel} — Remediation Items</CardTitle>
            <CardDescription>One row per prior finding. Pass = completed, evidenced, on time, and fully resolved.</CardDescription>
          </div>
          <Button size="sm" onClick={add}><Plus className="w-4 h-4 mr-1"/>Add finding</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead className="min-w-[200px]">Finding</TableHead>
              <TableHead className="min-w-[180px]">Remediation plan</TableHead>
              <TableHead>Target date</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Evidence</TableHead>
              <TableHead>Effectiveness</TableHead>
              <TableHead className="min-w-[160px]">Residual risk</TableHead>
              <TableHead className="w-24">Result</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell><Input value={i.source_reference ?? ''} onChange={(e) => update(i.id, { source_reference: e.target.value })}/></TableCell>
                <TableCell><Textarea rows={1} className="min-h-[40px]" value={i.finding_description} onChange={(e) => update(i.id, { finding_description: e.target.value })}/></TableCell>
                <TableCell><Textarea rows={1} className="min-h-[40px]" value={i.remediation_plan ?? ''} onChange={(e) => update(i.id, { remediation_plan: e.target.value })}/></TableCell>
                <TableCell><Input type="date" value={i.target_date ?? ''} onChange={(e) => update(i.id, { target_date: e.target.value || null })}/></TableCell>
                <TableCell><Input type="date" value={i.actual_completion_date ?? ''} onChange={(e) => update(i.id, { actual_completion_date: e.target.value || null })}/></TableCell>
                <TableCell>
                  <Select value={i.implementation_status ?? ''} onValueChange={(v) => update(i.id, { implementation_status: v })}>
                    <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not started</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Checkbox checked={!!i.evidence_available} onCheckedChange={(v) => update(i.id, { evidence_available: !!v })}/></TableCell>
                <TableCell>
                  <Select value={i.effectiveness_status ?? ''} onValueChange={(v) => update(i.id, { effectiveness_status: v })}>
                    <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fully_resolved">Fully resolved</SelectItem>
                      <SelectItem value="partially_resolved">Partially resolved</SelectItem>
                      <SelectItem value="unresolved">Unresolved</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Textarea rows={1} className="min-h-[40px]" value={i.residual_risk_notes ?? ''} onChange={(e) => update(i.id, { residual_risk_notes: e.target.value })}/></TableCell>
                <TableCell>{i.test_result && <Badge variant={i.test_result === 'pass' ? 'default' : i.test_result === 'partial' ? 'secondary' : 'destructive'} className="uppercase">{i.test_result}</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => saveRow(i)}><Save className="w-4 h-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground text-sm py-6">No remediation items yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
