import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  reviewId: string;
  submodule: string;
  submoduleLabel: string;
}

const RESULT_POINTS: Record<string, number> = { pass: 2, partial: 1, fail: 0, na: 0 };

export function SubmoduleSummaryCard({ reviewId, submodule, submoduleLabel }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<{
    test_result: string | null;
    summary_narrative: string | null;
    observation_best_practice: string | null;
    evidence_reviewed: string | null;
    document_reference: string | null;
    comments: string | null;
    deficiency_flag: boolean | null;
  }>({
    test_result: null,
    summary_narrative: '',
    observation_best_practice: '',
    evidence_reviewed: '',
    document_reference: '',
    comments: '',
    deficiency_flag: false,
  });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, submodule]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tm_submodule_status')
      .select('*')
      .eq('review_id', reviewId)
      .eq('submodule', submodule)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    }
    if (data) setRow({ ...row, ...data });
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const points = row.test_result ? RESULT_POINTS[row.test_result] ?? null : null;
    const { error } = await supabase.from('tm_submodule_status').upsert(
      {
        review_id: reviewId,
        submodule,
        status: 'reviewed',
        test_result: row.test_result,
        points_achieved: points,
        max_points: 2,
        deficiency_flag: row.test_result === 'fail' || row.test_result === 'partial',
        summary_narrative: row.summary_narrative,
        observation_best_practice: row.observation_best_practice,
        evidence_reviewed: row.evidence_reviewed,
        document_reference: row.document_reference,
        comments: row.comments,
      },
      { onConflict: 'review_id,submodule' },
    );
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved' });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const points = row.test_result ? RESULT_POINTS[row.test_result] ?? 0 : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{submoduleLabel} — Result & Summary</CardTitle>
            <CardDescription>Overall test result, score, and summary narrative for the audit report.</CardDescription>
          </div>
          {row.test_result && (
            <Badge
              variant={
                row.test_result === 'pass'
                  ? 'default'
                  : row.test_result === 'partial'
                    ? 'secondary'
                    : row.test_result === 'fail'
                      ? 'destructive'
                      : 'outline'
              }
              className="uppercase"
            >
              {row.test_result} {points !== null && `· ${points}/2`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Test Result</Label>
            <Select
              value={row.test_result ?? ''}
              onValueChange={(v) => setRow((r) => ({ ...r, test_result: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass (2)</SelectItem>
                <SelectItem value="partial">Partial (1)</SelectItem>
                <SelectItem value="fail">Fail (0)</SelectItem>
                <SelectItem value="na">N/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Document Reference</Label>
            <Textarea
              value={row.document_reference ?? ''}
              onChange={(e) => setRow((r) => ({ ...r, document_reference: e.target.value }))}
              rows={1}
            />
          </div>
        </div>
        <div>
          <Label>Evidence Reviewed</Label>
          <Textarea
            value={row.evidence_reviewed ?? ''}
            onChange={(e) => setRow((r) => ({ ...r, evidence_reviewed: e.target.value }))}
            rows={2}
          />
        </div>
        <div>
          <Label>Summary Narrative (for audit report)</Label>
          <Textarea
            value={row.summary_narrative ?? ''}
            onChange={(e) => setRow((r) => ({ ...r, summary_narrative: e.target.value }))}
            rows={3}
          />
        </div>
        <div>
          <Label>Observation / Best Practice</Label>
          <Textarea
            value={row.observation_best_practice ?? ''}
            onChange={(e) => setRow((r) => ({ ...r, observation_best_practice: e.target.value }))}
            rows={2}
          />
        </div>
        <div>
          <Label>Other Comments</Label>
          <Textarea
            value={row.comments ?? ''}
            onChange={(e) => setRow((r) => ({ ...r, comments: e.target.value }))}
            rows={2}
          />
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
