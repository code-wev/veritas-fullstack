import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import { ReportSample } from '../ReportTypeTesting';

interface STRDecisionReviewProps {
  formData: Partial<ReportSample>;
  onChange: (field: keyof ReportSample, value: any) => void;
}

interface STRCheck {
  field: keyof ReportSample;
  label: string;
  description: string;
  critical?: boolean;
}

const strChecks: STRCheck[] = [
  { 
    field: 'str_investigation_conducted', 
    label: 'Investigation Conducted', 
    description: 'Was an investigation conducted to assess the suspicious activity?',
    critical: true
  },
  { 
    field: 'str_suspicion_documented', 
    label: 'Suspicion Clearly Documented', 
    description: 'Is the basis for suspicion clearly documented in the file?',
    critical: true
  },
  { 
    field: 'str_rationale_documented', 
    label: 'Rationale Documented', 
    description: 'Is the rationale for filing (or not filing) an STR documented?',
    critical: true
  },
  { 
    field: 'str_escalation_performed', 
    label: 'Escalation Performed', 
    description: 'Was the suspicious activity escalated per policy (e.g., to Compliance Officer)?'
  },
  { 
    field: 'str_filed_promptly', 
    label: 'Filed Promptly', 
    description: 'Was the STR filed promptly after suspicion was formed?'
  },
];

export function STRDecisionReview({ formData, onChange }: STRDecisionReviewProps) {
  const hasCriticalFailure = strChecks.some(
    check => check.critical && formData[check.field] === false
  );

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        <p>STR Decision Review assesses whether the suspicion analysis and filing decision were appropriate.</p>
        <p className="mt-1 text-destructive">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          Suspicion exists + No STR + No documented rationale = Critical finding
        </p>
      </div>

      {hasCriticalFailure && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Critical STR Decision Weakness Detected</span>
          </div>
          <p className="text-sm text-destructive/80 mt-1">
            One or more critical STR decision criteria have failed. This may indicate a significant compliance gap.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {strChecks.map((check) => (
          <div key={check.field} className="p-4 border rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{check.label}</p>
                  {check.critical && (
                    <span className="text-xs text-destructive">(Critical)</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{check.description}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={formData[check.field] === true}
                    onCheckedChange={() => onChange(check.field, true)}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={formData[check.field] === false}
                    onCheckedChange={() => onChange(check.field, false)}
                  />
                  No
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={formData[check.field] === null}
                    onCheckedChange={() => onChange(check.field, null)}
                  />
                  N/A
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>STR Decision Notes</Label>
        <Textarea
          value={formData.str_decision_notes || ''}
          onChange={(e) => onChange('str_decision_notes', e.target.value)}
          placeholder="Document observations about the STR decision process, including any gaps in documentation, escalation, or rationale..."
          rows={4}
        />
      </div>
    </div>
  );
}
