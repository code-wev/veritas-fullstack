import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReportSample } from '../ReportTypeTesting';

interface AccuracyTestProps {
  formData: Partial<ReportSample>;
  onChange: (field: keyof ReportSample, value: any) => void;
}

interface AccuracyCheck {
  field: keyof ReportSample;
  label: string;
  description: string;
}

const accuracyChecks: AccuracyCheck[] = [
  { 
    field: 'accuracy_matches_ledger', 
    label: 'Matches Transaction Ledger', 
    description: 'Does the report data match the transaction ledger/system records?' 
  },
  { 
    field: 'accuracy_matches_kyc', 
    label: 'Matches KYC Records', 
    description: 'Does the client/beneficiary information match KYC records?' 
  },
  { 
    field: 'accuracy_matches_system', 
    label: 'Matches System Screenshots', 
    description: 'Does the report data match system screenshots or source documents?' 
  },
];

export function AccuracyTest({ formData, onChange }: AccuracyTestProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        <p>Cross-check the report data against source documents and records.</p>
        <p className="mt-1">Material mismatch = High severity. Minor mismatch = Medium severity.</p>
      </div>

      <div className="space-y-4">
        {accuracyChecks.map((check) => (
          <div key={check.field} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.description}</p>
              </div>
              <Select
                value={(formData[check.field] as string) || 'pending'}
                onValueChange={(value) => onChange(check.field, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pass">Accurate</SelectItem>
                  <SelectItem value="fail">Mismatch</SelectItem>
                  <SelectItem value="na">Unable to verify</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Accuracy Notes</Label>
        <Textarea
          value={formData.accuracy_notes || ''}
          onChange={(e) => onChange('accuracy_notes', e.target.value)}
          placeholder="Document any discrepancies found, evidence reviewed, and verification steps taken..."
          rows={4}
        />
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium">Overall Accuracy Result</span>
          <Select
            value={formData.accuracy_overall || 'pending'}
            onValueChange={(value) => onChange('accuracy_overall', value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="na">N/A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
