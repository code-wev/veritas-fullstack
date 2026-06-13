import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Trash2, AlertTriangle, CheckCircle, XCircle, Edit, Users } from 'lucide-react';
import { CSVImportDialog } from '../CSVImportDialog';

interface BusinessKYCTestingProps {
  reviewId: string;
  onIssueCreated: () => void;
}

interface BusinessSample {
  id: string;
  customer_id: string | null;
  business_name: string | null;
  onboarding_date: string | null;
  risk_rating: string;
  triggered_obligation: string | null;
  evidence_type: string | null;
  legal_name_present: boolean | null;
  address_present: boolean | null;
  nature_of_business_documented: boolean | null;
  incorporation_number_present: boolean | null;
  jurisdiction_documented: boolean | null;
  directors_list_obtained: boolean | null;
  bo_25_percent_identified: boolean | null;
  bo_natural_persons_identified: boolean | null;
  bo_identity_verified: boolean | null;
  smo_identified_if_bo_unknown: boolean | null;
  bo_pep_hio_determination_completed: boolean | null;
  third_party_determination_made: boolean | null;
  relationship_documented: boolean | null;
  supporting_evidence_available: boolean | null;
  record_retention_evidenced: boolean | null;
  source_of_funds_documented: boolean | null;
  source_of_wealth_documented: boolean | null;
  enhanced_monitoring_evidenced: boolean | null;
  senior_management_review_completed: boolean | null;
  mandatory_test_result: string | null;
  bo_test_result: string | null;
  reasonable_measures_result: string | null;
  overall_result: string | null;
  deficiencies: string | null;
  notes: string | null;
}

const emptyBusinessSample: Partial<BusinessSample> = {
  customer_id: '',
  business_name: '',
  onboarding_date: '',
  risk_rating: 'low',
  triggered_obligation: null,
  evidence_type: null,
  legal_name_present: null,
  address_present: null,
  nature_of_business_documented: null,
  incorporation_number_present: null,
  jurisdiction_documented: null,
  directors_list_obtained: null,
  bo_25_percent_identified: null,
  bo_natural_persons_identified: null,
  bo_identity_verified: null,
  smo_identified_if_bo_unknown: null,
  bo_pep_hio_determination_completed: null,
  third_party_determination_made: null,
  relationship_documented: null,
  supporting_evidence_available: null,
  record_retention_evidenced: null,
  source_of_funds_documented: null,
  source_of_wealth_documented: null,
  enhanced_monitoring_evidenced: null,
  senior_management_review_completed: null,
  deficiencies: '',
  notes: '',
};

export function BusinessKYCTesting({ reviewId, onIssueCreated }: BusinessKYCTestingProps) {
  const [samples, setSamples] = useState<BusinessSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<BusinessSample | null>(null);
  const [formData, setFormData] = useState<Partial<BusinessSample>>(emptyBusinessSample);
  const { toast } = useToast();

  useEffect(() => {
    loadSamples();
  }, [reviewId]);

  const loadSamples = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kyc_business_samples')
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

  const calculateTestResults = (data: Partial<BusinessSample>) => {
    // Mandatory business identity test
    const mandatoryFields = [
      data.legal_name_present,
      data.address_present,
      data.nature_of_business_documented,
      data.incorporation_number_present,
      data.jurisdiction_documented,
      data.directors_list_obtained,
    ];

    const mandatoryResult = mandatoryFields.every(f => f === true) ? 'pass' : 
                           mandatoryFields.some(f => f === false) ? 'fail' : 'pending';

    // Beneficial ownership test
    const boFields = [
      data.bo_25_percent_identified,
      data.bo_natural_persons_identified,
      data.bo_identity_verified,
      data.bo_pep_hio_determination_completed,
    ];

    const boResult = boFields.every(f => f === true) ? 'pass' : 
                     boFields.some(f => f === false) ? 'fail' : 'pending';

    // Reasonable measures for high-risk
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
    if (mandatoryResult === 'fail' || boResult === 'fail') {
      overallResult = 'fail';
    } else if (mandatoryResult === 'pass' && boResult === 'pass' && (reasonableResult === 'pass' || reasonableResult === 'n/a')) {
      overallResult = 'pass';
    } else if (mandatoryResult === 'pass' && boResult === 'pass' && reasonableResult === 'partial') {
      overallResult = 'partial';
    } else if (mandatoryResult === 'pass' && boResult === 'pass' && reasonableResult === 'fail') {
      overallResult = 'fail';
    }

    return {
      mandatory_test_result: mandatoryResult,
      bo_test_result: boResult,
      reasonable_measures_result: reasonableResult,
      overall_result: overallResult,
    };
  };

  const generateAutoIssues = async (sample: BusinessSample) => {
    const issues: any[] = [];
    const clientName = sample.business_name || sample.customer_id;

    // Mandatory business identity fields
    if (sample.legal_name_present === false) {
      issues.push({
        review_id: reviewId,
        business_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Legal Business Name',
        issue_description: `Business client ${clientName} is missing legal business name documentation.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Legal business name',
        recommendation: 'Obtain and document legal business name in accordance with PCMLTFR.',
      });
    }

    if (sample.address_present === false) {
      issues.push({
        review_id: reviewId,
        business_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Business Address',
        issue_description: `Business client ${clientName} is missing address documentation.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Business address',
        recommendation: 'Obtain and document business address in accordance with PCMLTFR.',
      });
    }

    if (sample.nature_of_business_documented === false) {
      issues.push({
        review_id: reviewId,
        business_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Nature of Business',
        issue_description: `Business client ${clientName} is missing nature of principal business documentation.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Nature of principal business',
        recommendation: 'Obtain and document nature of principal business in accordance with PCMLTFR.',
      });
    }

    if (sample.incorporation_number_present === false) {
      issues.push({
        review_id: reviewId,
        business_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Incorporation Number',
        issue_description: `Business client ${clientName} is missing incorporation number.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Incorporation number',
        recommendation: 'Obtain and document incorporation number and jurisdiction in accordance with PCMLTFR.',
      });
    }

    if (sample.directors_list_obtained === false) {
      issues.push({
        review_id: reviewId,
        business_sample_id: sample.id,
        issue_category: 'mandatory',
        issue_title: 'Missing Directors Information',
        issue_description: `Business client ${clientName} is missing directors list.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory field missing: Directors information',
        recommendation: 'Obtain and document directors information in accordance with PCMLTFR.',
      });
    }

    // Beneficial ownership issues
    if (sample.bo_25_percent_identified === false) {
      issues.push({
        review_id: reviewId,
        business_sample_id: sample.id,
        issue_category: 'bo_verification',
        issue_title: 'Beneficial Owners Not Identified',
        issue_description: `Business client ${clientName} beneficial owners ≥25% not identified.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: Beneficial owners ≥25% identification',
        recommendation: 'Identify all beneficial owners owning 25% or more of the entity.',
      });
    }

    if (sample.bo_identity_verified === false) {
      issues.push({
        review_id: reviewId,
        business_sample_id: sample.id,
        issue_category: 'bo_verification',
        issue_title: 'Beneficial Owner Identity Not Verified',
        issue_description: `Business client ${clientName} beneficial owner identity not verified.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: BO identity verification or SMO',
        recommendation: 'Verify identity of beneficial owners or confirm SMO controls are in place.',
      });
    }

    if (sample.bo_pep_hio_determination_completed === false) {
      issues.push({
        review_id: reviewId,
        business_sample_id: sample.id,
        issue_category: 'bo_verification',
        issue_title: 'BO PEP/HIO Determination Not Completed',
        issue_description: `Business client ${clientName} is missing PEP/HIO determination for beneficial owners.`,
        severity: 'high',
        is_auto_generated: true,
        auto_flag_reason: 'Mandatory requirement: PEP/HIO determination for BOs',
        recommendation: 'Complete PEP/HIO determination for all beneficial owners.',
      });
    }

    // High-risk reasonable measures
    if (sample.risk_rating === 'high') {
      if (sample.source_of_funds_documented === false) {
        issues.push({
          review_id: reviewId,
          business_sample_id: sample.id,
          issue_category: 'reasonable_measures',
          issue_title: 'Missing Source of Funds (High-Risk Business)',
          issue_description: `High-risk business client ${clientName} is missing source of funds documentation.`,
          severity: 'high',
          is_auto_generated: true,
          auto_flag_reason: 'Reasonable measures for high-risk: Source of funds not documented',
          recommendation: 'Document source of funds for high-risk business client.',
        });
      }

      if (sample.enhanced_monitoring_evidenced === false) {
        issues.push({
          review_id: reviewId,
          business_sample_id: sample.id,
          issue_category: 'reasonable_measures',
          issue_title: 'Missing Enhanced Monitoring (High-Risk Business)',
          issue_description: `High-risk business client ${clientName} is missing enhanced monitoring evidence.`,
          severity: 'high',
          is_auto_generated: true,
          auto_flag_reason: 'Reasonable measures for high-risk: Enhanced monitoring not evidenced',
          recommendation: 'Implement and document enhanced monitoring for high-risk business client.',
        });
      }
    }

    if (issues.length > 0) {
      await supabase
        .from('kyc_issues')
        .delete()
        .eq('business_sample_id', sample.id)
        .eq('is_auto_generated', true);

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
      let savedSample: BusinessSample;

      if (editingSample) {
        const { data, error } = await supabase
          .from('kyc_business_samples')
          .update(dataToSave as any)
          .eq('id', editingSample.id)
          .select()
          .single();

        if (error) throw error;
        savedSample = data as BusinessSample;
      } else {
        const { data, error } = await supabase
          .from('kyc_business_samples')
          .insert(dataToSave as any)
          .select()
          .single();

        if (error) throw error;
        savedSample = data as BusinessSample;
      }

      await generateAutoIssues(savedSample);

      toast({ title: 'Saved', description: 'Sample saved successfully.' });
      setDialogOpen(false);
      setEditingSample(null);
      setFormData(emptyBusinessSample);
      loadSamples();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteSample = async (id: string) => {
    const { error } = await supabase.from('kyc_business_samples').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Sample removed.' });
      loadSamples();
      onIssueCreated();
    }
  };

  const openEditDialog = (sample: BusinessSample) => {
    setEditingSample(sample);
    setFormData(sample);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingSample(null);
    setFormData(emptyBusinessSample);
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
          <h2 className="text-xl font-semibold">Business/Entity KYC Testing</h2>
          <p className="text-sm text-muted-foreground">Test business client KYC including beneficial ownership verification</p>
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
              <DialogTitle>{editingSample ? 'Edit' : 'Add'} Business KYC Sample</DialogTitle>
              <DialogDescription>
                Test business client KYC including beneficial ownership against PCMLTFR requirements
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Business Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Business Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Customer ID</Label>
                    <Input
                      value={formData.customer_id || ''}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      placeholder="Business identifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={formData.business_name || ''}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      placeholder="Legal business name"
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
                <div className="grid grid-cols-2 gap-4">
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
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Accordion type="multiple" defaultValue={['mandatory', 'bo', 'reasonable']} className="w-full">
                {/* Mandatory Business Identity */}
                <AccordionItem value="mandatory">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Mandatory Business Identity (Auto-Fail if Missing)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="legal_name_present"
                          checked={formData.legal_name_present === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, legal_name_present: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="legal_name_present">Legal business name present</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="address_present"
                          checked={formData.address_present === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, address_present: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="address_present">Business address present</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="nature_of_business_documented"
                          checked={formData.nature_of_business_documented === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, nature_of_business_documented: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="nature_of_business_documented">Nature of principal business documented</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="incorporation_number_present"
                          checked={formData.incorporation_number_present === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, incorporation_number_present: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="incorporation_number_present">Incorporation number present</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="jurisdiction_documented"
                          checked={formData.jurisdiction_documented === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, jurisdiction_documented: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="jurisdiction_documented">Jurisdiction documented</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="directors_list_obtained"
                          checked={formData.directors_list_obtained === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, directors_list_obtained: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="directors_list_obtained">Directors list obtained</Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Beneficial Ownership */}
                <AccordionItem value="bo">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Beneficial Ownership (Mandatory)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="bo_25_percent_identified"
                          checked={formData.bo_25_percent_identified === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, bo_25_percent_identified: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="bo_25_percent_identified">BOs ≥25% identified</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="bo_natural_persons_identified"
                          checked={formData.bo_natural_persons_identified === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, bo_natural_persons_identified: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="bo_natural_persons_identified">Natural person BOs identified</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="bo_identity_verified"
                          checked={formData.bo_identity_verified === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, bo_identity_verified: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="bo_identity_verified">BO identity verified</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="smo_identified_if_bo_unknown"
                          checked={formData.smo_identified_if_bo_unknown === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, smo_identified_if_bo_unknown: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="smo_identified_if_bo_unknown">SMO identified if BO unknown</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="bo_pep_hio_determination_completed"
                          checked={formData.bo_pep_hio_determination_completed === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, bo_pep_hio_determination_completed: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="bo_pep_hio_determination_completed">PEP/HIO determination for BOs</Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Third-Party & Control */}
                <AccordionItem value="third_party">
                  <AccordionTrigger className="text-base font-medium">
                    Third-Party & Control Testing
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-4">
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
                          id="relationship_documented"
                          checked={formData.relationship_documented === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, relationship_documented: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="relationship_documented">Relationship documented</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="supporting_evidence_available"
                          checked={formData.supporting_evidence_available === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, supporting_evidence_available: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="supporting_evidence_available">Supporting evidence available</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="record_retention_evidenced"
                          checked={formData.record_retention_evidenced === true}
                          onCheckedChange={(checked) => setFormData({ ...formData, record_retention_evidenced: checked === true ? true : checked === false ? false : null })}
                        />
                        <Label htmlFor="record_retention_evidenced">Record retention evidenced</Label>
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
              No business samples yet. Click "Add Sample" to begin testing.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Identity</TableHead>
                  <TableHead>BO</TableHead>
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
                        <div className="font-medium">{sample.business_name || 'N/A'}</div>
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
                    <TableCell>{getResultBadge(sample.bo_test_result)}</TableCell>
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
