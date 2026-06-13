/**
 * Transaction Reporting auto-classification engine.
 *
 * Inputs a `reporting_samples` row and emits a FINTRAC-aligned classification:
 *   - finding_type (highest weakness across all triggered rules)
 *   - severity (denormalized for legacy code)
 *   - compliance_dimension ('application' for these findings — the policy
 *     exists, the report was filed deficiently)
 *   - is_first_miss (relevant only for Complete-NC STR; default true)
 *   - weaknesses: structured trace of every rule that fired
 *   - title, description, recommendation: auditor-overridable defaults
 *
 * Rules per the user-approved table dated 2026-05-16. References:
 *   - https://fintrac-canafe.canada.ca/pen/guides/lctr-eng
 *   - https://fintrac-canafe.canada.ca/pen/guides/str-eng
 */
import {
  FindingType,
  FindingSeverity,
  findingTypeToSeverity,
  highestFindingType,
  getFindingTypeMeta,
} from './findingClassification';

export type ReportType = 'lctr' | 'eftr' | 'str' | 'lvctr' | 'lpepr';

export interface Weakness {
  dimension: 'completeness' | 'accuracy' | 'timeliness' | 'str_decision' | 'population';
  fields: string[];
  finding_type: FindingType;
  rationale: string;
}

export interface SampleClassification {
  finding_type: FindingType;
  severity: FindingSeverity;
  compliance_dimension: 'documentation' | 'application' | 'both' | null;
  is_first_miss: boolean | null;
  weaknesses: Weakness[];
  title: string;
  description: string;
  recommendation: string;
}

/**
 * Minimum shape required from a reporting_samples row to classify it.
 * We accept the full ReportSample type but only read these fields.
 */
export interface ClassifiableSample {
  report_type: string;
  report_reference_id: string | null;
  filing_method?: string | null;

  // Transaction core
  transaction_date: string | null;
  fintrac_submission_date: string | null;
  transaction_amount: number | null;
  is_aggregated: boolean;
  aggregation_type: string | null;
  aggregation_period_start: string | null;
  aggregation_period_end: string | null;

  // Header completeness
  header_reporting_entity: boolean | null;
  header_submission_timestamp: boolean | null;
  header_report_reference: boolean | null;
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

  // Party fields
  client_name: boolean | null;
  client_address: boolean | null;
  client_dob: boolean | null;
  client_occupation: boolean | null;
  client_incorporation_info: boolean | null;
  requester_account: boolean | null;
  requester_identification: boolean | null;
  authorized_persons: boolean | null;
  on_behalf_of_requester: boolean | null;
  beneficiary_name: boolean | null;
  beneficiary_address: boolean | null;
  beneficiary_account_wallet: boolean | null;
  beneficiary_identification: boolean | null;
  on_behalf_of_beneficiary: boolean | null;
  third_party_indicator: boolean | null;
  third_party_details: boolean | null;

  // Special fields
  exchange_rate: boolean | null;
  exchange_rate_source: boolean | null;
  vc_identifiers: boolean | null;
  str_narrative: boolean | null;

  // Dimension results
  completeness_result: string;
  accuracy_matches_ledger: string;
  accuracy_matches_kyc: string;
  accuracy_matches_system: string;
  accuracy_overall: string;
  timeliness_result: string;
  timeliness_days_to_file: number | null;
  overall_result: string;

  // STR Decision tab
  str_investigation_conducted: boolean | null;
  str_suspicion_documented: boolean | null;
  str_rationale_documented: boolean | null;
  str_escalation_performed: boolean | null;
  str_filed_promptly: boolean | null;

  deficiencies: string | null;
}

const FALSE = (b: boolean | null): boolean => b === false;

/** Regulatory filing windows in days from trigger date. */
const FILING_WINDOWS: Record<ReportType, number> = {
  lctr: 15,
  eftr: 5,
  lvctr: 5,
  str: 30, // "as soon as practicable" — soft cap from FINTRAC penalty scale
  lpepr: 30,
};

// ---------------------------------------------------------------------------
// Completeness rules
// ---------------------------------------------------------------------------

function classifyCompleteness(s: ClassifiableSample): Weakness[] {
  if (s.completeness_result !== 'fail') return [];
  const rt = s.report_type as ReportType;
  const weaknesses: Weakness[] = [];

  // --- Complete NC ---
  if (FALSE(s.client_name) && FALSE(s.beneficiary_name)) {
    weaknesses.push({
      dimension: 'completeness',
      fields: ['client_name', 'beneficiary_name'],
      finding_type: 'complete_nc',
      rationale: 'No party name on the report (neither client nor beneficiary). FINTRAC: at least one party name is required for a usable filing.',
    });
  }
  if (FALSE(s.txn_amount)) {
    weaknesses.push({
      dimension: 'completeness',
      fields: ['txn_amount'],
      finding_type: 'complete_nc',
      rationale: 'Transaction amount missing. FINTRAC: transaction details (amount + type) are required for a usable filing.',
    });
  }
  if (FALSE(s.header_reporting_entity) || FALSE(s.submitting_re_number)) {
    weaknesses.push({
      dimension: 'completeness',
      fields: [
        FALSE(s.header_reporting_entity) ? 'header_reporting_entity' : '',
        FALSE(s.submitting_re_number) ? 'submitting_re_number' : '',
      ].filter(Boolean),
      finding_type: 'complete_nc',
      rationale: 'Reporting entity identification missing. FINTRAC: RE identifying info is required for a usable filing.',
    });
  }
  if (rt === 'str' && FALSE(s.str_narrative)) {
    weaknesses.push({
      dimension: 'completeness',
      fields: ['str_narrative'],
      finding_type: 'complete_nc',
      rationale: 'STR narrative absent. The narrative is the substantive content of an STR; without it the filing is non-substantive.',
    });
  }

  // --- Partial: Important — party-identifying fields ---
  const partyImportantFields: { field: keyof ClassifiableSample; name: string }[] = [
    { field: 'client_dob', name: 'client_dob' },
    { field: 'client_address', name: 'client_address' },
    { field: 'requester_identification', name: 'requester_identification' },
    { field: 'beneficiary_identification', name: 'beneficiary_identification' },
  ];
  const importantMissing = partyImportantFields
    .filter(p => FALSE(s[p.field] as boolean | null))
    .map(p => p.name);
  if (importantMissing.length > 0) {
    weaknesses.push({
      dimension: 'completeness',
      fields: importantMissing,
      finding_type: 'partial_important',
      rationale: `Party-identifying fields missing: ${importantMissing.join(', ')}. FINTRAC: information that identifies parties to the transaction.`,
    });
  }
  // Single party name missing (Important — not Complete NC since the other side is present)
  if (FALSE(s.client_name) && !FALSE(s.beneficiary_name)) {
    weaknesses.push({
      dimension: 'completeness',
      fields: ['client_name'],
      finding_type: 'partial_important',
      rationale: 'Client name missing (beneficiary name present). Party identification non-compliant.',
    });
  }
  if (FALSE(s.beneficiary_name) && !FALSE(s.client_name)) {
    weaknesses.push({
      dimension: 'completeness',
      fields: ['beneficiary_name'],
      finding_type: 'partial_important',
      rationale: 'Beneficiary name missing (client name present). Party identification non-compliant.',
    });
  }

  // --- Partial: Moderate — relationships / flow-of-funds ---
  const moderateFields: { field: keyof ClassifiableSample; name: string }[] = [
    { field: 'requester_account', name: 'requester_account' },
    { field: 'txn_date_time', name: 'txn_date_time' },
    { field: 'txn_currency', name: 'txn_currency' },
    { field: 'header_report_reference', name: 'header_report_reference' },
  ];
  if (rt === 'eftr') {
    moderateFields.push({ field: 'eft_direction', name: 'eft_direction' });
  }
  // 24-hour aggregation: missing type/period when is_aggregated=true
  if (s.is_aggregated) {
    if (FALSE(s.txn_aggregation_indicator)) {
      moderateFields.push({ field: 'txn_aggregation_indicator', name: 'txn_aggregation_indicator' });
    }
    if (FALSE(s.txn_aggregation_type)) {
      moderateFields.push({ field: 'txn_aggregation_type', name: 'txn_aggregation_type' });
    }
    if (FALSE(s.txn_aggregation_period_start)) {
      moderateFields.push({ field: 'txn_aggregation_period_start', name: 'txn_aggregation_period_start' });
    }
    if (FALSE(s.txn_aggregation_period_end)) {
      moderateFields.push({ field: 'txn_aggregation_period_end', name: 'txn_aggregation_period_end' });
    }
  }
  const moderateMissing = moderateFields
    .filter(p => FALSE(s[p.field] as boolean | null))
    .map(p => p.name);
  if (moderateMissing.length > 0) {
    weaknesses.push({
      dimension: 'completeness',
      fields: moderateMissing,
      finding_type: 'partial_moderate',
      rationale: `Relationship / flow-of-funds fields missing: ${moderateMissing.join(', ')}. FINTRAC: information that identifies relationships or describes the flow of funds.`,
    });
  }

  // --- Partial: Lesser — efficiency fields ---
  const lesserFields: { field: keyof ClassifiableSample; name: string; appliesTo?: ReportType[] }[] = [
    { field: 'client_occupation', name: 'client_occupation' },
    { field: 'client_incorporation_info', name: 'client_incorporation_info' },
    { field: 'activity_sector_code', name: 'activity_sector_code' },
    { field: 'exchange_rate_source', name: 'exchange_rate_source' },
    { field: 'exchange_rate', name: 'exchange_rate' },
    { field: 'on_behalf_of_requester', name: 'on_behalf_of_requester' },
    { field: 'on_behalf_of_beneficiary', name: 'on_behalf_of_beneficiary' },
    { field: 'third_party_indicator', name: 'third_party_indicator' },
    { field: 'third_party_details', name: 'third_party_details' },
    { field: 'authorized_persons', name: 'authorized_persons' },
    { field: 'beneficiary_account_wallet', name: 'beneficiary_account_wallet' },
    { field: 'vc_identifiers', name: 'vc_identifiers', appliesTo: ['lvctr'] },
  ];
  const lesserMissing = lesserFields
    .filter(p => (!p.appliesTo || p.appliesTo.includes(rt)) && FALSE(s[p.field] as boolean | null))
    .map(p => p.name);
  if (lesserMissing.length > 0) {
    weaknesses.push({
      dimension: 'completeness',
      fields: lesserMissing,
      finding_type: 'partial_lesser',
      rationale: `Efficiency fields missing: ${lesserMissing.join(', ')}. FINTRAC: information that enhances efficiency of analysis but does not prevent baseline analysis.`,
    });
  }

  return weaknesses;
}

// ---------------------------------------------------------------------------
// Accuracy rules
// ---------------------------------------------------------------------------

function classifyAccuracy(s: ClassifiableSample): Weakness[] {
  const w: Weakness[] = [];
  if (s.accuracy_matches_ledger === 'fail') {
    w.push({
      dimension: 'accuracy',
      fields: ['accuracy_matches_ledger'],
      finding_type: 'partial_important',
      rationale: 'Report does not reconcile to underlying ledger. Misrepresents the transaction to FINTRAC.',
    });
  }
  if (s.accuracy_matches_kyc === 'fail') {
    w.push({
      dimension: 'accuracy',
      fields: ['accuracy_matches_kyc'],
      finding_type: 'partial_important',
      rationale: 'Report customer information does not match KYC file. Party identification non-compliant.',
    });
  }
  if (s.accuracy_matches_system === 'fail') {
    w.push({
      dimension: 'accuracy',
      fields: ['accuracy_matches_system'],
      finding_type: 'partial_moderate',
      rationale: 'Report values do not match transaction system of record.',
    });
  }
  return w;
}

// ---------------------------------------------------------------------------
// Timeliness rules
// ---------------------------------------------------------------------------

interface TimelinessTiers {
  lesser: [number, number];
  moderate: [number, number];
  important: [number, number];
}

const LCTR_TIERS: TimelinessTiers = {
  lesser: [1, 14],
  moderate: [15, 29],
  important: [30, Infinity],
};

const STR_TIERS: TimelinessTiers = {
  lesser: [1, 6],
  moderate: [7, 14],
  important: [15, Infinity],
};

function tierFor(rt: ReportType): TimelinessTiers {
  return rt === 'str' || rt === 'lpepr' ? STR_TIERS : LCTR_TIERS;
}

function classifyTimeliness(s: ClassifiableSample): Weakness[] {
  if (s.timeliness_result !== 'fail') return [];
  const rt = s.report_type as ReportType;

  // Complete NC: never filed despite obligation
  if (s.fintrac_submission_date == null) {
    return [{
      dimension: 'timeliness',
      fields: ['fintrac_submission_date'],
      finding_type: 'complete_nc',
      rationale: 'No filing date recorded — report was never submitted to FINTRAC despite the obligation.',
    }];
  }

  // Days late = (days_to_file) - (window for this report type)
  const window = FILING_WINDOWS[rt] ?? 30;
  const daysToFile = s.timeliness_days_to_file ?? 0;
  const daysLate = Math.max(0, daysToFile - window);
  if (daysLate === 0) return [];

  const tiers = tierFor(rt);
  let type: FindingType;
  if (daysLate >= tiers.important[0]) type = 'partial_important';
  else if (daysLate >= tiers.moderate[0]) type = 'partial_moderate';
  else type = 'partial_lesser';

  return [{
    dimension: 'timeliness',
    fields: ['fintrac_submission_date'],
    finding_type: type,
    rationale: `Filed ${daysLate} day${daysLate === 1 ? '' : 's'} past the ${window}-day regulatory window for ${rt.toUpperCase()}.`,
  }];
}

// ---------------------------------------------------------------------------
// STR Decision rules
// ---------------------------------------------------------------------------

function classifyStrDecision(s: ClassifiableSample): Weakness[] {
  if (s.report_type !== 'str') return [];
  const w: Weakness[] = [];
  if (FALSE(s.str_investigation_conducted)) {
    w.push({
      dimension: 'str_decision',
      fields: ['str_investigation_conducted'],
      finding_type: 'partial_important',
      rationale: 'No investigation conducted — STR decision is unsupportable without underlying analysis.',
    });
  }
  if (FALSE(s.str_suspicion_documented)) {
    w.push({
      dimension: 'str_decision',
      fields: ['str_suspicion_documented'],
      finding_type: 'partial_important',
      rationale: 'Suspicion not documented — RE cannot demonstrate reasonable grounds.',
    });
  }
  if (FALSE(s.str_rationale_documented)) {
    w.push({
      dimension: 'str_decision',
      fields: ['str_rationale_documented'],
      finding_type: 'partial_moderate',
      rationale: 'Decision rationale not documented.',
    });
  }
  if (FALSE(s.str_escalation_performed)) {
    w.push({
      dimension: 'str_decision',
      fields: ['str_escalation_performed'],
      finding_type: 'partial_moderate',
      rationale: 'Escalation procedure not performed where indicated.',
    });
  }
  // str_filed_promptly is rolled up under Timeliness — intentionally not double-counted
  return w;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function classifyReportingSample(s: ClassifiableSample): SampleClassification {
  const weaknesses: Weakness[] = [
    ...classifyCompleteness(s),
    ...classifyAccuracy(s),
    ...classifyTimeliness(s),
    ...classifyStrDecision(s),
  ];

  // If nothing triggered but overall failed (auditor marked fail without per-field detail),
  // emit a generic moderate weakness so we still produce a finding.
  if (weaknesses.length === 0 && s.overall_result === 'fail') {
    weaknesses.push({
      dimension: 'completeness',
      fields: [],
      finding_type: 'partial_moderate',
      rationale: 'Sample marked failed without specific field-level evidence; defaulting to moderate weakness for review.',
    });
  }

  const findingType = highestFindingType(weaknesses.map(w => w.finding_type));
  const meta = getFindingTypeMeta(findingType);
  const rt = s.report_type.toUpperCase();
  const ref = s.report_reference_id ?? 'Unknown Ref';

  // Is-first-miss is only meaningful for STR Complete-NC findings; default true
  // (worst case from FINTRAC's perspective) and let the auditor override.
  const isStrCompleteNc = s.report_type === 'str' && findingType === 'complete_nc';
  const is_first_miss = isStrCompleteNc ? true : null;

  // Description lists every triggered weakness so the auditor can see the "why"
  const description = buildDescription(weaknesses, meta.label);
  const title = buildTitle(rt, ref, weaknesses);
  const recommendation = buildRecommendation(rt, weaknesses);

  return {
    finding_type: findingType,
    severity: findingTypeToSeverity(findingType),
    // All auto-flagged TR findings are application-dimension (the policy
    // exists, the report was filed deficiently). Documentation findings come
    // from the Governance / Controls tab, not the per-sample classifier.
    compliance_dimension: 'application',
    is_first_miss,
    weaknesses,
    title,
    description,
    recommendation,
  };
}

function buildTitle(rt: string, ref: string, weaknesses: Weakness[]): string {
  const dims = new Set(weaknesses.map(w => w.dimension));
  const labels: string[] = [];
  if (dims.has('completeness')) labels.push('Completeness');
  if (dims.has('accuracy')) labels.push('Accuracy');
  if (dims.has('timeliness')) labels.push('Timeliness');
  if (dims.has('str_decision')) labels.push('STR decision');
  const dimText = labels.length > 0 ? labels.join(' / ') : 'Reporting';
  return `${rt} ${dimText} deficiency — ${ref}`;
}

function buildDescription(weaknesses: Weakness[], typeLabel: string): string {
  if (weaknesses.length === 0) return '';
  const lines: string[] = [];
  lines.push(`Auto-classified as ${typeLabel} based on the following weakness${weaknesses.length === 1 ? '' : 'es'}:`);
  lines.push('');
  for (const w of weaknesses) {
    const dim = w.dimension.replace('_', ' ');
    const dimCap = dim.charAt(0).toUpperCase() + dim.slice(1);
    const t = getFindingTypeMeta(w.finding_type).shortLabel;
    lines.push(`• ${dimCap} (${t}): ${w.rationale}`);
  }
  lines.push('');
  lines.push('Per FINTRAC: when multiple harm levels apply, the highest wins.');
  return lines.join('\n');
}

function buildRecommendation(rt: string, weaknesses: Weakness[]): string {
  const dims = new Set(weaknesses.map(w => w.dimension));
  const parts: string[] = [];
  if (dims.has('completeness')) {
    parts.push(`Strengthen ${rt} preparation controls to ensure all FINTRAC-required fields are captured before submission, with a four-eyes review of party-identifying and transaction-detail fields.`);
  }
  if (dims.has('accuracy')) {
    parts.push(`Implement a reconciliation step that ties each ${rt} back to the source ledger, KYC file, and transaction system before submission.`);
  }
  if (dims.has('timeliness')) {
    parts.push(`Implement an aging dashboard and exception escalation so any ${rt} approaching the regulatory window triggers a review.`);
  }
  if (dims.has('str_decision')) {
    parts.push(`Require documented investigation, suspicion grounds, decision rationale, and escalation evidence for every STR before submission.`);
  }
  return parts.length > 0
    ? parts.join(' ')
    : `Review ${rt} preparation controls and remediate the identified deficiencies.`;
}
