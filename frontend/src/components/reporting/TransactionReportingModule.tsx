import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ReportTypeTesting } from './sections/ReportTypeTesting';
import { ReportingGovernance } from './sections/ReportingGovernance';
import { ReportingFindings } from './sections/ReportingFindings';
import { ReportingResults } from './sections/ReportingResults';
import { SectionNavigationFooter } from '@/components/ui/section-navigation-footer';
import { ModuleWorkflowBanner } from '@/components/layout/ModuleWorkflowBanner';
import { cn } from '@/lib/utils';

const REPORT_TAB_ORDER = ['lctr', 'eftr', 'str', 'lvctr', 'lpepr', 'governance', 'findings', 'results'];
const REPORT_TAB_LABELS: Record<string, string> = {
  'lctr': 'LCTR',
  'eftr': 'EFTR',
  'str': 'STR',
  'lvctr': 'LVCTR',
  'lpepr': 'LPEPR',
  'governance': 'Controls',
  'findings': 'Findings',
  'results': 'Results',
};

interface TransactionReportingModuleProps {
  engagementId: string;
}

export interface ReportingReview {
  id: string;
  engagement_id: string;
  status: string;
  review_period_start: string | null;
  review_period_end: string | null;
  reviewer_name: string | null;
  notes: string | null;
}

export function TransactionReportingModule({ engagementId }: TransactionReportingModuleProps) {
  const [review, setReview] = useState<ReportingReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lctr');
  const { toast } = useToast();
  
  const [workflowFlags, setWorkflowFlags] = useState({ isLocked: false, canEdit: true });

  const handlePrintSection = () => {
    document.body.classList.add('printing-section');
    const cleanup = () => document.body.classList.remove('printing-section');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  };

  useEffect(() => {
    fetchOrCreateReview();
  }, [engagementId]);

  const fetchOrCreateReview = async () => {
    try {
      // Try to fetch existing review
      const { data: existingReview, error: fetchError } = await supabase
        .from('reporting_reviews')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingReview) {
        setReview(existingReview);
      } else {
        // Create new review
        const { data: newReview, error: createError } = await supabase
          .from('reporting_reviews')
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Unable to load reporting review.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 print-section-hide">
        <div>
          <h1 className="text-2xl font-semibold">Transaction Reporting Review</h1>
          <p className="text-muted-foreground mt-1">
            Test completeness, accuracy, and timeliness of FINTRAC reportable transactions
          </p>
        </div>
        <Button variant="outline" onClick={handlePrintSection}>
          <Printer className="h-4 w-4 mr-2" />
          Print Section
        </Button>
      </div>

      <ModuleWorkflowBanner
        engagementId={engagementId}
        moduleKey="reporting"
        tableName="reporting_reviews"
        onLockStateChange={(state, isLocked, canEdit) => setWorkflowFlags({ isLocked, canEdit })}
      />

      <div className={cn(
        "space-y-6 transition-opacity duration-300",
        !workflowFlags.canEdit && "pointer-events-none opacity-75"
      )}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-8 w-full max-w-5xl print-section-hide">
            <TabsTrigger value="lctr">LCTR</TabsTrigger>
            <TabsTrigger value="eftr">EFTR</TabsTrigger>
            <TabsTrigger value="str">STR</TabsTrigger>
            <TabsTrigger value="lvctr">LVCTR</TabsTrigger>
            <TabsTrigger value="lpepr">LPEPR</TabsTrigger>
            <TabsTrigger value="governance">Controls</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="lctr" className="mt-6 print-section-active">
            <ReportTypeTesting 
              reviewId={review.id} 
              engagementId={engagementId}
              reportType="lctr" 
              title="Large Cash Transaction Reports (LCTR)"
              description="Cash transactions of $10,000 or more"
            />
          </TabsContent>

          <TabsContent value="eftr" className="mt-6 print-section-active">
            <ReportTypeTesting 
              reviewId={review.id} 
              engagementId={engagementId}
              reportType="eftr" 
              title="Electronic Funds Transfer Reports (EFTR)"
              description="International EFTs of $10,000 or more"
            />
          </TabsContent>

          <TabsContent value="str" className="mt-6 print-section-active">
            <ReportTypeTesting 
              reviewId={review.id} 
              engagementId={engagementId}
              reportType="str" 
              title="Suspicious Transaction Reports (STR)"
              description="Transactions where reasonable grounds to suspect ML/TF"
            />
          </TabsContent>

          <TabsContent value="lvctr" className="mt-6 print-section-active">
            <ReportTypeTesting 
              reviewId={review.id} 
              engagementId={engagementId}
              reportType="lvctr" 
              title="Large Virtual Currency Transaction Reports (LVCTR)"
              description="Virtual currency transactions of $10,000 or more"
            />
          </TabsContent>

          <TabsContent value="lpepr" className="mt-6 print-section-active">
            <ReportTypeTesting 
              reviewId={review.id} 
              engagementId={engagementId}
              reportType="lpepr" 
              title="Listed Person/Entity Property Reports (LPEPR)"
              description="Property/transactions involving listed persons or entities"
            />
          </TabsContent>

          <TabsContent value="governance" className="mt-6 print-section-active">
            <ReportingGovernance reviewId={review.id} />
          </TabsContent>

          <TabsContent value="findings" className="mt-6 print-section-active">
            <ReportingFindings reviewId={review.id} engagementId={engagementId} />
          </TabsContent>

          <TabsContent value="results" className="mt-6 print-section-active">
            <ReportingResults reviewId={review.id} engagementId={engagementId} />
          </TabsContent>
        </Tabs>
      </div>

      {(() => {
        const currentIndex = REPORT_TAB_ORDER.indexOf(activeTab);
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < REPORT_TAB_ORDER.length - 1;
        return (
          <SectionNavigationFooter
            onPrevious={hasPrev ? () => setActiveTab(REPORT_TAB_ORDER[currentIndex - 1]) : undefined}
            onNext={hasNext ? () => setActiveTab(REPORT_TAB_ORDER[currentIndex + 1]) : undefined}
            previousLabel={hasPrev ? REPORT_TAB_LABELS[REPORT_TAB_ORDER[currentIndex - 1]] : undefined}
            nextLabel={hasNext ? REPORT_TAB_LABELS[REPORT_TAB_ORDER[currentIndex + 1]] : undefined}
            showPrevious={hasPrev}
            showNext={hasNext}
            showSave={false}
          />
        );
      })()}
    </div>
  );
}
