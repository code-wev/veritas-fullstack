// Checklist item templates per submodule.
// item_code is stable; do not rename — it is the upsert key.

export interface ChecklistItem {
  code: string;
  text: string;
  watchOut?: boolean;
}

export interface ChecklistSection {
  code: string;
  name: string;
  items: ChecklistItem[];
}

export const SCREENING_CHECKLIST: ChecklistSection[] = [
  {
    code: 'watch_out',
    name: 'Analyst Watch-Out / Common Deficiencies',
    items: [
      { code: 'wo_missed_added', text: 'System fails to detect newly added sanctions', watchOut: true },
      { code: 'wo_still_flags_removed', text: 'System still flags removed names', watchOut: true },
      { code: 'wo_delay_updates', text: 'Delayed list updates', watchOut: true },
      { code: 'wo_weak_fuzzy', text: 'Weak fuzzy matching logic', watchOut: true },
      { code: 'wo_no_doc', text: 'No documentation of screening results', watchOut: true },
    ],
  },
];

export const ALERT_REVIEW_CHECKLIST: ChecklistSection[] = [
  {
    code: 'alert_population',
    name: 'Section 1 — Alert Population',
    items: [
      { code: 'ap_tm', text: 'Transaction monitoring alerts present in population' },
      { code: 'ap_sanctions', text: 'Sanctions alerts present in population' },
      { code: 'ap_pep', text: 'PEP alerts present in population' },
      { code: 'ap_adverse', text: 'Adverse media alerts present in population' },
    ],
  },
  {
    code: 'timeliness',
    name: 'Section 2 — Timeliness (Critical)',
    items: [
      { code: 'at_date_recorded', text: 'Alert review date recorded' },
      { code: 'at_within_sla', text: 'Reviewed within internal SLA' },
      { code: 'at_no_backlog', text: 'No backlog of unreviewed alerts' },
    ],
  },
  {
    code: 'investigation',
    name: 'Section 3 — Alert Investigation',
    items: [
      { code: 'ai_profile', text: 'Customer profile reviewed' },
      { code: 'ai_history', text: 'Transaction history reviewed' },
      { code: 'ai_docs', text: 'Supporting documents considered' },
    ],
  },
  {
    code: 'rationale',
    name: 'Section 4 — Decision Rationale',
    items: [
      { code: 'dr_documented', text: 'Decision documented (suspicious / not suspicious)' },
      { code: 'dr_clear', text: 'Rationale clearly documented' },
      { code: 'dr_aligns', text: 'Rationale aligns with activity' },
    ],
  },
  {
    code: 'watch_out',
    name: 'Analyst Watch-Out',
    items: [
      { code: 'wo_generic', text: 'Generic rationale', watchOut: true },
      { code: 'wo_no_explain', text: 'No explanation for closure', watchOut: true },
      { code: 'wo_inconsistent', text: 'Inconsistent decision-making', watchOut: true },
    ],
  },
];

export const EDD_CHECKLIST: ChecklistSection[] = [
  {
    code: 'identification',
    name: 'Section 1 — High-Risk Identification',
    items: [
      { code: 'hr_identified', text: 'Customer identified as high risk' },
      { code: 'hr_reason', text: 'Reason for classification documented' },
    ],
  },
  {
    code: 'policy_compliance',
    name: 'Section 2 — Policy Compliance (Primary Test)',
    items: [
      { code: 'pc_sof', text: 'Source of funds obtained' },
      { code: 'pc_sow', text: 'Source of wealth obtained (if required or best practice)' },
      { code: 'pc_tx_review', text: 'Transaction review conducted' },
      { code: 'pc_sm_approval', text: 'Senior management approval obtained' },
    ],
  },
  {
    code: 'documentation',
    name: 'Section 3 — Documentation',
    items: [
      { code: 'doc_retained', text: 'Supporting documents retained' },
      { code: 'doc_aligns', text: 'Evidence aligns with policy' },
    ],
  },
  {
    code: 'best_practice',
    name: 'Section 4 — Best Practice Review (Second Layer)',
    items: [
      { code: 'bp_sow_extra', text: 'Source of wealth collected (even if not required)' },
      { code: 'bp_adverse', text: 'Adverse media conducted' },
      { code: 'bp_monitoring', text: 'Ongoing monitoring enhanced' },
    ],
  },
];

export const RISK_RECALC_CHECKLIST: ChecklistSection[] = [
  {
    code: 'methodology',
    name: 'Section 1 — Methodology Understanding',
    items: [
      { code: 'm_factors', text: 'Risk factors defined' },
      { code: 'm_scoring', text: 'Scoring logic documented' },
      { code: 'm_triggers', text: 'High-risk triggers defined' },
    ],
  },
  {
    code: 'triggers',
    name: 'Section 2 — Trigger Testing',
    items: [
      { code: 't_str', text: 'STR filed → customer upgraded to high risk' },
      { code: 't_volume', text: 'High transaction volume → risk updated' },
      { code: 't_other', text: 'Other triggers applied consistently' },
    ],
  },
];

export const FINTRAC_REMEDIATION_CHECKLIST: ChecklistSection[] = [
  {
    code: 'tracking',
    name: 'Section 1 — Deficiency Tracking',
    items: [
      { code: 'tr_identified', text: 'Deficiencies identified' },
      { code: 'tr_plan', text: 'Remediation plan documented' },
    ],
  },
  {
    code: 'implementation',
    name: 'Section 2 — Implementation',
    items: [
      { code: 'im_completed', text: 'Actions completed' },
      { code: 'im_evidence', text: 'Evidence of implementation available' },
      { code: 'im_timeline', text: 'Timeline adhered to' },
    ],
  },
  {
    code: 'effectiveness',
    name: 'Section 3 — Effectiveness',
    items: [
      { code: 'ef_resolved', text: 'Issue fully resolved' },
      { code: 'ef_no_recur', text: 'No recurrence observed' },
    ],
  },
];

export const PRIOR_REVIEW_REMEDIATION_CHECKLIST: ChecklistSection[] = [
  {
    code: 'prior_findings',
    name: 'Section 1 — Prior Findings',
    items: [
      { code: 'pf_documented', text: 'Findings documented' },
      { code: 'pf_tracked', text: 'Recommendations tracked' },
    ],
  },
  {
    code: 'implementation',
    name: 'Section 2 — Implementation Status',
    items: [
      { code: 'im_done', text: 'Recommendation implemented' },
      { code: 'im_evidence', text: 'Evidence available' },
      { code: 'im_timeline', text: 'Timeline met' },
    ],
  },
  {
    code: 'residual',
    name: 'Section 3 — Residual Risk',
    items: [
      { code: 're_no_gaps', text: 'No remaining gaps' },
      { code: 're_addressed', text: 'Issues fully addressed' },
    ],
  },
];

export const SUBMODULE_CHECKLISTS: Record<string, ChecklistSection[]> = {
  sanctions_screening: SCREENING_CHECKLIST,
  alert_review: ALERT_REVIEW_CHECKLIST,
  edd: EDD_CHECKLIST,
  risk_recalc: RISK_RECALC_CHECKLIST,
  fintrac_remediation: FINTRAC_REMEDIATION_CHECKLIST,
  prior_review_remediation: PRIOR_REVIEW_REMEDIATION_CHECKLIST,
};

export const SUBMODULES = [
  { key: 'sanctions_screening', label: 'Sanctions / PEP/HIO / Adverse Media Screening' },
  { key: 'alert_review', label: 'Alert Review / Transaction Monitoring' },
  { key: 'edd', label: 'High-Risk Customer (EDD) Testing' },
  { key: 'risk_recalc', label: 'Risk Rating Re-calculation' },
  { key: 'fintrac_remediation', label: 'FINTRAC Examination Remediation' },
  { key: 'prior_review_remediation', label: 'Previous AML Review Remediation' },
] as const;

export type SubmoduleKey = (typeof SUBMODULES)[number]['key'];
