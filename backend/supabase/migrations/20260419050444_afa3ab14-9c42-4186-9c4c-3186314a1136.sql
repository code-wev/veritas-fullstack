
-- 1. Question template library
CREATE TABLE IF NOT EXISTS public.training_question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  control_area TEXT NOT NULL,
  control_objective TEXT NOT NULL,
  test_procedure TEXT,
  expected_outcome TEXT,
  max_points INTEGER NOT NULL DEFAULT 2,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates readable by authenticated users"
  ON public.training_question_templates FOR SELECT
  TO authenticated USING (true);

-- 2. Per-review responses
CREATE TABLE IF NOT EXISTS public.training_control_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.training_reviews(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.training_question_templates(id) ON DELETE SET NULL,
  section_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  control_area TEXT NOT NULL,
  control_objective TEXT NOT NULL,
  test_procedure TEXT,
  expected_outcome TEXT,
  response TEXT,
  points_achieved INTEGER,
  max_points INTEGER NOT NULL DEFAULT 2,
  comments TEXT,
  observation_best_practice TEXT,
  evidence_reviewed TEXT,
  deficiency_flag BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_control_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_training_control_results_review ON public.training_control_results(review_id);

CREATE POLICY "Users can view results for their engagements"
  ON public.training_control_results FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.training_reviews tr
      WHERE tr.id = review_id
        AND public.has_engagement_access(auth.uid(), tr.engagement_id)
    )
  );

CREATE POLICY "Users can insert results for their engagements"
  ON public.training_control_results FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.training_reviews tr
      WHERE tr.id = review_id
        AND public.has_engagement_access(auth.uid(), tr.engagement_id)
    )
  );

CREATE POLICY "Users can update results for their engagements"
  ON public.training_control_results FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.training_reviews tr
      WHERE tr.id = review_id
        AND public.has_engagement_access(auth.uid(), tr.engagement_id)
    )
  );

CREATE POLICY "Users can delete results for their engagements"
  ON public.training_control_results FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.training_reviews tr
      WHERE tr.id = review_id
        AND public.has_engagement_access(auth.uid(), tr.engagement_id)
    )
  );

CREATE TRIGGER update_training_control_results_updated_at
  BEFORE UPDATE ON public.training_control_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Intake + summary fields on training_reviews
ALTER TABLE public.training_reviews
  ADD COLUMN IF NOT EXISTS training_document_name TEXT,
  ADD COLUMN IF NOT EXISTS training_version TEXT,
  ADD COLUMN IF NOT EXISTS training_date_approved DATE,
  ADD COLUMN IF NOT EXISTS training_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS overall_assessment TEXT,
  ADD COLUMN IF NOT EXISTS summary_for_report TEXT;

-- 4. Seed 26-question library
INSERT INTO public.training_question_templates
  (section_code, section_name, control_area, control_objective, test_procedure, expected_outcome, sort_order) VALUES

-- SECTION 1: TRAINING POLICY (DESIGN) — Training Structure & Source
('TPD', 'Training Policy (Design)', 'Training Source (Internal vs External)', 'Confirm whether AML training is delivered internally or by external providers', 'Review training policy and supporting documentation', 'Policy clearly states whether training is internal or external', 10),
('TPD', 'Training Policy (Design)', 'External Training Provider Details', 'If external, confirm provider details are documented', 'Review contracts, materials, or provider information', 'Training provider name, scope, and relevance are documented', 20),

-- Training Scope & Coverage
('TPD', 'Training Policy (Design)', 'Scope of Training', 'Confirm training applies to all relevant staff', 'Review policy scope', 'All employees, including client-facing, compliance, and management, are included', 30),
('TPD', 'Training Policy (Design)', 'Training for New Employees', 'Confirm onboarding training requirement', 'Review policy and timelines', 'New employees receive AML training within a defined period (e.g. upon hire or within X days)', 40),
('TPD', 'Training Policy (Design)', 'Training for All Staff (Annual / Refresher)', 'Confirm ongoing training requirement', 'Review policy frequency', 'All staff receive AML training at least annually or on a defined refresher cycle', 50),
('TPD', 'Training Policy (Design)', 'Training for Role Changes', 'Confirm training is required when employees change roles', 'Review policy triggers', 'Employees moving into higher-risk roles receive additional AML training', 60),
('TPD', 'Training Policy (Design)', 'Training for Returning Employees', 'Confirm training requirement for returning staff', 'Review policy provisions', 'Employees returning from extended absence (e.g. leave) are retrained as appropriate', 70),

-- Training Content
('TPD', 'Training Policy (Design)', 'Content Coverage', 'Confirm training covers AML obligations', 'Review materials', 'Includes KYC, STR, reporting, sanctions, red flags, recordkeeping', 80),
('TPD', 'Training Policy (Design)', 'Role-Based Training', 'Confirm training is tailored', 'Review materials by role', 'Higher-risk roles receive enhanced training', 90),
('TPD', 'Training Policy (Design)', 'Regulatory Updates', 'Confirm training reflects current requirements', 'Review updates and version history', 'Training updated for new regulations and emerging risks', 100),

-- Training Delivery & Records
('TPD', 'Training Policy (Design)', 'Delivery Method', 'Confirm delivery format', 'Review delivery approach', 'Defined (LMS, virtual, in-person, etc.)', 110),
('TPD', 'Training Policy (Design)', 'Training Recordkeeping', 'Confirm records are maintained', 'Review policy', 'Attendance and completion records are retained', 120),

-- SECTION 2: TRAINING IMPLEMENTATION (EFFECTIVENESS TESTING) — Training Execution
('TIE', 'Training Implementation (Effectiveness Testing)', 'Training Delivered', 'Confirm training is actually conducted', 'Review training logs', 'Evidence of completed training exists', 130),
('TIE', 'Training Implementation (Effectiveness Testing)', 'Training Log Completeness', 'Confirm training logs are complete', 'Review training register/log', 'Training logs include names, dates, and completion status', 140),
('TIE', 'Training Implementation (Effectiveness Testing)', 'Staff Coverage vs Training Log', 'Confirm all relevant staff have completed AML training', 'Compare employee list to training log', 'All employees (including client-facing, compliance, and relevant staff) are included and completed training', 150),

-- Detailed Staff Coverage Testing
('TIE', 'Training Implementation (Effectiveness Testing)', 'Client-Facing Staff Coverage', 'Confirm client-facing staff completed training', 'Cross-check employee roles vs logs', 'All client-facing staff are trained', 160),
('TIE', 'Training Implementation (Effectiveness Testing)', 'Compliance Staff Coverage', 'Confirm compliance staff completed training', 'Cross-check compliance team vs logs', 'Compliance staff have completed enhanced training', 170),
('TIE', 'Training Implementation (Effectiveness Testing)', 'Full Employee Population Coverage', 'Confirm all employees are captured', 'Compare HR employee list to training log', 'No unexplained gaps in training coverage', 180),

-- Training Quality & Effectiveness
('TIE', 'Training Implementation (Effectiveness Testing)', 'Training Relevance', 'Confirm training reflects business model', 'Compare content to operations', 'Training aligns with products, services, geography', 190),
('TIE', 'Training Implementation (Effectiveness Testing)', 'Practical AML Awareness', 'Confirm training includes real scenarios', 'Review materials', 'Includes red flags and typologies', 200),
('TIE', 'Training Implementation (Effectiveness Testing)', 'Knowledge Assessment', 'Confirm understanding is tested', 'Review quizzes or certifications', 'Staff knowledge is assessed and documented', 210),

-- Ongoing Effectiveness
('TIE', 'Training Implementation (Effectiveness Testing)', 'Training Updates Applied', 'Confirm new risks are included', 'Review updated materials', 'Training reflects new risks and regulatory updates', 220),
('TIE', 'Training Implementation (Effectiveness Testing)', 'Continuous Improvement', 'Confirm training evolves', 'Review feedback or updates', 'Training improves over time', 230),

-- SECTION 3: GOVERNANCE & OVERSIGHT
('GOV', 'Governance & Oversight', 'Senior Management Oversight', 'Confirm management oversight of training', 'Review reporting', 'Training program reviewed by management', 240),
('GOV', 'Governance & Oversight', 'Compliance Officer Oversight', 'Confirm CAMLO oversight', 'Review compliance reporting', 'CAMLO responsible for training effectiveness', 250),
('GOV', 'Governance & Oversight', 'Training Effectiveness Reporting', 'Confirm reporting on training effectiveness', 'Review CAMLO reports to senior management or board', 'Training effectiveness is reported to senior management or board', 260);
