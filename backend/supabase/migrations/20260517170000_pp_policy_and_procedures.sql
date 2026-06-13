-- Policies & Procedures — test BOTH policy and procedure; conditional sections
--
-- Three changes:
-- 1. Add `applicability` column to question templates and tag the MSB
--    Registration section (4) as msb_required and Correspondent Banking
--    (15) as fi_only. The working-paper UI hides these sections when
--    the engaged client doesn't have those activities, so analysts
--    don't have to bulk-N/A them every time.
-- 2. Reframe every applicable control's analyst guidance and pass
--    criteria so they explicitly test BOTH dimensions:
--      Policy   — what the regulation requires the document to state
--      Procedure — how staff actually operationalize the requirement
--    Per the FINTRAC CP Penalty Guide, all P&P deficiencies map to
--    PCMLTFR 71(1)(a-e) and are classified "Serious"; the harm-done
--    sub-classification (Complete NC / Partial-Important / Moderate /
--    Lesser) is what the analyst picks. Defaults are already set on
--    `suggested_finding_type` from the prior migration; this rewrite
--    sharpens the tests so the analyst can confidently apply them.
-- 3. Document-attribute controls in section 1 (DCG) are kept as
--    single-dimension tests (no meaningful "procedure" layer beyond
--    "follow document control").

ALTER TABLE public.aml_program_question_templates
  ADD COLUMN IF NOT EXISTS applicability text;

-- =========================================================================
-- 1. Tag sections that should only appear for relevant client activities
-- =========================================================================

UPDATE public.aml_program_question_templates
SET applicability = 'msb_required'
WHERE submodule = 'policies_procedures'
  AND control_area = 'core_controls'
  AND section_code = '4';

UPDATE public.aml_program_question_templates
SET applicability = 'fi_only'
WHERE submodule = 'policies_procedures'
  AND control_area = 'core_controls'
  AND section_code = '15';

-- =========================================================================
-- 2. Reframe controls to test BOTH policy and procedure
-- =========================================================================

WITH new_wordings(code, analyst_guidance, pass_criteria) AS (
  VALUES

  -- Section 1: Document Control & Governance (single-dimension tests)
  ('DCG-01','Confirm the document has a formal title, an identified owner (typically the Compliance Officer), and a clear scope statement covering the legal entity / entities and business activities in scope.','Title, owner and scope are documented and consistent with the entity actually under audit.'),
  ('DCG-02','Confirm the document carries version number, issue date, effective date and next review date. Look on the cover or version history page.','Versioning and dates are visible, internally consistent, and reflect a periodic review cycle the entity is actually following.'),
  ('DCG-03','Confirm the document is approved by the appropriate authority (Board / directors / senior management) and approval is dated. Confirm the document also describes the procedure for re-approving updates.','Approval authority, approver name/role, date are documented, and a procedure for ongoing approval of changes is described.'),
  ('DCG-04','Confirm the document contains a change log / revision history and describes the procedure for proposing, reviewing and recording amendments.','Change history identifies what changed, when, and by whom; and the procedure for handling future amendments is documented.'),
  ('DCG-05','Confirm the document references the PCMLTFA and PCMLTFR and operationalizes those obligations into procedures the firm actually uses.','PCMLTFA and PCMLTFR are cited as governing references and the document maps each obligation to internal procedures.'),
  ('DCG-06','Confirm the document references sanctions and related laws relevant to the business (SEMA, United Nations Act, JVCFOA, Criminal Code / RIUNRST) and links each to internal screening / escalation procedures.','Relevant sanctions / terrorist property statutes are referenced and the operational implications are reflected in procedures.'),
  ('DCG-07','Confirm the document references current FINTRAC guidance and either embeds the guidance into procedures or cross-references internal playbooks for operational steps.','Policy cross-references current FINTRAC guidance, and the document includes procedures that operationalize that guidance.'),

  -- Section 2: Effective Compliance Regime (five pillars)
  ('ECR-01','Verify the document includes BOTH: (a) Policy: a statement that the firm maintains an effective compliance regime / program; AND (b) Procedure: how the program is actually maintained day-to-day (ownership, cadence of reviews, who escalates issues).','Policy states the program exists and procedure describes how it is operated and maintained.'),
  ('ECR-02','Verify BOTH: (a) Policy: a compliance officer is required under PCMLTFR 71(1)(a); AND (b) Procedure: how the appointment is documented (board resolution / mandate), how reappointment is triggered (turnover, restructuring), and the CO''s day-to-day reporting line and escalation rights.','Policy designates the CO role and procedure describes appointment, reporting line and day-to-day operating practice.'),
  ('ECR-03','Verify BOTH: (a) Policy: written P&P are a required element of the program (PCMLTFR 71(1)(b)); AND (b) Procedure: how the P&P are maintained (annual review, ad-hoc updates for regulatory changes, version control, training rollout).','Policy mandates written P&P and procedure describes the ongoing maintenance process.'),
  ('ECR-04','Verify BOTH: (a) Policy: a documented risk assessment is required (PCMLTFR 71(1)(c)); AND (b) Procedure: how the RA is conducted (inputs, scope, refresh cadence, who owns it, how findings flow into the control environment).','Policy requires the RA and procedure describes how it is performed and refreshed.'),
  ('ECR-05','Verify BOTH: (a) Policy: a training program is a required element (PCMLTFR 71(1)(d)); AND (b) Procedure: how training is designed, delivered, evidenced, and refreshed for regulatory change.','Policy mandates training and procedure describes the operating model.'),
  ('ECR-06','Verify BOTH: (a) Policy: an effectiveness review at least every two years is required (PCMLTFR 71(1)(e)); AND (b) Procedure: how the review is scoped, conducted, reported and tracked to closure, including the PCMLTFR 71(2) 30-day reporting requirement.','Policy mandates the biennial review and procedure describes how it is run end-to-end and reported to senior officer within 30 days.'),

  -- Section 3: Roles & Responsibilities
  ('RR-01','Verify BOTH: (a) Policy: Board / directors'' AML oversight responsibilities are defined (approval, challenge, escalation, remediation oversight); AND (b) Procedure: how the Board receives AML reporting (cadence, content, format) and how it acts on it.','Both the Board''s mandate and the operating procedure for delivering AML reporting to the Board are documented.'),
  ('RR-02','Verify BOTH: (a) Policy: owners'' AML responsibilities are defined (where applicable) — accountability for resourcing compliance, providing truthful ownership information, supporting remediation; AND (b) Procedure: how owners are kept informed and engaged operationally.','Owners'' accountability and the operating practice for engaging them are both documented.'),
  ('RR-03','Verify BOTH: (a) Policy: senior management''s AML responsibilities (resourcing, escalation, remediation support); AND (b) Procedure: how management actually executes (escalation rituals, approval workflows, support for the CO).','Policy and operating procedure for senior management AML duties are both documented.'),
  ('RR-04','Verify BOTH: (a) Policy: the CO''s role, authority, independence and reporting line; AND (b) Procedure: how the CO operates — access to records, monthly/quarterly cadence, board reporting, escalation triggers, decision authority on holds, training oversight.','CO mandate and CO operating procedure are both documented.'),
  ('RR-05','Verify BOTH: (a) Policy: best practice — for a larger corporation, the CO is not directly involved in receipt, transfer or payment of funds; AND (b) Procedure: how segregation is enforced in practice (delegation, backup, conflict registers).','Policy reflects the segregation expectation and operating practice enforces it.'),
  ('RR-06','Verify BOTH: (a) Policy: employee / front-line obligations (follow procedures, complete training, identify and escalate unusual activity, maintain confidentiality); AND (b) Procedure: how employees are trained on those obligations, how attestations are captured, how escalation flows operationally.','Employees'' duties and the operating procedure for fulfilling them are both documented.'),
  ('RR-07','Verify BOTH: (a) Policy: escalation pathways for KYC, BO, PEP, reporting and sanctions issues; AND (b) Procedure: who specifically the front line escalates to, on what timeline, in what format, and what happens next.','Escalation responsibilities and the operating procedure for escalation are both documented.'),

  -- Section 4: MSB Registration & FINTRAC Notifications
  ('MSB-01','Verify BOTH: (a) Policy: MSB / FMSB registration must occur before business begins; AND (b) Procedure: how readiness is confirmed and registration is filed prior to launch (responsible person, evidence retained, sign-off).','Policy prohibits operating before registration and procedure describes the filing process.'),
  ('MSB-02','Verify BOTH: (a) Policy: renewal must occur before expiry, recognizing the two-year validity period; AND (b) Procedure: who tracks the renewal date, the alerting mechanism, evidence of submission.','Policy states the renewal requirement and procedure ensures timely action.'),
  ('MSB-03','Verify BOTH: (a) Policy: FINTRAC must be updated within 30 days of any change to registration information (PCMLTFR s.11.13); AND (b) Procedure: how staff detect a change, who logs and files the update, where acknowledgements are retained.','Policy states the 30-day rule and procedure operationalizes change detection and filing.'),
  ('MSB-04','Verify BOTH: (a) Policy: FINTRAC must be notified within 30 days after the business ceases MSB activities; AND (b) Procedure: who is responsible at cessation, how the notice is filed, where evidence is kept.','Policy states the cessation rule and procedure operationalizes it.'),
  ('MSB-05','Verify BOTH: (a) Policy: registration, renewal, update, cessation records must be retained; AND (b) Procedure: where these records live, retention period, and how they are made accessible during examination.','Policy lists retention obligations and procedure describes how records are stored and retrieved.'),
  ('MSB-06','Verify BOTH: (a) Policy: a FINTRAC inquiry must be responded to within 30 days; AND (b) Procedure: how inquiries are intercepted, triaged, assigned, drafted and reviewed before submission.','Policy states the 30-day response rule and procedure describes the intake-to-response workflow.'),

  -- Section 5: Client Identification & KYC
  ('KYC-01','Verify BOTH: (a) Policy: all identity-verification triggers applicable to the business are listed (e.g. LCT, LVCT, money orders, EFT $1K+, VC $1K+, FX $3K+, account opening, prepaid, suspicious transactions); AND (b) Procedure: at each trigger, what staff actually do — which method, what to collect, where to record, when to escalate.','Both the trigger inventory and the per-trigger staff procedure are documented.'),
  ('KYC-02','Verify BOTH: (a) Policy: any statutory / sector exemptions relied on; AND (b) Procedure: how staff confirm an exemption applies and what records are kept to evidence the exemption.','Exemptions are documented with the operational test for confirming and evidencing their use.'),
  ('KYC-03','Verify BOTH: (a) Policy: photo ID must be authentic, valid, current, and government-issued (federal/provincial; municipal not acceptable); AND (b) Procedure: step-by-step verification at point of contact — inspect for authenticity, verify validity date, record ID type/number/issuing authority/expiry, compare photo and signature, escalate suspect IDs.','Policy criteria and staff procedure are both documented and operationally usable.'),
  ('KYC-04','Verify BOTH: (a) Policy: criteria for non-face-to-face verification (technology assesses authenticity, presenter linked to the ID); AND (b) Procedure: which technology is used, fallback if the system fails, how match scores are interpreted, escalation on fail.','Non-face-to-face policy and the operational procedure are both documented.'),
  ('KYC-05','Verify BOTH: (a) Policy: credit file criteria (≥3 years old, ≥2 tradelines, matching name/DOB/address; obtained contemporaneously; mismatch handling); AND (b) Procedure: which vendor / source is used, what staff do when records mismatch.','Credit file criteria and the operational procedure are both documented.'),
  ('KYC-06','Verify BOTH: (a) Policy: dual-process method criteria — two reliable, independent sources, with permitted combinations; AND (b) Procedure: which sources the firm uses, how staff document independence, and recordkeeping.','Dual-process criteria and the staff procedure are both documented.'),
  ('KYC-07','Verify BOTH: (a) Policy: when reliance / affiliate / member methods may be used and the prior-verification requirements; AND (b) Procedure: how the firm obtains the underlying information and confirms validity in practice.','Reliance/affiliate/member policy and the operational procedure are both documented.'),
  ('KYC-08','Verify BOTH: (a) Policy: special procedures for minors or clients lacking standard ID; AND (b) Procedure: how staff execute the alternate verification path and document it.','Special-case policy and the staff procedure are both documented.'),
  ('KYC-09','Verify BOTH: (a) Policy: entity verification methods by entity type (corporations, trusts, NPOs, others) with confirmation-of-existence / reliance / simplified methods; AND (b) Procedure: which records staff collect, how authenticity / currentness are confirmed, recordkeeping.','Entity verification policy and staff procedure are both documented.'),
  ('KYC-10','Verify BOTH: (a) Policy: recordkeeping requirements by verification method; AND (b) Procedure: where records are stored, how they are retrieved during examination, retention period.','Per-method recordkeeping is documented in policy and operationalized in procedure.'),
  ('KYC-11','Verify BOTH: (a) Policy: client information must be kept current on a risk-based cadence or upon material change; AND (b) Procedure: refresh triggers, who owns refresh, how the firm chases incomplete refreshes, escalation on non-response.','Refresh policy and the operating practice for keeping information current are both documented.'),
  ('KYC-12','Verify BOTH: (a) Policy: the firm informs clients about the collection of their personal information (purpose, scope, limits on disclosure), other than information submitted to FINTRAC; AND (b) Procedure: how the privacy notice is delivered (paper, digital, signage), where consent / acknowledgement is recorded.','Privacy policy and the operational practice for delivering and recording it are both documented.'),

  -- Section 6: Business Relationships, Monitoring & EDD
  ('BR-01','Verify BOTH: (a) Policy: when a business relationship is formed for the applicable sector; AND (b) Procedure: how staff recognize the formation event, what they capture at that moment, where they record it.','Both the trigger definition and the operating practice are documented.'),
  ('BR-02','Verify BOTH: (a) Policy: purpose / intended nature of the relationship must be recorded; AND (b) Procedure: which form / system captures it, what specifically is asked, how the answer is used downstream.','Policy requires the record and procedure operationalizes its capture and use.'),
  ('BR-03','Verify BOTH: (a) Policy: when a business relationship ends; AND (b) Procedure: how staff recognize the end and what offboarding / record retention steps follow.','End-of-relationship policy and the operating practice are both documented.'),
  ('BR-04','Verify BOTH: (a) Policy: ongoing monitoring is required for all business relationships (risk-based); AND (b) Procedure: which system performs monitoring, alert thresholds, how alerts are reviewed, dispositions, audit trail.','Monitoring requirement and the operating model for it are both documented.'),
  ('BR-05','Verify BOTH: (a) Policy: enhanced measures apply to high-risk relationships (SoF/SoW, more frequent refresh, senior approval, enhanced monitoring); AND (b) Procedure: how high-risk is detected, which EDD steps trigger, where SoF/SoW evidence is stored, approvals workflow.','EDD policy and the operating procedure are both documented.'),
  ('BR-06','Verify BOTH: (a) Policy: unusual activity must be escalated for investigation and STR consideration; AND (b) Procedure: how the front line escalates (timing, to whom, what info to include), what the CO / investigations team does next, the STR-decision workflow.','Escalation policy and the investigations operating model are both documented.'),
  ('BR-07','Verify BOTH: (a) Policy: derisking / demarketing approach, fair-treatment considerations, governance; AND (b) Procedure: criteria for demarketing, approvals, ongoing monitoring of accounts already recommended for demarketing (esp. larger institutions), recordkeeping.','Derisking policy and the operating practice (including monitoring of in-flight demarketing) are both documented.'),

  -- Section 7: Third Party Determination
  ('TPD-01','Verify BOTH: (a) Policy: who a third party is (a person / entity that instructs or benefits from the transaction other than the conductor / client); AND (b) Procedure: how staff identify third parties in real interactions (what to ask, observable cues).','Definition and the operational way of recognising third parties are both documented.'),
  ('TPD-02','Verify BOTH: (a) Policy: third-party determination is required at large cash transactions; AND (b) Procedure: where in the LCT workflow the determination is performed, what is recorded.','Large cash trigger and the operational embed are both documented.'),
  ('TPD-03','Verify BOTH: (a) Policy: third-party determination is required at large virtual currency transactions; AND (b) Procedure: where in the LVCT workflow the determination is performed, what is recorded.','Large VC trigger and the operational embed are both documented.'),
  ('TPD-04','Verify BOTH: (a) Policy: third-party determination at information record / account opening / signature card events as applicable; AND (b) Procedure: form/system fields that capture the determination, who validates it.','Sector triggers and the operational embed are both documented.'),
  ('TPD-05','Verify BOTH: (a) Policy: how staff make the determination (ask the client, review documentation, escalate on uncertainty); AND (b) Procedure: scripted prompts staff use, where the answer is logged, escalation path.','Determination policy and the operating script are both documented.'),
  ('TPD-06','Verify BOTH: (a) Policy: required third-party data — name, address, telephone (where applicable), DOB, occupation, relationship to client; corporation-specific data where relevant; AND (b) Procedure: which form / system captures these fields, validations.','Required data and the operational capture mechanism are both documented.'),
  ('TPD-07','Verify BOTH: (a) Policy: when third-party involvement is suspected but cannot be confirmed, staff document the suspicion and escalate; AND (b) Procedure: escalation route, the form of documentation, follow-up action.','Suspected-but-unconfirmed handling is documented in policy and in operating procedure.'),

  -- Section 8: Beneficial Ownership & Discrepancy Reporting
  ('BO-01','Verify BOTH: (a) Policy: identify individuals who directly or indirectly own / control 25%+ of the entity (and the ownership/control structure); AND (b) Procedure: how staff obtain the information (questionnaire, registry, supporting documents), how they validate it.','25% threshold and the operating practice for capturing/validating BO are both documented.'),
  ('BO-02','Verify BOTH: (a) Policy: BO must be a natural person — not another corporation, trust or entity; AND (b) Procedure: how staff walk the chain when intermediate entities exist until they reach a natural person.','Policy on natural-person BO and the walk-the-chain operating practice are both documented.'),
  ('BO-03','Verify BOTH: (a) Policy: information establishing ownership, control and structure must be obtained; AND (b) Procedure: which records satisfy this (cap table, shareholder register, trust deed, organigram) and how they are stored.','Structure-data policy and operating practice are both documented.'),
  ('BO-04','Verify BOTH: (a) Policy: differentiated requirements by entity type (corporations, trusts, NPOs, partnerships, others); AND (b) Procedure: entity-type-specific intake forms / systems / record requirements.','Differentiated policy and operational implementation are both documented.'),
  ('BO-05','Verify BOTH: (a) Policy: when BO cannot be confirmed — reasonable measures taken, high-risk treatment, escalation, enhanced monitoring; AND (b) Procedure: what the front line does at point of impasse, who approves continuation, monitoring intensity going forward.','Unable-to-confirm policy and the operational response are both documented.'),
  ('BO-06','Verify BOTH: (a) Policy: when no BO exists, the rationale and evidence are documented; AND (b) Procedure: which form/memo captures the analysis, who reviews/approves it.','No-BO policy and operating practice are both documented.'),
  ('BO-07','Verify BOTH: (a) Policy: a material BO discrepancy (between BO obtained and ISC / Corporations Canada records) is defined (Oct 1, 2025); AND (b) Procedure: how staff identify a discrepancy operationally — what search they run, what they compare.','Discrepancy definition and the operational detection method are both documented.'),
  ('BO-08','Verify BOTH: (a) Policy: discrepancies must be subject to resolution attempts before external reporting; AND (b) Procedure: who contacts the client, the timeline, evidence retained, escalation if no resolution.','Resolution policy and the operating workflow are both documented.'),
  ('BO-09','Verify BOTH: (a) Policy: unresolved / material discrepancies must be reported to Corporations Canada (submission path, timing, evidence retention); AND (b) Procedure: who files, where the acknowledgement is retained, monitoring of regulator response.','Reporting policy and the operating filing procedure are both documented.'),
  ('BO-10','Verify BOTH: (a) Policy: BO discrepancies that suggest suspicious activity must be routed to STR / investigations; AND (b) Procedure: the operational handoff from discrepancy review to investigations, including timing and documentation.','Linkage policy and the operating handoff are both documented.'),
  ('BO-11','Verify BOTH: (a) Policy: BO records, measures taken, and reporting acknowledgements must be retained; AND (b) Procedure: where records live, retention period, access controls.','Recordkeeping policy and operating practice are both documented.'),

  -- Section 9: PEP / HIO
  ('PEP-01','Verify BOTH: (a) Policy: definitions for foreign PEP, domestic PEP, HIO, family members, close associates; AND (b) Procedure: how staff recognise each category in practice (questionnaire, screening tool, training).','Definitions are documented and operationalized for staff.'),
  ('PEP-02','Verify BOTH: (a) Policy: timing of PEP/HIO determination (onboarding, ongoing, trigger events such as EFT/VC ≥$100K where applicable); AND (b) Procedure: how the screening is triggered in the system, what staff do with a match.','Timing and operating practice are both documented.'),
  ('PEP-03','Verify BOTH: (a) Policy: foreign PEPs (and relevant foreign-PEP family members) do not age out; AND (b) Procedure: how this is reflected in the screening tool / monitoring rules (no expiry logic for foreign PEPs).','Foreign PEP lifecycle policy and operational implementation are both documented.'),
  ('PEP-04','Verify BOTH: (a) Policy: domestic PEP / HIO status ends 5 years after leaving office or death; AND (b) Procedure: how the date is tracked, how status changes are triggered, who approves the change.','Domestic lifecycle policy and operating practice are both documented.'),
  ('PEP-05','Verify BOTH: (a) Policy: close-associate status ends when the connection ceases; AND (b) Procedure: how the firm becomes aware of severed connections and updates status.','Close-associate lifecycle and the operating practice are both documented.'),
  ('PEP-06','Verify BOTH: (a) Policy: source of funds / source of wealth measures where required; AND (b) Procedure: which forms / evidence types are accepted, what the analyst reviews, escalation thresholds.','SoF/SoW policy and the operating evidence pack are both documented.'),
  ('PEP-07','Verify BOTH: (a) Policy: senior management review / approval where required; AND (b) Procedure: who approves, the approval form / system, turnaround time, exception-handling.','SM approval policy and the operating workflow are both documented.'),
  ('PEP-08','Verify BOTH: (a) Policy: PEP/HIO cases receive high-risk treatment and enhanced ongoing monitoring; AND (b) Procedure: monitoring intensity, refresh cadence, system controls (alert thresholds, transaction limits).','Risk treatment policy and the operating monitoring practice are both documented.'),
  ('PEP-09','Verify BOTH: (a) Policy: records to keep when PEP/HIO is identified (basis, determination, SoF/SoW, approvals); AND (b) Procedure: where these records are stored and how they are retrieved.','Recordkeeping policy and the operating storage practice are both documented.'),
  ('PEP-10','Verify BOTH: (a) Policy: how the entity will determine PEP/HIO status (asking, using a credible source / database); AND (b) Procedure: which database / tool, fallback procedure, how staff interpret matches.','Determination policy and the operating method are both documented.'),

  -- Section 10: Reporting Obligations
  ('REP-01','Verify BOTH: (a) Policy: cash $10K+ (or aggregated within a static 24-hour period) is reportable within 15 calendar days; AND (b) Procedure: how staff identify triggering transactions, perform aggregation, collect required fields, handle FX conversion (BoC rate at time of transaction), third-party determination, and submit (F2R / API).','LCTR policy and the end-to-end operational procedure are both documented.'),
  ('REP-02','Verify BOTH: (a) Policy: international EFTs $10K+ are reportable within 5 business days (PCMLTFR s.28(1)(b)(c)); AND (b) Procedure: detection, aggregation logic (conductor / beneficiary / third party), travel-rule data, FX conversion, submission path.','EFTR policy and the operating procedure are both documented.'),
  ('REP-03','Verify BOTH: (a) Policy: VC $10K+ (static 24-hour aggregation) is reportable within 5 working days; AND (b) Procedure: identification, aggregation, fair-market valuation source, recordkeeping for valuation, submission.','LVCTR policy and the operating procedure are both documented.'),
  ('REP-04','Verify BOTH: (a) Policy: attempted and completed suspicious transactions are reportable as soon as practicable; AND (b) Procedure: how front line escalates, how the investigation is conducted, the internal SLA after investigation conclusion, submission path.','STR policy and the operating workflow (front line → investigation → submission) are both documented.'),
  ('REP-05','Verify BOTH: (a) Policy: EFT and VC travel rule data elements / exception handling / escalation (without mis-stating STR as a travel-rule report); AND (b) Procedure: how each required data element is captured at transaction time, what staff do when data is missing, internal escalation.','Travel-rule policy and the operating data-capture procedure are both documented.'),
  ('REP-06','Verify BOTH: (a) Policy: sanctions-evasion-related suspicions must route through STR; AND (b) Procedure: how investigators specifically assess for sanctions-evasion indicators, when to file a combined STR for ML/TF + sanctions evasion.','Sanctions-evasion-in-STR policy and operating analysis procedure are both documented.'),
  ('REP-07','Verify BOTH: (a) Policy: the current listed person or entity property report is required (replacing earlier terminology) and must be filed immediately; AND (b) Procedure: who files, by what channel (paper / fax / portal as applicable), evidence retention.','LPEPR policy and the operating filing procedure are both documented.'),
  ('REP-08','Verify BOTH: (a) Policy: parallel reporting / escalation is required where more than one report may be due (e.g. LPEPR + STR, or law-enforcement notification under other laws); AND (b) Procedure: a decision tree / workflow staff follow when multiple report types may apply.','Parallel reporting policy and the operating decision-tree are both documented.'),
  ('REP-09','Verify BOTH: (a) Policy: approved submission channels (FINTRAC web portal, F2R / API) and any fallback / manual path; AND (b) Procedure: who has system credentials, what to do if the portal is unavailable, how acknowledgements are retained.','Submission policy and operating procedure (including resilience) are both documented.'),
  ('REP-10','Verify BOTH: (a) Policy: the STR public-private partnership / project name field (e.g. CP North) is used only when approved; AND (b) Procedure: who approves use of the field, where the approval evidence is stored. Mark N/A if the firm does not participate.','Optional-field policy and operating approval procedure are both documented (or N/A if not used).'),

  -- Section 11: Sanctions & Ministerial Directives
  ('SAN-01','Verify BOTH: (a) Policy: sanctions screening is required, with the specific lists named (UN Security Council Consolidated, Canadian Autonomous (SEMA), JVCFOA, Criminal Code listed entities, OFAC where commercially relied on); AND (b) Procedure: which screening tool runs against which list, screening frequency (onboarding, periodic, transaction-time), how matches are dispositioned, escalation.','Screening lists and the operating screening workflow are both documented.'),
  ('SAN-02','Verify BOTH: (a) Policy: Russia ministerial directive coverage (where applicable); AND (b) Procedure: specific operational measures required by the directive — enhanced CDD, transaction restrictions, recordkeeping, approvals.','Russia directive policy and operating measures are both documented.'),
  ('SAN-03','Verify BOTH: (a) Policy: DPRK / North Korea ministerial directive coverage; AND (b) Procedure: specific operational measures required by the directive.','DPRK directive policy and operating measures are both documented.'),
  ('SAN-04','Verify BOTH: (a) Policy: Iran ministerial directive coverage (per the Nov 2025 update); AND (b) Procedure: specific operational measures required by the updated directive.','Iran directive policy and operating measures are both documented.'),
  ('SAN-05','Verify BOTH: (a) Policy: the directive-specific enhanced measures required (CDD, verification, recordkeeping, approvals, transaction restrictions / escalation); AND (b) Procedure: how each measure is executed by the relevant team.','Directive policy and operating execution are both documented.'),
  ('SAN-06','Verify BOTH: (a) Policy: where a transaction involves prohibited or listed property the transaction must not proceed and must be escalated (Criminal Code / RIUNRST); AND (b) Procedure: the operational hold, who is notified (RCMP, CSIS, FINTRAC), the do-not-complete decision authority.','Do-not-complete policy and the operating hold procedure are both documented.'),

  -- Section 12: Recordkeeping
  ('RK-01','Verify BOTH: (a) Policy: minimum retention period (5-year statutory minimum where applicable); AND (b) Procedure: how the retention clock is anchored, archival storage, deletion workflow.','Retention policy and operating practice are both documented.'),
  ('RK-02','Verify BOTH: (a) Policy: the records relevant to the firm''s sector / products are listed; AND (b) Procedure: where each record type lives (system / vault), the owner, retrievability test cadence.','Sector record list and operating storage practice are both documented.'),
  ('RK-03','Verify BOTH: (a) Policy: required transaction records (LCT, EFT $1K+, LVCT, FX $3K+, VC exchange $1K+, money orders $3K+) with required fields; AND (b) Procedure: which system creates each record, validation controls, how records are retrieved.','Transaction record policy and operating capture/retrieval practice are both documented.'),
  ('RK-04','Verify BOTH: (a) Policy: client / account records to retain (signature cards, intended use, applications, account statements, operating agreements); AND (b) Procedure: where these are stored, retention, retrievability.','Client/account record policy and operating practice are both documented.'),
  ('RK-05','Verify BOTH: (a) Policy: investigation and STR-decisioning rationale records must be retained; AND (b) Procedure: which case-management system holds these, who has access, retention period.','Investigation record policy and operating case-management practice are both documented.'),
  ('RK-06','Verify BOTH: (a) Policy: records must be retrievable and audit-ready; AND (b) Procedure: who responds to a request, target SLA, periodic retrievability test.','Retrievability policy and the operating test practice are both documented.'),
  ('RK-07','Verify BOTH: (a) Policy: where agents / mandataries / service providers are used, agreements and oversight records must be retained; AND (b) Procedure: due diligence cadence, audit rights, remediation tracking.','Agent recordkeeping policy and operating oversight practice are both documented.'),

  -- Section 13: Training Program
  ('TRN-01','Verify BOTH: (a) Policy: a formal AML/ATF training program is documented; AND (b) Procedure: governance — owner, curriculum-approval cycle, vendor management (if external).','Training policy and the operating governance practice are both documented.'),
  ('TRN-02','Verify BOTH: (a) Policy: who must be trained (employees, management, agents, board where relevant); AND (b) Procedure: how the population is maintained (HRIS feed, onboarding hook), how exceptions are tracked.','Audience policy and the operating population-management practice are both documented.'),
  ('TRN-03','Verify BOTH: (a) Policy: AML training is required at onboarding, role change and return from extended leave; AND (b) Procedure: how onboarding training is delivered, assigned and tracked in the LMS.','Onboarding policy and operating delivery practice are both documented.'),
  ('TRN-04','Verify BOTH: (a) Policy: ongoing / refresher training cadence (at least annual, plus event-driven); AND (b) Procedure: campaign management, completion tracking, exception escalation.','Refresher policy and the operating campaign management are both documented.'),
  ('TRN-05','Verify BOTH: (a) Policy: required training content (obligations, red flags, sanctions / ministerial directives, KYC, BO, reporting, confidentiality, escalation); AND (b) Procedure: how content is reviewed for currency against FINTRAC guidance, who approves updates.','Content policy and the operating review practice are both documented.'),
  ('TRN-06','Verify BOTH: (a) Policy: delivery channels (LMS, classroom, virtual, attestations); AND (b) Procedure: which channel is used per audience, how completion is evidenced.','Delivery policy and operating practice are both documented.'),
  ('TRN-07','Verify BOTH: (a) Policy: role-based / enhanced training for higher-risk roles; AND (b) Procedure: who is in scope, additional curriculum, how completion is differentiated.','Role-based training policy and operating practice are both documented.'),
  ('TRN-08','Verify BOTH: (a) Policy: training records (attendance, completion, content version, attestation/score) must be retained; AND (b) Procedure: where records are kept, retention, retrievability.','Training-records policy and operating storage practice are both documented.'),
  ('TRN-09','Verify BOTH: (a) Policy: training must be updated when laws, guidance or products change; AND (b) Procedure: regulatory-change monitoring, who decides on training updates, rollout SLA.','Reg-change policy and the operating update practice are both documented.'),

  -- Section 14: Law Enforcement, Disclosures & Self-Disclosure
  ('LED-01','Verify BOTH: (a) Policy: production orders are routed through legal / compliance and logged; AND (b) Procedure: intake, legal review, response approval, evidence retention, confidentiality.','Production-order policy and the operating workflow are both documented.'),
  ('LED-02','Verify BOTH: (a) Policy: law-enforcement information requests must be centralized, logged and approved before response; AND (b) Procedure: intake channel, approval workflow, response template, retention.','LE-request policy and operating workflow are both documented.'),
  ('LED-03','Verify BOTH: (a) Policy: FINTRAC disclosure / clarification requests must be owned, timely, and confidential; AND (b) Procedure: who responds, target SLA, evidence-gathering steps, internal approvals.','FINTRAC-request policy and operating workflow are both documented.'),
  ('LED-04','Verify BOTH: (a) Policy: confidentiality and anti-tipping-off restrictions on AML reporting information; AND (b) Procedure: who has access, need-to-know boundary, training reinforcement.','Confidentiality policy and operating access controls are both documented.'),
  ('LED-05','Verify BOTH: (a) Policy: material non-compliance must be escalated and considered for voluntary self-disclosure; AND (b) Procedure: trigger criteria, who decides, who approves, how the disclosure is communicated to FINTRAC.','Self-disclosure policy and operating workflow are both documented.'),
  ('LED-06','Verify BOTH: (a) Policy: issue management requires root cause analysis, corrective action and validation of closure; AND (b) Procedure: issue-tracker, owners, target dates, re-testing approach.','Remediation policy and operating practice are both documented.'),
  ('LED-07','Verify BOTH: (a) Policy: independent / effective review of the compliance regime at least every 2 years, with results reported to a senior officer within 30 days (PCMLTFR 71(1)(e) and 71(2)); AND (b) Procedure: scoping, fieldwork, reporting cadence, remediation tracking to closure.','Effectiveness-review policy and the operating review programme are both documented.'),
  ('LED-08','Verify BOTH: (a) Policy: correct, current contact details for RCMP and CSIS disclosures (cross-check against current FINTRAC / government guidance); AND (b) Procedure: who maintains the contact list and how it is reviewed when guidance changes.','Contact policy and the operating maintenance practice are both documented.'),

  -- Section 15: Correspondent Banking (FI-only)
  ('CBR-01','Verify BOTH: (a) Policy: when a correspondent banking relationship is created; AND (b) Procedure: who initiates the relationship, what intake / approvals are required at inception.','Lifecycle policy and operating intake are both documented (or N/A for non-FI).'),
  ('CBR-02','Verify BOTH: (a) Policy: pre-entry diligence (AML/ATF assessment of foreign correspondent, sanctions screening, ownership / control review, senior management approval); AND (b) Procedure: which diligence pack is collected, approval routing, evidence retention.','Pre-entry policy and the operating diligence practice are both documented.'),
  ('CBR-03','Verify BOTH: (a) Policy: records to retain for each correspondent relationship (diligence file, agreements, approvals, periodic reviews); AND (b) Procedure: where records are kept, periodic-review cadence, retention period.','Recordkeeping policy and operating practice are both documented.')
)
UPDATE public.aml_program_question_templates t
SET analyst_guidance = nw.analyst_guidance,
    pass_criteria = nw.pass_criteria
FROM new_wordings nw
WHERE t.submodule = 'policies_procedures'
  AND t.control_area = 'core_controls'
  AND t.question_code = nw.code;

NOTIFY pgrst, 'reload schema';
