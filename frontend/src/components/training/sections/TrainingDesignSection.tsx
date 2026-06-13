import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TrainingDesignSectionProps {
  reviewId: string;
  data: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

const QUESTIONS = [
  { key: 'training_tailored_by_role', text: 'Is AML training tailored by role (Board, management, compliance, frontline)?', options: ['yes', 'no', 'partial'] },
  { key: 'enhanced_training_for_high_risk', text: 'Is enhanced training provided for higher-risk roles?', options: ['yes', 'no', 'partial'] },
  { key: 'aligned_with_risk_assessment', text: "Is training content aligned with the Company's ML/TF risk assessment?", options: ['yes', 'no', 'partial'] },
  { key: 'covers_reporting_obligations', text: 'Does training cover reporting obligations (STR, EFT, LCTR, LVCTR, LPEPR)?', options: ['yes', 'no', 'partial'] },
  { key: 'covers_client_identification', text: 'Does training cover client identification and beneficial ownership?', options: ['yes', 'no', 'partial'] },
  { key: 'addresses_sanctions_peps', text: 'Does training address sanctions, PEPs, and listed persons?', options: ['yes', 'no', 'partial'] },
  { key: 'includes_sector_specific_risks', text: 'Does training include sector-specific ML/TF risks?', options: ['yes', 'no', 'partial'] },
  { key: 'reflects_products_offered', text: 'Does training reflect products and services actually offered?', options: ['yes', 'no', 'partial'] },
  { key: 'incorporates_fintrac_guidance', text: 'Does training incorporate current FINTRAC guidance and advisories?', options: ['yes', 'no', 'partial'] },
  { key: 'updated_for_new_products', text: 'Is training updated when new products or technologies are introduced?', options: ['yes', 'no', 'partial'] },
  { key: 'includes_escalation_procedures', text: 'Does training include escalation and internal reporting procedures?', options: ['yes', 'no', 'partial'] },
  { key: 'content_reviewed_periodically', text: 'Is training content reviewed periodically?', options: ['yes', 'no', 'partial'] },
];

export function TrainingDesignSection({ reviewId, data, onSave, saving }: TrainingDesignSectionProps) {
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
    if (formData.training_tailored_by_role === false || formData.aligned_with_risk_assessment === false) {
      flags.push('Training not risk-based or role-specific - Medium Severity');
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
        <CardTitle>Section 2: Training Design and Risk Alignment</CardTitle>
        <CardDescription>
          Confirm training is risk-based, role-specific, and proportionate
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
