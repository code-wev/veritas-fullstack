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
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  engagementId: string;
  reviewId: string;
  submodule: string;
  submoduleLabel: string;
}

const RESULT_POINTS: Record<string, number> = { pass: 2, partial: 1, fail: 0, na: 0 };

export function SubmoduleSummaryCard({ engagementId, reviewId, submodule, submoduleLabel }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    const isDeficiency = row.test_result === 'fail' || row.test_result === 'partial';
    const isObservation = row.test_result === 'pass' && !!row.observation_best_practice?.trim();
    
    const findingTypeVal =
      row.test_result === 'fail'
        ? 'partial_important'
        : row.test_result === 'partial'
        ? 'partial_moderate'
        : isObservation
        ? 'observation'
        : null;

    // 1. Upsert submodule status
    const { error: statusErr } = await supabase.from('tm_submodule_status').upsert(
      {
        review_id: reviewId,
        submodule,
        status: 'reviewed',
        test_result: row.test_result,
        points_achieved: points,
        max_points: 2,
        deficiency_flag: isDeficiency,
        finding_type: findingTypeVal,
        summary_narrative: row.summary_narrative,
        observation_best_practice: row.observation_best_practice,
        evidence_reviewed: row.evidence_reviewed,
        document_reference: row.document_reference,
        comments: row.comments,
      },
      { onConflict: 'review_id,submodule' },
    );

    if (statusErr) {
      toast({ title: 'Save failed', description: statusErr.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // 2. Sync finding/deficiency to tm_findings which mirrors to central findings
    try {
      if (isDeficiency || isObservation) {
        const descParts = [];
        if (row.summary_narrative) descParts.push(`Summary narrative: ${row.summary_narrative}`);
        if (row.evidence_reviewed) descParts.push(`Evidence reviewed: ${row.evidence_reviewed}`);
        if (row.document_reference) descParts.push(`Document reference: ${row.document_reference}`);
        if (row.comments) descParts.push(`Comments: ${row.comments}`);
        const description = descParts.join('\n') || `Deficiency identified in ${submoduleLabel}.`;

        const severityVal =
          row.test_result === 'fail'
            ? 'high'
            : row.test_result === 'partial'
            ? 'medium'
            : 'observation';

        const { data: existingFind } = await supabase
          .from('tm_findings')
          .select('id')
          .eq('review_id', reviewId)
          .eq('submodule', submodule)
          .maybeSingle();

        const findingPayload = {
          engagement_id: engagementId,
          review_id: reviewId,
          submodule,
          finding_title: `${submoduleLabel} Deficiency`,
          finding_description: description,
          recommendation: row.observation_best_practice || null,
          severity: severityVal,
          finding_type: findingTypeVal,
          status: 'open',
          is_auto_generated: true,
        } as any;

        if (existingFind?.id) {
          const { error: findErr } = await supabase
            .from('tm_findings')
            .update(findingPayload)
            .eq('id', existingFind.id);
          if (findErr) throw findErr;
        } else {
          const { error: findErr } = await supabase
            .from('tm_findings')
            .insert(findingPayload);
          if (findErr) throw findErr;
        }
      } else {
        // Delete if exists since it's no longer a deficiency or observation
        const { error: delErr } = await supabase
          .from('tm_findings')
          .delete()
          .eq('review_id', reviewId)
          .eq('submodule', submodule);
        if (delErr) throw delErr;
      }

      queryClient.invalidateQueries({ queryKey: ['findings', engagementId] });
      toast({ title: 'Saved & synced findings' });
    } catch (findSyncErr: any) {
      console.error('[sync] failed:', findSyncErr);
      toast({ 
        title: 'Saved but failed to sync findings', 
        description: findSyncErr.message || 'Unknown error', 
        variant: 'destructive'
      });
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
