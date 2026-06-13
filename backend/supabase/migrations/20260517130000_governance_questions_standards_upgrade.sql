-- Governance Review module — standards-driven upgrade
--
-- Three changes:
-- 1. ADD 9 missing questions identified against FINTRAC PCMLTFR Part V and
--    the FINTRAC CP penalty guide.
-- 2. UPGRADE 13 auto_flag_condition JSON payloads with finding_type and
--    finding_title so flagged responses mint properly-classified findings.
-- 3. TIGHTEN evidence_required on 15 additional questions where documentary
--    evidence is the standard expectation for an audit working paper.
--
-- The new auto_flag_condition shape is:
--   { "trigger_on": <string | string[]>,
--     "flag_reason": <string>,
--     "finding_type": <complete_nc | partial_important | partial_moderate | partial_lesser>,
--     "finding_title": <string> }

-- =========================================================================
-- 1. ADD 9 NEW QUESTIONS
-- =========================================================================

-- Board of Directors Oversight: Board approval of Risk Assessment specifically
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('board_oversight', 15,
 'Does the Board (or designated committee) formally approve the AML Risk Assessment and material updates to it?',
 'yes_no', NULL, true,
 '{"trigger_on": "No", "flag_reason": "Risk Assessment Not Board-Approved", "finding_type": "partial_moderate", "finding_title": "AML Risk Assessment lacks Board approval"}'::jsonb,
 NULL, 'PCMLTFR Part V — Risk Assessment governance', 15);

-- Compliance Officer: knowledge of the Act
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('compliance_officer', 16,
 'Does the Compliance Officer have demonstrated knowledge of the PCMLTFA, PCMLTFR, and applicable FINTRAC guidance? Capture certifications (AMLCA, CAMS, etc.), training history, and years of relevant experience in Auditor Notes.',
 'yes_no_partial', NULL, true,
 '{"trigger_on": ["No", "Partially"], "flag_reason": "CO Knowledge Gap", "finding_type": "partial_lesser", "finding_title": "Compliance Officer has not been ensured to have adequate knowledge of the Act"}'::jsonb,
 NULL, 'PCMLTFR s.156(1)(a); FINTRAC CP Penalty Guide Level 4', 16);

-- Compliance Officer: 2-year review reported to senior officer
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('compliance_officer', 17,
 'Were the results of the most recent prescribed 2-year effectiveness review reported to a senior officer with authority to act on the findings?',
 'yes_no', NULL, true,
 '{"trigger_on": "No", "flag_reason": "Review Not Reported to Senior Officer", "finding_type": "complete_nc", "finding_title": "Results of prescribed 2-year effectiveness review not reported to a senior officer"}'::jsonb,
 NULL, 'PCMLTFR s.156(1)(a); FINTRAC CP Penalty Guide Level 1', 17);

-- Compliance Officer: 30-day delivery + content of effectiveness-review report
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('compliance_officer', 18,
 'Was the effectiveness-review report delivered within 30 days of assessment completion AND did it include: (a) the results, (b) any updates to policies & procedures, and (c) implementation status of updates?',
 'yes_no_partial', NULL, true,
 '{"trigger_on": ["No", "Partially"], "flag_reason": "Late or Incomplete Review Report", "finding_type": "partial_lesser", "finding_title": "Effectiveness-review report delivered late or missing required content"}'::jsonb,
 NULL, 'PCMLTFR s.156(1)(a); FINTRAC CP Penalty Guide Level 4', 18);

-- Compliance Officer: conflict-of-interest / multiple roles
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('compliance_officer', 19,
 'Does the Compliance Officer hold any other roles within the entity (e.g. Finance Director, Operations Lead, Owner)? If yes, document the roles and assess whether they conflict with the compliance function.',
 'yes_no', NULL, false,
 '{"trigger_on": "Yes", "flag_reason": "CO Holds Conflicting Roles", "finding_type": "partial_moderate", "finding_title": "Compliance Officer holds other roles that may compromise independence"}'::jsonb,
 NULL, 'PCMLTFR Part V — CO independence', 19);

-- Compliance Function: group-vs-entity compliance program
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('compliance_function', 13,
 'If the entity is part of a corporate group, does it maintain its own compliance program documentation? If it relies on group-level documentation, is that program tailored to this entity''s products, services, and risks?',
 'yes_no_na', NULL, true,
 '{"trigger_on": "No", "flag_reason": "Group Program Not Tailored", "finding_type": "partial_moderate", "finding_title": "Compliance program is not tailored to this entity"}'::jsonb,
 NULL, 'PCMLTFR Part V — CP must be tailored to the RE', 13);

-- Compliance Function: whistleblower / confidential reporting channel
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('compliance_function', 14,
 'Is there a documented channel for staff to raise AML compliance concerns confidentially, without fear of retaliation (whistleblower / speak-up mechanism)?',
 'yes_no', NULL, false,
 '{"trigger_on": "No", "flag_reason": "No Whistleblower Channel", "finding_type": "partial_lesser", "finding_title": "No confidential mechanism for staff to raise AML compliance concerns"}'::jsonb,
 NULL, 'Best practice — modern AML program expectation', 14);

-- Frontline Oversight: training content approval
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('frontline_oversight', 13,
 'Who approves the AML training content (CO, Senior Mgmt, third-party vendor)? Is the content reviewed against current FINTRAC guidance at least annually?',
 'yes_no_partial', NULL, true,
 '{"trigger_on": ["No", "Partially"], "flag_reason": "Training Content Not Reviewed", "finding_type": "partial_lesser", "finding_title": "AML training content is not reviewed against current FINTRAC guidance at least annually"}'::jsonb,
 NULL, 'PCMLTFR Part V — Training program currency', 13);

-- Change Management: regulator interaction history
INSERT INTO public.governance_question_templates
  (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, regulation_reference, sort_order)
VALUES
('change_management', 16,
 'Has the entity been subject to any FINTRAC examination, request for information (RFI), or administrative monetary penalty (AMP) in the past 24 months? If yes, are remediation actions tracked through to completion?',
 'yes_no_partial', NULL, true,
 '{"trigger_on": ["Yes", "Partially"], "flag_reason": "Recent Regulator Interaction", "finding_type": "partial_moderate", "finding_title": "Recent FINTRAC interaction (exam / RFI / AMP) — verify remediation tracking"}'::jsonb,
 NULL, 'FINTRAC examination follow-up', 16);

-- =========================================================================
-- 2. UPGRADE 13 EXISTING AUTO_FLAG_CONDITION JSONS WITH finding_type
-- =========================================================================

-- Board Oversight
UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "Weak Board Oversight", "finding_type": "partial_moderate", "finding_title": "Board does not receive regular AML compliance reports"}'::jsonb
WHERE submodule = 'board_oversight' AND question_number = 2;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "Weak Board Oversight", "finding_type": "partial_moderate", "finding_title": "Board does not approve AML policies and material updates"}'::jsonb
WHERE submodule = 'board_oversight' AND question_number = 5;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "Weak Board Oversight", "finding_type": "partial_moderate", "finding_title": "AML incidents or breaches not escalated to the Board"}'::jsonb
WHERE submodule = 'board_oversight' AND question_number = 9;

-- Senior Management
UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": ["No", "Partially"], "flag_reason": "Insufficient Management Support", "finding_type": "partial_moderate", "finding_title": "Management does not adequately support AML remediation efforts"}'::jsonb
WHERE submodule = 'senior_management' AND question_number = 3;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": ["No", "Partially"], "flag_reason": "Insufficient Management Support", "finding_type": "partial_moderate", "finding_title": "Insufficient resources allocated to the compliance function"}'::jsonb
WHERE submodule = 'senior_management' AND question_number = 4;

-- Compliance Officer — Q1 (FORMAL APPOINTMENT) — NEW critical auto-flag → Complete NC
UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "Compliance Officer Not Appointed", "finding_type": "complete_nc", "finding_title": "Compliance Officer not formally appointed — operating without designated CO"}'::jsonb
WHERE submodule = 'compliance_officer' AND question_number = 1;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "CO Independence Risk", "finding_type": "partial_important", "finding_title": "Compliance Officer lacks direct access to senior management"}'::jsonb
WHERE submodule = 'compliance_officer' AND question_number = 2;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "CO Independence Risk", "finding_type": "partial_important", "finding_title": "Compliance Officer lacks direct access to the Board"}'::jsonb
WHERE submodule = 'compliance_officer' AND question_number = 3;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "CO Independence Risk", "finding_type": "partial_important", "finding_title": "Compliance Officer not independent from revenue-generating functions"}'::jsonb
WHERE submodule = 'compliance_officer' AND question_number = 4;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "CO Independence Risk", "finding_type": "partial_important", "finding_title": "Compliance Officer lacks authority to escalate issues without interference"}'::jsonb
WHERE submodule = 'compliance_officer' AND question_number = 6;

-- Compliance Function
UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": ["No", "Partially"], "flag_reason": "Under-resourced Compliance Function", "finding_type": "partial_moderate", "finding_title": "Compliance function is not adequately staffed"}'::jsonb
WHERE submodule = 'compliance_function' AND question_number = 1;

-- Frontline Oversight
UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "Weak Frontline AML Awareness", "finding_type": "partial_moderate", "finding_title": "Frontline staff do not understand escalation procedures"}'::jsonb
WHERE submodule = 'frontline_oversight' AND question_number = 2;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "Weak Frontline AML Awareness", "finding_type": "partial_moderate", "finding_title": "Frontline staff not aware of STR indicators"}'::jsonb
WHERE submodule = 'frontline_oversight' AND question_number = 5;

-- Change Management
UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "Change Management Control Gap", "finding_type": "partial_moderate", "finding_title": "No formal change management process for AML-relevant changes"}'::jsonb
WHERE submodule = 'change_management' AND question_number = 1;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": "No", "flag_reason": "Change Management Control Gap", "finding_type": "partial_moderate", "finding_title": "Governance changes not assessed for regulatory impact"}'::jsonb
WHERE submodule = 'change_management' AND question_number = 2;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": ["No", "Unknown"], "flag_reason": "Potential Unreported Change", "finding_type": "partial_important", "finding_title": "Reportable change(s) potentially not notified to FINTRAC within 30 days"}'::jsonb
WHERE submodule = 'change_management' AND question_number = 7;

UPDATE public.governance_question_templates SET auto_flag_condition =
  '{"trigger_on": ["No", "Unknown"], "flag_reason": "Potential Unreported Change", "finding_type": "partial_important", "finding_title": "Reportable change notifications to FINTRAC were not timely (>30 days)"}'::jsonb
WHERE submodule = 'change_management' AND question_number = 8;

-- =========================================================================
-- 3. TIGHTEN EVIDENCE REQUIREMENTS ON 15 ADDITIONAL QUESTIONS
-- =========================================================================

UPDATE public.governance_question_templates SET evidence_required = true
WHERE (submodule, question_number) IN (
  ('board_oversight', 1),       -- Board mandate/charter showing AML responsibility
  ('board_oversight', 5),       -- Signed policy documents
  ('board_oversight', 6),       -- Board minutes / resolution re CO appointment
  ('board_oversight', 10),      -- Board training records
  ('senior_management', 2),     -- Job descriptions with AML responsibilities
  ('senior_management', 11),    -- Management training records
  ('compliance_officer', 1),    -- CO appointment letter / resolution
  ('compliance_officer', 5),    -- CO mandate / role description
  ('compliance_officer', 10),   -- Signed P&P showing CO approval
  ('compliance_officer', 13),   -- Decision log / sign-off register
  ('compliance_function', 2),   -- Org chart / role descriptions
  ('compliance_function', 11),  -- Succession or backup plan document
  ('frontline_oversight', 1),   -- Staff training records
  ('frontline_oversight', 3),   -- Job descriptions with AML obligations
  ('change_management', 5)      -- Central change log
);

NOTIFY pgrst, 'reload schema';
