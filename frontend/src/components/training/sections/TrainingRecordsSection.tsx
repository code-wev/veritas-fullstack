import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TrainingRecordsSectionProps {
  reviewId: string;
  data: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

const QUESTIONS = [
  { key: 'records_retained_per_requirements', text: 'Are training records retained in accordance with recordkeeping requirements?' },
  { key: 'records_centralized', text: 'Are records centralized and retrievable?', options: ['yes', 'no', 'partial'] },
  { key: 'records_show_who_when_what', text: 'Do records show who was trained, when, and on what content?', options: ['yes', 'no', 'partial'] },
  { key: 'records_protected', text: 'Are records protected from unauthorized modification?', options: ['yes', 'no', 'partial'] },
  { key: 'records_available_for_fintrac', text: 'Are records available for FINTRAC examination on request?' },
  { key: 'records_retained_required_periods', text: 'Are records retained for required periods?', options: ['yes', 'no', 'partial'] },
  { key: 'exceptions_documented', text: 'Are training exceptions documented and approved?', options: ['yes', 'no', 'n_a'] },
  { key: 'evidence_linked_to_program_review', text: 'Is training evidence linked to the compliance program review?', options: ['yes', 'no', 'partial'] },
];

export function TrainingRecordsSection({ reviewId, data, onSave, saving }: TrainingRecordsSectionProps) {
  const [formData, setFormData] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    const initial: Record<string, boolean | null> = {};
    QUESTIONS.forEach(q => {
      initial[q.key] = data[q.key] ?? null;
    });
    setFormData(initial);
  }, [data]);

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
        <CardTitle>Section 5: Training Records and Audit Trail</CardTitle>
        <CardDescription>
          Ensure training is auditable and defensible
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
