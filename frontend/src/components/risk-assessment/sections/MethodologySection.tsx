import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Review {
  defines_ml_tf_risk: string | null;
  distinguishes_inherent_residual: string | null;
  defines_likelihood_assessment: string | null;
  defines_impact_assessment: string | null;
  uses_scoring_model: string | null;
  scoring_reproducible: string | null;
  weights_explained: string | null;
  ratings_documented_rationale: string | null;
  risk_tolerance_statement: string | null;
  risk_tolerance_approved: string | null;
  risk_acceptance_process: string | null;
  likelihood_impact_matrix: string | null;
}

interface MethodologySectionProps {
  review: Review;
  onUpdate: (updates: Partial<Review>) => void;
}

export function MethodologySection({ review, onUpdate }: MethodologySectionProps) {
  const showAutoFlags = () => {
    const flags: string[] = [];
    if (review.distinguishes_inherent_residual === 'no') {
      flags.push('Inherent vs residual risk not differentiated - Medium Severity');
    }
    if (review.scoring_reproducible === 'no') {
      flags.push('Risk scoring not reproducible or not documented - Medium Severity');
    }
    if (review.risk_tolerance_statement === 'no') {
      flags.push('Risk tolerance not defined - Medium Severity');
    }
    return flags;
  };

  const autoFlags = showAutoFlags();

  const questions = [
    { id: 'defines_ml_tf_risk', num: 1, text: 'Does the RBA define "risk" in ML/TF terms?', options: ['yes', 'no', 'partial'] },
    { id: 'distinguishes_inherent_residual', num: 2, text: 'Does the RBA distinguish inherent risk from residual risk?', options: ['yes', 'no'] },
    { id: 'defines_likelihood_assessment', num: 3, text: 'Does the RBA define how likelihood is assessed?', options: ['yes', 'no', 'partial'] },
    { id: 'defines_impact_assessment', num: 4, text: 'Does the RBA define how impact is assessed (regulatory, legal, reputational, financial)?', options: ['yes', 'no', 'partial'] },
    { id: 'uses_scoring_model', num: 5, text: 'Does the RBA use a scoring model or risk scale (Low, Medium, High or equivalent)?', options: ['yes', 'no'] },
    { id: 'scoring_reproducible', num: 6, text: 'Is the scoring model documented clearly enough to reproduce outcomes?', options: ['yes', 'no', 'partial'] },
    { id: 'weights_explained', num: 7, text: 'Are weights or prioritization rules explained if used?', options: ['yes', 'no', 'na'] },
    { id: 'ratings_documented_rationale', num: 8, text: 'Are risk ratings supported by documented rationale?', options: ['yes', 'no', 'partial'] },
    { id: 'risk_tolerance_statement', num: 9, text: 'Does the RBA include a risk tolerance or risk appetite statement?', options: ['yes', 'no', 'partial'] },
    { id: 'risk_tolerance_approved', num: 10, text: 'If risk tolerance exists, is it approved by senior management?', options: ['yes', 'no', 'na'] },
    { id: 'risk_acceptance_process', num: 11, text: 'Does the RBA include a process for risk acceptance when residual risk exceeds tolerance?', options: ['yes', 'no', 'na'] },
    { id: 'likelihood_impact_matrix', num: 12, text: 'Is a likelihood-impact matrix used or an equivalent decision tool?', options: ['yes', 'no', 'optional'] },
  ];

  const getOptionLabel = (option: string) => {
    const labels: Record<string, string> = {
      yes: 'Yes',
      no: 'No',
      partial: 'Partial',
      na: 'N/A',
      optional: 'Optional',
    };
    return labels[option] || option;
  };

  return (
    <div className="space-y-6">
      {autoFlags.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Auto-Flagged Issues:</strong>
            <ul className="list-disc ml-4 mt-2">
              {autoFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {questions.map((q) => (
        <div key={q.id} className="space-y-3">
          <Label className="text-base font-medium">
            {q.num}. {q.text}
          </Label>
          <RadioGroup
            value={(review as any)[q.id] || ''}
            onValueChange={(value) => onUpdate({ [q.id]: value })}
            className="flex flex-wrap gap-4"
          >
            {q.options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${q.id}_${option}`} />
                <Label htmlFor={`${q.id}_${option}`}>{getOptionLabel(option)}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
    </div>
  );
}
