import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, AlertTriangle, CheckCircle, XCircle, Edit, User, Building2 } from 'lucide-react';
import { CSVImportDialog } from '../CSVImportDialog';

interface UnifiedKYCSamplesProps {
  reviewId: string;
  onIssueCreated: () => void;
}

type SampleType = 'individual' | 'business';

interface UnifiedSample {
  id: string;
  type: SampleType;
  customer_id?: string | null;
  customer_name?: string | null;
  business_name?: string | null;
  onboarding_date?: string | null;
  risk_rating?: string;
  triggered_obligation?: string | null;
  identification_method?: string | null;
  evidence_type?: string | null;
  // Individual fields
  name_present?: boolean | null;
  dob_present?: boolean | null;
  telephone_present?: boolean | null;
  address_present?: boolean | null;
  occupation_present?: boolean | null;
  occupation_required?: boolean | null;
  occupation_description?: string | null;
  sole_prop_nature_of_business?: string | null;
  id_verified?: boolean | null;
  id_contains_required_attributes?: boolean | null;
  id_attr_person_name?: boolean | null;
  id_attr_document_type?: boolean | null;
  id_attr_identifying_number?: boolean | null;
  id_attr_jurisdiction?: boolean | null;
  id_attr_expiry_date?: boolean | null;
  id_attr_expiry_na?: boolean | null;
  id_valid_at_verification?: boolean | null;
  pep_hio_determination_completed?: boolean | null;
  pep_hio_identified?: boolean | null;
  pep_status_recorded?: boolean | null;
  pep_office_position_documented?: boolean | null;
  pep_determination_date_documented?: boolean | null;
  pep_source_of_funds_measures?: boolean | null;
  pep_source_of_wealth_measures?: boolean | null;
  pep_senior_mgmt_review_30_days?: boolean | null;
  pep_senior_mgmt_approval?: boolean | null;
  pep_classified_high_risk?: boolean | null;
  // Credit File method checks
  cf_name_address_dob_match?: boolean | null;
  cf_credit_bureau_name?: boolean | null;
  cf_credit_file_number?: boolean | null;
  cf_existence_3_years?: boolean | null;
  cf_two_tradelines?: boolean | null;
  cf_consultation_date?: boolean | null;
  // Dual Process method checks
  dp_person_name?: boolean | null;
  dp_two_independent_sources?: boolean | null;
  dp_information_type?: boolean | null;
  dp_document_valid_current?: boolean | null;
  dp_document_number?: boolean | null;
  dp_date_verified?: boolean | null;
  third_party_determination_made?: boolean | null;
  record_retention_evidenced?: boolean | null;
  source_of_funds_documented?: boolean | null;
  source_of_wealth_documented?: boolean | null;
  enhanced_monitoring_evidenced?: boolean | null;
  senior_management_review_completed?: boolean | null;
  senior_management_review_within_30_days?: boolean | null;
  // Business fields
  legal_name_present?: boolean | null;
  nature_of_business_documented?: boolean | null;
  incorporation_number_present?: boolean | null;
  jurisdiction_documented?: boolean | null;
  directors_list_obtained?: boolean | null;
  authorized_persons_documented?: boolean | null;
  authorized_persons_names_recorded?: boolean | null;
  signature_card_obtained?: boolean | null;
  articles_or_bylaws_obtained?: boolean | null;
  // BO Row 1
  bo_25_percent_identified?: boolean | null;
  bo_name_address_recorded?: boolean | null;
  // BO Row 2
  bo_percentages_total_100?: boolean | null;
  bo_percentage_gap_explanation?: boolean | null;
  // BO Row 3
  ownership_structure_documented?: boolean | null;
  control_structure_documented?: boolean | null;
  bo_supporting_docs_obtained?: boolean | null;
  // BO general
  bo_natural_persons_identified?: boolean | null;
  bo_identity_verified?: boolean | null;
  smo_identified_if_bo_unknown?: boolean | null;
  bo_pep_hio_determination_completed?: boolean | null;
  // Entity-type gates + specifics
  entity_is_corporation?: boolean | null;
  entity_is_trust?: boolean | null;
  entity_is_widely_held?: boolean | null;
  entity_is_other?: boolean | null;
  entity_is_nfp?: boolean | null;
  corp_directors_names_recorded?: boolean | null;
  corp_25pct_owners_name_address?: boolean | null;
  corp_ownership_control_structure?: boolean | null;
  trust_trustees_name_address?: boolean | null;
  trust_beneficiaries_name_address?: boolean | null;
  trust_settlors_name_address?: boolean | null;
  trust_ownership_control_structure?: boolean | null;
  wht_trustees_names?: boolean | null;
  wht_25pct_owners_identified?: boolean | null;
  wht_ownership_control_documented?: boolean | null;
  other_25pct_owners_identified?: boolean | null;
  other_ownership_control_documented?: boolean | null;
  nfp_registered_charity?: boolean | null;
  nfp_non_charity_soliciting?: boolean | null;
  relationship_documented?: boolean | null;
  supporting_evidence_available?: boolean | null;
  // Cheque-cashing record-keeping fields (shared individual + business)
  cheque_date_cashed?: boolean | null;
  cheque_provider_name?: boolean | null;
  cheque_provider_address?: boolean | null;
  cheque_provider_occupation?: boolean | null;
  cheque_provider_dob?: boolean | null;
  cheque_total_amount?: boolean | null;
  cheque_issuer_name?: boolean | null;
  cheque_account_number?: boolean | null;
  cheque_account_type?: boolean | null;
  cheque_account_holder_name?: boolean | null;
  cheque_reference_number?: boolean | null;
  cheque_vc_transaction_identifier?: boolean | null;
  // Transaction-related fields
  is_transaction_related?: boolean | null;
  transaction_type?: string | null;
  transaction_amount?: number | null;
  transaction_date?: string | null;
  transaction_currency?: string | null;
  third_party_required?: boolean | null;
  third_party_documented?: boolean | null;
  third_party_type?: string | null;
  third_party_individual_name?: boolean | null;
  third_party_individual_address?: boolean | null;
  third_party_individual_dob?: boolean | null;
  third_party_individual_occupation?: boolean | null;
  third_party_entity_name?: boolean | null;
  third_party_entity_address?: boolean | null;
  third_party_entity_nature_of_business?: boolean | null;
  third_party_entity_incorporation_number?: boolean | null;
  third_party_entity_place_of_incorporation?: boolean | null;
  third_party_relationship_documented?: boolean | null;
  third_party_relationship_type?: string | null;
  eft_record_complete?: boolean | null;
  vc_record_complete?: boolean | null;
  lctr_record_complete?: boolean | null;
  // EFT detailed fields
  eft_date_of_initiation?: boolean | null;
  eft_ordering_client_name?: boolean | null;
  eft_ordering_client_address?: boolean | null;
  eft_requesting_client_match_kyc?: boolean | null;
  eft_beneficiary_name?: boolean | null;
  eft_beneficiary_address?: boolean | null;
  eft_account_details?: boolean | null;
  eft_exchange_rate?: boolean | null;
  eft_exchange_rate_source?: boolean | null;
  eft_reference_number?: boolean | null;
  eft_fund_type_amount?: boolean | null;
  eft_sending_fi?: boolean | null;
  eft_receiving_fi?: boolean | null;
  // LCTR detailed fields
  lctr_amount_confirmed?: boolean | null;
  lctr_24h_aggregation?: boolean | null;
  lctr_currency_conversion?: boolean | null;
  lctr_third_party_determination?: boolean | null;
  lctr_third_party_details?: boolean | null;
  lctr_client_name?: boolean | null;
  lctr_client_address?: boolean | null;
  lctr_client_dob?: boolean | null;
  lctr_occupation?: boolean | null;
  lctr_conductor_name?: boolean | null;
  lctr_conductor_address?: boolean | null;
  lctr_purpose?: boolean | null;
  lctr_transaction_time?: boolean | null;
  // VC detailed fields
  vc_amount_confirmed?: boolean | null;
  vc_third_party_determination?: boolean | null;
  vc_client_name?: boolean | null;
  vc_client_address?: boolean | null;
  vc_type_of_vc?: boolean | null;
  vc_amount?: boolean | null;
  vc_fiat_equivalent?: boolean | null;
  vc_exchange_rate?: boolean | null;
  vc_exchange_rate_source?: boolean | null;
  vc_sending_wallet?: boolean | null;
  vc_receiving_wallet?: boolean | null;
  vc_reference_number?: boolean | null;
  // Results
  mandatory_test_result?: string | null;
  reasonable_measures_result?: string | null;
  bo_test_result?: string | null;
  overall_result?: string | null;
  deficiencies?: string | null;
  notes?: string | null;
}

const emptyIndividualSample: Partial<UnifiedSample> = {
  type: 'individual',
  customer_id: '',
  customer_name: '',
  onboarding_date: '',
  risk_rating: 'low',
  triggered_obligation: null,
  identification_method: null,
  evidence_type: null,
  name_present: null,
  dob_present: null,
  telephone_present: null,
  address_present: null,
  occupation_present: null,
  occupation_required: false,
  occupation_description: '',
  sole_prop_nature_of_business: '',
  id_verified: null,
  id_contains_required_attributes: null,
  pep_hio_determination_completed: null,
  pep_hio_identified: null,
  pep_office_position_documented: null,
  pep_determination_date_documented: null,
  pep_source_of_funds_measures: null,
  pep_source_of_wealth_measures: null,
  pep_senior_mgmt_review_30_days: null,
  pep_classified_high_risk: null,
  cf_name_address_dob_match: null,
  cf_credit_bureau_name: null,
  cf_credit_file_number: null,
  cf_existence_3_years: null,
  cf_two_tradelines: null,
  cf_consultation_date: null,
  dp_person_name: null,
  dp_two_independent_sources: null,
  dp_information_type: null,
  dp_document_valid_current: null,
  dp_document_number: null,
  dp_date_verified: null,
  third_party_determination_made: null,
  record_retention_evidenced: null,
  source_of_funds_documented: null,
  source_of_wealth_documented: null,
  enhanced_monitoring_evidenced: null,
  senior_management_review_completed: null,
  senior_management_review_within_30_days: null,
  is_transaction_related: false,
  transaction_type: null,
  transaction_amount: null,
  transaction_date: null,
  transaction_currency: 'CAD',
  third_party_required: false,
  third_party_documented: null,
  eft_record_complete: null,
  vc_record_complete: null,
  lctr_record_complete: null,
  // EFT fields
  eft_ordering_client_name: null,
  eft_ordering_client_address: null,
  eft_beneficiary_name: null,
  eft_beneficiary_address: null,
  eft_exchange_rate: null,
  eft_reference_number: null,
  eft_fund_type_amount: null,
  eft_sending_fi: null,
  eft_receiving_fi: null,
  // LCTR fields
  lctr_client_name: null,
  lctr_client_address: null,
  lctr_client_dob: null,
  lctr_occupation: null,
  lctr_conductor_name: null,
  lctr_conductor_address: null,
  lctr_purpose: null,
  lctr_transaction_time: null,
  // VC fields
  vc_client_name: null,
  vc_client_address: null,
  vc_type_of_vc: null,
  vc_amount: null,
  vc_fiat_equivalent: null,
  vc_exchange_rate: null,
  vc_sending_wallet: null,
  vc_receiving_wallet: null,
  vc_reference_number: null,
  deficiencies: '',
  notes: '',
};

const emptyBusinessSample: Partial<UnifiedSample> = {
  type: 'business',
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
  authorized_persons_documented: null,
  authorized_persons_names_recorded: null,
  signature_card_obtained: null,
  articles_or_bylaws_obtained: null,
  bo_25_percent_identified: null,
  bo_name_address_recorded: null,
  bo_percentages_total_100: null,
  bo_percentage_gap_explanation: null,
  ownership_structure_documented: null,
  control_structure_documented: null,
  bo_supporting_docs_obtained: null,
  bo_natural_persons_identified: null,
  bo_identity_verified: null,
  smo_identified_if_bo_unknown: null,
  bo_pep_hio_determination_completed: null,
  entity_is_corporation: null,
  entity_is_trust: null,
  entity_is_widely_held: null,
  entity_is_other: null,
  entity_is_nfp: null,
  corp_directors_names_recorded: null,
  corp_25pct_owners_name_address: null,
  corp_ownership_control_structure: null,
  trust_trustees_name_address: null,
  trust_beneficiaries_name_address: null,
  trust_settlors_name_address: null,
  trust_ownership_control_structure: null,
  wht_trustees_names: null,
  wht_25pct_owners_identified: null,
  wht_ownership_control_documented: null,
  other_25pct_owners_identified: null,
  other_ownership_control_documented: null,
  nfp_registered_charity: null,
  nfp_non_charity_soliciting: null,
  third_party_determination_made: null,
  relationship_documented: null,
  supporting_evidence_available: null,
  record_retention_evidenced: null,
  source_of_funds_documented: null,
  source_of_wealth_documented: null,
  enhanced_monitoring_evidenced: null,
  senior_management_review_completed: null,
  is_transaction_related: false,
  transaction_type: null,
  transaction_amount: null,
  transaction_date: null,
  transaction_currency: 'CAD',
  third_party_required: false,
  third_party_documented: null,
  eft_record_complete: null,
  vc_record_complete: null,
  lctr_record_complete: null,
  // EFT fields
  eft_ordering_client_name: null,
  eft_ordering_client_address: null,
  eft_beneficiary_name: null,
  eft_beneficiary_address: null,
  eft_exchange_rate: null,
  eft_reference_number: null,
  eft_fund_type_amount: null,
  eft_sending_fi: null,
  eft_receiving_fi: null,
  // LCTR fields
  lctr_client_name: null,
  lctr_client_address: null,
  lctr_client_dob: null,
  lctr_occupation: null,
  lctr_conductor_name: null,
  lctr_conductor_address: null,
  lctr_purpose: null,
  lctr_transaction_time: null,
  // VC fields
  vc_client_name: null,
  vc_client_address: null,
  vc_type_of_vc: null,
  vc_amount: null,
  vc_fiat_equivalent: null,
  vc_exchange_rate: null,
  vc_sending_wallet: null,
  vc_receiving_wallet: null,
  vc_reference_number: null,
  deficiencies: '',
  notes: '',
};

const transactionTypes = [
  { value: 'eft', label: 'EFT ≥$1,000' },
  { value: 'vc_1k', label: 'Virtual Currency ≥$1,000' },
  { value: 'vc_transaction', label: 'Virtual Currency ≥$10,000' },
  { value: 'fx_3k', label: 'FX ≥$3,000' },
  { value: 'lctr', label: 'Large Cash Transaction ≥$10,000' },
  { value: 'cheque_cashing', label: 'Cheque Cashing ≥$3,000' },
  { value: 'other', label: 'Other' },
];

// Triggered obligations that require transaction-based testing
const TRANSACTION_BASED_TRIGGERS = new Set([
  'transaction',
  'fx_3k',
  'cash_cheque_3k',
  'lctr',
  'lvctr',
  'vc_transaction',
]);

const isTransactionBasedTrigger = (trigger?: string | null) =>
  !!trigger && TRANSACTION_BASED_TRIGGERS.has(trigger);

export function UnifiedKYCSamples({ reviewId, onIssueCreated }: UnifiedKYCSamplesProps) {
  const [samples, setSamples] = useState<UnifiedSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<UnifiedSample | null>(null);
  const [formData, setFormData] = useState<Partial<UnifiedSample>>(emptyIndividualSample);
  const [selectedType, setSelectedType] = useState<SampleType>('individual');
  const { toast } = useToast();

  useEffect(() => {
    loadSamples();
  }, [reviewId]);

  const loadSamples = async () => {
    setLoading(true);
    
    // Load both individual and business samples
    const [individualsRes, businessRes] = await Promise.all([
      supabase
        .from('kyc_individual_samples')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false }),
      supabase
        .from('kyc_business_samples')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false }),
    ]);

    const individuals: UnifiedSample[] = (individualsRes.data || []).map(s => ({
      ...s,
      type: 'individual' as SampleType,
    }));

    const businesses: UnifiedSample[] = (businessRes.data || []).map(s => ({
      ...s,
      type: 'business' as SampleType,
      customer_name: s.business_name,
    }));

    // Combine and sort by created_at
    const combined = [...individuals, ...businesses].sort(
      (a, b) => new Date(b.onboarding_date || 0).getTime() - new Date(a.onboarding_date || 0).getTime()
    );

    setSamples(combined);
    setLoading(false);
  };

  const calculateIndividualTestResults = (data: Partial<UnifiedSample>) => {
    const mandatoryFields: (boolean | null | undefined)[] = [
      data.name_present,
      data.dob_present,
      data.address_present,
      data.pep_hio_determination_completed,
    ];

    // ID-method-specific mandatory checks
    if (data.identification_method === 'credit_file') {
      mandatoryFields.push(
        data.cf_name_address_dob_match,
        data.cf_credit_bureau_name,
        data.cf_credit_file_number,
        data.cf_existence_3_years,
        data.cf_two_tradelines,
        data.cf_consultation_date,
      );
    } else if (data.identification_method === 'dual_process') {
      mandatoryFields.push(
        data.dp_person_name,
        data.dp_two_independent_sources,
        data.dp_information_type,
        data.dp_document_valid_current,
        data.dp_document_number,
        data.dp_date_verified,
      );
    } else {
      // Default: Government ID / Affiliate / unspecified — use photo-ID attribute checks
      mandatoryFields.push(
        data.id_attr_person_name,
        data.id_attr_document_type,
        data.id_attr_identifying_number,
        data.id_attr_jurisdiction,
      );
    }

    // Telephone is mandatory for all triggers EXCEPT LVCTR
    if (data.triggered_obligation !== 'lvctr') {
      mandatoryFields.push(data.telephone_present);
    }

    if (data.occupation_required) {
      mandatoryFields.push(data.occupation_present);
    }

    // If identification method is "none", the ID verification automatically fails
    const idMethodFails = data.identification_method === 'none';

    const mandatoryResult = idMethodFails ? 'fail' :
                           mandatoryFields.every(f => f === true) ? 'pass' : 
                           mandatoryFields.some(f => f === false) ? 'fail' : 'pending';

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

  const calculateBusinessTestResults = (data: Partial<UnifiedSample>) => {
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

    const boFields = [
      data.bo_25_percent_identified,
      data.bo_natural_persons_identified,
      data.bo_identity_verified,
      data.bo_pep_hio_determination_completed,
    ];

    const boResult = boFields.every(f => f === true) ? 'pass' : 
                     boFields.some(f => f === false) ? 'fail' : 'pending';

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

  const saveSample = async () => {
    const type = formData.type || selectedType;
    const tableName = type === 'individual' ? 'kyc_individual_samples' : 'kyc_business_samples';
    
    const testResults = type === 'individual' 
      ? calculateIndividualTestResults(formData)
      : calculateBusinessTestResults(formData);

    // Prepare data based on type
    const baseData = {
      review_id: reviewId,
      customer_id: formData.customer_id || null,
      onboarding_date: formData.onboarding_date || null,
      risk_rating: formData.risk_rating || 'low',
      triggered_obligation: formData.triggered_obligation || null,
      evidence_type: formData.evidence_type || null,
      deficiencies: formData.deficiencies || null,
      notes: formData.notes || null,
      // Transaction fields
      is_transaction_related: formData.is_transaction_related || false,
      transaction_type: formData.transaction_type || null,
      transaction_amount: formData.transaction_amount || null,
      transaction_date: formData.transaction_date || null,
      transaction_currency: formData.transaction_currency || 'CAD',
      third_party_required: formData.third_party_required || false,
      third_party_documented: formData.third_party_documented,
      third_party_type: formData.third_party_type || null,
      third_party_individual_name: formData.third_party_individual_name,
      third_party_individual_address: formData.third_party_individual_address,
      third_party_individual_dob: formData.third_party_individual_dob,
      third_party_individual_occupation: formData.third_party_individual_occupation,
      third_party_entity_name: formData.third_party_entity_name,
      third_party_entity_address: formData.third_party_entity_address,
      third_party_entity_nature_of_business: formData.third_party_entity_nature_of_business,
      third_party_entity_incorporation_number: formData.third_party_entity_incorporation_number,
      third_party_entity_place_of_incorporation: formData.third_party_entity_place_of_incorporation,
      third_party_relationship_documented: formData.third_party_relationship_documented,
      third_party_relationship_type: formData.third_party_relationship_type || null,
      eft_record_complete: formData.eft_record_complete,
      vc_record_complete: formData.vc_record_complete,
      lctr_record_complete: formData.lctr_record_complete,
      // EFT detailed fields
      eft_date_of_initiation: formData.eft_date_of_initiation,
      eft_ordering_client_name: formData.eft_ordering_client_name,
      eft_ordering_client_address: formData.eft_ordering_client_address,
      eft_requesting_client_match_kyc: formData.eft_requesting_client_match_kyc,
      eft_beneficiary_name: formData.eft_beneficiary_name,
      eft_beneficiary_address: formData.eft_beneficiary_address,
      eft_account_details: formData.eft_account_details,
      eft_exchange_rate: formData.eft_exchange_rate,
      eft_exchange_rate_source: formData.eft_exchange_rate_source,
      eft_reference_number: formData.eft_reference_number,
      eft_fund_type_amount: formData.eft_fund_type_amount,
      eft_sending_fi: formData.eft_sending_fi,
      eft_receiving_fi: formData.eft_receiving_fi,
      // LCTR detailed fields
      lctr_amount_confirmed: formData.lctr_amount_confirmed,
      lctr_24h_aggregation: formData.lctr_24h_aggregation,
      lctr_currency_conversion: formData.lctr_currency_conversion,
      lctr_third_party_determination: formData.lctr_third_party_determination,
      lctr_third_party_details: formData.lctr_third_party_details,
      lctr_client_name: formData.lctr_client_name,
      lctr_client_address: formData.lctr_client_address,
      lctr_client_dob: formData.lctr_client_dob,
      lctr_occupation: formData.lctr_occupation,
      lctr_conductor_name: formData.lctr_conductor_name,
      lctr_conductor_address: formData.lctr_conductor_address,
      lctr_purpose: formData.lctr_purpose,
      lctr_transaction_time: formData.lctr_transaction_time,
      // VC detailed fields
      vc_amount_confirmed: formData.vc_amount_confirmed,
      vc_third_party_determination: formData.vc_third_party_determination,
      vc_client_name: formData.vc_client_name,
      vc_client_address: formData.vc_client_address,
      vc_type_of_vc: formData.vc_type_of_vc,
      vc_amount: formData.vc_amount,
      vc_fiat_equivalent: formData.vc_fiat_equivalent,
      vc_exchange_rate: formData.vc_exchange_rate,
      vc_exchange_rate_source: formData.vc_exchange_rate_source,
      vc_sending_wallet: formData.vc_sending_wallet,
      vc_receiving_wallet: formData.vc_receiving_wallet,
      vc_reference_number: formData.vc_reference_number,
      // Cheque-cashing record-keeping fields
      cheque_date_cashed: formData.cheque_date_cashed,
      cheque_provider_name: formData.cheque_provider_name,
      cheque_provider_address: formData.cheque_provider_address,
      cheque_provider_occupation: formData.cheque_provider_occupation,
      cheque_provider_dob: formData.cheque_provider_dob,
      cheque_total_amount: formData.cheque_total_amount,
      cheque_issuer_name: formData.cheque_issuer_name,
      cheque_account_number: formData.cheque_account_number,
      cheque_account_type: formData.cheque_account_type,
      cheque_account_holder_name: formData.cheque_account_holder_name,
      cheque_reference_number: formData.cheque_reference_number,
      cheque_vc_transaction_identifier: formData.cheque_vc_transaction_identifier,
      ...testResults,
    };

    let dataToSave: any;
    
    if (type === 'individual') {
      dataToSave = {
        ...baseData,
        customer_name: formData.customer_name || null,
        identification_method: formData.identification_method || null,
        name_present: formData.name_present,
        dob_present: formData.dob_present,
        telephone_present: formData.telephone_present,
        address_present: formData.address_present,
        occupation_present: formData.occupation_present,
        occupation_required: formData.occupation_required || false,
        occupation_description: formData.occupation_description || null,
        sole_prop_nature_of_business: formData.sole_prop_nature_of_business || null,
        id_verified: formData.id_verified,
        id_contains_required_attributes: formData.id_contains_required_attributes,
        id_attr_person_name: formData.id_attr_person_name,
        id_attr_document_type: formData.id_attr_document_type,
        id_attr_identifying_number: formData.id_attr_identifying_number,
        id_attr_jurisdiction: formData.id_attr_jurisdiction,
        id_attr_expiry_date: formData.id_attr_expiry_date,
        id_attr_expiry_na: formData.id_attr_expiry_na,
        id_valid_at_verification: formData.id_valid_at_verification,
        cf_name_address_dob_match: formData.cf_name_address_dob_match,
        cf_credit_bureau_name: formData.cf_credit_bureau_name,
        cf_credit_file_number: formData.cf_credit_file_number,
        cf_existence_3_years: formData.cf_existence_3_years,
        cf_two_tradelines: formData.cf_two_tradelines,
        cf_consultation_date: formData.cf_consultation_date,
        dp_person_name: formData.dp_person_name,
        dp_two_independent_sources: formData.dp_two_independent_sources,
        dp_information_type: formData.dp_information_type,
        dp_document_valid_current: formData.dp_document_valid_current,
        dp_document_number: formData.dp_document_number,
        dp_date_verified: formData.dp_date_verified,
        pep_hio_determination_completed: formData.pep_hio_determination_completed,
        pep_hio_identified: formData.pep_hio_identified,
        pep_status_recorded: formData.pep_status_recorded,
        pep_office_position_documented: formData.pep_office_position_documented,
        pep_determination_date_documented: formData.pep_determination_date_documented,
        pep_source_of_funds_measures: formData.pep_source_of_funds_measures,
        pep_source_of_wealth_measures: formData.pep_source_of_wealth_measures,
        pep_senior_mgmt_review_30_days: formData.pep_senior_mgmt_review_30_days,
        pep_senior_mgmt_approval: formData.pep_senior_mgmt_approval,
        pep_classified_high_risk: formData.pep_classified_high_risk,
        third_party_determination_made: formData.third_party_determination_made,
        record_retention_evidenced: formData.record_retention_evidenced,
        source_of_funds_documented: formData.source_of_funds_documented,
        source_of_wealth_documented: formData.source_of_wealth_documented,
        enhanced_monitoring_evidenced: formData.enhanced_monitoring_evidenced,
        senior_management_review_completed: formData.senior_management_review_completed,
        senior_management_review_within_30_days: formData.senior_management_review_within_30_days,
      };
    } else {
      dataToSave = {
        ...baseData,
        business_name: formData.business_name || formData.customer_name || null,
        legal_name_present: formData.legal_name_present,
        address_present: formData.address_present,
        nature_of_business_documented: formData.nature_of_business_documented,
        incorporation_number_present: formData.incorporation_number_present,
        jurisdiction_documented: formData.jurisdiction_documented,
        directors_list_obtained: formData.directors_list_obtained,
        authorized_persons_documented: formData.authorized_persons_documented,
        authorized_persons_names_recorded: formData.authorized_persons_names_recorded,
        signature_card_obtained: formData.signature_card_obtained,
        articles_or_bylaws_obtained: formData.articles_or_bylaws_obtained,
        bo_25_percent_identified: formData.bo_25_percent_identified,
        bo_name_address_recorded: formData.bo_name_address_recorded,
        bo_percentages_total_100: formData.bo_percentages_total_100,
        bo_percentage_gap_explanation: formData.bo_percentage_gap_explanation,
        ownership_structure_documented: formData.ownership_structure_documented,
        control_structure_documented: formData.control_structure_documented,
        bo_supporting_docs_obtained: formData.bo_supporting_docs_obtained,
        bo_natural_persons_identified: formData.bo_natural_persons_identified,
        bo_identity_verified: formData.bo_identity_verified,
        smo_identified_if_bo_unknown: formData.smo_identified_if_bo_unknown,
        bo_pep_hio_determination_completed: formData.bo_pep_hio_determination_completed,
        entity_is_corporation: formData.entity_is_corporation,
        entity_is_trust: formData.entity_is_trust,
        entity_is_widely_held: formData.entity_is_widely_held,
        entity_is_other: formData.entity_is_other,
        entity_is_nfp: formData.entity_is_nfp,
        corp_directors_names_recorded: formData.corp_directors_names_recorded,
        corp_25pct_owners_name_address: formData.corp_25pct_owners_name_address,
        corp_ownership_control_structure: formData.corp_ownership_control_structure,
        trust_trustees_name_address: formData.trust_trustees_name_address,
        trust_beneficiaries_name_address: formData.trust_beneficiaries_name_address,
        trust_settlors_name_address: formData.trust_settlors_name_address,
        trust_ownership_control_structure: formData.trust_ownership_control_structure,
        wht_trustees_names: formData.wht_trustees_names,
        wht_25pct_owners_identified: formData.wht_25pct_owners_identified,
        wht_ownership_control_documented: formData.wht_ownership_control_documented,
        other_25pct_owners_identified: formData.other_25pct_owners_identified,
        other_ownership_control_documented: formData.other_ownership_control_documented,
        nfp_registered_charity: formData.nfp_registered_charity,
        nfp_non_charity_soliciting: formData.nfp_non_charity_soliciting,
        third_party_determination_made: formData.third_party_determination_made,
        relationship_documented: formData.relationship_documented,
        supporting_evidence_available: formData.supporting_evidence_available,
        record_retention_evidenced: formData.record_retention_evidenced,
        source_of_funds_documented: formData.source_of_funds_documented,
        source_of_wealth_documented: formData.source_of_wealth_documented,
        enhanced_monitoring_evidenced: formData.enhanced_monitoring_evidenced,
        senior_management_review_completed: formData.senior_management_review_completed,
      };
    }

    try {
      if (editingSample) {
        const { error } = await supabase
          .from(tableName)
          .update(dataToSave)
          .eq('id', editingSample.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert(dataToSave);

        if (error) throw error;
      }

      toast({ title: 'Saved', description: 'Sample saved successfully.' });
      setDialogOpen(false);
      setEditingSample(null);
      setFormData(emptyIndividualSample);
      loadSamples();
      onIssueCreated();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteSample = async (sample: UnifiedSample) => {
    const tableName = sample.type === 'individual' ? 'kyc_individual_samples' : 'kyc_business_samples';
    const { error } = await supabase.from(tableName).delete().eq('id', sample.id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Sample removed.' });
      loadSamples();
      onIssueCreated();
    }
  };

  const openEditDialog = (sample: UnifiedSample) => {
    setEditingSample(sample);
    setSelectedType(sample.type);
    setFormData({
      ...sample,
      customer_name: sample.type === 'business' ? sample.business_name : sample.customer_name,
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingSample(null);
    setSelectedType('individual');
    setFormData(emptyIndividualSample);
    setDialogOpen(true);
  };

  const handleTypeChange = (type: SampleType) => {
    setSelectedType(type);
    if (type === 'individual') {
      setFormData({ ...emptyIndividualSample });
    } else {
      setFormData({ ...emptyBusinessSample });
    }
  };

  const getResultBadge = (result: string | null | undefined) => {
    switch (result) {
      case 'pass':
        return <Badge className="bg-primary text-primary-foreground"><CheckCircle className="w-3 h-3 mr-1" />Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fail</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const renderCheckboxField = (
    label: string,
    value: boolean | null | undefined,
    onChange: (checked: boolean | null) => void,
    guidance?: string
  ) => (
    <div className="flex items-start justify-between gap-3 p-2 rounded hover:bg-muted/50">
      <div className="grid gap-1 leading-none flex-1 min-w-0">
        <label className="text-sm font-medium">{label}</label>
        {guidance && <p className="text-xs text-muted-foreground">{guidance}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          size="sm"
          variant={value === true ? 'default' : 'outline'}
          className="h-7 px-3"
          onClick={() => onChange(value === true ? null : true)}
        >
          Yes
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value === false ? 'destructive' : 'outline'}
          className="h-7 px-3"
          onClick={() => onChange(value === false ? null : false)}
        >
          No
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">KYC Samples</h2>
          <p className="text-sm text-muted-foreground">Test individual and business client KYC files against FINTRAC requirements</p>
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
                <DialogTitle>{editingSample ? 'Edit' : 'Add'} KYC Sample</DialogTitle>
                <DialogDescription>
                  Test client KYC against PCMLTFR mandatory and reasonable measures requirements
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Type Selection - only show for new samples */}
                {!editingSample && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Sample Type</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={selectedType === 'individual' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => handleTypeChange('individual')}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Individual
                      </Button>
                      <Button
                        type="button"
                        variant={selectedType === 'business' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => handleTypeChange('business')}
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Business / Entity
                      </Button>
                    </div>
                  </div>
                )}

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
                      <Label>{selectedType === 'business' ? 'Business Name' : 'Customer Name'}</Label>
                      <Input
                        value={selectedType === 'business' ? (formData.business_name || '') : (formData.customer_name || '')}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          [selectedType === 'business' ? 'business_name' : 'customer_name']: e.target.value 
                        })}
                        placeholder={selectedType === 'business' ? 'Legal business name' : 'Full legal name'}
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
                          <SelectItem value="customer_listing">Customer Listing</SelectItem>
                          <SelectItem value="service_agreement">Service Agreement</SelectItem>
                          <SelectItem value="transaction">Transaction ≥$1,000</SelectItem>
                          <SelectItem value="fx_3k">FX ≥$3,000</SelectItem>
                          <SelectItem value="cash_cheque_3k">Cash Cheque Cashing ≥$3,000</SelectItem>
                          <SelectItem value="lctr">LCTR ≥$10,000</SelectItem>
                          <SelectItem value="lvctr">LVCTR ≥$10,000</SelectItem>
                          <SelectItem value="vc_transaction">VC Transaction ≥$10,000</SelectItem>
                          <SelectItem value="suspicion">Suspicion</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Individual-specific fields */}
                {selectedType === 'individual' && (
                  <Accordion type="multiple" defaultValue={['mandatory', 'reasonable']} className="w-full">
                    <AccordionItem value="mandatory">
                      <AccordionTrigger className="text-base font-medium">
                        Mandatory Requirements (Hard Fail if Missing)
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Identification Method</Label>
                              {formData.identification_method === 'none' && (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </div>
                            <Select
                              value={formData.identification_method || ''}
                              onValueChange={(value) => setFormData({ ...formData, identification_method: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select method..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="government_id">Government ID</SelectItem>
                                <SelectItem value="credit_file">Credit File</SelectItem>
                                <SelectItem value="dual_process">Dual Process</SelectItem>
                                <SelectItem value="affiliate">Affiliate/Member</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
                            {formData.identification_method === 'none' && (
                              <p className="text-xs text-destructive">
                                No identification method on file — mandatory KYC requirements automatically fail.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 border rounded-lg p-4">
                          {renderCheckboxField('Legal name documented', formData.name_present, (checked) => setFormData({ ...formData, name_present: checked }))}
                          {renderCheckboxField('Date of birth documented', formData.dob_present, (checked) => setFormData({ ...formData, dob_present: checked }))}
                          {renderCheckboxField(
                            'Telephone number documented',
                            formData.telephone_present,
                            (checked) => setFormData({ ...formData, telephone_present: checked }),
                            'Required only for remittance-related transactions.'
                          )}
                          {renderCheckboxField(
                            'Address documented',
                            formData.address_present,
                            (checked) => setFormData({ ...formData, address_present: checked }),
                            'Must be a physical address. PO Box not allowed.'
                          )}
                          
                          <div className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              checked={formData.occupation_required === true}
                              onCheckedChange={(checked) => setFormData({ ...formData, occupation_required: checked === true })}
                              className="mt-0.5"
                            />
                            <div className="grid gap-1 leading-none">
                              <label className="text-sm font-medium cursor-pointer">Occupation required (transaction ≥$1,000)</label>
                            </div>
                          </div>
                          {formData.occupation_required && (
                            <>
                              {renderCheckboxField('Occupation documented and sufficiently descriptive', formData.occupation_present, (checked) => setFormData({ ...formData, occupation_present: checked }))}
                              <div className="space-y-2 pl-7 pb-2">
                                <Label className="text-sm">Occupation / nature of business described</Label>
                                <Input
                                  value={formData.occupation_description || ''}
                                  onChange={(e) => setFormData({ ...formData, occupation_description: e.target.value })}
                                  placeholder="e.g. Civil engineer at ABC Construction, Owner-operator of XYZ Bakery..."
                                />
                              </div>
                              <div className="space-y-2 pl-7 pb-2">
                                <Label className="text-sm">Nature of principal business (if a sole proprietorship)</Label>
                                <Input
                                  value={formData.sole_prop_nature_of_business || ''}
                                  onChange={(e) => setFormData({ ...formData, sole_prop_nature_of_business: e.target.value })}
                                  placeholder="e.g. Independent retail bakery, Freelance accounting services..."
                                />
                              </div>
                            </>
                          )}
                          
                          {(formData.identification_method === 'government_id' || formData.identification_method === 'affiliate' || !formData.identification_method || formData.identification_method === 'none') && (
                            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">ID contains required attributes</p>
                                <p className="text-xs text-muted-foreground">
                                  Mark Yes / No for each attribute on the photo ID.
                                </p>
                              </div>
                              <div className="space-y-1 pl-2 border-l-2 border-muted">
                                {renderCheckboxField("Person's name", formData.id_attr_person_name, (checked) => setFormData({ ...formData, id_attr_person_name: checked }))}
                                {renderCheckboxField('Document type', formData.id_attr_document_type, (checked) => setFormData({ ...formData, id_attr_document_type: checked }))}
                                {renderCheckboxField('Identifying number', formData.id_attr_identifying_number, (checked) => setFormData({ ...formData, id_attr_identifying_number: checked }))}
                                {renderCheckboxField('Jurisdiction of issue (state/province and country)', formData.id_attr_jurisdiction, (checked) => setFormData({ ...formData, id_attr_jurisdiction: checked }))}
                                <div className="flex items-start justify-between gap-3 p-2 rounded hover:bg-muted/50">
                                  <div className="grid gap-1 leading-none flex-1 min-w-0">
                                    <label className="text-sm font-medium">Expiry date (if applicable)</label>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={formData.id_attr_expiry_date === true && !formData.id_attr_expiry_na ? 'default' : 'outline'}
                                      className="h-7 px-3"
                                      onClick={() => setFormData({
                                        ...formData,
                                        id_attr_expiry_date: formData.id_attr_expiry_date === true && !formData.id_attr_expiry_na ? null : true,
                                        id_attr_expiry_na: false,
                                      })}
                                    >
                                      Yes
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={formData.id_attr_expiry_date === false && !formData.id_attr_expiry_na ? 'destructive' : 'outline'}
                                      className="h-7 px-3"
                                      onClick={() => setFormData({
                                        ...formData,
                                        id_attr_expiry_date: formData.id_attr_expiry_date === false && !formData.id_attr_expiry_na ? null : false,
                                        id_attr_expiry_na: false,
                                      })}
                                    >
                                      No
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={formData.id_attr_expiry_na ? 'secondary' : 'outline'}
                                      className="h-7 px-3"
                                      onClick={() => setFormData({
                                        ...formData,
                                        id_attr_expiry_na: !formData.id_attr_expiry_na,
                                        id_attr_expiry_date: !formData.id_attr_expiry_na ? true : null,
                                      })}
                                    >
                                      N/A
                                    </Button>
                                  </div>
                                </div>
                                {renderCheckboxField('ID was valid at time of verification', formData.id_valid_at_verification, (checked) => setFormData({ ...formData, id_valid_at_verification: checked }))}
                              </div>
                            </div>
                          )}

                          {formData.identification_method === 'credit_file' && (
                            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Credit File Method — required attributes</p>
                                <p className="text-xs text-muted-foreground">
                                  Confirm each requirement is documented in the credit file consulted.
                                </p>
                              </div>
                              <div className="space-y-1 pl-2 border-l-2 border-muted">
                                {renderCheckboxField("Name, address & DOB match customer's info", formData.cf_name_address_dob_match, (checked) => setFormData({ ...formData, cf_name_address_dob_match: checked }))}
                                {renderCheckboxField('Valid & current Canadian credit bureau or 3rd-party vendor named', formData.cf_credit_bureau_name, (checked) => setFormData({ ...formData, cf_credit_bureau_name: checked }))}
                                {renderCheckboxField('Credit file number documented', formData.cf_credit_file_number, (checked) => setFormData({ ...formData, cf_credit_file_number: checked }))}
                                {renderCheckboxField('Credit file has existed for at least 3 years', formData.cf_existence_3_years, (checked) => setFormData({ ...formData, cf_existence_3_years: checked }))}
                                {renderCheckboxField('Two (2) or more tradelines exist', formData.cf_two_tradelines, (checked) => setFormData({ ...formData, cf_two_tradelines: checked }))}
                                {renderCheckboxField('Date the credit file was consulted/searched documented', formData.cf_consultation_date, (checked) => setFormData({ ...formData, cf_consultation_date: checked }))}
                              </div>
                            </div>
                          )}

                          {formData.identification_method === 'dual_process' && (
                            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Dual Process Method — required attributes</p>
                                <p className="text-xs text-muted-foreground">
                                  Confirm each requirement is documented across the two information sources used.
                                </p>
                              </div>
                              <div className="space-y-1 pl-2 border-l-2 border-muted">
                                {renderCheckboxField("Person's name documented", formData.dp_person_name, (checked) => setFormData({ ...formData, dp_person_name: checked }))}
                                {renderCheckboxField('Two different sources referencing name & DOB and name & address (or deposit account)', formData.dp_two_independent_sources, (checked) => setFormData({ ...formData, dp_two_independent_sources: checked }))}
                                {renderCheckboxField('Type of information referred to documented', formData.dp_information_type, (checked) => setFormData({ ...formData, dp_information_type: checked }))}
                                {renderCheckboxField('Document used was valid and current', formData.dp_document_valid_current, (checked) => setFormData({ ...formData, dp_document_valid_current: checked }))}
                                {renderCheckboxField('Number associated with the information (document) documented', formData.dp_document_number, (checked) => setFormData({ ...formData, dp_document_number: checked }))}
                                {renderCheckboxField('Date verified documented', formData.dp_date_verified, (checked) => setFormData({ ...formData, dp_date_verified: checked }))}
                              </div>
                            </div>
                          )}
                          {renderCheckboxField('PEP/HIO determination completed', formData.pep_hio_determination_completed, (checked) => setFormData({ ...formData, pep_hio_determination_completed: checked }))}
                          {formData.pep_hio_determination_completed === true && (
                            <div className="ml-4 mt-2 border-l-2 border-primary/40 pl-4 space-y-2">
                              {renderCheckboxField('PEP/HIO identified', formData.pep_hio_identified, (checked) => setFormData({ ...formData, pep_hio_identified: checked }))}
                              {formData.pep_hio_identified === true && (
                                <div className="ml-4 mt-2 border-l-2 border-primary/40 pl-4 space-y-2">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Confirm the following are documented:</p>
                                  </div>
                                  {renderCheckboxField('PEP status recorded', formData.pep_status_recorded, (checked) => setFormData({ ...formData, pep_status_recorded: checked }))}
                                  {renderCheckboxField('Office or position for which the person was determined to be a PEP', formData.pep_office_position_documented, (checked) => setFormData({ ...formData, pep_office_position_documented: checked }))}
                                  {renderCheckboxField('Date of determination that the person was a PEP', formData.pep_determination_date_documented, (checked) => setFormData({ ...formData, pep_determination_date_documented: checked }))}
                                  {renderCheckboxField('Reasonable measures to determine source of funds (current and future transactions)', formData.pep_source_of_funds_measures, (checked) => setFormData({ ...formData, pep_source_of_funds_measures: checked }))}
                                  {renderCheckboxField('Reasonable measures to determine source of wealth', formData.pep_source_of_wealth_measures, (checked) => setFormData({ ...formData, pep_source_of_wealth_measures: checked }))}
                                  {renderCheckboxField('Senior Management reviewed the transaction within 30 days', formData.pep_senior_mgmt_review_30_days, (checked) => setFormData({ ...formData, pep_senior_mgmt_review_30_days: checked }))}
                                  {renderCheckboxField('Senior management approval documented', formData.pep_senior_mgmt_approval, (checked) => setFormData({ ...formData, pep_senior_mgmt_approval: checked }))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {formData.risk_rating === 'high' && (
                      <AccordionItem value="reasonable">
                        <AccordionTrigger className="text-base font-medium">
                          Reasonable Measures (High-Risk Only)
                        </AccordionTrigger>
                        <AccordionContent className="space-y-1 border rounded-lg p-4 mt-4">
                          {renderCheckboxField('Source of funds documented', formData.source_of_funds_documented, (checked) => setFormData({ ...formData, source_of_funds_documented: checked }))}
                          {renderCheckboxField('Source of wealth documented', formData.source_of_wealth_documented, (checked) => setFormData({ ...formData, source_of_wealth_documented: checked }))}
                          {renderCheckboxField('Enhanced monitoring evidenced', formData.enhanced_monitoring_evidenced, (checked) => setFormData({ ...formData, enhanced_monitoring_evidenced: checked }))}
                          {renderCheckboxField('Senior management review completed', formData.senior_management_review_completed, (checked) => setFormData({ ...formData, senior_management_review_completed: checked }))}
                          {formData.senior_management_review_completed && renderCheckboxField('Review within 30 days', formData.senior_management_review_within_30_days, (checked) => setFormData({ ...formData, senior_management_review_within_30_days: checked }))}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                )}

                {/* Business-specific fields */}
                {selectedType === 'business' && (
                  <Accordion type="multiple" defaultValue={['mandatory', 'authorized', 'directors', 'bo', 'entity-type', 'reasonable']} className="w-full">
                    {/* SECTION 1: Mandatory Business Identity */}
                    <AccordionItem value="mandatory">
                      <AccordionTrigger className="text-base font-medium">
                        Section 1: Mandatory Business Identity Requirements
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 border rounded-lg p-4 mt-4">
                        {renderCheckboxField('Legal business name documented', formData.legal_name_present, (checked) => setFormData({ ...formData, legal_name_present: checked }))}
                        {renderCheckboxField(
                          'Business address documented',
                          formData.address_present,
                          (checked) => setFormData({ ...formData, address_present: checked }),
                          'Must be a physical address. PO Box not allowed.'
                        )}
                        {renderCheckboxField('Nature of principal business documented', formData.nature_of_business_documented, (checked) => setFormData({ ...formData, nature_of_business_documented: checked }))}
                        {renderCheckboxField('Incorporation number documented', formData.incorporation_number_present, (checked) => setFormData({ ...formData, incorporation_number_present: checked }))}
                        {renderCheckboxField('Jurisdiction documented', formData.jurisdiction_documented, (checked) => setFormData({ ...formData, jurisdiction_documented: checked }))}
                        {renderCheckboxField('Articles of incorporation or bylaws obtained', formData.articles_or_bylaws_obtained, (checked) => setFormData({ ...formData, articles_or_bylaws_obtained: checked }))}
                      </AccordionContent>
                    </AccordionItem>

                    {/* SECTION 2: Authorized Persons / Signatories */}
                    <AccordionItem value="authorized">
                      <AccordionTrigger className="text-base font-medium">
                        Section 2: Authorized Persons / Signatories
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 border rounded-lg p-4 mt-4">
                        {renderCheckboxField('Authorized persons identified', formData.authorized_persons_documented, (checked) => setFormData({ ...formData, authorized_persons_documented: checked }))}
                        {renderCheckboxField('Names of authorized persons recorded', formData.authorized_persons_names_recorded, (checked) => setFormData({ ...formData, authorized_persons_names_recorded: checked }))}
                        {renderCheckboxField('Signature card or equivalent documentation obtained', formData.signature_card_obtained, (checked) => setFormData({ ...formData, signature_card_obtained: checked }))}
                      </AccordionContent>
                    </AccordionItem>

                    {/* SECTION 3: Directors (Corporations Only) */}
                    <AccordionItem value="directors">
                      <AccordionTrigger className="text-base font-medium">
                        Section 3: Directors (Corporations Only)
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 border rounded-lg p-4 mt-4">
                        {renderCheckboxField('Names of all directors recorded', formData.directors_list_obtained, (checked) => setFormData({ ...formData, directors_list_obtained: checked }))}
                      </AccordionContent>
                    </AccordionItem>

                    {/* SECTION 4: Beneficial Ownership */}
                    <AccordionItem value="bo">
                      <AccordionTrigger className="text-base font-medium">
                        Section 4: Beneficial Ownership (Core FINTRAC Requirement)
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 border rounded-lg p-4 mt-4">
                        {/* Row 1: BO Identification */}
                        <div className="space-y-2">
                          <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Row 1: BO Identification (25% Threshold)</h6>
                          <div className="space-y-1 pl-2 border-l-2 border-muted">
                            {renderCheckboxField('Beneficial owners ≥25% identified', formData.bo_25_percent_identified, (checked) => setFormData({ ...formData, bo_25_percent_identified: checked }))}
                            {renderCheckboxField('Name and address recorded for each', formData.bo_name_address_recorded, (checked) => setFormData({ ...formData, bo_name_address_recorded: checked }))}
                          </div>
                        </div>

                        {/* Row 2: Ownership Percentage Completeness */}
                        <div className="space-y-2">
                          <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Row 2: Ownership Percentage Completeness</h6>
                          <div className="space-y-1 pl-2 border-l-2 border-muted">
                            {renderCheckboxField('Ownership percentages total 100%', formData.bo_percentages_total_100, (checked) => setFormData({ ...formData, bo_percentages_total_100: checked }))}
                            {renderCheckboxField('OR explanation provided for any gap', formData.bo_percentage_gap_explanation, (checked) => setFormData({ ...formData, bo_percentage_gap_explanation: checked }))}
                          </div>
                        </div>

                        {/* Row 3: Control & Structure */}
                        <div className="space-y-2">
                          <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Row 3: Control & Structure</h6>
                          <div className="space-y-1 pl-2 border-l-2 border-muted">
                            {renderCheckboxField('Ownership structure documented', formData.ownership_structure_documented, (checked) => setFormData({ ...formData, ownership_structure_documented: checked }))}
                            {renderCheckboxField('Control structure documented', formData.control_structure_documented, (checked) => setFormData({ ...formData, control_structure_documented: checked }))}
                            {renderCheckboxField('Supporting documentation obtained', formData.bo_supporting_docs_obtained, (checked) => setFormData({ ...formData, bo_supporting_docs_obtained: checked }))}
                          </div>
                        </div>

                        {/* Additional BO controls */}
                        <div className="space-y-2 pt-2 border-t">
                          <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional BO Controls</h6>
                          <div className="space-y-1 pl-2 border-l-2 border-muted">
                            {renderCheckboxField('BOs identified to natural persons', formData.bo_natural_persons_identified, (checked) => setFormData({ ...formData, bo_natural_persons_identified: checked }))}
                            {renderCheckboxField('BO identity verified', formData.bo_identity_verified, (checked) => setFormData({ ...formData, bo_identity_verified: checked }))}
                            {renderCheckboxField('SMO identified if BO unknown', formData.smo_identified_if_bo_unknown, (checked) => setFormData({ ...formData, smo_identified_if_bo_unknown: checked }))}
                            {renderCheckboxField('BO PEP/HIO determination completed', formData.bo_pep_hio_determination_completed, (checked) => setFormData({ ...formData, bo_pep_hio_determination_completed: checked }))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* SECTION 5: Entity Type-Specific Requirements */}
                    <AccordionItem value="entity-type">
                      <AccordionTrigger className="text-base font-medium">
                        🧩 Section 5: Entity Type-Specific Requirements
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 border rounded-lg p-4 mt-4">
                        {/* CORPORATION GATE */}
                        <div className="border rounded-md p-3 bg-muted/10">
                          <Label className="text-sm font-medium">🔹 Corporation</Label>
                          <div className="mt-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Entity is a Corporation?</Label>
                            <RadioGroup
                              value={formData.entity_is_corporation === true ? 'yes' : formData.entity_is_corporation === false ? 'no' : ''}
                              onValueChange={(v) => setFormData({ ...formData, entity_is_corporation: v === 'yes' })}
                              className="flex gap-6"
                            >
                              <div className="flex items-center gap-1"><RadioGroupItem value="yes" id="ent-corp-yes" /><Label htmlFor="ent-corp-yes" className="text-xs">Yes</Label></div>
                              <div className="flex items-center gap-1"><RadioGroupItem value="no" id="ent-corp-no" /><Label htmlFor="ent-corp-no" className="text-xs">No</Label></div>
                            </RadioGroup>
                          </div>
                          {formData.entity_is_corporation === true && (
                            <div className="mt-3 pt-3 border-t space-y-1 pl-2">
                              <p className="text-xs text-muted-foreground italic mb-2">Only if Yes — complete below</p>
                              {renderCheckboxField('Names of all directors recorded', formData.corp_directors_names_recorded, (checked) => setFormData({ ...formData, corp_directors_names_recorded: checked }))}
                              {renderCheckboxField('Names and addresses of individuals owning/controlling ≥25% recorded', formData.corp_25pct_owners_name_address, (checked) => setFormData({ ...formData, corp_25pct_owners_name_address: checked }))}
                              {renderCheckboxField('Ownership, control, and structure documented', formData.corp_ownership_control_structure, (checked) => setFormData({ ...formData, corp_ownership_control_structure: checked }))}
                            </div>
                          )}
                        </div>

                        {/* TRUST GATE */}
                        <div className="border rounded-md p-3 bg-muted/10">
                          <Label className="text-sm font-medium">🔹 Trust</Label>
                          <div className="mt-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Entity is a Trust?</Label>
                            <RadioGroup
                              value={formData.entity_is_trust === true ? 'yes' : formData.entity_is_trust === false ? 'no' : ''}
                              onValueChange={(v) => setFormData({ ...formData, entity_is_trust: v === 'yes' })}
                              className="flex gap-6"
                            >
                              <div className="flex items-center gap-1"><RadioGroupItem value="yes" id="ent-trust-yes" /><Label htmlFor="ent-trust-yes" className="text-xs">Yes</Label></div>
                              <div className="flex items-center gap-1"><RadioGroupItem value="no" id="ent-trust-no" /><Label htmlFor="ent-trust-no" className="text-xs">No</Label></div>
                            </RadioGroup>
                          </div>
                          {formData.entity_is_trust === true && (
                            <div className="mt-3 pt-3 border-t space-y-1 pl-2">
                              <p className="text-xs text-muted-foreground italic mb-2">Only if Yes — complete below</p>
                              {renderCheckboxField('Names and addresses of trustees', formData.trust_trustees_name_address, (checked) => setFormData({ ...formData, trust_trustees_name_address: checked }))}
                              {renderCheckboxField('Names and addresses of beneficiaries', formData.trust_beneficiaries_name_address, (checked) => setFormData({ ...formData, trust_beneficiaries_name_address: checked }))}
                              {renderCheckboxField('Names and addresses of settlors', formData.trust_settlors_name_address, (checked) => setFormData({ ...formData, trust_settlors_name_address: checked }))}
                              {renderCheckboxField('Ownership / control / structure documented', formData.trust_ownership_control_structure, (checked) => setFormData({ ...formData, trust_ownership_control_structure: checked }))}
                            </div>
                          )}
                        </div>

                        {/* WIDELY HELD / PUBLIC TRUST GATE */}
                        <div className="border rounded-md p-3 bg-muted/10">
                          <Label className="text-sm font-medium">🔹 Widely Held / Public Trust</Label>
                          <div className="mt-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Entity is Widely Held / Public Trust?</Label>
                            <RadioGroup
                              value={formData.entity_is_widely_held === true ? 'yes' : formData.entity_is_widely_held === false ? 'no' : ''}
                              onValueChange={(v) => setFormData({ ...formData, entity_is_widely_held: v === 'yes' })}
                              className="flex gap-6"
                            >
                              <div className="flex items-center gap-1"><RadioGroupItem value="yes" id="ent-wht-yes" /><Label htmlFor="ent-wht-yes" className="text-xs">Yes</Label></div>
                              <div className="flex items-center gap-1"><RadioGroupItem value="no" id="ent-wht-no" /><Label htmlFor="ent-wht-no" className="text-xs">No</Label></div>
                            </RadioGroup>
                          </div>
                          {formData.entity_is_widely_held === true && (
                            <div className="mt-3 pt-3 border-t space-y-1 pl-2">
                              <p className="text-xs text-muted-foreground italic mb-2">Only if Yes — complete below</p>
                              {renderCheckboxField('Names of trustees', formData.wht_trustees_names, (checked) => setFormData({ ...formData, wht_trustees_names: checked }))}
                              {renderCheckboxField('≥25% owners identified', formData.wht_25pct_owners_identified, (checked) => setFormData({ ...formData, wht_25pct_owners_identified: checked }))}
                              {renderCheckboxField('Ownership / control documented', formData.wht_ownership_control_documented, (checked) => setFormData({ ...formData, wht_ownership_control_documented: checked }))}
                            </div>
                          )}
                        </div>

                        {/* OTHER ENTITY GATE */}
                        <div className="border rounded-md p-3 bg-muted/10">
                          <Label className="text-sm font-medium">🔹 Other Entity</Label>
                          <div className="mt-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Entity falls under "Other Entity"?</Label>
                            <RadioGroup
                              value={formData.entity_is_other === true ? 'yes' : formData.entity_is_other === false ? 'no' : ''}
                              onValueChange={(v) => setFormData({ ...formData, entity_is_other: v === 'yes' })}
                              className="flex gap-6"
                            >
                              <div className="flex items-center gap-1"><RadioGroupItem value="yes" id="ent-other-yes" /><Label htmlFor="ent-other-yes" className="text-xs">Yes</Label></div>
                              <div className="flex items-center gap-1"><RadioGroupItem value="no" id="ent-other-no" /><Label htmlFor="ent-other-no" className="text-xs">No</Label></div>
                            </RadioGroup>
                          </div>
                          {formData.entity_is_other === true && (
                            <div className="mt-3 pt-3 border-t space-y-1 pl-2">
                              <p className="text-xs text-muted-foreground italic mb-2">Only if Yes — complete below</p>
                              {renderCheckboxField('≥25% owners identified', formData.other_25pct_owners_identified, (checked) => setFormData({ ...formData, other_25pct_owners_identified: checked }))}
                              {renderCheckboxField('Ownership / control documented', formData.other_ownership_control_documented, (checked) => setFormData({ ...formData, other_ownership_control_documented: checked }))}
                            </div>
                          )}
                        </div>

                        {/* NOT-FOR-PROFIT GATE */}
                        <div className="border rounded-md p-3 bg-muted/10">
                          <Label className="text-sm font-medium">🔹 Not-for-Profit</Label>
                          <div className="mt-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Entity is Not-for-Profit?</Label>
                            <RadioGroup
                              value={formData.entity_is_nfp === true ? 'yes' : formData.entity_is_nfp === false ? 'no' : ''}
                              onValueChange={(v) => setFormData({ ...formData, entity_is_nfp: v === 'yes' })}
                              className="flex gap-6"
                            >
                              <div className="flex items-center gap-1"><RadioGroupItem value="yes" id="ent-nfp-yes" /><Label htmlFor="ent-nfp-yes" className="text-xs">Yes</Label></div>
                              <div className="flex items-center gap-1"><RadioGroupItem value="no" id="ent-nfp-no" /><Label htmlFor="ent-nfp-no" className="text-xs">No</Label></div>
                            </RadioGroup>
                          </div>
                          {formData.entity_is_nfp === true && (
                            <div className="mt-3 pt-3 border-t space-y-1 pl-2">
                              <p className="text-xs text-muted-foreground italic mb-2">Only if Yes — complete below</p>
                              {renderCheckboxField('Registered charity (CRA)', formData.nfp_registered_charity, (checked) => setFormData({ ...formData, nfp_registered_charity: checked }))}
                              {renderCheckboxField('Non-charity soliciting donations', formData.nfp_non_charity_soliciting, (checked) => setFormData({ ...formData, nfp_non_charity_soliciting: checked }))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {formData.risk_rating === 'high' && (
                      <AccordionItem value="reasonable">
                        <AccordionTrigger className="text-base font-medium">
                          Reasonable Measures (High-Risk Only)
                        </AccordionTrigger>
                        <AccordionContent className="space-y-1 border rounded-lg p-4 mt-4">
                          {renderCheckboxField('Source of funds documented', formData.source_of_funds_documented, (checked) => setFormData({ ...formData, source_of_funds_documented: checked }))}
                          {renderCheckboxField('Source of wealth documented', formData.source_of_wealth_documented, (checked) => setFormData({ ...formData, source_of_wealth_documented: checked }))}
                          {renderCheckboxField('Enhanced monitoring evidenced', formData.enhanced_monitoring_evidenced, (checked) => setFormData({ ...formData, enhanced_monitoring_evidenced: checked }))}
                          {renderCheckboxField('Senior management review completed', formData.senior_management_review_completed, (checked) => setFormData({ ...formData, senior_management_review_completed: checked }))}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                )}

                {/* Transaction-Related Section */}
                <Accordion type="single" collapsible defaultValue={isTransactionBasedTrigger(formData.triggered_obligation) ? 'transaction' : undefined} className="w-full">
                  <AccordionItem value="transaction">
                    <AccordionTrigger className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        Transaction-Related Testing
                        {formData.is_transaction_related === true && (
                          <Badge variant="secondary">Active</Badge>
                        )}
                        {formData.is_transaction_related === false && (
                          <Badge variant="outline">Skipped</Badge>
                        )}
                        {isTransactionBasedTrigger(formData.triggered_obligation) && formData.is_transaction_related !== true && (
                          <Badge variant="destructive">Required by trigger</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      {isTransactionBasedTrigger(formData.triggered_obligation) && formData.is_transaction_related !== true && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                          <p className="font-medium text-destructive">Transaction-based trigger selected</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            The triggered obligation requires transaction record-keeping testing. Please select <strong>Yes</strong> below and complete the testing.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 p-3 rounded-md border bg-muted/20">
                        <Label className="text-sm font-medium">Perform transaction-based testing for this sample?</Label>
                        <p className="text-xs text-muted-foreground">
                          Select <strong>No</strong> to skip transaction record-keeping testing (EFT, VC, LCTR fields will not be required).
                        </p>
                        <RadioGroup
                          value={formData.is_transaction_related === true ? 'yes' : formData.is_transaction_related === false ? 'no' : ''}
                          onValueChange={(value) => setFormData({ ...formData, is_transaction_related: value === 'yes' })}
                          className="flex gap-6 pt-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="tx-test-yes" />
                            <Label htmlFor="tx-test-yes" className="text-sm font-normal cursor-pointer">Yes — complete testing</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="tx-test-no" />
                            <Label htmlFor="tx-test-no" className="text-sm font-normal cursor-pointer">No — not applicable</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {formData.is_transaction_related === true && (
                        <div className="space-y-4 border rounded-lg p-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Transaction Type</Label>
                              <Select
                                value={formData.transaction_type || ''}
                                onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {transactionTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Transaction Amount</Label>
                              <Input
                                type="number"
                                value={formData.transaction_amount || ''}
                                onChange={(e) => setFormData({ ...formData, transaction_amount: parseFloat(e.target.value) || null })}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Transaction Date</Label>
                              <Input
                                type="date"
                                value={formData.transaction_date || ''}
                                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  checked={formData.third_party_required === true}
                                  onCheckedChange={(checked) => setFormData({ ...formData, third_party_required: checked === true })}
                                  className="mt-0.5"
                                />
                                <div className="grid gap-1 leading-none">
                                  <label className="text-sm font-medium cursor-pointer">
                                    Third-party determination made — Yes
                                  </label>
                                  <p className="text-xs text-muted-foreground">
                                    Mandatory only when LCT, LVCT, or Service Agreement are completed. Check if a third party is involved.
                                  </p>
                                </div>
                              </div>

                              {formData.third_party_required && (
                                <div className="space-y-4 pl-7 pt-2 border-l-2 border-muted ml-2">
                                  <div className="space-y-2">
                                    <Label className="text-sm">Third-party type</Label>
                                    <Select
                                      value={formData.third_party_type || ''}
                                      onValueChange={(value) => setFormData({ ...formData, third_party_type: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select third-party type..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="individual">Individual</SelectItem>
                                        <SelectItem value="entity">Entity</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {formData.third_party_type === 'individual' && (
                                    <div className="space-y-1">
                                      <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Individual Third Party — Required Information
                                      </h6>
                                      {renderCheckboxField('Third party name documented', formData.third_party_individual_name, (checked) => setFormData({ ...formData, third_party_individual_name: checked }))}
                                      {renderCheckboxField('Third party address documented', formData.third_party_individual_address, (checked) => setFormData({ ...formData, third_party_individual_address: checked }))}
                                      {renderCheckboxField('Third party date of birth documented', formData.third_party_individual_dob, (checked) => setFormData({ ...formData, third_party_individual_dob: checked }))}
                                      {renderCheckboxField('Third party principal business or occupation documented', formData.third_party_individual_occupation, (checked) => setFormData({ ...formData, third_party_individual_occupation: checked }))}
                                    </div>
                                  )}

                                  {formData.third_party_type === 'entity' && (
                                    <div className="space-y-1">
                                      <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Entity Third Party — Required Information
                                      </h6>
                                      {renderCheckboxField('Third party (entity) name documented', formData.third_party_entity_name, (checked) => setFormData({ ...formData, third_party_entity_name: checked }))}
                                      {renderCheckboxField('Third party (entity) address documented', formData.third_party_entity_address, (checked) => setFormData({ ...formData, third_party_entity_address: checked }))}
                                      {renderCheckboxField('Nature of principal business of third party documented', formData.third_party_entity_nature_of_business, (checked) => setFormData({ ...formData, third_party_entity_nature_of_business: checked }))}
                                      {renderCheckboxField(
                                        'Incorporation number documented (if Corporation)',
                                        formData.third_party_entity_incorporation_number,
                                        (checked) => setFormData({ ...formData, third_party_entity_incorporation_number: checked })
                                      )}
                                      {renderCheckboxField(
                                        'Place of incorporation documented (if Corporation)',
                                        formData.third_party_entity_place_of_incorporation,
                                        (checked) => setFormData({ ...formData, third_party_entity_place_of_incorporation: checked })
                                      )}
                                    </div>
                                  )}

                                  <div className="space-y-1 pt-2 border-t">
                                    {renderCheckboxField(
                                      'Relationship between third party and customer is established and documented',
                                      formData.third_party_relationship_documented,
                                      (checked) => setFormData({ ...formData, third_party_relationship_documented: checked }),
                                      'E.g. Accountant, Lawyer, etc.'
                                    )}
                                    {formData.third_party_relationship_documented && (
                                      <div className="space-y-2 pl-7">
                                        <Label className="text-sm">Relationship type</Label>
                                        <Input
                                          value={formData.third_party_relationship_type || ''}
                                          onChange={(e) => setFormData({ ...formData, third_party_relationship_type: e.target.value })}
                                          placeholder="e.g. Accountant, Lawyer, Power of Attorney..."
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            
                            {/* EFT Record-Keeping Requirements */}
                            {(formData.transaction_type === 'eft' || formData.transaction_type === 'fx_3k') && (
                              <div className="space-y-4 pt-2">
                                <h5 className="font-medium text-sm border-b pb-2">EFT ≥ $1,000 Record-Keeping Requirements (PCMLTFR)</h5>
                                
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Date of initiation', formData.eft_date_of_initiation, (checked) => setFormData({ ...formData, eft_date_of_initiation: checked }))}
                                    {renderCheckboxField('Type and amount of each fund remitted or transmitted', formData.eft_fund_type_amount, (checked) => setFormData({ ...formData, eft_fund_type_amount: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client Information</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Requesting client details match KYC', formData.eft_requesting_client_match_kyc, (checked) => setFormData({ ...formData, eft_requesting_client_match_kyc: checked }))}
                                    {renderCheckboxField('Ordering client name', formData.eft_ordering_client_name, (checked) => setFormData({ ...formData, eft_ordering_client_name: checked }))}
                                    {renderCheckboxField('Ordering client address', formData.eft_ordering_client_address, (checked) => setFormData({ ...formData, eft_ordering_client_address: checked }))}
                                    {renderCheckboxField('Beneficiary name', formData.eft_beneficiary_name, (checked) => setFormData({ ...formData, eft_beneficiary_name: checked }))}
                                    {renderCheckboxField('Beneficiary address', formData.eft_beneficiary_address, (checked) => setFormData({ ...formData, eft_beneficiary_address: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account & Reference</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Account details (numbers, type, holder)', formData.eft_account_details, (checked) => setFormData({ ...formData, eft_account_details: checked }))}
                                    {renderCheckboxField('Reference/transaction number', formData.eft_reference_number, (checked) => setFormData({ ...formData, eft_reference_number: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">FX</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Exchange rate used', formData.eft_exchange_rate, (checked) => setFormData({ ...formData, eft_exchange_rate: checked }))}
                                    {renderCheckboxField('Source of exchange rate documented', formData.eft_exchange_rate_source, (checked) => setFormData({ ...formData, eft_exchange_rate_source: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Financial Institution Details</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Sending financial institution', formData.eft_sending_fi, (checked) => setFormData({ ...formData, eft_sending_fi: checked }))}
                                    {renderCheckboxField('Receiving financial institution', formData.eft_receiving_fi, (checked) => setFormData({ ...formData, eft_receiving_fi: checked }))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* VC Record-Keeping Requirements */}
                            {(formData.transaction_type === 'vc_transaction' || formData.transaction_type === 'vc_1k') && (
                              <div className="space-y-4 pt-2">
                                <h5 className="font-medium text-sm border-b pb-2">
                                  {formData.transaction_type === 'vc_transaction'
                                    ? 'Large Virtual Currency (LVCTR ≥ $10,000) Record-Keeping Requirements (PCMLTFR)'
                                    : 'Virtual Currency ≥ $1,000 Record-Keeping Requirements (PCMLTFR)'}
                                </h5>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Threshold</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField(
                                      formData.transaction_type === 'vc_transaction'
                                        ? 'Amount ≥ $10,000 CAD equivalent'
                                        : 'Amount ≥ $1,000 CAD equivalent',
                                      formData.vc_amount_confirmed,
                                      (checked) => setFormData({ ...formData, vc_amount_confirmed: checked })
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client Information</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Client name', formData.vc_client_name, (checked) => setFormData({ ...formData, vc_client_name: checked }))}
                                    {renderCheckboxField('Client address', formData.vc_client_address, (checked) => setFormData({ ...formData, vc_client_address: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction Details</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Type of virtual currency (e.g. BTC, ETH, USDT)', formData.vc_type_of_vc, (checked) => setFormData({ ...formData, vc_type_of_vc: checked }))}
                                    {renderCheckboxField('Virtual currency amount', formData.vc_amount, (checked) => setFormData({ ...formData, vc_amount: checked }))}
                                    {renderCheckboxField('Fiat equivalent value', formData.vc_fiat_equivalent, (checked) => setFormData({ ...formData, vc_fiat_equivalent: checked }))}
                                    {renderCheckboxField('Exchange rate used', formData.vc_exchange_rate, (checked) => setFormData({ ...formData, vc_exchange_rate: checked }))}
                                    {renderCheckboxField('Source of exchange rate documented', formData.vc_exchange_rate_source, (checked) => setFormData({ ...formData, vc_exchange_rate_source: checked }))}
                                    {renderCheckboxField('Wallet / transaction hash & reference number recorded', formData.vc_reference_number, (checked) => setFormData({ ...formData, vc_reference_number: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wallet Information</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Sending wallet address', formData.vc_sending_wallet, (checked) => setFormData({ ...formData, vc_sending_wallet: checked }))}
                                    {renderCheckboxField('Receiving wallet address', formData.vc_receiving_wallet, (checked) => setFormData({ ...formData, vc_receiving_wallet: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Third Party</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Third party determination performed', formData.vc_third_party_determination, (checked) => setFormData({ ...formData, vc_third_party_determination: checked }))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* LCTR Record-Keeping Requirements */}
                            {formData.transaction_type === 'lctr' && (
                              <div className="space-y-4 pt-2">
                                <h5 className="font-medium text-sm border-b pb-2">Large Cash Transaction (LCTR ≥ $10,000) Record-Keeping Requirements (PCMLTFR)</h5>
                                
                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Threshold & Aggregation</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Amount ≥ $10,000 CAD', formData.lctr_amount_confirmed, (checked) => setFormData({ ...formData, lctr_amount_confirmed: checked }))}
                                    {renderCheckboxField('24-hour aggregation considered', formData.lctr_24h_aggregation, (checked) => setFormData({ ...formData, lctr_24h_aggregation: checked }))}
                                    {renderCheckboxField('Currency conversion (BoC rate) applied if foreign', formData.lctr_currency_conversion, (checked) => setFormData({ ...formData, lctr_currency_conversion: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client Information</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Client name', formData.lctr_client_name, (checked) => setFormData({ ...formData, lctr_client_name: checked }))}
                                    {renderCheckboxField('Client address', formData.lctr_client_address, (checked) => setFormData({ ...formData, lctr_client_address: checked }))}
                                    {renderCheckboxField('Client date of birth', formData.lctr_client_dob, (checked) => setFormData({ ...formData, lctr_client_dob: checked }))}
                                    {renderCheckboxField('Occupation', formData.lctr_occupation, (checked) => setFormData({ ...formData, lctr_occupation: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction Details</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Transaction time recorded', formData.lctr_transaction_time, (checked) => setFormData({ ...formData, lctr_transaction_time: checked }))}
                                    {renderCheckboxField('Purpose of transaction', formData.lctr_purpose, (checked) => setFormData({ ...formData, lctr_purpose: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Third Party</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Third party determination performed', formData.lctr_third_party_determination, (checked) => setFormData({ ...formData, lctr_third_party_determination: checked }))}
                                    {renderCheckboxField('Third party details recorded (if applicable)', formData.lctr_third_party_details, (checked) => setFormData({ ...formData, lctr_third_party_details: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conductor (if different from client)</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Conductor name', formData.lctr_conductor_name, (checked) => setFormData({ ...formData, lctr_conductor_name: checked }))}
                                    {renderCheckboxField('Conductor address', formData.lctr_conductor_address, (checked) => setFormData({ ...formData, lctr_conductor_address: checked }))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Cheque Cashing Record-Keeping Requirements */}
                            {formData.transaction_type === 'cheque_cashing' && (
                              <div className="space-y-4 pt-2">
                                <h5 className="font-medium text-sm border-b pb-2">Cheque Cashing Record-Keeping Requirements (PCMLTFR)</h5>
                                <p className="text-xs text-muted-foreground -mt-2">
                                  Required when an MSB cashes one or more cheques totalling $3,000 or more at the request of a person or entity in Canada.
                                </p>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Date each cheque was cashed', formData.cheque_date_cashed, (checked) => setFormData({ ...formData, cheque_date_cashed: checked }))}
                                    {renderCheckboxField('Total amount of the cheque(s)', formData.cheque_total_amount, (checked) => setFormData({ ...formData, cheque_total_amount: checked }))}
                                    {renderCheckboxField('Name of the issuer of each cheque', formData.cheque_issuer_name, (checked) => setFormData({ ...formData, cheque_issuer_name: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Person/Entity Providing the Cheque</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Name', formData.cheque_provider_name, (checked) => setFormData({ ...formData, cheque_provider_name: checked }))}
                                    {renderCheckboxField('Address', formData.cheque_provider_address, (checked) => setFormData({ ...formData, cheque_provider_address: checked }))}
                                    {renderCheckboxField('Nature of principal business or occupation', formData.cheque_provider_occupation, (checked) => setFormData({ ...formData, cheque_provider_occupation: checked }))}
                                    {renderCheckboxField('Date of birth (if the client is a person)', formData.cheque_provider_dob, (checked) => setFormData({ ...formData, cheque_provider_dob: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Affected Account(s)</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Account number', formData.cheque_account_number, (checked) => setFormData({ ...formData, cheque_account_number: checked }))}
                                    {renderCheckboxField('Type of account', formData.cheque_account_type, (checked) => setFormData({ ...formData, cheque_account_type: checked }))}
                                    {renderCheckboxField('Name of each account holder', formData.cheque_account_holder_name, (checked) => setFormData({ ...formData, cheque_account_holder_name: checked }))}
                                    {renderCheckboxField('Every reference number connected to the cashing of the cheque(s)', formData.cheque_reference_number, (checked) => setFormData({ ...formData, cheque_reference_number: checked }))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Virtual Currency (if applicable)</h6>
                                  <div className="space-y-1 pl-2 border-l-2 border-muted">
                                    {renderCheckboxField('Every transaction identifier including sending and receiving addresses', formData.cheque_vc_transaction_identifier, (checked) => setFormData({ ...formData, cheque_vc_transaction_identifier: checked }))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Notes */}
                <div className="space-y-4">
                  <h4 className="font-medium">Additional Notes</h4>
                  <div className="space-y-2">
                    <Label>Deficiencies</Label>
                    <Textarea
                      value={formData.deficiencies || ''}
                      onChange={(e) => setFormData({ ...formData, deficiencies: e.target.value })}
                      placeholder="Document any deficiencies identified..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveSample}>
                    {editingSample ? 'Update' : 'Save'} Sample
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Samples Table */}
      {samples.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No KYC samples added yet</p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Sample
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Txn Related</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead>Reasonable</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {samples.map((sample) => (
                  <TableRow key={`${sample.type}-${sample.id}`}>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {sample.type === 'individual' ? (
                          <><User className="w-3 h-3" /> Individual</>
                        ) : (
                          <><Building2 className="w-3 h-3" /> Business</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{sample.customer_id || '-'}</TableCell>
                    <TableCell>{sample.customer_name || sample.business_name || '-'}</TableCell>
                    <TableCell>{sample.onboarding_date || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={sample.risk_rating === 'high' ? 'destructive' : sample.risk_rating === 'medium' ? 'secondary' : 'outline'}>
                        {sample.risk_rating}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sample.is_transaction_related ? (
                        <Badge variant="secondary">{sample.transaction_type || 'Yes'}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getResultBadge(sample.mandatory_test_result)}</TableCell>
                    <TableCell>{getResultBadge(sample.reasonable_measures_result)}</TableCell>
                    <TableCell>{getResultBadge(sample.overall_result)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(sample)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteSample(sample)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
