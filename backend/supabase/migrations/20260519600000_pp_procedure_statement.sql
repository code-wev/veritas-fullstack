-- procedure_statement on every active P&P control
--
-- Each control's pass criteria currently states only the POLICY requirement
-- (what the document must say). The firm wants every control to also show
-- the matching PROCEDURE — a concise 1-2 sentence operational statement of
-- how the reporting entity actually executes the requirement. The UI will
-- render this directly beneath the Pass Criteria as a labeled "Procedure"
-- section.
--
-- This migration:
-- 1. Adds the procedure_statement column to aml_program_question_templates.
-- 2. Populates a concise procedure for every question_code likely to be
--    active. Targets by question_code so it's idempotent and library-
--    version agnostic.

ALTER TABLE public.aml_program_question_templates
  ADD COLUMN IF NOT EXISTS procedure_statement text;

WITH new_procedures(code, procedure_statement) AS (
  VALUES

  -- Section 1: Document Control & Governance
  ('DCG-01', 'The Compliance Officer maintains the AML manual and is identified as the document owner on the cover page; scope is reviewed annually.'),
  ('DCG-02', 'Each revision of the manual is logged with a version number, issue date, effective date and next-review date by the Compliance Officer.'),
  ('DCG-03', 'The manual is submitted to the appropriate authority (Board / directors / senior management) for sign-off and the signed approval is retained on file.'),
  ('DCG-04', 'The Compliance Officer captures each change in the change log (what changed, when, by whom) before publishing the updated manual.'),
  ('DCG-05', 'The Compliance Officer cross-references PCMLTFA and PCMLTFR throughout the manual and reviews internal procedures whenever the legislation is amended.'),
  ('DCG-06', 'Sanctions and related statutes (SEMA, UN Act, JVCFOA, Criminal Code / RIUNRST) are referenced where applicable and updates are incorporated into the manual within a defined timeframe.'),
  ('DCG-07', 'Current FINTRAC guidance is monitored by the Compliance Officer and reflected in the corresponding sections of the manual or supporting playbooks.'),

  -- Section 2: Effective Compliance Regime
  ('ECR-01', 'The Compliance Officer maintains and reviews the AML/ATF compliance program covering all five required pillars.'),
  ('ECR-02', 'Senior management formally appoints the Compliance Officer in writing and reappoints on turnover or restructuring.'),
  ('ECR-03', 'The Compliance Officer maintains current written policies and procedures and refreshes them at least every two years or when laws / products change.'),
  ('ECR-04', 'The Compliance Officer prepares and updates the documented Risk Assessment using inputs from products, clients, geography, channels and other relevant risk factors.'),
  ('ECR-05', 'The Compliance Officer delivers AML/ATF training to relevant staff at onboarding and at a defined recurring cadence; completion is tracked.'),
  ('ECR-06', 'An independent reviewer conducts the effectiveness review at least every two years and the Compliance Officer reports the results to senior management within 30 days of completion.'),

  -- Section 3: Roles & Responsibilities
  ('RR-01', 'The Board (or equivalent governance body) receives periodic AML reports from the Compliance Officer and approves the AML program and material changes.'),
  ('RR-02', 'Owners provide truthful ownership information and support compliance through resourcing and access to records.'),
  ('RR-03', 'Senior management allocates resources, supports escalation from the Compliance Officer and acts on remediation needs in a timely manner.'),
  ('RR-04', 'The Compliance Officer is granted authority, access and independence to operate the program and escalate issues directly to senior management or the Board.'),
  ('RR-05', 'For larger entities, the Compliance Officer is segregated from receipt / transfer / payment of funds; transactional duties are delegated to other staff.'),
  ('RR-06', 'Front-line staff complete required training, follow KYC and reporting procedures, and escalate unusual activity to the Compliance Officer.'),
  ('RR-07', 'Operational staff escalate KYC, BO, PEP, reporting and sanctions issues to the Compliance Officer through documented channels and turnaround times.'),
  ('RR-08', 'External AML consultants are engaged through a written engagement letter referenced in the program; their roles and limits are reviewed by the Compliance Officer.'),

  -- Section 4: MSB Registration & FINTRAC Notifications
  ('MSB-01', 'The Compliance Officer obtains MSB / FMSB registration with FINTRAC and retains the confirmation before any MSB activity begins.'),
  ('MSB-02', 'The Compliance Officer monitors the registration expiry date and submits renewal documentation through the FINTRAC reporting portal prior to expiration.'),
  ('MSB-03', 'The Compliance Officer files updates to FINTRAC within 30 days of any change to ownership, address, activities/services or other registration information.'),
  ('MSB-04', 'The Compliance Officer notifies FINTRAC within 30 days after the business ceases MSB activities and retains the acknowledgement.'),
  ('MSB-05', 'Registration, renewal, update and cessation records are retained by the Compliance Officer in a designated repository and remain accessible during examination.'),
  ('MSB-06', 'The Compliance Officer triages FINTRAC inquiries, gathers supporting information, drafts the response and submits it within 30 days.'),

  -- Legal & Regulatory Framework
  ('LRF-01', 'The Compliance Officer maps each PCMLTFA / PCMLTFR obligation to an internal procedure and updates the mapping when legislation changes.'),
  ('LRF-02', 'The Compliance Officer monitors FINTRAC guidance publications and reflects updates in policies, training and operational playbooks on a defined cadence.'),
  ('LRF-03', 'The Compliance Officer maintains an inventory of applicable sanctions statutes and confirms screening tools cover the corresponding lists.'),
  ('LRF-04', 'For Russia and DPRK / North Korea Ministerial Directives, the Compliance Officer documents and executes the enhanced measures required for affected clients / transactions.'),
  ('LRF-05', 'For the updated Iran Ministerial Directive (Nov 2025), the Compliance Officer documents and executes the enhanced measures required for affected clients / transactions.'),
  ('LRF-06', 'Where correspondent banking or foreign-affiliate relationships exist, the Compliance Officer performs pre-entry diligence and periodic review; otherwise the section is scoped N/A.'),

  -- Client Identification & KYC
  ('KYC-01', 'Front-line staff verify client identity at each trigger event using one of the approved methods documented in the manual; the verification is recorded at the time of the transaction or onboarding.'),
  ('KYC-02', 'Compliance staff conduct periodic customer reviews based on the customer''s risk rating and refresh identification information on material change.'),
  ('KYC-03', 'Where an exemption applies, the Compliance Officer documents the rationale at the time of onboarding and retains supporting evidence on file.'),
  ('KYC-04', 'Front-line staff inspect a government-issued photo ID for authenticity, validity and currency, and record the ID type, number, issuing authority and expiry date.'),
  ('KYC-05', 'Compliance staff obtain the credit file at the time of verification through an approved third-party source, confirm name / DOB / address match, and escalate mismatches per the manual.'),
  ('KYC-06', 'Front-line staff obtain documents or information from two independent and reliable sources confirming the required combinations of identifying information.'),
  ('KYC-07', 'Where affiliate / member or reliance methods are used, the Compliance Officer obtains the underlying verification information from the affiliate or relied-on entity and retains it on file.'),
  ('KYC-08', 'Where reliance is used, the Compliance Officer maintains a written reliance arrangement and obtains the underlying verification records as soon as feasible.'),
  ('KYC-09', 'Where an agent / mandatary verifies on the reporting entity''s behalf, the Compliance Officer puts a written arrangement in place and obtains the verification records the agent relied on.'),
  ('KYC-10', 'For minors or clients lacking standard ID, front-line staff follow the alternate path documented in the manual and capture the supporting records.'),
  ('KYC-11', 'For entity clients, Compliance staff confirm the entity''s existence using approved records (certificate of incorporation, annual filing, etc.) and capture the required entity data.'),
  ('KYC-12', 'Entity records (name, address, directors, incorporation details, nature of business) are captured at onboarding and retained for the required period.'),

  -- Business Relationships & Ongoing Monitoring
  ('BR-01', 'Front-line staff recognise the formation event for a business relationship per the sector-specific rule and capture the required record at that moment.'),
  ('BR-02', 'Front-line staff record the intended nature and purpose of each business relationship at onboarding using the designated form / system field.'),
  ('BR-03', 'Front-line staff or system controls flag end-of-relationship events and trigger the offboarding / record-retention steps.'),
  ('BR-04', 'Compliance and front-line staff run ongoing monitoring against business relationships using risk-rated alert thresholds and review alerts on a defined cadence.'),
  ('BR-04A', 'The Compliance Officer runs periodic KYC refresh on a risk-based schedule (high 1-2y, medium 2-3y, low 5y) and on trigger events; outreach attempts, exceptions and account restrictions are logged and tracked.'),
  ('BR-05', 'High-risk relationships receive enhanced due diligence — source of funds / wealth, more frequent refresh and senior approval — per the documented criteria.'),
  ('BR-06', 'Unusual activity is escalated from the front line to the Compliance Officer within a defined SLA and the investigation outcome (no action / STR / further review) is recorded.'),
  ('BR-07', 'The Compliance Officer applies documented derisking / demarketing criteria with senior-management approval and monitors accounts flagged for demarketing through to closure.'),

  -- Third Party Determination
  ('TPD-01', 'Front-line staff apply the documented definition to recognise when a third party is involved in a transaction or relationship.'),
  ('TPD-02', 'At large cash transactions, front-line staff perform the third-party determination and record the answer before processing.'),
  ('TPD-03', 'At large virtual currency transactions, front-line staff perform the third-party determination and record the answer before processing.'),
  ('TPD-04', 'At account opening and information-record events, front-line staff capture the third-party determination in the designated form / system field.'),
  ('TPD-05', 'Front-line staff ask the client about third-party involvement using a scripted prompt, record the response and escalate uncertain cases to the Compliance Officer.'),
  ('TPD-06', 'When a third party is identified, the required fields (name, address, DOB, occupation, relationship to client, corporation data where relevant) are captured.'),
  ('TPD-07', 'Where third-party involvement is suspected but cannot be confirmed, the Compliance Officer documents the suspicion and escalates appropriately.'),

  -- Beneficial Ownership & Discrepancy Reporting
  ('BO-01', 'For entity clients, Compliance staff identify individuals owning or controlling 25% or more directly or indirectly and document the ownership/control structure.'),
  ('BO-02', 'Compliance staff walk the ownership chain through any intermediate entities until they reach the natural-person beneficial owners.'),
  ('BO-03', 'Compliance staff capture ownership, control and structure information using approved records (cap table, shareholder register, trust deed, organigram).'),
  ('BO-04', 'Per entity type (corporation, trust, NPO, partnership, etc.) Compliance staff capture the differentiated data required for that entity.'),
  ('BO-05', 'Where BO cannot be confirmed, Compliance staff document reasonable measures taken, apply high-risk treatment and enhanced monitoring, and escalate to the Compliance Officer.'),
  ('BO-06', 'Where no BO exists, Compliance staff document the rationale and the evidence supporting that conclusion.'),
  ('BO-07', 'Compliance staff compare BO obtained from the client with ISC / Corporations Canada records and apply the documented threshold for what constitutes a material discrepancy.'),
  ('BO-08', 'Where a discrepancy exists, Compliance staff attempt to resolve with the client before reporting externally; the resolution attempts and timing are documented.'),
  ('BO-09', 'Unresolved material discrepancies are reported to Corporations Canada by the Compliance Officer within the required timeline and the acknowledgement is retained.'),
  ('BO-10', 'BO discrepancies that suggest suspicious activity are routed by the Compliance Officer to STR / investigation logic.'),
  ('BO-11', 'BO records, measures taken, and reporting acknowledgements are retained by the Compliance Officer in a designated repository.'),

  -- PEP / HIO
  ('PEP-01', 'Compliance staff apply the documented definitions to identify foreign PEPs, domestic PEPs, HIOs, family members and close associates.'),
  ('PEP-02', 'PEP / HIO screening is performed at onboarding and at the documented trigger events (periodic review, high-value EFT / VC, fact changes).'),
  ('PEP-03', 'Foreign PEP status is treated as ongoing and the screening tool does not auto-expire foreign PEP records.'),
  ('PEP-04', 'Domestic PEP / HIO status is removed five years after the individual leaves office or becomes deceased, with the decision documented.'),
  ('PEP-05', 'Close-associate status is removed once the relationship ceases, with the rationale and date documented.'),
  ('PEP-06', 'For identified PEPs / HIOs, Compliance staff obtain source-of-funds and source-of-wealth information using the designated evidence pack.'),
  ('PEP-07', 'Senior management reviews and approves PEP / HIO relationships before onboarding or before continuing the relationship.'),
  ('PEP-08', 'PEP / HIO clients receive high-risk treatment and enhanced ongoing monitoring with documented monitoring intensity and refresh cadence.'),
  ('PEP-09', 'Records of PEP / HIO determinations, basis, source-of-funds / wealth and approvals are retained by the Compliance Officer.'),
  ('PEP-10', 'PEP / HIO status is determined by asking the client and / or referring to a credible source / database, with the method recorded.'),

  -- Reporting Obligations
  ('REP-01', 'Front-line staff identify large cash transactions ($10K+, aggregated in a static 24-hour window), gather required fields, perform third-party determination and the Compliance Officer files the LCTR within 15 calendar days.'),
  ('REP-02', 'Front-line staff identify reportable EFTs ($10K+ international) and the Compliance Officer files the EFTR within 5 business days, including travel-rule data.'),
  ('REP-03', 'Front-line staff identify large VC transactions ($10K+, aggregated 24-hour) and the Compliance Officer files the LVCTR within 5 working days, with fair-market valuation evidence retained.'),
  ('REP-04', 'Suspicious attempted and completed transactions are escalated to the Compliance Officer, investigated and filed as STRs as soon as practicable after the investigation concludes.'),
  ('REP-05', 'Front-line staff capture the required travel-rule data elements at the time of the EFT / VC transfer and the Compliance Officer escalates missing-data exceptions.'),
  ('REP-06', 'Investigators assess transactions for sanctions-evasion indicators and the Compliance Officer files a combined STR where ML/TF and sanctions evasion are both suspected.'),
  ('REP-07', 'The Compliance Officer files the listed person or entity property report immediately via the required channel and retains evidence of submission.'),
  ('REP-08', 'Where more than one report applies (e.g. LPEPR plus STR, or law-enforcement notification), the Compliance Officer follows the documented decision tree to file each report.'),
  ('REP-09', 'Approved submission channels (FINTRAC web portal, F2R / API) are used with documented credentials, and acknowledgements are retained; fallback / manual paths are available for portal outages.'),
  ('REP-10', 'Use of the STR public-private partnership / project-name field (where applicable) is approved by the Compliance Officer and the approval evidence is retained.'),
  -- Legacy REP-11..17 (some libraries have more REP rows; fill them with conservative generic procedures)
  ('REP-11', 'Compliance staff retain the records and evidence supporting each filed regulatory report for the prescribed retention period.'),
  ('REP-12', 'Where a report is recalled, the Compliance Officer corrects and resubmits it within the required timeline (20 days for STR) and retains the corrected submission.'),
  ('REP-13', 'Documented red flags and typologies are reviewed by the Compliance Officer and used to train front-line staff on suspicious-activity identification.'),
  ('REP-14', 'For terrorist property, the Compliance Officer immediately discloses to the RCMP and CSIS and files the FINTRAC report; transactions are not completed.'),
  ('REP-15', 'Approval of submitted reports is documented through a quality-control review before submission.'),
  ('REP-16', 'Resident determination for reporting purposes is captured at onboarding and during ongoing monitoring.'),
  ('REP-17', 'Foreign-currency amounts are converted to CAD using the Bank of Canada rate at the time of the transaction and the rate source is retained.'),

  -- Sanctions & Ministerial Directives
  ('SAN-01', 'The reporting entity screens customers and transactions against the applicable sanctions lists (UN Consolidated, Canadian Autonomous / SEMA, JVCFOA, Criminal Code listed entities, OFAC where used) at onboarding and on an ongoing basis using its designated screening solution; hits are dispositioned and escalated by the Compliance Officer.'),
  ('SAN-02', 'For Russia, the Compliance Officer applies the directive-specific enhanced measures (CDD, transaction restrictions, recordkeeping, approvals) and documents the operational steps.'),
  ('SAN-03', 'For DPRK / North Korea, the Compliance Officer applies the directive-specific enhanced measures and documents the operational steps.'),
  ('SAN-04', 'For Iran (per the Nov 2025 update), the Compliance Officer applies the directive-specific enhanced measures and documents the operational steps.'),
  ('SAN-05', 'Directive-specific enhanced measures (CDD, verification, recordkeeping, approvals, transaction restrictions / escalation) are executed by the relevant team and tracked by the Compliance Officer.'),
  ('SAN-06', 'Where a transaction involves prohibited or listed property the front-line operator places an immediate hold and the Compliance Officer notifies RCMP, CSIS and FINTRAC per the do-not-complete rule.'),

  -- Recordkeeping
  ('RK-01', 'Compliance staff retain regulatory records for the minimum statutory period (typically 5 years) in a designated repository with documented access controls.'),
  ('RK-02', 'The Compliance Officer maintains a sector-specific record inventory listing every record type the firm must retain, the system of record, owner and retention period.'),
  ('RK-03', 'Compliance and operational staff create the required transaction records (LCT, EFT $1K+, LVCT, FX $3K+, VC exchange $1K+, money orders $3K+) at the time of the transaction with the required fields populated.'),
  ('RK-04', 'Client and account records (signature cards, intended use, applications, statements, agreements) are captured at onboarding and updated through the relationship.'),
  ('RK-05', 'Internal STR-decision memorandums and investigation rationale are retained in the designated case-management system.'),
  ('RK-06', 'A documented Records Custodian responds to retrieval requests within a target SLA and the Compliance Officer performs periodic retrievability tests.'),
  ('RK-07', 'For agents / mandataries / service providers, written agreements, due-diligence files and oversight evidence are retained by the Compliance Officer for the required period.'),

  -- Training
  ('TRN-01', 'The Compliance Officer maintains a formal AML/ATF training program with documented governance, curriculum-approval cycle and vendor management.'),
  ('TRN-02', 'The Compliance Officer maintains the training population (employees, management, agents, board) using HRIS feeds and tracks exceptions.'),
  ('TRN-03', 'New relevant staff are assigned AML training at onboarding (or role change / return from long leave) and completion is tracked in the LMS.'),
  ('TRN-04', 'Refresher AML training is delivered at least annually and on event-driven triggers (regulatory change, product change) with campaign management by the Compliance Officer.'),
  ('TRN-05', 'Training content covers obligations, red flags, sanctions / ministerial directives, KYC, BO, reporting, confidentiality and escalation; the Compliance Officer reviews content against current FINTRAC guidance annually.'),
  ('TRN-06', 'Training is delivered through approved channels (LMS, classroom, virtual, attestations) and completion evidence is captured.'),
  ('TRN-07', 'Higher-risk roles (compliance, operations, investigators) receive enhanced role-based training in addition to the baseline curriculum.'),
  ('TRN-08', 'Training records (attendance, completion date, content version, attestation / score) are retained by the Compliance Officer for the required period.'),
  ('TRN-09', 'The Compliance Officer monitors regulatory changes and updates training content within a defined SLA after a change.'),

  -- Law Enforcement, Disclosures & Self-Disclosure
  ('LED-01', 'Production orders are routed to the Compliance Officer and legal counsel, logged, responded to under privilege where applicable, and evidence is retained.'),
  ('LED-02', 'Law-enforcement information requests are centralised with the Compliance Officer, logged and approved before response.'),
  ('LED-03', 'FINTRAC disclosure / clarification requests are owned by the Compliance Officer, responded to within the target SLA and the response is reviewed before submission.'),
  ('LED-04', 'Confidentiality and anti-tipping-off controls limit access to AML reporting information to a need-to-know basis; this is reinforced in training.'),
  ('LED-05', 'Material non-compliance is escalated to the Compliance Officer and senior management; voluntary self-disclosure is considered and approved per the documented criteria.'),
  ('LED-06', 'Issues are tracked in an issue log with root cause, owner, target date and re-testing evidence; the Compliance Officer monitors closure.'),
  ('LED-07', 'An independent reviewer scopes and runs the effectiveness review at least every two years; remediation actions are tracked to closure.'),
  ('LED-08', 'The Compliance Officer maintains current RCMP and CSIS disclosure contact details against published guidance and reviews them when guidance changes.'),

  -- Correspondent Banking (if applicable / FI-only — kept in case rows exist)
  ('CBR-01', 'When entering a correspondent banking relationship, the relationship is registered with the Compliance Officer and the trigger event is documented.'),
  ('CBR-02', 'Before entry, the Compliance Officer performs sanctions screening, ownership / control review and senior-management approval on the foreign correspondent.'),
  ('CBR-03', 'Correspondent banking diligence files, agreements, approvals and periodic-review evidence are retained by the Compliance Officer for the required period.')
)
UPDATE public.aml_program_question_templates t
SET procedure_statement = np.procedure_statement
FROM new_procedures np
WHERE t.submodule    = 'policies_procedures'
  AND t.control_area = 'core_controls'
  AND t.question_code = np.code;

NOTIFY pgrst, 'reload schema';
