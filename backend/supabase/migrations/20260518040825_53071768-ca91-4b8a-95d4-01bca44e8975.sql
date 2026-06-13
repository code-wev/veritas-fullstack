ALTER TABLE public.risk_assessment_control_results
  ADD COLUMN IF NOT EXISTS finding_type            text,
  ADD COLUMN IF NOT EXISTS reviewer_recommendation text;

ALTER TABLE public.risk_assessment_reviews
  ADD COLUMN IF NOT EXISTS overall_finding_type            text,
  ADD COLUMN IF NOT EXISTS overall_finding_type_overridden boolean NOT NULL DEFAULT false;

ALTER TABLE public.risk_assessment_question_templates
  ADD COLUMN IF NOT EXISTS suggested_finding_type text,
  ADD COLUMN IF NOT EXISTS applicability text;

CREATE TABLE IF NOT EXISTS public.risk_assessment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.risk_assessment_reviews(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_type text,
  version_number text,
  date_prepared date,
  date_approved date,
  approval_authority text,
  scope text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS risk_assessment_documents_review_idx
  ON public.risk_assessment_documents (review_id);

ALTER TABLE public.risk_assessment_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Engagement members read risk_assessment_documents" ON public.risk_assessment_documents;
CREATE POLICY "Engagement members read risk_assessment_documents"
ON public.risk_assessment_documents FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.risk_assessment_reviews r
  WHERE r.id = review_id
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members insert risk_assessment_documents" ON public.risk_assessment_documents;
CREATE POLICY "Engagement members insert risk_assessment_documents"
ON public.risk_assessment_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.risk_assessment_reviews r
  WHERE r.id = review_id
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members update risk_assessment_documents" ON public.risk_assessment_documents;
CREATE POLICY "Engagement members update risk_assessment_documents"
ON public.risk_assessment_documents FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.risk_assessment_reviews r
  WHERE r.id = review_id
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members delete risk_assessment_documents" ON public.risk_assessment_documents;
CREATE POLICY "Engagement members delete risk_assessment_documents"
ON public.risk_assessment_documents FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.risk_assessment_reviews r
  WHERE r.id = review_id
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
));

CREATE OR REPLACE FUNCTION public.risk_assessment_documents_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS risk_assessment_documents_updated_at ON public.risk_assessment_documents;
CREATE TRIGGER risk_assessment_documents_updated_at
BEFORE UPDATE ON public.risk_assessment_documents
FOR EACH ROW
EXECUTE FUNCTION public.risk_assessment_documents_set_updated_at();

INSERT INTO public.risk_assessment_question_templates
  (section_code, section_name, control_area, control_objective, test_procedure, expected_outcome, sort_order, suggested_finding_type, applicability)
VALUES
('FRM','Framework','Business-based and relationship-based RAs both maintained',
 'Does the firm maintain BOTH a business-based RA (inherent risks across the firm) and a relationship-based RA methodology (risks per client / segment)?',
 'Confirm two distinct artefacts or one document that clearly separates the two assessments.',
 'Both assessments exist and are demonstrably tied to operational decisions.',
 33, 'partial_important', NULL),
('FRM','Framework','National Risk Assessment referenced',
 'Does the RA reference and reflect the sector-level findings of Canada''s National Risk Assessment (Department of Finance NRA)?',
 'Look for citation of the NRA in the methodology / inputs section and check that NRA findings shape risk ratings.',
 'NRA is named as an input and findings are visibly reflected in the assessment.',
 35, 'partial_lesser', NULL),
('FRM','Framework','Ministerial Directives treated as RA inputs',
 'Does the RA treat applicable Ministerial Directives (Russia / DPRK / Iran-Nov2025) as risk-assessment inputs, not just as operational sanctions screening?',
 'Look for the directives in the methodology / inputs section as risk drivers separate from the operational screening procedure.',
 'Applicable directives are listed as RA inputs and influence client / geography ratings.',
 37, 'partial_moderate', NULL),
('FRM','Framework','Sector-regulator measures reflected',
 'Does the RA reflect applicable sector-regulator measures (provincial regulators, OSFI prudential oversight, securities regulators, AMF, FSRA, etc.)?',
 'For FIs, confirm regulator-issued requirements are cited and reflected in the methodology.',
 'Sector-specific regulator measures are named and reflected in risk treatments.',
 39, 'partial_lesser', 'fi_only'),
('FRM','Framework','Operational scale risks assessed',
 'Does the RA assess risks tied to operational structure — branch count, employee headcount, employee turnover — and link them to compensating controls (training intensity, supervision)?',
 'Look for explicit consideration of scale and turnover and the linked compensating controls.',
 'Operational scale and turnover are assessed and linked to mitigating control intensity.',
 41, 'partial_moderate', NULL),
('FRM','Framework','Third-party / service-provider responsibility retained',
 'Where the firm uses third parties or service providers (vendor-managed KYC, screening solution, outsourced compliance, etc.), does the RA confirm the firm retains PCMLTFA responsibility and assess the third party''s AML capability?',
 'Confirm the RA enumerates material third parties and treats outsourcing as a residual-risk input.',
 'Third-party arrangements are inventoried, residual responsibility is retained in writing, and third-party AML capability is assessed.',
 43, 'partial_important', NULL),
('FRM','Framework','Update trigger — business model or scope change',
 'Does the RA require re-assessment when the business model or scope changes (new products, new locations, mergers / acquisitions)?',
 'Look for an explicit trigger event and refresh SLA.',
 'Business-model and scope changes are documented triggers with a defined re-assessment SLA.',
 45, 'partial_moderate', NULL),
('FRM','Framework','Update trigger — affiliate-activity change',
 'Does the RA require re-assessment when the activities of foreign or domestic affiliates change?',
 'Look for an explicit trigger event in the methodology section.',
 'Affiliate-activity changes are documented as a re-assessment trigger.',
 47, 'partial_moderate', 'fi_only'),
('FRM','Framework','Update trigger — new ML/TF threats or typologies',
 'Does the RA require re-assessment when new ML/TF threats or typologies are identified (e.g. emerging payment methods, new fraud vectors)?',
 'Look for an explicit trigger event tied to threat / typology monitoring.',
 'Emerging threats and typologies are a documented re-assessment trigger.',
 49, 'partial_moderate', NULL),
('FRM','Framework','Update trigger — FINTRAC advisory publication',
 'Does the RA require re-assessment within a defined timeframe (e.g. 30 days) after FINTRAC publishes a new advisory affecting the firm''s sector or geographies?',
 'Confirm advisory-driven refresh is enumerated and the SLA is defined.',
 'FINTRAC advisory publication is a documented re-assessment trigger with a defined SLA.',
 51, 'partial_moderate', NULL),
('FRM','Framework','Cross-pillar linkage — RA informs Policies & Procedures',
 'Are RA findings explicitly reflected in the firm''s policies & procedures (mitigation measures, EDD thresholds, monitoring intensity)?',
 'Spot-check several RA-identified high-risk areas and confirm corresponding P&P treatment exists.',
 'RA-identified risks have visibly corresponding P&P treatments and controls.',
 53, 'partial_moderate', NULL),
('FRM','Framework','Cross-pillar linkage — RA informs training curriculum',
 'Are RA-identified high-risk areas reflected in the firm''s training curriculum (specific modules, frequency, audience)?',
 'Confirm training content aligns with RA-identified risk themes and that high-risk areas drive enhanced training.',
 'Training content visibly addresses RA-identified high-risk themes.',
 55, 'partial_moderate', NULL),
('MTH','Methodology','Senior management approval of the Risk Assessment',
 'Is the Risk Assessment document formally approved by senior management (or the Board where applicable)?',
 'Look for a signed approval page / minute / attestation; cross-check the approval date is current.',
 'The RA carries a current, dated approval from senior management or the Board.',
 99, 'partial_important', NULL),
('MTH','Methodology','Compliance Officer ownership of the RA process',
 'Is the Compliance Officer documented as the owner of the RA process — including refresh cycles, input gathering and trigger-event tracking?',
 'Look for explicit assignment of ownership in the methodology section.',
 'CO ownership of the RA process is documented and a refresh calendar exists.',
 101, 'partial_moderate', NULL),
('TOL','Risk Tolerance','Senior management approval of risk tolerance level',
 'Is the firm''s risk tolerance level formally approved by senior management (or the Board)?',
 'Look for documented approval of the tolerance level (e.g. minute, signed policy).',
 'Risk tolerance level is documented and carries dated senior-management approval.',
 138, 'partial_important', NULL),
('CUS','Customer Risk','CRA Registered Charities verification (NPO clients)',
 'Where the firm onboards charities or NPOs, does the RA / methodology reference the CRA Registered Charities database as a verification input?',
 'Look for an explicit reference to the CRA registered-charities list.',
 'CRA registered-charity status is cited as a verification input for NPO clients.',
 173, 'partial_lesser', 'onboards_npos'),
('GEO','Geography','FATF High-Risk and Other Monitored Jurisdictions referenced',
 'Does the RA reference the current FATF High-Risk and Other Monitored Jurisdictions lists, with the source named and dated?',
 'Confirm the list is cited by name with a refresh date matching the last RA review.',
 'FATF list is cited by name with a current refresh date.',
 247, 'partial_lesser', NULL),
('GEO','Geography','FINTRAC advisories referenced',
 'Does the RA reference current FINTRAC advisories on high-risk jurisdictions / sectors, with a procedure to ingest new advisories?',
 'Look for citation of specific FINTRAC advisories and the ingestion / monitoring process.',
 'FINTRAC advisories are cited and a monitoring procedure exists.',
 249, 'partial_lesser', NULL),
('GEO','Geography','Canadian sanctions / FACFOA lists referenced',
 'Does the RA reference Canadian sanctions lists (United Nations Act, SEMA, JVCFOA / FACFOA) when assessing geographic risk?',
 'Confirm sanctions sources are cited as geographic risk inputs (distinct from operational screening in the sanctions section).',
 'Canadian sanctions lists are cited as geographic-risk inputs.',
 251, 'partial_lesser', NULL),
('GEO','Geography','Local crime statistics for physical-branch operations',
 'For physical-branch operations, does the RA incorporate Statistics Canada or local police crime mapping when assessing the risk of locations served?',
 'For each material physical location, look for crime-mapping data and how it shapes the geographic risk rating.',
 'Local crime statistics / mapping data are incorporated and shape geographic risk ratings.',
 253, 'partial_lesser', 'physical_branch'),
('GEO','Geography','Corruption / governance indices (Transparency International)',
 'Does the RA reference country corruption / governance indices (e.g. Transparency International CPI) when assessing the geographic risk of clients and counterparties?',
 'Look for an explicit reference to a corruption index in the methodology / inputs section.',
 'A corruption / governance index is cited and used for country-level risk inputs.',
 255, 'partial_lesser', NULL),
('IND','Indicators, Typologies & Threats','Non-face-to-face onboarding and channels',
 'Does the RA explicitly assess non-face-to-face onboarding and transaction channels (online, telephone, chat) as a higher-risk indicator?',
 'Look for an explicit treatment of non-F2F channels in the indicators / business-risk section.',
 'Non-F2F channels are listed as a higher-risk indicator with documented mitigation.',
 357, 'partial_moderate', NULL),
('IND','Indicators, Typologies & Threats','Cash-intensive client categories',
 'Does the RA explicitly assess cash-intensive client categories (e.g. retail money services, casinos, certain professionals) as a higher-risk indicator?',
 'Confirm cash-intensive segments are inventoried and treated as higher-risk.',
 'Cash-intensive client categories are listed and risk-rated higher.',
 359, 'partial_moderate', NULL),
('IND','Indicators, Typologies & Threats','Virtual currency / e-wallet exposure',
 'Does the RA explicitly assess virtual currency / electronic-wallet exposure as a higher-risk indicator?',
 'Look for treatment of VC / e-wallet exposure in the indicators section.',
 'VC / e-wallet exposure is listed and risk-rated; if not used, scoped N/A with rationale.',
 361, 'partial_moderate', NULL),
('IND','Indicators, Typologies & Threats','Border-crossing proximity',
 'Where applicable, does the RA explicitly assess proximity to border crossings as a higher-risk geographic indicator?',
 'For entities with branches near border points, confirm explicit treatment.',
 'Border-crossing proximity is treated as a higher-risk indicator where applicable; otherwise N/A with rationale.',
 363, 'partial_lesser', NULL),
('IND','Indicators, Typologies & Threats','Branches / clients in high-crime areas',
 'Does the RA explicitly treat branches or client populations in high-crime areas as a higher-risk indicator?',
 'Cross-reference the local crime mapping row (GEO) and confirm those data points drive risk ratings.',
 'High-crime areas served are listed and risk-rated; mitigation is documented.',
 367, 'partial_moderate', NULL),
('IND','Indicators, Typologies & Threats','Foreign PEPs, family members and close associates',
 'Does the RA explicitly assess foreign PEPs (and their family members / close associates) as a higher-risk indicator?',
 'Look for explicit treatment of foreign-PEP exposure and the EDD measures triggered.',
 'Foreign PEPs / family / associates are treated as higher-risk and trigger documented EDD.',
 369, 'partial_important', NULL),
('IND','Indicators, Typologies & Threats','Complex entity structures obscuring beneficial ownership',
 'Does the RA explicitly assess complex entity structures (multi-layer ownership, nominees, opaque jurisdictions) as a higher-risk indicator?',
 'Look for explicit treatment of complex BO structures in the indicators section.',
 'Complex BO structures are treated as higher-risk and trigger documented mitigation.',
 371, 'partial_moderate', NULL),
('IND','Indicators, Typologies & Threats','Agents / intermediaries not subject to AML laws',
 'Does the RA explicitly assess use of agents or intermediaries that are NOT themselves subject to AML laws as a higher-risk indicator?',
 'Look for treatment of unregulated intermediary exposure in the indicators section.',
 'Unregulated intermediary use is identified as a higher-risk indicator with mitigation documented.',
 373, 'partial_moderate', NULL),
('IND','Indicators, Typologies & Threats','Correspondent banking / private banking exposure',
 'Does the RA explicitly assess correspondent banking or private banking exposure as a higher-risk indicator?',
 'For FIs, confirm explicit treatment of correspondent / private banking in the indicators section.',
 'Correspondent / private banking exposure is treated as higher-risk; otherwise N/A.',
 375, 'partial_moderate', 'fi_only'),
('IND','Indicators, Typologies & Threats','Sector-relevant typology sources cited',
 'Does the RA cite specific sector-relevant typology sources (e.g. FATF Methods & Trends for the firm''s sector; Public Safety Canada organized-crime reports)?',
 'Look for named typology reports in the inputs / methodology section.',
 'At least one named sector typology source is cited and reflected in the RA.',
 377, 'partial_lesser', NULL);

NOTIFY pgrst, 'reload schema';