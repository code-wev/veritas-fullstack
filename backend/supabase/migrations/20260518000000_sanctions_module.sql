-- Sanctions & Ministerial Directives — pull out as a standalone module
--
-- Sanctions screening obligations under SEMA, the UN Act, JVCFOA and the
-- Criminal Code apply to every reporting entity. Ministerial Directives
-- (Russia, DPRK, Iran) also apply universally. Testing belongs in its own
-- module so we can test BOTH design (the existing SAN-01..06 design rows)
-- AND operating effectiveness (screening tool inventory, sample-based
-- screening tests, alert dispositions, directive-execution evidence).
--
-- This migration:
-- 1. Creates `sanctions_reviews` (per engagement) and
--    `sanctions_control_results` (per question response).
-- 2. Soft-deletes the SAN-* rows from the P&P working paper.
-- 3. Inserts the new sanctions question library under submodule
--    'sanctions_directives' with two control_areas: 'design' (lifted from
--    P&P, same wording) and 'operational' (six new sample-based testing
--    rows).

-- =========================================================================
-- 1. sanctions_reviews — one row per engagement
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.sanctions_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  summary_narrative text,
  overall_finding_type text,
  overall_finding_type_overridden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sanctions_reviews_engagement_uniq
  ON public.sanctions_reviews (engagement_id);

ALTER TABLE public.sanctions_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Engagement members read sanctions_reviews" ON public.sanctions_reviews;
CREATE POLICY "Engagement members read sanctions_reviews"
ON public.sanctions_reviews FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

DROP POLICY IF EXISTS "Engagement members insert sanctions_reviews" ON public.sanctions_reviews;
CREATE POLICY "Engagement members insert sanctions_reviews"
ON public.sanctions_reviews FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

DROP POLICY IF EXISTS "Engagement members update sanctions_reviews" ON public.sanctions_reviews;
CREATE POLICY "Engagement members update sanctions_reviews"
ON public.sanctions_reviews FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

DROP POLICY IF EXISTS "Engagement members delete sanctions_reviews" ON public.sanctions_reviews;
CREATE POLICY "Engagement members delete sanctions_reviews"
ON public.sanctions_reviews FOR DELETE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE OR REPLACE FUNCTION public.sanctions_reviews_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanctions_reviews_updated_at ON public.sanctions_reviews;
CREATE TRIGGER sanctions_reviews_updated_at
BEFORE UPDATE ON public.sanctions_reviews
FOR EACH ROW
EXECUTE FUNCTION public.sanctions_reviews_set_updated_at();

-- =========================================================================
-- 2. sanctions_control_results — per-question response
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.sanctions_control_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.sanctions_reviews(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.aml_program_question_templates(id) ON DELETE SET NULL,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  response text,
  notes text,
  doc_reference text,
  finding_type text,
  observation_best_practice text,
  evidence_reviewed text,
  deficiency_flag boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sanctions_control_results_review_idx
  ON public.sanctions_control_results (review_id);

ALTER TABLE public.sanctions_control_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Engagement members read sanctions_control_results" ON public.sanctions_control_results;
CREATE POLICY "Engagement members read sanctions_control_results"
ON public.sanctions_control_results FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sanctions_reviews sr
  WHERE sr.id = sanctions_control_results.review_id
    AND public.has_engagement_access(auth.uid(), sr.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members insert sanctions_control_results" ON public.sanctions_control_results;
CREATE POLICY "Engagement members insert sanctions_control_results"
ON public.sanctions_control_results FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sanctions_reviews sr
  WHERE sr.id = sanctions_control_results.review_id
    AND public.has_engagement_access(auth.uid(), sr.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members update sanctions_control_results" ON public.sanctions_control_results;
CREATE POLICY "Engagement members update sanctions_control_results"
ON public.sanctions_control_results FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sanctions_reviews sr
  WHERE sr.id = sanctions_control_results.review_id
    AND public.has_engagement_access(auth.uid(), sr.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members delete sanctions_control_results" ON public.sanctions_control_results;
CREATE POLICY "Engagement members delete sanctions_control_results"
ON public.sanctions_control_results FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sanctions_reviews sr
  WHERE sr.id = sanctions_control_results.review_id
    AND public.has_engagement_access(auth.uid(), sr.engagement_id)
));

-- =========================================================================
-- 3. Soft-delete SAN-* rows from the P&P working paper
-- =========================================================================

UPDATE public.aml_program_question_templates
SET is_active = false
WHERE submodule    = 'policies_procedures'
  AND control_area = 'core_controls'
  AND question_code LIKE 'SAN-%';

-- =========================================================================
-- 4. Insert new Sanctions module question library
--    submodule='sanctions_directives'
--    control_area='design' (6 rows) or 'operational' (6 rows)
-- =========================================================================

-- Design review — lifted from the prior P&P SAN-01..SAN-06 with the
-- already-reframed policy+procedure wording.
INSERT INTO public.aml_program_question_templates
  (submodule, control_area, control_category, question_number, question_text, regulatory_reference, evidence_required, sort_order, regulatory_category, analyst_guidance, pass_criteria, max_points, section_code, section_name, subsection, question_code, is_new_or_updated, suggested_finding_type)
VALUES
('sanctions_directives','design','sanctions_design',1,'Screening framework','UN Act / SEMA / JVCFOA',true,1001,'Requirement',
 'Verify BOTH: (a) Policy: sanctions screening is required, with the specific lists named (UN Security Council Consolidated, Canadian Autonomous (SEMA), JVCFOA, Criminal Code listed entities, OFAC where commercially relied on); AND (b) Procedure: which screening tool runs against which list, screening frequency (onboarding, periodic, transaction-time), how matches are dispositioned, escalation.',
 'Screening lists and the operating screening workflow are both documented.',
 NULL,'1','Design Review','Sanctions framework','SAN-01',false,'partial_important'),
('sanctions_directives','design','sanctions_design',2,'Russia directive coverage','Ministerial Directive (Russia)',true,1002,'Requirement',
 'Verify BOTH: (a) Policy: Russia ministerial directive coverage; AND (b) Procedure: specific operational measures required by the directive — enhanced CDD, transaction restrictions, recordkeeping, approvals.',
 'Russia directive policy and operating measures are both documented.',
 NULL,'1','Design Review','Ministerial directives','SAN-02',false,'partial_important'),
('sanctions_directives','design','sanctions_design',3,'DPRK directive coverage','Ministerial Directive (DPRK)',true,1003,'Requirement',
 'Verify BOTH: (a) Policy: DPRK / North Korea ministerial directive coverage; AND (b) Procedure: specific operational measures required by the directive.',
 'DPRK directive policy and operating measures are both documented.',
 NULL,'1','Design Review','Ministerial directives','SAN-03',false,'partial_important'),
('sanctions_directives','design','sanctions_design',4,'Iran directive coverage','Ministerial Directive (Iran, Nov 2025)',true,1004,'Requirement',
 'Verify BOTH: (a) Policy: Iran ministerial directive coverage (per the Nov 2025 update); AND (b) Procedure: specific operational measures required by the updated directive.',
 'Iran directive policy and operating measures are both documented.',
 NULL,'1','Design Review','Ministerial directives','SAN-04',true,'partial_important'),
('sanctions_directives','design','sanctions_design',5,'Operational measures','Ministerial Directives',true,1005,'Requirement',
 'Verify BOTH: (a) Policy: the directive-specific enhanced measures required (CDD, verification, recordkeeping, approvals, transaction restrictions / escalation); AND (b) Procedure: how each measure is executed by the relevant team.',
 'Directive policy and operating execution are both documented.',
 NULL,'1','Design Review','Ministerial directives','SAN-05',false,'partial_moderate'),
('sanctions_directives','design','sanctions_design',6,'Do-not-complete and escalation rules','Criminal Code / RIUNRST',true,1006,'Requirement',
 'Verify BOTH: (a) Policy: where a transaction involves prohibited or listed property the transaction must not proceed and must be escalated (Criminal Code / RIUNRST); AND (b) Procedure: the operational hold, who is notified (RCMP, CSIS, FINTRAC), the do-not-complete decision authority.',
 'Do-not-complete policy and the operating hold procedure are both documented.',
 NULL,'1','Design Review','Terrorist property / listed property','SAN-06',false,'partial_important');

-- Operational testing — new sample-based rows
INSERT INTO public.aml_program_question_templates
  (submodule, control_area, control_category, question_number, question_text, regulatory_reference, evidence_required, sort_order, regulatory_category, analyst_guidance, pass_criteria, max_points, section_code, section_name, subsection, question_code, is_new_or_updated, suggested_finding_type)
VALUES
('sanctions_directives','operational','sanctions_operational',7,'Screening tool inventory and configuration','FINTRAC Guidance',true,2001,'Requirement',
 'Obtain the inventory of sanctions screening tool(s) used. For each tool, verify: (a) which lists are loaded (UN Consolidated, Canadian Autonomous, JVCFOA, Criminal Code, OFAC, internal); (b) screening triggers (onboarding, transaction-time, periodic rescreening); (c) refresh cadence for list updates and proof of the last refresh date.',
 'Tool inventory documents the lists loaded, screening triggers and list-update cadence, with evidence of recent list updates.',
 NULL,'2','Operational Testing','Screening operations','SAN-OPS-01',true,'partial_important'),
('sanctions_directives','operational','sanctions_operational',8,'Sample of screened clients — onboarding','PCMLTFR',true,2002,'Requirement',
 'Select a sample of clients onboarded during the review period (e.g. 10). For each, verify: (a) sanctions screening was performed at onboarding; (b) any hits were dispositioned (true match vs false positive with rationale); (c) screening evidence is retained on file.',
 'Each sampled client shows evidence of onboarding screening, dispositioned hits and retained evidence.',
 NULL,'2','Operational Testing','Sample testing','SAN-OPS-02',true,'partial_important'),
('sanctions_directives','operational','sanctions_operational',9,'Sample of screened transactions','PCMLTFR',true,2003,'Requirement',
 'Select a sample of high-risk or large transactions during the review period (e.g. 10). For each, verify transaction-time sanctions screening was performed and any hits handled appropriately (escalation, hold, do-not-complete where applicable).',
 'Sampled transactions show evidence of transaction-time screening with proper hit handling.',
 NULL,'2','Operational Testing','Sample testing','SAN-OPS-03',true,'partial_important'),
('sanctions_directives','operational','sanctions_operational',10,'Alert disposition testing','PCMLTFR / Criminal Code',true,2004,'Requirement',
 'Select a sample of recent screening alerts (e.g. 10 mixed true / false positives). For each, verify: (a) rationale documented; (b) escalation path followed where required; (c) approval signed off; (d) timeliness of disposition (within firm SLA).',
 'Alerts are dispositioned with documented rationale, proper escalation and timely closure.',
 NULL,'2','Operational Testing','Alert disposition','SAN-OPS-04',true,'partial_important'),
('sanctions_directives','operational','sanctions_operational',11,'List update process','PCMLTFR',true,2005,'Requirement',
 'Verify the list-update process: how the firm monitors list publishers (Global Affairs Canada, UN, OFSI, OFAC), how lists are ingested into the screening tool, refresh cadence, and evidence of recent updates with timestamps.',
 'List-update process is documented and executed with timestamps showing the lists are current.',
 NULL,'2','Operational Testing','List management','SAN-OPS-05',true,'partial_moderate'),
('sanctions_directives','operational','sanctions_operational',12,'Ministerial Directive execution evidence','Ministerial Directives',true,2006,'Requirement',
 'For each in-force Ministerial Directive applicable to the firm (Russia, DPRK, Iran), obtain evidence the firm is executing the directive-specific procedures: enhanced CDD records for in-scope clients, transaction-restriction examples, approval records, escalation logs. Mark N/A only after confirming there are genuinely no in-scope clients / transactions.',
 'Each applicable Ministerial Directive has supporting evidence of execution, or proper N/A scoping with rationale.',
 NULL,'2','Operational Testing','Ministerial directive execution','SAN-OPS-06',true,'partial_important');

NOTIFY pgrst, 'reload schema';
