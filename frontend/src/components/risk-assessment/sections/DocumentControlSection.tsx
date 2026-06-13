import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Review {
  rba_exists: boolean | null;
  document_titles: string | null;
  version_number: string | null;
  date_prepared: string | null;
  date_last_updated: string | null;
  updated_within_12_months: string | null;
  version_control_maintained: string | null;
  approved_by_senior_mgmt: string | null;
  approval_evidence_available: string | null;
  rba_retrievable: string | null;
}

interface DocumentControlSectionProps {
  review: Review;
  onUpdate: (updates: Partial<Review>) => void;
}

export function DocumentControlSection({ review, onUpdate }: DocumentControlSectionProps) {
  const showAutoFlags = () => {
    const flags: string[] = [];
    if (review.rba_exists === false) {
      flags.push('No documented risk assessment - High Severity');
    }
    if (review.updated_within_12_months === 'no' || review.updated_within_12_months === 'unknown') {
      flags.push('Risk assessment not current or update not evidenced - Medium Severity');
    }
    if (review.approved_by_senior_mgmt === 'no') {
      flags.push('No evidence of senior management approval - Medium Severity');
    }
    return flags;
  };

  const autoFlags = showAutoFlags();

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

      {/* Question 1 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          1. Does the Company maintain a documented ML/TF risk assessment?
        </Label>
        <RadioGroup
          value={review.rba_exists === true ? 'yes' : review.rba_exists === false ? 'no' : ''}
          onValueChange={(value) => onUpdate({ rba_exists: value === 'yes' })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="rba_exists_yes" />
            <Label htmlFor="rba_exists_yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="rba_exists_no" />
            <Label htmlFor="rba_exists_no">No</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Question 2 */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          2. Risk assessment document title(s)
        </Label>
        <Textarea
          value={review.document_titles || ''}
          onChange={(e) => onUpdate({ document_titles: e.target.value })}
          placeholder="Enter document title(s)"
          rows={2}
        />
      </div>

      {/* Question 3 */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          3. Version number or identifier
        </Label>
        <Input
          value={review.version_number || ''}
          onChange={(e) => onUpdate({ version_number: e.target.value })}
          placeholder="e.g., v2.1, 2024-Q4"
        />
      </div>

      {/* Question 4 */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          4. Date prepared
        </Label>
        <Input
          type="date"
          value={review.date_prepared || ''}
          onChange={(e) => onUpdate({ date_prepared: e.target.value })}
        />
      </div>

      {/* Question 5 */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          5. Date last updated
        </Label>
        <Input
          type="date"
          value={review.date_last_updated || ''}
          onChange={(e) => onUpdate({ date_last_updated: e.target.value })}
        />
      </div>

      {/* Question 6 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          6. Was it updated within the last 12 months or since last material change?
        </Label>
        <RadioGroup
          value={review.updated_within_12_months || ''}
          onValueChange={(value) => onUpdate({ updated_within_12_months: value })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="updated_yes" />
            <Label htmlFor="updated_yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="updated_no" />
            <Label htmlFor="updated_no">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unknown" id="updated_unknown" />
            <Label htmlFor="updated_unknown">Unknown</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Question 7 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          7. Is version control maintained (change log, revisions, authors)?
        </Label>
        <RadioGroup
          value={review.version_control_maintained || ''}
          onValueChange={(value) => onUpdate({ version_control_maintained: value })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="version_yes" />
            <Label htmlFor="version_yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="version_no" />
            <Label htmlFor="version_no">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="partial" id="version_partial" />
            <Label htmlFor="version_partial">Partial</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Question 8 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          8. Is the risk assessment approved by senior management or Board where applicable?
        </Label>
        <RadioGroup
          value={review.approved_by_senior_mgmt || ''}
          onValueChange={(value) => onUpdate({ approved_by_senior_mgmt: value })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="approved_yes" />
            <Label htmlFor="approved_yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="approved_no" />
            <Label htmlFor="approved_no">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="na" id="approved_na" />
            <Label htmlFor="approved_na">N/A</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Question 9 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          9. Is evidence of approval available (minutes, email approval, signature page)?
        </Label>
        <RadioGroup
          value={review.approval_evidence_available || ''}
          onValueChange={(value) => onUpdate({ approval_evidence_available: value })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="evidence_yes" />
            <Label htmlFor="evidence_yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="evidence_no" />
            <Label htmlFor="evidence_no">No</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Question 10 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          10. Is the risk assessment available and retrievable on request (central repository)?
        </Label>
        <RadioGroup
          value={review.rba_retrievable || ''}
          onValueChange={(value) => onUpdate({ rba_retrievable: value })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="retrievable_yes" />
            <Label htmlFor="retrievable_yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="retrievable_no" />
            <Label htmlFor="retrievable_no">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="partial" id="retrievable_partial" />
            <Label htmlFor="retrievable_partial">Partial</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
