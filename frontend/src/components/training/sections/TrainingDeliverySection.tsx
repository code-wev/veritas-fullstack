import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TrainingDeliverySectionProps {
  reviewId: string;
  data: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

const QUESTIONS = [
  { key: 'training_delivered_in_period', text: 'Was AML training delivered during the review period?', required: true },
  { key: 'delivered_to_all_required_staff', text: 'Was training delivered to all required staff categories?', options: ['yes', 'no', 'partial'] },
  { key: 'onboarding_training_delivered', text: 'Was onboarding AML training delivered to new hires?', options: ['yes', 'no', 'partial'] },
  { key: 'refresher_trainings_delivered', text: 'Were refresher trainings delivered as required?', options: ['yes', 'no', 'partial'] },
  { key: 'delivered_before_duties', text: 'Was training delivered before staff assumed AML-relevant duties?', options: ['yes', 'no', 'partial'] },
  { key: 'delivery_tracked', text: 'Was training delivery tracked and documented?' },
  { key: 'attendance_records_maintained', text: 'Were training attendance records maintained?' },
  { key: 'missed_trainings_remediated', text: 'Were missed trainings identified and remediated?', options: ['yes', 'no', 'partial'] },
  { key: 'third_party_trainers_qualified', text: 'Were third-party trainers qualified and appropriate?', options: ['yes', 'no', 'n_a'] },
  { key: 'suitable_format', text: 'Was training delivered in a suitable format (in-person, virtual, LMS)?', options: ['yes', 'no', 'partial'] },
  { key: 'training_mandatory', text: 'Was training mandatory or optional?' },
  { key: 'agents_trained', text: 'Were agents or third parties trained where applicable?', options: ['yes', 'no', 'n_a'] },
  { key: 'delivered_in_understood_language', text: 'Was training delivered in a language staff understand?', options: ['yes', 'no', 'partial'] },
  { key: 'completed_within_timelines', text: 'Is there evidence that training was completed within required timelines?', options: ['yes', 'no', 'partial'] },
];

export function TrainingDeliverySection({ reviewId, data, onSave, saving }: TrainingDeliverySectionProps) {
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
    if (formData.training_delivered_in_period === false) {
      flags.push('AML training not delivered during review period - High Severity');
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
        <CardTitle>Section 3: Training Delivery and Implementation</CardTitle>
        <CardDescription>
          Confirm training is actually delivered, not just designed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {autoFlags.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Auto-Flagged Issues
            </div>
            <ul className="list-disc list-inside text-sm text-destructive">
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
                {question.required && <span className="text-destructive ml-1">*</span>}
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
