import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UploadButton } from './UploadButton';
import { UploadList } from './UploadList';

interface Props {
  engagementId: string;
  clientId: string;
}

interface Sample {
  id: string;
  label: string;
  sublabel?: string;
}

interface SampleGroup {
  key: string;          // sample_type stored on the upload row
  title: string;
  description: string;
  samples: Sample[];
  loading: boolean;
}

/**
 * Sample evidence tab — pulls the actual sample rows from the testing modules
 * (KYC, Reporting, Transaction Monitoring) so the analyst can attach the
 * underlying sample records (KYC files, LVCTR copies, EFTR copies, alert
 * case files, EDD files, risk-recalc workings, screening evidence).
 */
export function SampleEvidenceManager({ engagementId, clientId }: Props) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<SampleGroup[]>([
    { key: 'kyc_individual', title: 'KYC — Individual Samples', description: 'Selected individual KYC records under review.', samples: [], loading: true },
    { key: 'kyc_business',   title: 'KYC — Business Samples',   description: 'Selected business / entity KYC records under review.', samples: [], loading: true },
    { key: 'reporting',      title: 'Transaction Reports — LCTR / EFTR / STR / LVCTR / TPR / LPEPR', description: 'Selected reportable transactions submitted to FINTRAC.', samples: [], loading: true },
    { key: 'alert',          title: 'Transaction Monitoring — Alerts',          description: 'Selected alerts under review.',          samples: [], loading: true },
    { key: 'edd',            title: 'High-Risk Customer EDD Samples',           description: 'Selected high-risk customers under EDD review.', samples: [], loading: true },
    { key: 'risk_recalc',    title: 'Risk-Rating Re-calculation Samples',       description: 'Selected customers tested for risk-rating recalculation.', samples: [], loading: true },
    { key: 'screening',      title: 'Sanctions / PEP / HIO Screening Samples',  description: 'Test names used for screening effectiveness testing.', samples: [], loading: true },
  ]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  const setGroupSamples = (key: string, samples: Sample[]) => {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, samples, loading: false } : g)));
  };

  const loadAll = async () => {
    // KYC — get review_id first
    const { data: kycReview } = await supabase
      .from('kyc_reviews').select('id').eq('engagement_id', engagementId).maybeSingle();

    if (kycReview?.id) {
      const [{ data: ind }, { data: biz }] = await Promise.all([
        supabase.from('kyc_individual_samples')
          .select('id, customer_name, customer_id').eq('review_id', kycReview.id).order('created_at'),
        supabase.from('kyc_business_samples')
          .select('id, business_name, customer_id').eq('review_id', kycReview.id).order('created_at'),
      ]);
      setGroupSamples('kyc_individual', (ind || []).map((s) => ({
        id: s.id,
        label: s.customer_name || 'Unnamed individual',
        sublabel: s.customer_id ? `ID: ${s.customer_id}` : undefined,
      })));
      setGroupSamples('kyc_business', (biz || []).map((s) => ({
        id: s.id,
        label: s.business_name || 'Unnamed business',
        sublabel: s.customer_id ? `ID: ${s.customer_id}` : undefined,
      })));
    } else {
      setGroupSamples('kyc_individual', []);
      setGroupSamples('kyc_business', []);
    }

    // Reporting samples (engagement_id directly on table)
    const { data: rpts } = await supabase
      .from('reporting_samples')
      .select('id, report_type, report_reference, transaction_date')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: false });
    setGroupSamples('reporting', (rpts || []).map((s) => ({
      id: s.id,
      label: `${(s.report_type || 'REPORT').toUpperCase()} — ${s.report_reference || s.id.slice(0, 8)}`,
      sublabel: s.transaction_date ? `Txn date: ${s.transaction_date}` : undefined,
    })));

    // TM — get review_id first
    const { data: tmReview } = await supabase
      .from('tm_reviews').select('id').eq('engagement_id', engagementId).maybeSingle();

    if (tmReview?.id) {
      const [{ data: alerts }, { data: edd }, { data: rr }, { data: scr }] = await Promise.all([
        supabase.from('tm_alert_samples')
          .select('id, alert_id, alert_type, alert_date').eq('review_id', tmReview.id).order('created_at'),
        supabase.from('tm_edd_samples')
          .select('id, customer_name, customer_id').eq('review_id', tmReview.id).order('created_at'),
        supabase.from('tm_risk_recalc_samples')
          .select('id, customer_name, customer_id').eq('review_id', tmReview.id).order('created_at'),
        supabase.from('tm_screening_samples')
          .select('id, sample_number, test_name, list_source').eq('review_id', tmReview.id).order('sample_number'),
      ]);
      setGroupSamples('alert', (alerts || []).map((s) => ({
        id: s.id,
        label: s.alert_id || `Alert ${s.id.slice(0, 8)}`,
        sublabel: [s.alert_type, s.alert_date].filter(Boolean).join(' • ') || undefined,
      })));
      setGroupSamples('edd', (edd || []).map((s) => ({
        id: s.id,
        label: s.customer_name || 'Unnamed customer',
        sublabel: s.customer_id ? `ID: ${s.customer_id}` : undefined,
      })));
      setGroupSamples('risk_recalc', (rr || []).map((s) => ({
        id: s.id,
        label: s.customer_name || 'Unnamed customer',
        sublabel: s.customer_id ? `ID: ${s.customer_id}` : undefined,
      })));
      setGroupSamples('screening', (scr || []).map((s) => ({
        id: s.id,
        label: s.test_name || `Test #${s.sample_number ?? '—'}`,
        sublabel: s.list_source || undefined,
      })));
    } else {
      ['alert', 'edd', 'risk_recalc', 'screening'].forEach((k) => setGroupSamples(k, []));
    }
  };

  const onUploaded = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample Evidence</CardTitle>
          <CardDescription>
            Attach the actual records for each sample selected during testing — KYC files, LVCTR / EFTR / STR copies,
            alert case files, EDD documentation, risk-recalculation workings, and screening evidence.
            Samples are pulled from each testing module; if a group is empty, select samples in that module first.
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="multiple" defaultValue={groups.map((g) => g.key)}>
        {groups.map((g) => (
          <AccordionItem key={g.key} value={g.key} className="border border-border rounded-md mb-3">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <span className="font-medium text-sm">{g.title}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {g.loading ? '…' : `${g.samples.length} sample${g.samples.length === 1 ? '' : 's'}`}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">{g.description}</p>
              {g.loading ? (
                <div className="text-xs text-muted-foreground">Loading samples…</div>
              ) : g.samples.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No samples selected yet in this module.
                </div>
              ) : (
                <ul className="space-y-3">
                  {g.samples.map((s) => (
                    <li key={s.id} className="border border-border rounded-md p-3 space-y-2 bg-muted/20">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{s.label}</div>
                          {s.sublabel && (
                            <div className="text-xs text-muted-foreground truncate">{s.sublabel}</div>
                          )}
                        </div>
                        <UploadButton
                          engagementId={engagementId}
                          clientId={clientId}
                          sampleType={g.key}
                          sampleId={s.id}
                          sampleLabel={s.label}
                          onUploaded={onUploaded}
                          label="Attach"
                        />
                      </div>
                      <UploadList
                        engagementId={engagementId}
                        sampleType={g.key}
                        sampleId={s.id}
                        refreshKey={refreshKey}
                        emptyHint="No evidence attached for this sample yet."
                      />
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
