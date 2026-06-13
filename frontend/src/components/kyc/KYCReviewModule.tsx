import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UnifiedKYCSamples } from './sections/UnifiedKYCSamples';
import { KYCIssuesSection } from './sections/KYCIssuesSection';
import { Users, AlertTriangle, FileText } from 'lucide-react';
import { SectionNavigationFooter } from '@/components/ui/section-navigation-footer';
import { ModuleWorkflowBanner } from '@/components/layout/ModuleWorkflowBanner';
import { cn } from '@/lib/utils';

const KYC_TAB_ORDER = ['overview', 'samples', 'issues'];
const KYC_TAB_LABELS: Record<string, string> = {
  'overview': 'Overview',
  'samples': 'Samples',
  'issues': 'Findings & Observations',
};

const SAMPLE_SOURCES = [
  { id: 'customer', label: 'Customer-driven', description: 'Onboarded during review period' },
  { id: 'transaction', label: 'Transaction-driven', description: 'High value or high volume' },
  { id: 'mixed', label: 'Mixed sampling', description: 'Old + New customers' },
];

interface KYCReviewModuleProps {
  engagementId: string;
}

interface KYCReview {
  id: string;
  engagement_id: string;
  status: string;
  individual_sample_sources: string[];
  individual_selection_rationale: string | null;
  individual_population_size: number | null;
  individual_sample_size: number | null;
  business_sample_sources: string[];
  business_selection_rationale: string | null;
  business_population_size: number | null;
  business_sample_size: number | null;
  notes: string | null;
}

export function KYCReviewModule({ engagementId }: KYCReviewModuleProps) {
  const [review, setReview] = useState<KYCReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  
  const [workflowFlags, setWorkflowFlags] = useState({ isLocked: false, canEdit: true });

  // Stats for badges
  const [stats, setStats] = useState({
    individualCount: 0,
    businessCount: 0,
    issueCount: 0,
    highIssues: 0,
    totalSamples: 0,
  });

  useEffect(() => {
    loadOrCreateReview();
  }, [engagementId]);

  useEffect(() => {
    if (review?.id) {
      loadStats();
    }
  }, [review?.id]);

  const loadOrCreateReview = async () => {
    setLoading(true);
    try {
      // Try to load existing review
      const { data: existing, error: fetchError } = await supabase
        .from('kyc_reviews')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setReview(existing);
      } else {
        // Create new review
        const { data: newReview, error: createError } = await supabase
          .from('kyc_reviews')
          .insert({ engagement_id: engagementId })
          .select()
          .single();

        if (createError) throw createError;
        setReview(newReview);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!review?.id) return;

    const [individuals, businesses, issues] = await Promise.all([
      supabase.from('kyc_individual_samples').select('id', { count: 'exact' }).eq('review_id', review.id),
      supabase.from('kyc_business_samples').select('id', { count: 'exact' }).eq('review_id', review.id),
      supabase.from('kyc_issues').select('id, severity', { count: 'exact' }).eq('review_id', review.id),
    ]);

    const highIssues = issues.data?.filter(i => i.severity === 'high').length || 0;
    const totalSamples = (individuals.count || 0) + (businesses.count || 0);

    setStats({
      individualCount: individuals.count || 0,
      businessCount: businesses.count || 0,
      issueCount: issues.count || 0,
      highIssues,
      totalSamples,
    });
  };

  const updateReview = async (updates: Partial<KYCReview>) => {
    if (!review?.id) return;
    if (!workflowFlags.canEdit) {
      toast({
        title: 'Read Only',
        description: 'This review is finalized or locked for your role.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('kyc_reviews')
        .update(updates as any)
        .eq('id', review.id);

      if (error) throw error;

      setReview({ ...review, ...updates });
      toast({ title: 'Saved', description: 'Review updated successfully.' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!review) {
    return <div className="p-6 text-muted-foreground">Failed to load KYC Review.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KYC Review</h1>
          <p className="text-muted-foreground">
            FINTRAC-aligned KYC testing for individuals, entities, and transactions
          </p>
        </div>
      </div>

      <ModuleWorkflowBanner
        engagementId={engagementId}
        moduleKey="kyc"
        tableName="kyc_reviews"
        onLockStateChange={(state, isLocked, canEdit) => setWorkflowFlags({ isLocked, canEdit })}
      />

      <div className={cn(
        "space-y-6 transition-opacity duration-300",
        !workflowFlags.canEdit && "pointer-events-none opacity-75"
      )}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="samples" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Samples
            {stats.totalSamples > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.totalSamples}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Findings & Observations
            {stats.highIssues > 0 && (
              <Badge variant="destructive" className="ml-1">{stats.highIssues}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Individual Sampling Configuration</CardTitle>
                <CardDescription>Define sample selection methodology for individual clients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Sample Sources (select all that apply)</Label>
                  <div className="space-y-3">
                    {SAMPLE_SOURCES.map((source) => (
                      <div key={source.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`individual-${source.id}`}
                          checked={(review.individual_sample_sources || []).includes(source.id)}
                          onCheckedChange={(checked) => {
                            const current = review.individual_sample_sources || [];
                            const updated = checked
                              ? [...current, source.id]
                              : current.filter(s => s !== source.id);
                            updateReview({ individual_sample_sources: updated });
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`individual-${source.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {source.label}
                          </label>
                          <p className="text-xs text-muted-foreground">{source.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Population Size</Label>
                    <Input
                      type="number"
                      value={review.individual_population_size || ''}
                      onChange={(e) => updateReview({ individual_population_size: parseInt(e.target.value) || null })}
                      placeholder="Total population"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sample Size</Label>
                    <Input
                      type="number"
                      value={review.individual_sample_size || ''}
                      onChange={(e) => updateReview({ individual_sample_size: parseInt(e.target.value) || null })}
                      placeholder="Sample size"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Selection Rationale</Label>
                  <Textarea
                    value={review.individual_selection_rationale || ''}
                    onChange={(e) => updateReview({ individual_selection_rationale: e.target.value })}
                    placeholder="Describe the selection criteria and sampling methodology..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Sampling Configuration</CardTitle>
                <CardDescription>Define sample selection methodology for business/entity clients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Sample Sources (select all that apply)</Label>
                  <div className="space-y-3">
                    {SAMPLE_SOURCES.map((source) => (
                      <div key={source.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`business-${source.id}`}
                          checked={(review.business_sample_sources || []).includes(source.id)}
                          onCheckedChange={(checked) => {
                            const current = review.business_sample_sources || [];
                            const updated = checked
                              ? [...current, source.id]
                              : current.filter(s => s !== source.id);
                            updateReview({ business_sample_sources: updated });
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`business-${source.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {source.label}
                          </label>
                          <p className="text-xs text-muted-foreground">{source.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Population Size</Label>
                    <Input
                      type="number"
                      value={review.business_population_size || ''}
                      onChange={(e) => updateReview({ business_population_size: parseInt(e.target.value) || null })}
                      placeholder="Total population"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sample Size</Label>
                    <Input
                      type="number"
                      value={review.business_sample_size || ''}
                      onChange={(e) => updateReview({ business_sample_size: parseInt(e.target.value) || null })}
                      placeholder="Sample size"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Selection Rationale</Label>
                  <Textarea
                    value={review.business_selection_rationale || ''}
                    onChange={(e) => updateReview({ business_selection_rationale: e.target.value })}
                    placeholder="Describe the selection criteria and sampling methodology..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Testing Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.totalSamples}</div>
                    <div className="text-sm text-muted-foreground">Total Samples</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.individualCount}</div>
                    <div className="text-sm text-muted-foreground">Individuals</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold">{stats.businessCount}</div>
                    <div className="text-sm text-muted-foreground">Businesses</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold text-destructive">{stats.highIssues}</div>
                    <div className="text-sm text-muted-foreground">High Severity Findings</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="samples" className="mt-6">
          <UnifiedKYCSamples reviewId={review.id} onIssueCreated={loadStats} />
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <KYCIssuesSection reviewId={review.id} />
        </TabsContent>
      </Tabs>
      </div>

      {(() => {
        const currentIndex = KYC_TAB_ORDER.indexOf(activeTab);
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < KYC_TAB_ORDER.length - 1;
        return (
          <SectionNavigationFooter
            onPrevious={hasPrev ? () => setActiveTab(KYC_TAB_ORDER[currentIndex - 1]) : undefined}
            onNext={hasNext ? () => setActiveTab(KYC_TAB_ORDER[currentIndex + 1]) : undefined}
            previousLabel={hasPrev ? KYC_TAB_LABELS[KYC_TAB_ORDER[currentIndex - 1]] : undefined}
            nextLabel={hasNext ? KYC_TAB_LABELS[KYC_TAB_ORDER[currentIndex + 1]] : undefined}
            showPrevious={hasPrev}
            showNext={hasNext}
            showSave={false}
          />
        );
      })()}
    </div>
  );
}
