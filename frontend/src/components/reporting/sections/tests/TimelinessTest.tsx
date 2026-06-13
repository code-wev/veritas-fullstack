import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ReportSample } from '../ReportTypeTesting';

interface TimelinessTestProps {
  formData: Partial<ReportSample>;
  reportType: string;
  onChange: (field: keyof ReportSample, value: any) => void;
}

const getRequiredDays = (reportType: string): number => {
  switch (reportType) {
    case 'lctr':
    case 'eftr':
    case 'lvctr':
      return 15; // 15 calendar days for threshold reports
    case 'str':
      return 30; // 30 calendar days for STRs (after suspicion formed)
    default:
      return 15;
  }
};

export function TimelinessTest({ formData, reportType, onChange }: TimelinessTestProps) {
  const requiredDays = getRequiredDays(reportType);
  const isSTR = reportType === 'str';
  const effectiveStartDate = isSTR
    ? formData.timeliness_suspicion_date
    : formData.timeliness_transaction_date || formData.transaction_date;
  const effectiveFilingDate = formData.timeliness_filing_date || formData.fintrac_submission_date;

  // Auto-calculate days to file
  useEffect(() => {
    if (effectiveStartDate && effectiveFilingDate) {
      const start = new Date(effectiveStartDate);
      const filing = new Date(effectiveFilingDate);
      const diffTime = filing.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays !== formData.timeliness_days_to_file) {
        onChange('timeliness_days_to_file', diffDays);
      }

      const calculatedResult = diffDays <= requiredDays ? 'pass' : 'fail';
      if (formData.timeliness_result === 'pending' || formData.timeliness_result !== calculatedResult) {
        onChange('timeliness_result', calculatedResult);
      }
    }
  }, [effectiveStartDate, effectiveFilingDate, formData.timeliness_days_to_file, formData.timeliness_result, requiredDays]);

  const daysToFile = formData.timeliness_days_to_file;
  const isLate = daysToFile !== null && daysToFile !== undefined && daysToFile > requiredDays;
  const isOnTime = daysToFile !== null && daysToFile !== undefined && daysToFile <= requiredDays;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        <p>
          {isSTR 
            ? 'STRs must be filed within 30 calendar days after suspicion is formed.'
            : `${reportType.toUpperCase()}s must be filed within ${requiredDays} calendar days of the transaction.`
          }
        </p>
        <p className="mt-1">Late mandatory report = High severity finding.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isSTR ? (
          <div className="space-y-2">
            <Label>Date Suspicion Formed</Label>
            <Input
              type="date"
              value={formData.timeliness_suspicion_date || ''}
              onChange={(e) => onChange('timeliness_suspicion_date', e.target.value || null)}
            />
            <p className="text-xs text-muted-foreground">When was reasonable suspicion determined?</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Transaction Date</Label>
            <Input
              type="date"
              value={formData.timeliness_transaction_date || formData.transaction_date || ''}
              onChange={(e) => onChange('timeliness_transaction_date', e.target.value || null)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Filing Date (to FINTRAC)</Label>
          <Input
            type="date"
            value={formData.timeliness_filing_date || formData.fintrac_submission_date || ''}
            onChange={(e) => onChange('timeliness_filing_date', e.target.value || null)}
          />
        </div>
      </div>

      {/* Auto-calculated result */}
      <div className="p-4 border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Days to File</span>
          <div className="flex items-center gap-2">
            {daysToFile !== null && daysToFile !== undefined ? (
              <>
                <span className="text-lg font-semibold">{daysToFile}</span>
                <span className="text-muted-foreground">/ {requiredDays} days</span>
                {isOnTime && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    On Time
                  </Badge>
                )}
                {isLate && (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Late
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Enter dates to calculate
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timeliness Notes</Label>
        <Textarea
          value={formData.timeliness_notes || ''}
          onChange={(e) => onChange('timeliness_notes', e.target.value)}
          placeholder="Document any delays, reasons for late filing, or inability to determine timeline..."
          rows={3}
        />
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium">Timeliness Result</span>
          <Select
            value={formData.timeliness_result || 'pending'}
            onValueChange={(value) => onChange('timeliness_result', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pass">On Time</SelectItem>
              <SelectItem value="fail">Late</SelectItem>
              <SelectItem value="na">Unable to Determine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
