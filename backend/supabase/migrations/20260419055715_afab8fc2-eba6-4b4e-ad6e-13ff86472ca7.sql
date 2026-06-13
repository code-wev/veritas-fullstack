-- ============================================================
-- Client Files module: document-request checklist + uploads
-- ============================================================

-- 1) Storage bucket for client-files uploads (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Checklist templates (one row per request-list item, scoped by entity profile)
CREATE TABLE IF NOT EXISTS public.client_files_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_profile TEXT NOT NULL,            -- 'msb' | 'trust' | 'common'
  section TEXT NOT NULL,                   -- 'organizational' | 'framework' | 'data_files'
  item_number INT NOT NULL,
  item_code TEXT NOT NULL UNIQUE,          -- stable upsert key (e.g. 'msb_org_01')
  description TEXT NOT NULL,
  guidance TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_files_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read templates"
ON public.client_files_checklist_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage templates"
ON public.client_files_checklist_templates
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3) Per-engagement checklist responses (status / N/A / comment per item)
CREATE TABLE IF NOT EXISTS public.client_files_checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.client_files_checklist_templates(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'received' | 'na'
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, template_id)
);

ALTER TABLE public.client_files_checklist_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Engagement members read responses"
ON public.client_files_checklist_responses
FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Engagement members insert responses"
ON public.client_files_checklist_responses
FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Engagement members update responses"
ON public.client_files_checklist_responses
FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Engagement members delete responses"
ON public.client_files_checklist_responses
FOR DELETE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE TRIGGER trg_client_files_responses_updated
BEFORE UPDATE ON public.client_files_checklist_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Uploads table — single source of truth for both checklist items and sample evidence
CREATE TABLE IF NOT EXISTS public.client_files_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Link target: EITHER a checklist item OR a sample (both nullable)
  template_id UUID REFERENCES public.client_files_checklist_templates(id) ON DELETE SET NULL,

  -- Sample linkage: free-form to support all sample tables
  sample_type TEXT,        -- 'kyc_individual' | 'kyc_business' | 'reporting' | 'alert' | 'edd' | 'risk_recalc' | 'screening'
  sample_id UUID,          -- FK to the corresponding sample row (no hard FK — multiple tables)
  sample_label TEXT,       -- denormalized human-readable label

  -- File metadata
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  sha256 TEXT NOT NULL,    -- duplicate-detection key
  notes TEXT,

  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Block exact duplicates within the same engagement
  UNIQUE (engagement_id, sha256)
);

CREATE INDEX IF NOT EXISTS idx_cf_uploads_engagement   ON public.client_files_uploads(engagement_id);
CREATE INDEX IF NOT EXISTS idx_cf_uploads_template     ON public.client_files_uploads(template_id);
CREATE INDEX IF NOT EXISTS idx_cf_uploads_sample      ON public.client_files_uploads(sample_type, sample_id);

ALTER TABLE public.client_files_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Engagement members read uploads"
ON public.client_files_uploads
FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Engagement members insert uploads"
ON public.client_files_uploads
FOR INSERT TO authenticated
WITH CHECK (
  public.has_engagement_access(auth.uid(), engagement_id)
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Engagement members update own uploads"
ON public.client_files_uploads
FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Engagement members delete own uploads"
ON public.client_files_uploads
FOR DELETE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE TRIGGER trg_client_files_uploads_updated
BEFORE UPDATE ON public.client_files_uploads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Storage RLS: scope by engagement_id (folder = "<engagement_id>/...")
CREATE POLICY "Engagement members read client-files objects"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'client-files'
  AND public.has_engagement_access(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

CREATE POLICY "Engagement members upload client-files objects"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-files'
  AND public.has_engagement_access(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

CREATE POLICY "Engagement members update client-files objects"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-files'
  AND public.has_engagement_access(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

CREATE POLICY "Engagement members delete client-files objects"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'client-files'
  AND public.has_engagement_access(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

-- 6) Seed checklist templates — MSB list (per uploaded Document Request List)
INSERT INTO public.client_files_checklist_templates
  (entity_profile, section, item_number, item_code, description, sort_order)
VALUES
  -- Organizational & Risk Management
  ('msb','organizational',1,'msb_org_01','Incorporation documentation, including beneficial ownership and directors'' information of the Company.',101),
  ('msb','organizational',2,'msb_org_02','FINTRAC (and Quebec) MSB Registration Details, including the detailed registration form.',102),
  ('msb','organizational',3,'msb_org_03','Details of the AML Compliance Officer, including their letter of appointment, resume with qualifications, and relevant training.',103),
  ('msb','organizational',4,'msb_org_04','A listing of employees (full and contract), including roles and the dates they were hired.',104),
  ('msb','organizational',5,'msb_org_05','The two most recent AML compliance reports presented to senior management, including minutes and action items.',105),
  ('msb','organizational',6,'msb_org_06','Name(s) and functionalities of the compliance software(s) used for client identification, sanctions/PEP screening, transaction monitoring, and reporting.',106),
  ('msb','organizational',7,'msb_org_07','List of AML transaction monitoring rules implemented (automated and manual).',107),
  ('msb','organizational',8,'msb_org_08','Audit trails of changes made to compliance and transaction monitoring systems (dates, nature, authorizers).',108),
  ('msb','organizational',9,'msb_org_09','Lists of agents, affiliates, and their locations.',109),
  ('msb','organizational',10,'msb_org_10','List of projects (impacting clients) recently embarked or executed.',110),
  ('msb','organizational',11,'msb_org_11','Correspondent banking relationship information.',111),
  ('msb','organizational',12,'msb_org_12','Any other relevant information.',112),
  -- Framework
  ('msb','framework',13,'msb_fw_13','Most recent AML compliance policy and procedures documentation.',201),
  ('msb','framework',14,'msb_fw_14','Most recent risk assessment documentation (if documented separately).',202),
  ('msb','framework',15,'msb_fw_15','Detailed methodology of client risk assessment, including high-risk classification criteria.',203),
  ('msb','framework',16,'msb_fw_16','Most recent training program.',204),
  ('msb','framework',17,'msb_fw_17','Records of AML training sessions conducted (attendance logs, materials, post-training assessments).',205),
  ('msb','framework',18,'msb_fw_18','Most recent FINTRAC examination report and remedial actions completed (if any).',206),
  ('msb','framework',19,'msb_fw_19','Last two independent AML compliance effectiveness review reports and remedial actions completed.',207),
  ('msb','framework',20,'msb_fw_20','Bank (Client transactions) Statement for the Period of Review.',208),
  -- Data Files
  ('msb','data_files',21,'msb_data_21','Transactions data for the Period of Review (Date, Customer Number, Customer Name, Amount, Type of Funds, Type of Transaction).',301),
  ('msb','data_files',22,'msb_data_22','Listing of all customers (active, inactive, blocked, suspended, closed) with onboarding date and risk rating.',302),
  ('msb','data_files',23,'msb_data_23','List of all high-risk accounts as of period-end (if not included above).',303),
  ('msb','data_files',24,'msb_data_24','List of all PEPs (domestic and foreign) and Heads of International Organizations as of period-end.',304),
  ('msb','data_files',25,'msb_data_25','Listing of transaction monitoring alerts generated during the POR.',305),
  ('msb','data_files',26,'msb_data_26','Listing of all name screening / adverse media alerts generated during the POR.',306),
  ('msb','data_files',27,'msb_data_27','Listing of all Suspicious Transactions Reports (STRs) submitted to FINTRAC during the POR.',307),
  ('msb','data_files',28,'msb_data_28','Listing of all Electronic Funds Transfer Reports (EFTRs) submitted to FINTRAC during the POR.',308),
  ('msb','data_files',29,'msb_data_29','Listing of all Large Virtual Currency Transactions Reports (LVCTRs) submitted to FINTRAC.',309),
  ('msb','data_files',30,'msb_data_30','Listing of all Terrorist Property Reports (TPRs) submitted to FINTRAC during the POR.',310),
  ('msb','data_files',31,'msb_data_31','Any other relevant information.',311)
ON CONFLICT (item_code) DO NOTHING;

-- 7) Seed checklist templates — Trust Company list
INSERT INTO public.client_files_checklist_templates
  (entity_profile, section, item_number, item_code, description, sort_order)
VALUES
  ('trust','organizational',1,'trust_org_01','Incorporation documentation, including beneficial ownership information.',101),
  ('trust','organizational',2,'trust_org_02','Details of the AML Compliance Officer, including letter of appointment, resume with qualifications, and relevant training.',102),
  ('trust','organizational',3,'trust_org_03','A listing of employees (full and contract), including roles and dates hired.',103),
  ('trust','organizational',4,'trust_org_04','Two most recent AML compliance reports presented to senior management, including minutes and action items.',104),
  ('trust','organizational',5,'trust_org_05','Name(s) and functionalities of the compliance software(s) used for client identification, sanctions/PEP screening, transaction monitoring, and reporting.',105),
  ('trust','organizational',6,'trust_org_06','List of AML transaction monitoring rules implemented (automated and manual).',106),
  ('trust','organizational',7,'trust_org_07','Audit trails of changes made to compliance and transaction monitoring systems (dates, nature, authorizers).',107),
  ('trust','organizational',8,'trust_org_08','Lists of, and due diligence (including written agreements) completed on, agents, affiliates, and their locations.',108),
  ('trust','organizational',9,'trust_org_09','List of projects (impacting clients) recently embarked or executed.',109),
  ('trust','organizational',10,'trust_org_10','Correspondent banking relationship information.',110),
  ('trust','organizational',11,'trust_org_11','Any other relevant information.',111),
  ('trust','framework',12,'trust_fw_12','Most recent AML compliance policy and procedures documentation.',201),
  ('trust','framework',13,'trust_fw_13','Most recent risk assessment documentation (if documented separately).',202),
  ('trust','framework',14,'trust_fw_14','Detailed methodology of client risk assessment, including high-risk classification criteria.',203),
  ('trust','framework',15,'trust_fw_15','Most recent training program.',204),
  ('trust','framework',16,'trust_fw_16','Records of AML training sessions conducted (attendance logs, materials, post-training assessments).',205),
  ('trust','framework',17,'trust_fw_17','Most recent FINTRAC examination report and remedial actions completed (if any).',206),
  ('trust','framework',18,'trust_fw_18','Last two independent AML compliance effectiveness review reports and remedial actions completed.',207),
  ('trust','framework',19,'trust_fw_19','Trust Bank Statement for the Period of Review.',208),
  ('trust','data_files',20,'trust_data_20','Transactions data for the Period of Review.',301),
  ('trust','data_files',21,'trust_data_21','Listing of all customers (active, blocked, suspended, inactive) with onboarding date and risk rating as of period-end.',302),
  ('trust','data_files',22,'trust_data_22','List of all high-risk accounts as of period-end.',303),
  ('trust','data_files',23,'trust_data_23','List of all PEPs (domestic and foreign), HIOs, close associates and relatives of PEPs/HIOs as of period-end.',304),
  ('trust','data_files',24,'trust_data_24','Listing of transaction monitoring alerts generated during the POR.',305),
  ('trust','data_files',25,'trust_data_25','Listing of all name screening / adverse media alerts generated during the POR.',306),
  ('trust','data_files',26,'trust_data_26','Listing of all Suspicious Transactions Reports (STRs) submitted to FINTRAC.',307),
  ('trust','data_files',27,'trust_data_27','Listing of all Large Cash Transactions Reports (LCTRs) submitted to FINTRAC.',308),
  ('trust','data_files',28,'trust_data_28','Listing of all Large Virtual Currency Transactions Reports (LVCTRs) submitted to FINTRAC.',309),
  ('trust','data_files',29,'trust_data_29','Listing of all Terrorist Property Reports (TPRs) submitted to FINTRAC.',310)
ON CONFLICT (item_code) DO NOTHING;