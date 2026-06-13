import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ChecklistSectionView } from './ChecklistSectionView';
import { SubmoduleSummaryCard } from './SubmoduleSummaryCard';
import { ScreeningSampleTable } from './ScreeningSampleTable';
import { AlertSampleTable } from './AlertSampleTable';
import { EDDSampleTable } from './EDDSampleTable';
import { RiskRecalcSampleTable } from './RiskRecalcSampleTable';
import { RemediationItemTable } from './RemediationItemTable';
import { ProcedureNarrative } from './ProcedureNarrative';
import { SUBMODULES, SUBMODULE_CHECKLISTS, type SubmoduleKey } from './checklistTemplates';

interface Props {
  engagementId: string;
  initialSubmodule?: SubmoduleKey;
}

// Submodules where every test item is per-sample (no separate section checklist)
const PER_SAMPLE_ONLY: SubmoduleKey[] = ['alert_review', 'edd', 'risk_recalc'];

type WalkthroughConfig = {
  field:
    | 'screening_procedure_text'
    | 'alert_review_procedure_text'
    | 'edd_procedure_text'
    | 'risk_recalc_procedure_text'
    | 'fintrac_remediation_procedure_text'
    | 'prior_review_remediation_procedure_text';
  title: string;
  description: string;
  placeholder: string;
};

const WALKTHROUGHS: Record<SubmoduleKey, WalkthroughConfig> = {
  sanctions_screening: {
    field: 'screening_procedure_text',
    title: 'Walkthrough — Sanctions / PEP / HIO / Adverse Media Screening',
    description:
      'Document how the entity performs name screening: lists used, frequency, tool/vendor, who reviews matches, escalation path. This narrative will be carried directly into the audit report before the testing results.',
    placeholder:
      'e.g. Screening is performed at onboarding and refreshed nightly using [vendor]. Lists covered include OFAC, UN, Canada Consolidated, UK HMT, PEP, HIO and adverse media. Matches are reviewed by the AMLCO within 24 hours…',
  },
  alert_review: {
    field: 'alert_review_procedure_text',
    title: 'Walkthrough — Alert Review',
    description:
      'Paste the section of the AML policy, alert-handling procedure, or SLA standard that governs how alerts must be triaged, investigated, and dispositioned.',
    placeholder:
      'e.g. Per Section 5.2 of the AML Policy, all transaction monitoring alerts must be reviewed within 30 days. The investigator must document review of customer profile, transaction history, and supporting documents, and record a clear disposition rationale…',
  },
  edd: {
    field: 'edd_procedure_text',
    title: 'Walkthrough — High-Risk Customer EDD',
    description:
      'Paste the section of the policy, EDD procedure, or risk assessment that defines when a customer is high risk and what enhanced due diligence steps must be performed (SoF/SoW, senior management approval, enhanced monitoring, etc.).',
    placeholder:
      'e.g. Per Section 7 of the Risk Assessment, customers meeting any of the following criteria are classified as high risk: …  For high-risk customers, the EDD procedure (Policy §6.4) requires source of funds, senior management approval, and enhanced ongoing monitoring…',
  },
  risk_recalc: {
    field: 'risk_recalc_procedure_text',
    title: 'Walkthrough — Risk Rating Recalculation',
    description:
      "Paste the section of the policy or risk-assessment methodology that defines risk factors, scoring, and the triggers that require a customer's risk rating to be recalculated (STR filed, transaction volume thresholds, adverse media, PEP match, etc.).",
    placeholder:
      'e.g. Per the Risk Assessment Methodology §4.3, customer risk ratings are derived from product, geography, channel, and behavioural factors. Risk ratings must be recalculated when any of the following triggers occur: STR filed, transaction volumes exceed $X, adverse media identified…',
  },
  fintrac_remediation: {
    field: 'fintrac_remediation_procedure_text',
    title: 'Walkthrough — FINTRAC Examination Remediation',
    description:
      'Summarise the FINTRAC examination outcome, the deficiencies identified by the examiner, the agreed remediation plan, owners, and target dates. This narrative frames the testing of remediation evidence below.',
    placeholder:
      'e.g. FINTRAC conducted an examination on [date] and issued [N] findings covering KYC, ongoing monitoring and STR reporting. Management committed to a remediation plan dated [date], with the AMLCO as overall owner and target completion of [date]…',
  },
  prior_review_remediation: {
    field: 'prior_review_remediation_procedure_text',
    title: 'Walkthrough — Previous AML Review Remediation',
    description:
      "Summarise the prior independent AML review's findings and recommendations, the management response, and how remediation has been tracked since. This narrative frames the testing of remediation evidence below.",
    placeholder:
      'e.g. The previous independent review (dated [date], conducted by [firm]) raised [N] findings. Management accepted all recommendations and assigned [owner]. Status is tracked monthly via the AML Committee…',
  },
};

export function TransactionMonitoringModule({ engagementId, initialSubmodule }: Props) {
  const { toast } = useToast();
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeKey: SubmoduleKey = initialSubmodule ?? 'sanctions_screening';
  const activeMeta = SUBMODULES.find((s) => s.key === activeKey);

  useEffect(() => {
    void loadOrCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  const loadOrCreate = async () => {
    setLoading(true);
    const { data: existing, error: selErr } = await supabase
      .from('tm_reviews').select('*').eq('engagement_id', engagementId).maybeSingle();
    if (selErr && selErr.code !== 'PGRST116') {
      toast({ title: 'Failed to load', description: selErr.message, variant: 'destructive' });
    }
    if (existing) {
      setReviewId(existing.id);
      setLoading(false);
      return;
    }
    const { data: created, error: insErr } = await supabase
      .from('tm_reviews').insert({ engagement_id: engagementId }).select('*').single();
    if (insErr) {
      toast({ title: 'Failed to initialize', description: insErr.message, variant: 'destructive' });
    } else {
      setReviewId(created.id);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!reviewId) return <div className="text-sm text-destructive">Could not initialize review.</div>;

  const renderTesting = (key: SubmoduleKey) => {
    switch (key) {
      case 'sanctions_screening':
        return <ScreeningSampleTable reviewId={reviewId} />;
      case 'alert_review':
        return <AlertSampleTable reviewId={reviewId} />;
      case 'edd':
        return <EDDSampleTable reviewId={reviewId} />;
      case 'risk_recalc':
        return <RiskRecalcSampleTable reviewId={reviewId} />;
      case 'fintrac_remediation':
        return <RemediationItemTable reviewId={reviewId} source="fintrac_exam" />;
      case 'prior_review_remediation':
        return <RemediationItemTable reviewId={reviewId} source="prior_aml_review" />;
    }
  };

  const walkthrough = WALKTHROUGHS[activeKey];
  const checklists = SUBMODULE_CHECKLISTS[activeKey] ?? [];
  const showChecklist = !PER_SAMPLE_ONLY.includes(activeKey);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{activeMeta?.label ?? 'Transaction Monitoring'}</CardTitle>
          <CardDescription>
            Start with the walkthrough (free-text policy / procedure summary), then complete the testing
            below. Failures auto-flow to the central Findings register.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 1) Walkthrough first */}
      <ProcedureNarrative
        reviewId={reviewId}
        field={walkthrough.field}
        title={walkthrough.title}
        description={walkthrough.description}
        placeholder={walkthrough.placeholder}
      />

      {/* 2) Testing / execution */}
      {renderTesting(activeKey)}

      {/* 3) Supporting checklist (only where applicable) */}
      {showChecklist && (
        <ChecklistSectionView reviewId={reviewId} submodule={activeKey} sections={checklists} />
      )}

      {/* 4) Submodule summary */}
      <SubmoduleSummaryCard reviewId={reviewId} submodule={activeKey} submoduleLabel={activeMeta?.label ?? activeKey} />
    </div>
  );
}
