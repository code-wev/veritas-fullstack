import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Sample {
  id: string;
  sample_number: number;
  test_name: string;
  list_source: string | null;
  list_status: string | null;
  date_added_to_list: string | null;
  date_removed_from_list: string | null;
  expected_result: string | null;
  system_flagged: boolean | null;
  match_type: string | null;
  test_result: string | null;
  notes: string | null;
}

interface Props {
  reviewId: string;
}

const LIST_SOURCES = [
  { v: 'canada_sanctions', l: 'Canada Sanctions' },
  { v: 'ofac', l: 'OFAC (US)' },
  { v: 'un', l: 'UN Sanctions' },
  { v: 'uk_hmt', l: 'UK HMT' },
  { v: 'pep', l: 'PEP' },
  { v: 'hio', l: 'HIO' },
  { v: 'adverse_media', l: 'Adverse Media' },
  { v: 'other', l: 'Other' },
];

const LIST_STATUS = [
  { v: 'active', l: 'Active' },
  { v: 'recently_added', l: 'Recently added' },
  { v: 'recently_removed', l: 'Recently removed' },
  { v: 'pep', l: 'PEP' },
  { v: 'hio', l: 'HIO' },
  { v: 'close_associate', l: 'Close associate' },
];

export function ScreeningSampleTable({ reviewId }: Props) {
  const { toast } = useToast();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_screening_samples')
      .select('*')
      .eq('review_id', reviewId)
      .order('sample_number', { ascending: true });
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setSamples((data as Sample[]) ?? []);
    setLoading(false);
  };

  const addSample = async () => {
    const next = (samples[samples.length - 1]?.sample_number ?? 0) + 1;
    const { data, error } = await supabase
      .from('tm_screening_samples')
      .insert({ review_id: reviewId, sample_number: next, test_name: `Test name ${next}` })
      .select('*')
      .single();
    if (error) {
      toast({ title: 'Failed to add', description: error.message, variant: 'destructive' });
      return;
    }
    setSamples((s) => [...s, data as Sample]);
  };

  const seedTen = async () => {
    if (samples.length > 0) return;
    const rows = Array.from({ length: 10 }, (_, i) => ({
      review_id: reviewId,
      sample_number: i + 1,
      test_name: `Test name ${i + 1}`,
    }));
    const { data, error } = await supabase.from('tm_screening_samples').insert(rows).select('*');
    if (error) {
      toast({ title: 'Failed to seed', description: error.message, variant: 'destructive' });
      return;
    }
    setSamples((data as Sample[]) ?? []);
  };

  const update = (id: string, patch: Partial<Sample>) => {
    setSamples((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const recomputeResult = (s: Sample): string | null => {
    if (s.expected_result == null || s.system_flagged == null) return s.test_result;
    const expectedFlag = s.expected_result === 'should_flag';
    return expectedFlag === s.system_flagged ? 'pass' : 'fail';
  };

  const saveRow = async (s: Sample) => {
    const test_result = recomputeResult(s);
    const { error } = await supabase
      .from('tm_screening_samples')
      .update({
        test_name: s.test_name,
        list_source: s.list_source,
        list_status: s.list_status,
        date_added_to_list: s.date_added_to_list,
        date_removed_from_list: s.date_removed_from_list,
        expected_result: s.expected_result,
        system_flagged: s.system_flagged,
        match_type: s.match_type,
        test_result,
        notes: s.notes,
      })
      .eq('id', s.id);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    update(s.id, { test_result });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('tm_screening_samples').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setSamples((rows) => rows.filter((r) => r.id !== id));
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading samples…</div>;

  const passCount = samples.filter((s) => s.test_result === 'pass').length;
  const failCount = samples.filter((s) => s.test_result === 'fail').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base">Name Testing Execution (Core Test)</CardTitle>
            <CardDescription>
              For each test name, document the expected vs actual system result. Pass = system behaved as
              expected. Fail = system missed a sanctioned name OR still flagged a removed name.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{samples.length} samples</Badge>
            <Badge variant="default">{passCount} pass</Badge>
            <Badge variant="destructive">{failCount} fail</Badge>
            {samples.length === 0 && (
              <Button size="sm" variant="secondary" onClick={seedTen}>
                Seed 10 rows
              </Button>
            )}
            <Button size="sm" onClick={addSample}>
              <Plus className="w-4 h-4 mr-1" /> Add name
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[160px]">Test name</TableHead>
              <TableHead className="min-w-[140px]">List source</TableHead>
              <TableHead className="min-w-[140px]">List status</TableHead>
              <TableHead className="min-w-[120px]">Date added</TableHead>
              <TableHead className="min-w-[120px]">Date removed</TableHead>
              <TableHead className="min-w-[140px]">Expected</TableHead>
              <TableHead className="min-w-[120px]">System flagged?</TableHead>
              <TableHead className="min-w-[120px]">Match type</TableHead>
              <TableHead className="min-w-[200px]">Notes</TableHead>
              <TableHead className="w-24">Result</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.sample_number}</TableCell>
                <TableCell>
                  <Input value={s.test_name} onChange={(e) => update(s.id, { test_name: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Select value={s.list_source ?? ''} onValueChange={(v) => update(s.id, { list_source: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {LIST_SOURCES.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={s.list_status ?? ''} onValueChange={(v) => update(s.id, { list_status: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {LIST_STATUS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={s.date_added_to_list ?? ''}
                    onChange={(e) => update(s.id, { date_added_to_list: e.target.value || null })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={s.date_removed_from_list ?? ''}
                    onChange={(e) => update(s.id, { date_removed_from_list: e.target.value || null })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={s.expected_result ?? ''}
                    onValueChange={(v) => update(s.id, { expected_result: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="should_flag">Should flag</SelectItem>
                      <SelectItem value="should_not_flag">Should NOT flag</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={s.system_flagged == null ? '' : s.system_flagged ? 'yes' : 'no'}
                    onValueChange={(v) => update(s.id, { system_flagged: v === 'yes' })}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={s.match_type ?? ''} onValueChange={(v) => update(s.id, { match_type: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">Exact</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="fuzzy">Fuzzy</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Textarea
                    rows={1}
                    className="min-h-[40px]"
                    value={s.notes ?? ''}
                    onChange={(e) => update(s.id, { notes: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  {s.test_result && (
                    <Badge variant={s.test_result === 'pass' ? 'default' : 'destructive'} className="uppercase">
                      {s.test_result}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => saveRow(s)}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {samples.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-6">
                  No test names yet. Click "Seed 10 rows" to start with the recommended minimum sample.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
