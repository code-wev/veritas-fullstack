import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, AlertTriangle, CheckCircle, XCircle, Edit } from 'lucide-react';
import { CSVImportDialog } from '../CSVImportDialog';

interface IndividualsKYCTestingProps {
  reviewId: string;
  onIssueCreated: () => void;
}

interface IndividualSample {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  onboarding_date: string | null;
  risk_rating: string;
  triggered_obligation: string | null;
  identification_method: string | null;
  evidence_type: string | null;
  name_present: boolean | null;
  dob_present: boolean | null;
  address_present: boolean | null;
  occupation_present: boolean | null;
  occupation_required: boolean | null;
  id_verified: boolean | null;
  id_contains_required_attributes: boolean | null;
  pep_hio_determination_completed: boolean | null;
  third_party_determination_made: boolean | null;
  record_retention_evidenced: boolean | null;
  source_of_funds_documented: boolean | null;
  source_of_wealth_documented: boolean | null;
  enhanced_monitoring_evidenced: boolean | null;
  senior_management_review_completed: boolean | null;
  senior_management_review_within_30_days: boolean | null;
  mandatory_test_result: string | null;
  reasonable_measures_result: string | null;
  overall_result: string | null;
  deficiencies: string | null;
  notes: string | null;
}

const emptyIndividualSample: Partial<IndividualSample> = {
  customer_id: '',
  customer_name: '',
  onboarding_date: '',
  risk_rating: 'low',
  triggered_obligation: null,
  identification_method: null,
  evidence_type: null,
  name_present: null,
  dob_present: null,
  address_present: null,
  occupation_present: null,
  occupation_required: false,
  id_verified: null,
  id_contains_required_attributes: null,
  pep_hio_determination_completed: null,
  third_party_determination_made: null,
  record_retention_evidenced: null,
  source_of_funds_documented: null,
  source_of_wealth_documented: null,
  enhanced_monitoring_evidenced: null,
  senior_management_review_completed: null,
  senior_management_review_within_30_days: null,
  deficiencies: '',
  notes: '',
};

export function IndividualsKYCTesting({ reviewId, onIssueCreated }: IndividualsKYCTestingProps) {
  const [samples, setSamples] = useState<IndividualSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<IndividualSample | null>(null);
  const [formData, setFormData] = useState<Partial<IndividualSample>>(emptyIndividualSample);
  const { toast } = useToast();

  useEffect(() => {
    loadSamples();
  }, [reviewId]);

  const loadSamples = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kyc_individual_samples')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSamples(data || []);
    }
    setLoading(false);
  };

  const calculateTestResults = (data: Partial<IndividualSample>) => {
    // Mandatory test - all must be true for pass
    const mandatoryFields = [
      data.name_present,
      data.dob_present,
      data.address_present,
      data.id_verified,
      data.id_contains_required_attributes,
      data.pep_hio_determination_completed,
    ];

    // Add occupation check if required
    if (data.occupation_required) {
      mandatoryFields.push(data.occupation_present);
    }

    const mandatoryResult = mandatoryFields.every(f => f === true) ? 'pass' : 
                           mandatoryFields.some(f => f === false) ? 'fail' : 'pending';

    // Reasonable measures - only apply for high-risk
    let reasonableResult: string = 'n/a';
    if (data.risk_rating === 'high') {
      const reasonableFields = [
        data.source_of_funds_documented,
        data.source_of_wealth_documented,
        data.enhanced_monitoring_evidenced,
        data.senior_management_review_completed,
      ];
      
      if (reasonableFields.every(f => f === true)) {
        reasonableResult = 'pass';
      } else if (reasonableFields.some(f => f === false)) {
        reasonableResult = 'fail';
      } else if (reasonableFields.some(f => f === true)) {
        reasonableResult = 'partial';
      } else {
        reasonableResult = 'pending';
      }
    }

    // Overall result
    let overallResult = 'pending';
    if (mandatoryResult === 'fail') {
      overallResult = 'fail';
    } else if (mandatoryResult === 'pass' && (reasonableResult === 'pass' || reasonableResult === 'n/a')) {
      overallResult = 'pass';
    } else if (mandatoryResult === 'pass' && reasonableResult === 'partial') {
      overallResult = 'partial';
    } else if (mandatoryResult === 'pass' && reasonableResult === 'fail') {
      overallResult = 'fail';
    }

    return {
      mandatory_test_result: mandatoryResult,
      reasonable_measures_result: reasonableResult,
      overall_result: overallResult,
    };
  };

  const generateAutoIssues = async (sample: IndividualSample) => {
    const issues: any[] = [];

    // Check mandatory fields for failures
    if (sample.name_present === false) {
      issues.push({
        review_id: reviewId,
        individual_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Legal Name',
        issue_description: `Individual client ${sample.customer_name || sample.customer_id} is missing legal name documentation.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Legal name',
        recommendation: 'Obtain and document full legal name in accordance with PCMLTFR.',
      });
    }

    if (sample.dob_present === false) {
      issues.push({
        review_id: reviewId,
        individual_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Date of Birth',
        issue_description: `Individual client ${sample.customer_name || sample.customer_id} is missing date of birth.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Date of birth',
        recommendation: 'Obtain and document date of birth in accordance with PCMLTFR.',
      });
    }

    if (sample.address_present === false) {
      issues.push({
        review_id: reviewId,
        individual_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Address',
        issue_description: `Individual client ${sample.customer_name || sample.customer_id} is missing address documentation.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Address',
        recommendation: 'Obtain and document address in accordance with PCMLTFR.',
      });
    }

    if (sample.occupation_required && sample.occupation_present === false) {
      issues.push({
        review_id: reviewId,
        individual_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Occupation',
        issue_description: `Individual client ${sample.customer_name || sample.customer_id} is missing occupation (required for transaction ≥$1,000).`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Occupation for transaction ≥$1,000',
        recommendation: 'Obtain and document occupation in accordance with PCMLTFR.',
      });
    }

    if (sample.id_verified === false) {
      issues.push({
        review_id: reviewId,
        individual_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Identity Not Verified',
        issue_description: `Individual client ${sample.customer_name || sample.customer_id} identity was not verified using a permitted method.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: ID verification using permitted method',
        recommendation: 'Verify identity using one of the permitted methods under PCMLTFR.',
      });
    }

    if (sample.pep_hio_determination_completed === false) {
      issues.push({
        review_id: reviewId,
        individual_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'PEP/HIO Determination Not Completed',
        issue_description: `Individual client ${sample.customer_name || sample.customer_id} is missing PEP/HIO determination.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: PEP/HIO determination',
        recommendation: 'Complete PEP/HIO determination and document the results.',
      });
    }

    // Reasonable measures for high-risk clients
    if (sample.risk_rating === 'high') {
      if (sample.source_of_funds_documented === false) {
        issues.push({
          review_id: reviewId,
          individual_sample_id: sample.id,
          issue_category: 'reasonable_measures',
          issue_title: 'Missing Source of Funds (High-Risk)',
          issue_description: `High-risk individual client ${sample.customer_name || sample.customer_id} is missing source of funds documentation.`,
          severity: 'high',
          is_auto_generated: true,
          auto_flag_reason: 'Reasonable measures for high-risk: Source of funds not documented',
          recommendation: 'Document source of funds for high-risk client as part of enhanced due diligence.',
        });
      }

      if (sample.enhanced_monitoring_evidenced === false) {
        issues.push({
          review_id: reviewId,
          individual_sample_id: sample.id,
          issue_category: 'reasonable_measures',
          issue_title: 'Missing Enhanced Monitoring Evidence (High-Risk)',
          issue_description: `High-risk individual client ${sample.customer_name || sample.customer_id} is missing enhanced monitoring evidence.`,
          severity: 'high',
          is_auto_generated: true,
          auto_flag_reason: 'Reasonable measures for high-risk: Enhanced monitoring not evidenced',
          recommendation: 'Implement and document enhanced monitoring for high-risk client.',
        });
      }

      if (sample.senior_management_review_completed === false) {
        issues.push({
          review_id: reviewId,
          individual_sample_id: sample.id,
          issue_category: 'reasonable_measures',
          issue_title: 'Missing Senior Management Review (High-Risk)',
          issue_description: `High-risk individual client ${sample.customer_name || sample.customer_id} is missing senior management review.`,
          severity: 'high',
          is_auto_generated: true,
          auto_flag_reason: 'Reasonable measures for high-risk: Senior management review not completed',
          recommendation: 'Obtain senior management review and approval for high-risk client within 30 days.',
        });
      }
    }

    // Insert issues
    if (issues.length > 0) {
      // First delete existing auto-generated issues for this sample
      await supabase
        .from('kyc_issues')
        .delete()
        .eq('individual_sample_id', sample.id)
        .eq('is_auto_generated', true);

      // Insert new issues
      const { error } = await supabase.from('kyc_issues').insert(issues);
      if (error) {
        toast({ title: 'Warning', description: 'Failed to create some auto-issues', variant: 'destructive' });
      } else {
        onIssueCreated();
      }
    }
  };

  const saveSample = async () => {
    const testResults = calculateTestResults(formData);
    const dataToSave = {
      ...formData,
      ...testResults,
      review_id: reviewId,
      // Convert empty strings to null for date fields
      onboarding_date: formData.onboarding_date || null,
    };

    try {
      let savedSample: IndividualSample;

      if (editingSample) {
        const { data, error } = await supabase
          .from('kyc_individual_samples')
          .update(dataToSave as any)
          .eq('id', editingSample.id)
          .select()
          .single();

        if (error) throw error;
        savedSample = data as IndividualSample;
      } else {
        const { data, error } = await supabase
          .from('kyc_individual_samples')
          .insert(dataToSave as any)
          .select()
          .single();

        if (error) throw error;
        savedSample = data as IndividualSample;
      }

      // Generate auto-issues
      await generateAutoIssues(savedSample);

      toast({ title: 'Saved', description: 'Sample saved successfully.' });
      setDialogOpen(false);
      setEditingSample(null);
      setFormData(emptyIndividualSample);
      loadSamples();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteSample = async (id: string) => {
    const { error } = await supabase.from('kyc_individual_samples').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Sample removed.' });
      loadSamples();
      onIssueCreated();
    }
  };

  const openEditDialog = (sample: IndividualSample) => {
    setEditingSample(sample);
    setFormData(sample);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingSample(null);
    setFormData(emptyIndividualSample);
    setDialogOpen(true);
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'pass':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fail</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Individual KYC Testing</h2>
          <p className="text-sm text-muted-foreground">Test individual client KYC files against FINTRAC mandatory and reasonable measures</p>
        </div>
        <div className="flex gap-2">
          <CSVImportDialog 
            reviewId={reviewId} 
            onImportComplete={loadSamples} 
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Sample
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSample ? 'Edit' : 'Add'} Individual KYC Sample</DialogTitle>
              <DialogDescription>
                Test individual client KYC against mandatory PCMLTFR requirements
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Client Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Client Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Customer ID</Label>
                    <Input
                      value={formData.customer_id || ''}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      placeholder="Client identifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Name</Label>
                    <Input
                      value={formData.customer_name || ''}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="Full legal name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Onboarding Date</Label>
                    <Input
                      type="date"
                      value={formData.onboarding_date || ''}
                      onChange={(e) => setFormData({ ...formData, onboarding_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Risk Rating</Label>
                    <Select
                      value={formData.risk_rating || 'low'}
                      onValueChange={(value) => setFormData({ ...formData, risk_rating: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Triggered Obligation</Label>
                    <Select
                      value={formData.triggered_obligation || ''}
                      onValueChange={(value) => setFormData({ ...formData, triggered_obligation: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="transaction">Transaction</SelectItem>
                        <SelectItem value="lctr">LCTR</SelectItem>
                        <SelectItem value="eft">EFT</SelectItem>
                        <SelectItem value="vc_transaction">VC Transaction</SelectItem>
                        <SelectItem value="remittance">Remittance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ID Method</Label>
                    <Select
                      value={formData.identification_method || ''}
                      onValueChange={(value) => setFormData({ ...formData, identification_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="government_id">Government ID</SelectItem>
                        <SelectItem value="credit_file">Credit File</SelectItem>
                        <SelectItem value="dual_process">Dual Process</SelectItem>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Accordion type="multiple" defaultValue={['mandatory', 'reasonable']} className="w-full">
                {/* Mandatory Requirements */}
                <AccordionItem value="mandatory">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Mandatory Requirements (Auto-Fail if Missing)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="name_present"
                          checked={formData.name_present === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, name_present: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="name_present">Full legal name present</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dob_present"
                          checked={formData.dob_present === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, dob_present: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="dob_present">Date of birth present</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="address_present"
                          checked={formData.address_present === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, address_present: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="address_present">Address present</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="id_verified"
                          checked={formData.id_verified === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, id_verified: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="id_verified">ID verified using permitted method</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="id_contains_required_attributes"
                          checked={formData.id_contains_required_attributes === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, id_contains_required_attributes: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="id_contains_required_attributes">ID contains required attributes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pep_hio_determination_completed"
                          checked={formData.pep_hio_determination_completed === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, pep_hio_determination_completed: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="pep_hio_determination_completed">PEP/HIO determination completed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="third_party_determination_made"
                          checked={formData.third_party_determination_made === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, third_party_determination_made: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="third_party_determination_made">Third-party determination made</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="record_retention_evidenced"
                          checked={formData.record_retention_evidenced === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, record_retention_evidenced: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="record_retention_evidenced">Record retention evidenced</Label>
                      </div>
                      <div className="col-span-2 p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id="occupation_required"
                            checked={formData.occupation_required === true}
                            onCheckedChange={(checked) => setFormData({ ...formData, occupation_required: checked === true })}
                          />
                          <Label htmlFor="occupation_required" className="font-medium">Occupation required (transaction ≥$1,000)</Label>
                        </div>
                        {formData.occupation_required && (
                          <div className="flex items-center space-x-2 ml-6">
                            <Checkbox
                              id="occupation_present"
                              checked={formData.occupation_present === true}
                              onCheckedChange={(checked) => setFormData({ ...formData, occupation_present: checked === true ? true : checked === false ? false : null })}
                            />
                            <Label htmlFor="occupation_present">Occupation documented</Label>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Reasonable Measures */}
                <AccordionItem value="reasonable">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      Reasonable Measures (Required for High-Risk)
                      {formData.risk_rating === 'high' && (
                        <Badge variant="destructive" className="ml-2">Required</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="source_of_funds_documented"
                          checked={formData.source_of_funds_documented === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, source_of_funds_documented: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="source_of_funds_documented">Source of funds documented</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="source_of_wealth_documented"
                          checked={formData.source_of_wealth_documented === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, source_of_wealth_documented: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="source_of_wealth_documented">Source of wealth documented</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enhanced_monitoring_evidenced"
                          checked={formData.enhanced_monitoring_evidenced === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, enhanced_monitoring_evidenced: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="enhanced_monitoring_evidenced">Enhanced monitoring evidenced</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="senior_management_review_completed"
                          checked={formData.senior_management_review_completed === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, senior_management_review_completed: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="senior_management_review_completed">Senior management review completed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="senior_management_review_within_30_days"
                          checked={formData.senior_management_review_within_30_days === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, senior_management_review_within_30_days: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="senior_management_review_within_30_days">SM review within 30 days</Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Deficiencies / Notes</Label>
                <Textarea
                  value={formData.deficiencies || ''}
                  onChange={(e) => setFormData({ ...formData, deficiencies: e.target.value })}
                  placeholder="Document any deficiencies or observations..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveSample}>Save Sample</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Results Table */}
      <Card>
        <CardContent className="pt-6">
          {samples.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No individual samples yet. Click "Add Sample" to begin testing.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead>Reasonable</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {samples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sample.customer_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{sample.customer_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{sample.onboarding_date || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={sample.risk_rating === 'high' ? 'destructive' : sample.risk_rating === 'medium' ? 'secondary' : 'outline'}>
                        {sample.risk_rating}
                      </Badge>
                    </TableCell>
                    <TableCell>{getResultBadge(sample.mandatory_test_result)}</TableCell>
                    <TableCell>{getResultBadge(sample.reasonable_measures_result)}</TableCell>
                    <TableCell>{getResultBadge(sample.overall_result)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(sample)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteSample(sample.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
