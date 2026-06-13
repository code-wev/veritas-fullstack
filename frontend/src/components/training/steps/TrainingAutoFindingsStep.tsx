import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, FileCheck, Plus, Trash2 } from 'lucide-react';

interface Deficiency {
  id: string;
  section_name: string;
  control_area: string;
  control_objective: string;
  comments: string | null;
  observation_best_practice: string | null;
  response: string | null;
}

interface ManualFinding {
  id: string;
  title: string;
  description: string;
  severity: string;
  recommendation: string;
}

interface Props {
  reviewId: string;
  engagementId: string;
}

export function TrainingAutoFindingsStep({ reviewId, engagementId }: Props) {
  const { toast } = useToast();
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [manualFindings, setManualFindings] = useState<ManualFinding[]>([]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_control_results')
        .select('id, section_name, control_area, control_objective, comments, observation_best_practice, response')
        .eq('review_id', reviewId)
        .eq('deficiency_flag', true)
        .order('sort_order');
      if (error) throw error;
      setDeficiencies((data ?? []) as Deficiency[]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load deficiencies', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addManual = () => {
    setManualFindings((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: '', description: '', severity: 'medium', recommendation: '' },
    ]);
  };

  const updateManual = (id: string, updates: Partial<ManualFinding>) => {
    setManualFindings((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const removeManual = (id: string) => {
    setManualFindings((prev) => prev.filter((m) => m.id !== id));
  };

  const pushToFindings = async () => {
    setPushing(true);
    try {
      const autoRows = deficiencies.map((d) => ({
        engagement_id: engagementId,
        module: 'training',
        submodule: d.section_name,
        title: `${d.section_name}: ${d.control_area}`,
        observation: d.comments || d.control_objective,
        description: d.comments || d.control_objective,
        recommendation: d.observation_best_practice ?? null,
        severity: d.response === 'fail' ? 'high' : 'medium',
        original_severity: d.response === 'fail' ? 'high' : 'medium',
        status: 'draft',
        date_identified: new Date().toISOString().slice(0, 10),
      }));
      const manualRows = manualFindings
        .filter((m) => m.title.trim())
        .map((m) => ({
          engagement_id: engagementId,
          module: 'training',
          submodule: 'Manual',
          title: m.title,
          observation: m.description,
          description: m.description,
          recommendation: m.recommendation,
          severity: m.severity,
          original_severity: m.severity,
          status: 'draft',
          date_identified: new Date().toISOString().slice(0, 10),
        }));
      const all = [...autoRows, ...manualRows];
      if (all.length === 0) {
        toast({ title: 'Nothing to push', description: 'No deficiencies or manual findings to send.' });
        return;
      }
      const { error } = await supabase.from('findings').insert(all);
      if (error) throw error;
      toast({ title: 'Pushed', description: `${all.length} findings sent to the Findings module.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to push findings', variant: 'destructive' });
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Auto-Generated Deficiencies ({deficiencies.length})
          </CardTitle>
          <CardDescription>
            All checklist items marked Fail or Partial. These flow into the Findings module and Audit Report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {deficiencies.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No deficiencies identified yet. Complete the checklist in Step 2.
            </div>
          ) : (
            deficiencies.map((d) => (
              <div key={d.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="mr-2">{d.section_name}</Badge>
                    <span className="font-semibold text-sm">{d.control_area}</span>
                  </div>
                  {d.response && <Badge variant="destructive" className="text-xs">{d.response}</Badge>}
                </div>
                {d.comments && <div className="text-sm text-muted-foreground">{d.comments}</div>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Additional Findings & Observations</CardTitle>
              <CardDescription>Manually add findings not captured by the checklist.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addManual}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {manualFindings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No manual findings yet.
            </div>
          ) : (
            manualFindings.map((m) => (
              <div key={m.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Finding title"
                      value={m.title}
                      onChange={(e) => updateManual(m.id, { title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description / observation"
                      rows={2}
                      value={m.description}
                      onChange={(e) => updateManual(m.id, { description: e.target.value })}
                    />
                    <Textarea
                      placeholder="Recommendation"
                      rows={2}
                      value={m.recommendation}
                      onChange={(e) => updateManual(m.id, { recommendation: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Severity:</Label>
                      <Select value={m.severity} onValueChange={(v) => updateManual(m.id, { severity: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeManual(m.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={pushToFindings} disabled={pushing}>
          <FileCheck className="w-4 h-4 mr-1" />
          {pushing ? 'Pushing...' : 'Push to Findings Module'}
        </Button>
      </div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}
