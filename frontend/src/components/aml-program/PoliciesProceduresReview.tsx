import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { DocumentIntakeStep } from './steps/DocumentIntakeStep';
import { WorkingPaperSection } from './WorkingPaperSection';
import { OverallVerdictSection } from './OverallVerdictSection';
import { isMsbEntityType } from '@/lib/msbActivities';

interface PoliciesProceduresReviewProps {
  engagementId: string;
}

interface PPReview {
  id: string;
  program_review_id: string;
  current_step: number;
  status: string;
  policy_document_ids: string[];
  document_names: string[];
  version_number: string | null;
  last_updated_date: string | null;
  approval_evidence_ids: string[];
  approval_present: string | null;
  version_control_present: string | null;
  business_activities: string[];
  uses_agents_branches: boolean;
  deals_in_virtual_currency: boolean;
  offers_international_efts: boolean;
  account_based_relationships: boolean;
  overall_design_rating: string | null;
  summary_narrative: string | null;
  overall_finding_type?: string | null;
  overall_finding_type_overridden?: boolean | null;
}

interface ClientContext {
  entityType: string | null;
  msbActivities: string[];
  isMsb: boolean;
  isFi: boolean;
}

/**
 * Substring matchers for entity_type values that indicate a financial entity
 * subject to correspondent banking obligations.
 */
const FI_KEYWORDS = ['bank', 'credit union', 'trust company', 'loan company', 'life insurance', 'securities dealer', 'financial entity'];

function isFiEntityType(entityType: string | null | undefined): boolean {
  if (!entityType) return false;
  const lower = entityType.toLowerCase();
  return FI_KEYWORDS.some((k) => lower.includes(k));
}

export function PoliciesProceduresReview({ engagementId }: PoliciesProceduresReviewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ppReview, setPPReview] = useState<PPReview | null>(null);
  const [clientContext, setClientContext] = useState<ClientContext>({
    entityType: null,
    msbActivities: [],
    isMsb: false,
    isFi: false,
  });

  useEffect(() => {
    initializeReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  const initializeReview = async () => {
    setLoading(true);
    try {
      // Load the engaged client's profile (entity type + MSB activities) so we
      // can hide sections that don't apply (e.g. MSB Registration for a non-
      // MSB; Correspondent Banking for a non-FI).
      const { data: engRow } = await supabase
        .from('engagements')
        .select('client_id')
        .eq('id', engagementId)
        .maybeSingle();
      if (engRow?.client_id) {
        const { data: clientRow } = await supabase
          .from('clients')
          .select('entity_type, msb_activities')
          .eq('id', engRow.client_id)
          .maybeSingle();
        const entityType = (clientRow as any)?.entity_type ?? null;
        const msbActivities = (clientRow as any)?.msb_activities ?? [];
        setClientContext({
          entityType,
          msbActivities,
          isMsb: isMsbEntityType(entityType) || (Array.isArray(msbActivities) && msbActivities.length > 0),
          isFi: isFiEntityType(entityType),
        });
      }

      // Get or create the parent program review row
      let { data: programReview, error: prError } = await supabase
        .from('aml_program_reviews')
        .select('*')
        .eq('engagement_id', engagementId)
        .single();

      if (prError && prError.code === 'PGRST116') {
        const { data: newPR, error: createPRError } = await supabase
          .from('aml_program_reviews')
          .insert({ engagement_id: engagementId })
          .select()
          .single();
        if (createPRError) throw createPRError;
        programReview = newPR;
      } else if (prError) {
        throw prError;
      }

      // Get or create the P&P review row
      let { data: ppData, error: ppError } = await supabase
        .from('aml_pp_reviews')
        .select('*')
        .eq('program_review_id', programReview.id)
        .single();

      if (ppError && ppError.code === 'PGRST116') {
        const { data: newPP, error: createPPError } = await supabase
          .from('aml_pp_reviews')
          .insert({ program_review_id: programReview.id })
          .select()
          .single();
        if (createPPError) throw createPPError;
        ppData = newPP;
      } else if (ppError) {
        throw ppError;
      }

      setPPReview(ppData as PPReview);
    } catch (error: any) {
      console.error('Error initializing P&P review:', error);
      toast.error(`Failed to load P&P review: ${error?.message ?? 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePPReview = async (updates: Partial<PPReview> | Record<string, any>) => {
    if (!ppReview) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aml_pp_reviews')
        .update(updates as any)
        .eq('id', ppReview.id);
      if (error) throw error;
      setPPReview((prev) => (prev ? ({ ...prev, ...updates } as PPReview) : prev));
    } catch (error: any) {
      console.error('Error updating P&P review:', error);
      toast.error(`Failed to save: ${error?.message ?? 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!ppReview) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to load the Policies & Procedures review.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentIntakeStep ppReview={ppReview} onUpdate={updatePPReview} saving={saving} />

      <WorkingPaperSection
        ppReviewId={ppReview.id}
        engagementId={engagementId}
        clientContext={clientContext}
      />

      <OverallVerdictSection
        ppReviewId={ppReview.id}
        ppReview={ppReview}
        engagementId={engagementId}
        clientContext={clientContext}
        onUpdate={updatePPReview}
      />
    </div>
  );
}
