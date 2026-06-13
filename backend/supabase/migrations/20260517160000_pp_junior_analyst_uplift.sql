-- Policies & Procedures — junior-analyst usability uplift
--
-- 1. Adds `suggested_finding_type` to `aml_program_question_templates`. When
--    an analyst marks a control "No" or "Partial", the working-paper UI
--    auto-fills the FINTRAC classification from this column so a reviewer
--    new to AML doesn't have to apply the harm-done framework cold. They
--    can override per row.
-- 2. Backfills suggested_finding_type for every active P&P core_controls
--    row, mapped from FINTRAC's CP Penalty Guide levels:
--      Level 1 (most serious)  -> complete_nc
--      Level 2 (priority)      -> partial_important
--      Level 3 (foundational)  -> partial_moderate
--      Level 4 (efficiency)    -> partial_lesser
-- 3. Adds four small coverage rows surfaced from the live engagement
--    spreadsheet: KYC-12 (privacy notice), LED-08 (RCMP/CSIS contact
--    correctness), and the optional Correspondent Banking section
--    (Section 15) with three rows. Tightens SAN-01's analyst guidance to
--    explicitly name the lists.

ALTER TABLE public.aml_program_question_templates
  ADD COLUMN IF NOT EXISTS suggested_finding_type text;

-- =========================================================================
-- 1. Backfill suggested_finding_type for every existing control
-- =========================================================================

-- Complete NC: foundational pillars and outright failure to register / file
UPDATE public.aml_program_question_templates
SET suggested_finding_type = 'complete_nc'
WHERE submodule = 'policies_procedures' AND control_area = 'core_controls'
  AND question_code IN (
    'ECR-02','ECR-03','ECR-04','ECR-05','ECR-06',
    'MSB-01',
    'REP-01','REP-02','REP-03','REP-04',
    'LED-07'
  );

-- Partial-Important: priority elements for achieving FINTRAC objectives
UPDATE public.aml_program_question_templates
SET suggested_finding_type = 'partial_important'
WHERE submodule = 'policies_procedures' AND control_area = 'core_controls'
  AND question_code IN (
    'DCG-05','DCG-06',
    'ECR-01',
    'RR-04',
    'MSB-02','MSB-03',
    'KYC-01','KYC-03','KYC-04','KYC-09',
    'BR-04','BR-05','BR-06',
    'BO-01','BO-03','BO-05','BO-09','BO-10',
    'PEP-02','PEP-06','PEP-07','PEP-08',
    'REP-05','REP-06','REP-07',
    'SAN-01','SAN-02','SAN-03','SAN-04','SAN-06',
    'RK-01',
    'TRN-01','TRN-05',
    'LED-04'
  );

-- Partial-Moderate: foundational elements that affect day-to-day operations
UPDATE public.aml_program_question_templates
SET suggested_finding_type = 'partial_moderate'
WHERE submodule = 'policies_procedures' AND control_area = 'core_controls'
  AND question_code IN (
    'DCG-03',
    'RR-01','RR-02','RR-03','RR-06','RR-07',
    'MSB-04','MSB-05','MSB-06',
    'KYC-05','KYC-06','KYC-10','KYC-11',
    'BR-01','BR-02',
    'TPD-02','TPD-03','TPD-04','TPD-05','TPD-06','TPD-07',
    'BO-04','BO-07','BO-08','BO-11',
    'PEP-03','PEP-09','PEP-10',
    'REP-09',
    'SAN-05',
    'RK-02','RK-03','RK-04','RK-06','RK-07',
    'TRN-02','TRN-03','TRN-04','TRN-08',
    'LED-01','LED-02','LED-03','LED-06'
  );

-- Partial-Lesser: efficiency / best-practice / formal-admin elements
UPDATE public.aml_program_question_templates
SET suggested_finding_type = 'partial_lesser'
WHERE submodule = 'policies_procedures' AND control_area = 'core_controls'
  AND question_code IN (
    'DCG-01','DCG-02','DCG-04','DCG-07',
    'RR-05',
    'KYC-02','KYC-07','KYC-08',
    'BR-03','BR-07',
    'TPD-01',
    'BO-02','BO-06',
    'PEP-01','PEP-04','PEP-05',
    'REP-08','REP-10',
    'RK-05',
    'TRN-06','TRN-07','TRN-09',
    'LED-05'
  );

-- =========================================================================
-- 2. New coverage rows from the live engagement spreadsheet
-- =========================================================================

-- KYC-12: Privacy notice on personal information collection
INSERT INTO public.aml_program_question_templates
  (submodule, control_area, control_category, question_number, question_text, regulatory_reference, evidence_required, sort_order, regulatory_category, test_procedure, analyst_guidance, pass_criteria, max_points, section_code, section_name, subsection, question_code, is_new_or_updated, suggested_finding_type)
VALUES
('policies_procedures','core_controls','client_identification_kyc',150,'Privacy notice on personal information collection','PIPEDA / PCMLTFR',true,150,'Requirement',NULL,'Confirm the policy informs clients about the collection of their personal information (other than information submitted to FINTRAC in reports).','Policy contains a privacy / personal-information notice describing what data is collected, the purpose, and limits on disclosure.',NULL,'5','Client Identification & KYC','Privacy','KYC-12',true,'partial_lesser');

-- LED-08: RCMP / CSIS disclosure contact correctness
INSERT INTO public.aml_program_question_templates
  (submodule, control_area, control_category, question_number, question_text, regulatory_reference, evidence_required, sort_order, regulatory_category, test_procedure, analyst_guidance, pass_criteria, max_points, section_code, section_name, subsection, question_code, is_new_or_updated, suggested_finding_type)
VALUES
('policies_procedures','core_controls','law_enforcement_disclosure',151,'RCMP / CSIS disclosure contact details','PCMLTFA / Criminal Code',true,151,'Requirement',NULL,'Confirm the policy provides the correct, current RCMP and CSIS disclosure contact information for reporting suspected listed-person / terrorist property. Cross-check against FINTRAC''s current guidance — outdated fax numbers are a common deficiency.','Contact details (phone, fax, email) for RCMP and CSIS disclosures match the current FINTRAC/government guidance.',NULL,'14','Law Enforcement, Disclosures & Self-Disclosure','External requests','LED-08',true,'partial_lesser');

-- =========================================================================
-- 3. Optional Section 15: Correspondent Banking (FI clients; N/A for most MSBs)
-- =========================================================================

INSERT INTO public.aml_program_question_templates
  (submodule, control_area, control_category, question_number, question_text, regulatory_reference, evidence_required, sort_order, regulatory_category, test_procedure, analyst_guidance, pass_criteria, max_points, section_code, section_name, subsection, question_code, is_new_or_updated, suggested_finding_type)
VALUES
('policies_procedures','core_controls','correspondent_banking',160,'When a correspondent relationship is created','PCMLTFR',true,160,'Requirement',NULL,'If the entity is a financial entity with foreign correspondent relationships, confirm the policy defines when such a relationship is created. Mark N/A for MSBs / DPMS / others with no correspondent banking.','Policy defines the trigger event(s) creating a correspondent banking relationship, or correctly scopes the section out as N/A.',NULL,'15','Correspondent Banking','Lifecycle','CBR-01',true,'partial_moderate'),
('policies_procedures','core_controls','correspondent_banking',161,'Pre-entry due diligence','PCMLTFR',true,161,'Requirement',NULL,'Confirm the policy describes the diligence required before entering a correspondent banking relationship (e.g. AML/ATF assessment of the foreign correspondent, sanctions screening, ownership/control review, senior management approval).','Policy lists the pre-entry diligence and approval steps for new correspondent relationships.',NULL,'15','Correspondent Banking','Lifecycle','CBR-02',true,'partial_important'),
('policies_procedures','core_controls','correspondent_banking',162,'Recordkeeping for correspondent relationships','PCMLTFR',true,162,'Requirement',NULL,'Confirm the records the entity must retain for each correspondent banking relationship are listed (e.g. diligence file, agreements, approvals, periodic reviews).','Required correspondent banking records are enumerated.',NULL,'15','Correspondent Banking','Recordkeeping','CBR-03',true,'partial_moderate');

-- =========================================================================
-- 4. Tighten SAN-01 to name the lists explicitly
-- =========================================================================

UPDATE public.aml_program_question_templates
SET analyst_guidance = 'Confirm sanctions screening procedures and watchlists are described. The policy should explicitly identify the lists to consult: UN Security Council Consolidated List, Canadian Autonomous Sanctions List (SEMA), Justice for Victims of Corrupt Foreign Officials Act list, Criminal Code listed persons / entities, and any commercial lists (e.g. OFAC) used in practice.',
    pass_criteria = 'Policy names the specific sanctions lists used, the screening cadence/triggers, and the escalation path for hits.'
WHERE submodule = 'policies_procedures'
  AND control_area = 'core_controls'
  AND question_code = 'SAN-01';

NOTIFY pgrst, 'reload schema';
