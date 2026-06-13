import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PolicyExistenceSectionProps {
  reviewId: string;
  data: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

const QUESTIONS = [
  { key: 'has_documented_policy', text: 'Does the Company maintain a documented AML training policy or program?', required: true },
  { key: 'policy_approved', text: 'Is the AML training policy approved by senior management or the Board?', options: ['yes', 'no', 'n_a'] },
  { key: 'policy_aligned_with_pcmltfa', text: 'Is the training policy aligned with PCMLTFA and FINTRAC guidance?', options: ['yes', 'no', 'partial'] },
  { key: 'defines_mandatory_requirements', text: 'Does the policy define mandatory AML training requirements?' },
  { key: 'defines_who_must_be_trained', text: 'Does the policy define who must be trained (roles, staff categories)?', options: ['yes', 'no', 'partial'] },
  { key: 'defines_training_frequency', text: 'Does the policy define training frequency?', options: ['yes', 'no', 'partial'] },
  { key: 'assigns_ownership', text: 'Does the policy assign ownership (Compliance Officer / HR / Other)?' },
  { key: 'addresses_onboarding_vs_refresher', text: 'Does the policy address onboarding vs refresher training?', options: ['yes', 'no', 'partial'] },
  { key: 'requires_updates_on_change', text: 'Does the policy require training updates upon regulatory or business change?', options: ['yes', 'no', 'partial'] },
  { key: 'policy_accessible', text: 'Is the policy accessible to staff?', options: ['yes', 'no', 'partial'] },
];

export function PolicyExistenceSection({ reviewId, data, onSave, saving }: PolicyExistenceSectionProps) {
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
    if (formData.has_documented_policy === false) {
      flags.push('No documented AML training policy - High Severity');
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
        <CardTitle className="flex items-center gap-2">
          Section 1: Training Policy Existence and Governance
        </CardTitle>
        <CardDescription>
          Confirm AML training is formally documented, approved, and governed
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
