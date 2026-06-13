import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Props {
  reviewId: string;
  review: {
    overall_assessment: string | null;
    summary_for_report: string | null;
    status: string;
  };
  onUpdate: (updates: Record<string, unknown>) => void;
}

interface Stats {
  total: number;
  answered: number;
  deficiencies: number;
  points: number;
  maxPoints: number;
}

export function TrainingSummaryStep({ reviewId, review, onUpdate }: Props) {
  const [stats, setStats] = useState<Stats>({ total: 0, answered: 0, deficiencies: 0, points: 0, maxPoints: 0 });

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const loadStats = async () => {
    const { data } = await supabase
      .from('training_control_results')
      .select('response, points_achieved, max_points, deficiency_flag')
      .eq('review_id', reviewId);
    if (!data) return;
    setStats({
      total: data.length,
      answered: data.filter((r) => r.response).length,
      deficiencies: data.filter((r) => r.deficiency_flag).length,
      points: data.reduce((s, r) => s + (r.points_achieved ?? 0), 0),
      maxPoints: data.reduce((s, r) => s + r.max_points, 0),
    });
  };

  const scorePct = stats.maxPoints > 0 ? Math.round((stats.points / stats.maxPoints) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Questions</div><div className="text-2xl font-bold">{stats.answered}/{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Deficiencies</div><div className="text-2xl font-bold text-destructive">{stats.deficiencies}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Score</div><div className="text-2xl font-bold">{stats.points}/{stats.maxPoints}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">% Effective</div><div className="text-2xl font-bold">{scorePct}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall Assessment</CardTitle>
          <CardDescription>Conclude the review and prepare narrative for the audit report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Overall Effectiveness Rating</Label>
            <Select
              value={review.overall_assessment ?? ''}
              onValueChange={(v) => onUpdate({ overall_assessment: v })}
            >
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="effective">Effective</SelectItem>
                <SelectItem value="partially_effective">Partially Effective</SelectItem>
                <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                <SelectItem value="ineffective">Ineffective</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Summary for Audit Report</Label>
            <Textarea
              rows={8}
              placeholder="Narrative summary of the training program review — strengths, gaps, conclusions..."
              value={review.summary_for_report ?? ''}
              onChange={(e) => onUpdate({ summary_for_report: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Label>Status:</Label>
            <Badge variant={review.status === 'completed' ? 'default' : 'outline'}>{review.status}</Badge>
            <Select
              value={review.status}
              onValueChange={(v) => onUpdate({ status: v })}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
