import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ReportSampleList } from './ReportSampleList';
import { ReportSampleSplitView } from './ReportSampleSplitView';
import { ReportUploadDialog, ParsedReport } from '../ReportUploadDialog';

interface ReportTypeTestingProps {
  reviewId: string;
  engagementId: string;
  reportType: 'lctr' | 'eftr' | 'str' | 'lvctr' | 'lpepr';
  title: string;
  description: string;
}

export interface ReportSample {
  id: string;
  engagement_id: string;
  review_id: string | null;
  report_type: string;
  filing_method: string;
  report_reference_id: string | null;
  fintrac_submission_date: string | null;
  transaction_date: string | null;
  transaction_amount: number | null;
  transaction_currency: string | null;
  is_aggregated: boolean;
  aggregation_type: string | null;
  aggregation_period_start: string | null;
  aggregation_period_end: string | null;
  // Header completeness
  header_reporting_entity: boolean | null;
  header_submission_timestamp: boolean | null;
  header_report_reference: boolean | null;
  header_complete: string;
  activity_sector_code: boolean | null;
  eft_direction: boolean | null;
  ministerial_directive: boolean | null;
  submitting_re_number: boolean | null;
  // Transaction completeness
  txn_amount: boolean | null;
  txn_currency: boolean | null;
  txn_date_time: boolean | null;
  txn_aggregation_indicator: boolean | null;
  txn_aggregation_type: boolean | null;
  txn_aggregation_period_start: boolean | null;
  txn_aggregation_period_end: boolean | null;
  txn_complete: string;
  // Requester (starting action) completeness
  client_name: boolean | null;
  client_address: boolean | null;
  client_dob: boolean | null;
  client_occupation: boolean | null;
  client_incorporation_info: boolean | null;
  client_complete: string;
  requester_account: boolean | null;
  requester_identification: boolean | null;
  authorized_persons: boolean | null;
  on_behalf_of_requester: boolean | null;
  // Beneficiary (completing action) completeness
  beneficiary_name: boolean | null;
  beneficiary_address: boolean | null;
  beneficiary_account_wallet: boolean | null;
  beneficiary_complete: string;
  beneficiary_identification: boolean | null;
  on_behalf_of_beneficiary: boolean | null;
  // Legacy third party (kept for backward compat)
  third_party_indicator: boolean | null;
  third_party_details: boolean | null;
  third_party_complete: string;
  // Special fields
  exchange_rate: boolean | null;
  exchange_rate_source: boolean | null;
  vc_identifiers: boolean | null;
  str_narrative: boolean | null;
  special_fields_complete: string;
  // Accuracy
  accuracy_matches_ledger: string;
  accuracy_matches_kyc: string;
  accuracy_matches_system: string;
  accuracy_notes: string | null;
  accuracy_overall: string;
  // Timeliness
  timeliness_transaction_date: string | null;
  timeliness_filing_date: string | null;
  timeliness_suspicion_date: string | null;
  timeliness_days_to_file: number | null;
  timeliness_notes: string | null;
  timeliness_result: string;
  // STR specific
  str_investigation_conducted: boolean | null;
  str_suspicion_documented: boolean | null;
  str_rationale_documented: boolean | null;
  str_escalation_performed: boolean | null;
  str_filed_promptly: boolean | null;
  str_decision_notes: string | null;
  // Results
  completeness_result: string;
  overall_result: string;
  // Evidence & parsed data
  evidence_file_ids: string[];
  parsed_json: any;
  manual_notes: string | null;
  deficiencies: string | null;
  notes: string | null;
}

const emptySample = (engagementId: string, reviewId: string, reportType: string): Partial<ReportSample> => ({
  engagement_id: engagementId,
  review_id: reviewId,
  report_type: reportType,
  filing_method: 'manual',
  report_reference_id: null,
  fintrac_submission_date: null,
  transaction_date: null,
  transaction_amount: null,
  transaction_currency: 'CAD',
  is_aggregated: false,
  aggregation_type: null,
  aggregation_period_start: null,
  aggregation_period_end: null,
  header_reporting_entity: null,
  header_submission_timestamp: null,
  header_report_reference: null,
  header_complete: 'pending',
  activity_sector_code: null,
  eft_direction: null,
  ministerial_directive: null,
  submitting_re_number: null,
  txn_amount: null,
  txn_currency: null,
  txn_date_time: null,
  txn_aggregation_indicator: null,
  txn_aggregation_type: null,
  txn_aggregation_period_start: null,
  txn_aggregation_period_end: null,
  txn_complete: 'pending',
  client_name: null,
  client_address: null,
  client_dob: null,
  client_occupation: null,
  client_incorporation_info: null,
  client_complete: 'pending',
  requester_account: null,
  requester_identification: null,
  authorized_persons: null,
  on_behalf_of_requester: null,
  beneficiary_name: null,
  beneficiary_address: null,
  beneficiary_account_wallet: null,
  beneficiary_complete: 'pending',
  beneficiary_identification: null,
  on_behalf_of_beneficiary: null,
  third_party_indicator: null,
  third_party_details: null,
  third_party_complete: 'pending',
  exchange_rate: null,
  exchange_rate_source: null,
  vc_identifiers: null,
  str_narrative: null,
  special_fields_complete: 'pending',
  accuracy_matches_ledger: 'pending',
  accuracy_matches_kyc: 'pending',
  accuracy_matches_system: 'pending',
  accuracy_notes: null,
  accuracy_overall: 'pending',
  timeliness_transaction_date: null,
  timeliness_filing_date: null,
  timeliness_suspicion_date: null,
  timeliness_days_to_file: null,
  timeliness_notes: null,
  timeliness_result: 'pending',
  str_investigation_conducted: null,
  str_suspicion_documented: null,
  str_rationale_documented: null,
  str_escalation_performed: null,
  str_filed_promptly: null,
  str_decision_notes: null,
  completeness_result: 'pending',
  overall_result: 'pending',
  evidence_file_ids: [],
  parsed_json: null,
  manual_notes: null,
  deficiencies: null,
  notes: null,
});

export function ReportTypeTesting({ reviewId, engagementId, reportType, title, description }: ReportTypeTestingProps) {
  const [samples, setSamples] = useState<ReportSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<ReportSample | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSamples();
  }, [reviewId, reportType]);

  const fetchSamples = async () => {
    try {
      const { data, error } = await supabase
        .from('reporting_samples')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('report_type', reportType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSamples(data || []);
    } catch (error: any) {
      toast({ title: 'Error loading samples', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSample = () => {
    setSelectedSample(emptySample(engagementId, reviewId, reportType) as ReportSample);
    setIsCreating(true);
  };

  const handleSelectSample = (sample: ReportSample) => {
    setSelectedSample(sample);
    setIsCreating(false);
  };

  const handleSaveSample = async (sample: Partial<ReportSample>) => {
    try {
      if (isCreating) {
        const { data, error } = await supabase
          .from('reporting_samples')
          .insert(sample as any)
          .select()
          .single();
        if (error) throw error;
        setSamples([data, ...samples]);
        setSelectedSample(data);
        setIsCreating(false);
        toast({ title: 'Sample created successfully' });
      } else {
        const { data, error } = await supabase
          .from('reporting_samples')
          .update(sample)
          .eq('id', sample.id)
          .select()
          .single();
        if (error) throw error;
        setSamples(samples.map(s => s.id === data.id ? data : s));
        setSelectedSample(data);
        toast({ title: 'Sample updated successfully' });
      }
    } catch (error: any) {
      toast({ title: 'Error saving sample', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteSample = async (sampleId: string) => {
    try {
      const { error } = await supabase.from('reporting_samples').delete().eq('id', sampleId);
      if (error) throw error;
      setSamples(samples.filter(s => s.id !== sampleId));
      if (selectedSample?.id === sampleId) setSelectedSample(null);
      toast({ title: 'Sample deleted' });
    } catch (error: any) {
      toast({ title: 'Error deleting sample', description: error.message, variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    setSelectedSample(null);
    setIsCreating(false);
  };

  const handleReportsImported = async (parsedReports: ParsedReport[]) => {
    let relevantReports = parsedReports.filter(r => r.report_type === reportType);
    let coercedCount = 0;
    // Fallback: if nothing matched the active tab but the user clearly intended
    // to upload this report type (uploaded from this tab), accept all parsed
    // reports and coerce their type to the active tab. This handles cases where
    // the parser couldn't infer the report type from the payload.
    if (relevantReports.length === 0 && parsedReports.length > 0) {
      console.warn(
        `[handleReportsImported] No reports matched active tab "${reportType}". ` +
        `Coercing ${parsedReports.length} parsed report(s) to "${reportType}".`,
        parsedReports.map(r => r.report_type)
      );
      relevantReports = parsedReports.map(r => ({ ...r, report_type: reportType }));
      coercedCount = relevantReports.length;
    }
    if (relevantReports.length === 0) {
      toast({ title: 'No reports parsed', description: `No data could be extracted from the file(s).`, variant: 'destructive' });
      return;
    }

    let successCount = 0;
    let firstError: string | null = null;
    for (const report of relevantReports) {
      try {
        const sampleData = {
          engagement_id: engagementId,
          review_id: reviewId,
          report_type: reportType,
          filing_method: report.filing_method,
          report_reference_id: report.report_reference_id,
          fintrac_submission_date: report.fintrac_submission_date,
          transaction_date: report.transaction_date,
          transaction_amount: report.transaction_amount,
          transaction_currency: report.transaction_currency || 'CAD',
          is_aggregated: report.is_aggregated || false,
          aggregation_type: report.aggregation_type,
          aggregation_period_start: report.aggregation_period_start,
          aggregation_period_end: report.aggregation_period_end,
          header_reporting_entity: report.header_reporting_entity,
          header_submission_timestamp: report.header_submission_timestamp,
          header_report_reference: report.header_report_reference,
          activity_sector_code: report.activity_sector_code,
          eft_direction: report.eft_direction,
          ministerial_directive: report.ministerial_directive,
          submitting_re_number: report.submitting_re_number,
          txn_amount: report.txn_amount,
          txn_currency: report.txn_currency,
          txn_date_time: report.txn_date_time,
          txn_aggregation_indicator: report.txn_aggregation_indicator,
          txn_aggregation_type: report.txn_aggregation_type,
          txn_aggregation_period_start: report.txn_aggregation_period_start,
          txn_aggregation_period_end: report.txn_aggregation_period_end,
          client_name: report.client_name,
          client_address: report.client_address,
          client_dob: report.client_dob,
          client_occupation: report.client_occupation,
          requester_account: report.requester_account,
          requester_identification: report.requester_identification,
          authorized_persons: report.authorized_persons,
          on_behalf_of_requester: report.on_behalf_of_requester,
          beneficiary_name: report.beneficiary_name,
          beneficiary_address: report.beneficiary_address,
          beneficiary_account_wallet: report.beneficiary_account_wallet,
          beneficiary_identification: report.beneficiary_identification,
          on_behalf_of_beneficiary: report.on_behalf_of_beneficiary,
          third_party_indicator: report.third_party_indicator,
          exchange_rate: report.exchange_rate,
          str_narrative: report.str_narrative,
          vc_identifiers: report.vc_identifiers,
          parsed_json: report.parsed_json,
          manual_notes: report.manual_notes,
        };

        const { data, error } = await supabase
          .from('reporting_samples')
          .insert(sampleData as any)
          .select()
          .single();
        if (error) throw error;
        setSamples(prev => [data, ...prev]);
        successCount++;
      } catch (error: any) {
        console.error('Error creating sample:', error);
        if (!firstError) firstError = error.message;
      }
    }

    setUploadDialogOpen(false);
    if (successCount === 0) {
      toast({
        title: 'Import failed',
        description: `0 of ${relevantReports.length} ${reportType.toUpperCase()} report(s) saved. ${firstError ?? 'Check console for details.'}`,
        variant: 'destructive',
      });
    } else if (successCount < relevantReports.length) {
      toast({
        title: 'Partial import',
        description: `Saved ${successCount} of ${relevantReports.length} ${reportType.toUpperCase()} report(s). First error: ${firstError}`,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Reports imported', description: `Successfully imported ${successCount} ${reportType.toUpperCase()} report(s).` });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Reports
              </Button>
              <Button onClick={handleAddSample}>
                <Plus className="w-4 h-4 mr-2" />
                Add Sample
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {samples.length === 0 && !selectedSample ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No {reportType.toUpperCase()} samples yet.</p>
              <p className="text-sm mt-1">Click "Upload Reports" or "Add Sample" to start testing.</p>
            </div>
          ) : !selectedSample ? (
            <ReportSampleList
              samples={samples}
              selectedId={undefined}
              onSelect={handleSelectSample}
              onDelete={handleDeleteSample}
            />
          ) : (
            <ReportSampleSplitView
              sample={selectedSample}
              reportType={reportType}
              onSave={handleSaveSample}
              onCancel={handleCancel}
              isNew={isCreating}
            />
          )}
        </CardContent>
      </Card>

      <ReportUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        engagementId={engagementId}
        reviewId={reviewId}
        onReportsCreated={handleReportsImported}
      />
    </div>
  );
}
