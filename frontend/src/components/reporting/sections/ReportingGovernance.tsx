import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportingGovernanceProps {
  reviewId: string;
}

interface GovernanceData {
  id?: string;
  review_id: string;
  // Training
  training_program_exists: boolean | null;
  training_covers_reporting_types: boolean | null;
  training_notes: string | null;
  // Procedures
  procedures_documented: boolean | null;
  procedures_cover_identification: boolean | null;
  procedures_cover_escalation: boolean | null;
  procedures_cover_filing: boolean | null;
  procedures_notes: string | null;
  // QA
  qa_process_exists: boolean | null;
  qa_frequency: string | null;
  qa_covers_completeness: boolean | null;
  qa_covers_accuracy: boolean | null;
  qa_covers_timeliness: boolean | null;
  qa_notes: string | null;
  // Escalation
  escalation_process_documented: boolean | null;
  escalation_roles_defined: boolean | null;
  escalation_timelines_defined: boolean | null;
  escalation_notes: string | null;
  // Overall
  overall_assessment: string | null;
  summary_narrative: string | null;
}

const emptyGovernance = (reviewId: string): GovernanceData => ({
  review_id: reviewId,
  training_program_exists: null,
  training_covers_reporting_types: null,
  training_notes: null,
  procedures_documented: null,
  procedures_cover_identification: null,
  procedures_cover_escalation: null,
  procedures_cover_filing: null,
  procedures_notes: null,
  qa_process_exists: null,
  qa_frequency: null,
  qa_covers_completeness: null,
  qa_covers_accuracy: null,
  qa_covers_timeliness: null,
  qa_notes: null,
  escalation_process_documented: null,
  escalation_roles_defined: null,
  escalation_timelines_defined: null,
  escalation_notes: null,
  overall_assessment: null,
  summary_narrative: null,
});

function CheckboxField({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: boolean | null; 
  onChange: (checked: boolean | null) => void 
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={value === true} onCheckedChange={() => onChange(true)} />
          Yes
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={value === false} onCheckedChange={() => onChange(false)} />
          No
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={value === null} onCheckedChange={() => onChange(null)} />
          N/A
        </label>
      </div>
    </div>
  );
}

export function ReportingGovernance({ reviewId }: ReportingGovernanceProps) {
  const [data, setData] = useState<GovernanceData>(emptyGovernance(reviewId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGovernance();
  }, [reviewId]);

  const fetchGovernance = async () => {
    try {
      const { data: existing, error } = await supabase
        .from('reporting_governance')
        .select('*')
        .eq('review_id', reviewId)
        .maybeSingle();

      if (error) throw error;
      if (existing) {
        setData(existing);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading governance data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof GovernanceData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (data.id) {
        const { error } = await supabase
          .from('reporting_governance')
          .update(data)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('reporting_governance')
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        setData(created);
      }
      toast({ title: 'Governance assessment saved' });
    } catch (error: any) {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reporting Controls & Governance</CardTitle>
          <CardDescription>
            Assess whether reporting controls are operationalized across training, procedures, QA, and escalation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted">
              <span className="font-medium">Training Program</span>
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pt-3 space-y-3">
              <CheckboxField
                label="Training program exists for reporting obligations"
                value={data.training_program_exists}
                onChange={(v) => handleChange('training_program_exists', v)}
              />
              <CheckboxField
                label="Training covers all applicable report types (LCTR, EFTR, STR, LVCTR)"
                value={data.training_covers_reporting_types}
                onChange={(v) => handleChange('training_covers_reporting_types', v)}
              />
              <div className="space-y-2 pt-2">
                <Label>Training Notes</Label>
                <Textarea
                  value={data.training_notes || ''}
                  onChange={(e) => handleChange('training_notes', e.target.value)}
                  placeholder="Document training program observations..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Procedures Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted">
              <span className="font-medium">Procedures</span>
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pt-3 space-y-3">
              <CheckboxField
                label="Reporting procedures are documented"
                value={data.procedures_documented}
                onChange={(v) => handleChange('procedures_documented', v)}
              />
              <CheckboxField
                label="Procedures cover transaction identification"
                value={data.procedures_cover_identification}
                onChange={(v) => handleChange('procedures_cover_identification', v)}
              />
              <CheckboxField
                label="Procedures cover escalation process"
                value={data.procedures_cover_escalation}
                onChange={(v) => handleChange('procedures_cover_escalation', v)}
              />
              <CheckboxField
                label="Procedures cover filing requirements"
                value={data.procedures_cover_filing}
                onChange={(v) => handleChange('procedures_cover_filing', v)}
              />
              <div className="space-y-2 pt-2">
                <Label>Procedures Notes</Label>
                <Textarea
                  value={data.procedures_notes || ''}
                  onChange={(e) => handleChange('procedures_notes', e.target.value)}
                  placeholder="Document procedure observations..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* QA/Monitoring Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted">
              <span className="font-medium">QA / Monitoring</span>
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pt-3 space-y-3">
              <CheckboxField
                label="QA process exists for reporting"
                value={data.qa_process_exists}
                onChange={(v) => handleChange('qa_process_exists', v)}
              />
              <div className="space-y-2">
                <Label>QA Frequency</Label>
                <Select
                  value={data.qa_frequency || ''}
                  onValueChange={(v) => handleChange('qa_frequency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                    <SelectItem value="ad-hoc">Ad-hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CheckboxField
                label="QA covers completeness checks"
                value={data.qa_covers_completeness}
                onChange={(v) => handleChange('qa_covers_completeness', v)}
              />
              <CheckboxField
                label="QA covers accuracy checks"
                value={data.qa_covers_accuracy}
                onChange={(v) => handleChange('qa_covers_accuracy', v)}
              />
              <CheckboxField
                label="QA covers timeliness checks"
                value={data.qa_covers_timeliness}
                onChange={(v) => handleChange('qa_covers_timeliness', v)}
              />
              <div className="space-y-2 pt-2">
                <Label>QA Notes</Label>
                <Textarea
                  value={data.qa_notes || ''}
                  onChange={(e) => handleChange('qa_notes', e.target.value)}
                  placeholder="Document QA/monitoring observations..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Escalation Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted">
              <span className="font-medium">Escalation</span>
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pt-3 space-y-3">
              <CheckboxField
                label="Escalation process is documented"
                value={data.escalation_process_documented}
                onChange={(v) => handleChange('escalation_process_documented', v)}
              />
              <CheckboxField
                label="Escalation roles are clearly defined"
                value={data.escalation_roles_defined}
                onChange={(v) => handleChange('escalation_roles_defined', v)}
              />
              <CheckboxField
                label="Escalation timelines are defined"
                value={data.escalation_timelines_defined}
                onChange={(v) => handleChange('escalation_timelines_defined', v)}
              />
              <div className="space-y-2 pt-2">
                <Label>Escalation Notes</Label>
                <Textarea
                  value={data.escalation_notes || ''}
                  onChange={(e) => handleChange('escalation_notes', e.target.value)}
                  placeholder="Document escalation process observations..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Overall Assessment */}
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Overall Assessment</Label>
              <Select
                value={data.overall_assessment || ''}
                onValueChange={(v) => handleChange('overall_assessment', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="effective">Effective</SelectItem>
                  <SelectItem value="generally_effective">Generally Effective</SelectItem>
                  <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                  <SelectItem value="ineffective">Ineffective</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Summary Narrative</Label>
              <Textarea
                value={data.summary_narrative || ''}
                onChange={(e) => handleChange('summary_narrative', e.target.value)}
                placeholder="Summarize the overall assessment of reporting governance and controls..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Assessment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
