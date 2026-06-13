import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TrainingEffectivenessSectionProps {
  reviewId: string;
  data: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

const QUESTIONS = [
  { key: 'knowledge_assessments_used', text: 'Are knowledge assessments or tests used?', options: ['yes', 'no', 'partial'] },
  { key: 'assessment_results_retained', text: 'Are assessment results retained?', options: ['yes', 'no', 'partial'] },
  { key: 'required_to_pass', text: 'Are staff required to pass training assessments?', options: ['yes', 'no', 'n_a'] },
  { key: 'retraining_applied', text: 'Are retraining or remediation steps applied when staff fail?', options: ['yes', 'no', 'partial'] },
  { key: 'errors_linked_to_training_gaps', text: 'Are AML errors or incidents linked back to training gaps?', options: ['yes', 'no', 'partial'] },
  { key: 'str_quality_informs_updates', text: 'Are STR quality issues used to inform training updates?', options: ['yes', 'no', 'partial'] },
  { key: 'feedback_collected', text: 'Is training feedback collected from participants?', options: ['yes', 'no', 'partial'] },
  { key: 'materials_refreshed_on_incidents', text: 'Are training materials refreshed based on incidents or findings?', options: ['yes', 'no', 'partial'] },
  { key: 'training_improved_awareness', text: 'Is there evidence training improved awareness or escalation?', options: ['yes', 'no', 'partial'] },
  { key: 'management_reviews_effectiveness', text: 'Does management review training effectiveness?', options: ['yes', 'no', 'partial'] },
];

export function TrainingEffectivenessSection({ reviewId, data, onSave, saving }: TrainingEffectivenessSectionProps) {
  const [formData, setFormData] = useState<Record<string, boolean | null>>({});
  const [autoFlags, setAutoFlags] = useState<string[]>([]);

  useEffect(() => {
    const initial: Record<string, boolean | null> = {};
    QUESTIONS.forEach(q => {
      initial[q.key] = data[q.key] ?? null;
    });
    setFormData(initial);
  }, [data]);

  useEffect(() => {
    const flags: string[] = [];
    if (formData.knowledge_assessments_used === false && formData.errors_linked_to_training_gaps === true) {
      flags.push('No mechanism to assess training effectiveness - Medium Severity');
    }
    setAutoFlags(flags);
  }, [formData]);

  const handleChange = (key: string, value: string) => {
    const boolValue = value === 'yes' ? true : value === 'no' ? false : null;
    setFormData(prev => ({ ...prev, [key]: boolValue }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const getValueString = (value: boolean | null): string => {
    if (value === true) return 'yes';
    if (value === false) return 'no';
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Section 4: Training Effectiveness and Assessment</CardTitle>
        <CardDescription>
          Confirm training effectiveness is measured and reinforced
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {autoFlags.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-600 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Auto-Flagged Issues
            </div>
            <ul className="list-disc list-inside text-sm text-amber-600">
              {autoFlags.map((flag, i) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-6">
          {QUESTIONS.map((question, index) => (
            <div key={question.key} className="space-y-3 pb-4 border-b last:border-0">
              <Label className="text-sm font-medium">
                {index + 1}. {question.text}
              </Label>
              <RadioGroup
                value={getValueString(formData[question.key])}
                onValueChange={(value) => handleChange(question.key, value)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${question.key}-yes`} />
                  <Label htmlFor={`${question.key}-yes`} className="font-normal">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${question.key}-no`} />
                  <Label htmlFor={`${question.key}-no`} className="font-normal">No</Label>
                </div>
                {question.options?.includes('partial') && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id={`${question.key}-partial`} />
                    <Label htmlFor={`${question.key}-partial`} className="font-normal">Partial</Label>
                  </div>
                )}
                {question.options?.includes('n_a') && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="n_a" id={`${question.key}-na`} />
                    <Label htmlFor={`${question.key}-na`} className="font-normal">N/A</Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Section'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
