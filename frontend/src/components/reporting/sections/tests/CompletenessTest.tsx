import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { ReportSample } from '../ReportTypeTesting';

interface CompletenessTestProps {
  formData: Partial<ReportSample>;
  reportType: string;
  onChange: (field: keyof ReportSample, value: any) => void;
}

interface FieldCheck {
  field: keyof ReportSample;
  label: string;
  mandatory?: boolean;
  reasonableMeasure?: boolean;
  condition?: (reportType: string) => boolean;
}

const headerFields: FieldCheck[] = [
  { field: 'header_reporting_entity', label: 'Reporting entity details', mandatory: true },
  { field: 'submitting_re_number', label: 'Submitting RE number (if different)', reasonableMeasure: true },
  { field: 'activity_sector_code', label: 'Activity sector code', mandatory: true },
  { field: 'header_submission_timestamp', label: 'Submission timestamp', mandatory: true },
  { field: 'header_report_reference', label: 'Report reference ID', mandatory: true },
  { field: 'eft_direction', label: 'EFT direction (initiation/final receipt)', mandatory: true, condition: (rt) => rt === 'eftr' },
  { field: 'ministerial_directive', label: 'Ministerial directive (if applicable)', reasonableMeasure: true },
];

const transactionFields: FieldCheck[] = [
  { field: 'txn_amount', label: 'Transaction amount', mandatory: true },
  { field: 'txn_currency', label: 'Currency', mandatory: true },
  { field: 'txn_date_time', label: 'Date and time', mandatory: true },
  { field: 'txn_aggregation_indicator', label: '24-hour aggregation indicator', mandatory: true },
  { field: 'txn_aggregation_type', label: 'Aggregation type', mandatory: true },
  { field: 'txn_aggregation_period_start', label: 'Aggregation period start date/time', mandatory: true },
  { field: 'txn_aggregation_period_end', label: 'Aggregation period end date/time (e.g., 23:59:59)', mandatory: true },
  { field: 'exchange_rate', label: 'Exchange rate', condition: (rt) => rt === 'eftr' || rt === 'lvctr' },
  { field: 'exchange_rate_source', label: 'Exchange rate source', condition: (rt) => rt === 'eftr' || rt === 'lvctr' },
];

const requesterFields: FieldCheck[] = [
  { field: 'client_name', label: 'Requester/Conductor name', mandatory: true },
  { field: 'client_address', label: 'Requester address', mandatory: true },
  { field: 'client_dob', label: 'Date of birth (individuals)', reasonableMeasure: true },
  { field: 'client_occupation', label: 'Occupation / Nature of business', reasonableMeasure: true },
  { field: 'requester_identification', label: 'Identification document(s)', reasonableMeasure: true },
  { field: 'requester_account', label: 'Account details (number, type, FI)', reasonableMeasure: true },
  { field: 'client_incorporation_info', label: 'Incorporation/registration info (entities)', condition: (rt) => rt !== 'str' },
  { field: 'authorized_persons', label: 'Authorized persons (entities)', condition: (rt) => rt !== 'str' },
  { field: 'on_behalf_of_requester', label: 'On-behalf-of indicator & details (third party)', reasonableMeasure: true },
];

const beneficiaryFields: FieldCheck[] = [
  { field: 'beneficiary_name', label: 'Beneficiary name', mandatory: true, condition: (rt) => rt === 'eftr' || rt === 'lvctr' },
  { field: 'beneficiary_address', label: 'Beneficiary address', reasonableMeasure: true, condition: (rt) => rt === 'eftr' || rt === 'lvctr' },
  { field: 'beneficiary_account_wallet', label: 'Account/Wallet details', reasonableMeasure: true, condition: (rt) => rt === 'eftr' || rt === 'lvctr' },
  { field: 'beneficiary_identification', label: 'Identification document(s)', reasonableMeasure: true, condition: (rt) => rt === 'eftr' || rt === 'lvctr' },
  { field: 'on_behalf_of_beneficiary', label: 'On-behalf-of indicator & details (third party)', reasonableMeasure: true, condition: (rt) => rt === 'eftr' || rt === 'lvctr' },
];

const specialFields: FieldCheck[] = [
  { field: 'vc_identifiers', label: 'Virtual currency identifiers (txn ID, wallet)', mandatory: true, condition: (rt) => rt === 'lvctr' },
  { field: 'str_narrative', label: 'STR narrative (suspicion details)', mandatory: true, condition: (rt) => rt === 'str' },
];

function FieldCheckRow({
  field, label, mandatory, reasonableMeasure, value, onChange,
}: {
  field: string;
  label: string;
  mandatory?: boolean;
  reasonableMeasure?: boolean;
  value: boolean | null;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
        {mandatory && <span className="text-xs text-destructive font-semibold">(M)</span>}
        {reasonableMeasure && <span className="text-xs text-amber-600 font-semibold">(RM)</span>}
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={value === true} onCheckedChange={() => onChange(true)} />
          Pass
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={value === false} onCheckedChange={() => onChange(false)} />
          Fail
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={value === null} onCheckedChange={() => onChange(null as any)} />
          N/A
        </label>
      </div>
    </div>
  );
}

function FieldSection({
  title, fields, reportType, formData, onChange, resultField,
}: {
  title: string;
  fields: FieldCheck[];
  reportType: string;
  formData: Partial<ReportSample>;
  onChange: (field: keyof ReportSample, value: any) => void;
  resultField: keyof ReportSample;
}) {
  const applicableFields = fields.filter(f => !f.condition || f.condition(reportType));
  if (applicableFields.length === 0) return null;

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <span className="font-medium text-sm">{title}</span>
        <div className="flex items-center gap-2">
          <Select
            value={(formData[resultField] as string) || 'pending'}
            onValueChange={(value) => onChange(resultField, value)}
          >
            <SelectTrigger className="w-24 h-7 text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="na">N/A</SelectItem>
            </SelectContent>
          </Select>
          <ChevronDown className="w-4 h-4" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pt-2">
        {applicableFields.map((field) => (
          <FieldCheckRow
            key={field.field}
            field={field.field}
            label={field.label}
            mandatory={field.mandatory}
            reasonableMeasure={field.reasonableMeasure}
            value={formData[field.field] as boolean | null}
            onChange={(checked) => onChange(field.field, checked)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CompletenessTest({ formData, reportType, onChange }: CompletenessTestProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4 space-y-1">
        <p><span className="text-destructive font-semibold">(M)</span> = Mandatory field — Missing results in High severity finding.</p>
        <p><span className="text-amber-600 font-semibold">(RM)</span> = Reasonable Measures — Missing results in Medium severity.</p>
      </div>

      <FieldSection
        title="Report Header"
        fields={headerFields}
        reportType={reportType}
        formData={formData}
        onChange={onChange}
        resultField="header_complete"
      />

      <FieldSection
        title="Transaction Details"
        fields={transactionFields}
        reportType={reportType}
        formData={formData}
        onChange={onChange}
        resultField="txn_complete"
      />

      <FieldSection
        title="Starting Action — Requester / Conductor"
        fields={requesterFields}
        reportType={reportType}
        formData={formData}
        onChange={onChange}
        resultField="client_complete"
      />

      <FieldSection
        title="Completing Action — Beneficiary"
        fields={beneficiaryFields}
        reportType={reportType}
        formData={formData}
        onChange={onChange}
        resultField="beneficiary_complete"
      />

      <FieldSection
        title="Special / Report-Type Specific"
        fields={specialFields}
        reportType={reportType}
        formData={formData}
        onChange={onChange}
        resultField="special_fields_complete"
      />
    </div>
  );
}
