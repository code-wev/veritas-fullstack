import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, ListChecks, AlertTriangle, FileCheck } from 'lucide-react';
import { SectionNavigationFooter } from '@/components/ui/section-navigation-footer';
import { TrainingDocumentIntakeStep } from './steps/TrainingDocumentIntakeStep';
import { TrainingChecklistStep } from './steps/TrainingChecklistStep';
import { TrainingAutoFindingsStep } from './steps/TrainingAutoFindingsStep';
import { TrainingSummaryStep } from './steps/TrainingSummaryStep';

interface TrainingProgramReviewProps {
  engagementId: string;
}

interface Review {
  id: string;
  engagement_id: string;
  status: string;
  current_step: number | null;
  training_document_name: string | null;
  training_version: string | null;
  training_date_approved: string | null;
  training_approved_by: string | null;
  notes: string | null;
  overall_assessment: string | null;
  summary_for_report: string | null;
}

const STEPS = [
  { id: 1, name: 'Document Intake', icon: FileText, description: 'Capture the training policy / program document being reviewed.' },
  { id: 2, name: 'Training Checklist', icon: ListChecks, description: 'Complete the FINTRAC-aligned training checklist (3 sections, 26 questions).' },
  { id: 3, name: 'Auto Findings', icon: AlertTriangle, description: 'Review deficiencies and add manual observations.' },
  { id: 4, name: 'Summary', icon: FileCheck, description: 'Conclude the review and prepare audit-report narrative.' },
];

export function TrainingProgramReview({ engagementId }: TrainingProgramReviewProps) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    void loadOrCreateReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  const loadOrCreateReview = async () => {
    setLoading(true);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('training_reviews')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) {
        setReview(existing as unknown as Review);
      } else {
        const { data: created, error: createError } = await supabase
          .from('training_reviews')
          .insert({ engagement_id: engagementId, status: 'draft', current_step: 1 })
          .select()
          .single();
        if (createError) throw createError;
        setReview(created as unknown as Review);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load Training review', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (updates: Partial<Review>) => {
    if (!review) return;
    setReview({ ...review, ...updates });
    const { error } = await supabase
      .from('training_reviews')
      .update(updates)
      .eq('id', review.id);
    if (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    }
  };

  const goToStep = (step: number) => {
    if (step < 1 || step > STEPS.length) return;
    void updateReview({ current_step: step });
  };

  if (loading || !review) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  const currentStep = review.current_step ?? 1;
  const currentStepConfig = STEPS.find((s) => s.id === currentStep) ?? STEPS[0];
  const progress = (currentStep / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <TrainingDocumentIntakeStep review={review} onUpdate={updateReview} />;
      case 2:
        return <TrainingChecklistStep reviewId={review.id} />;
      case 3:
        return <TrainingAutoFindingsStep reviewId={review.id} engagementId={engagementId} />;
      case 4:
        return <TrainingSummaryStep reviewId={review.id} review={review} onUpdate={updateReview} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant={review.status === 'completed' ? 'default' : 'outline'}>{review.status}</Badge>
            <span className="text-xs text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s) => (
          <Button
            key={s.id}
            variant={s.id === currentStep ? 'default' : 'ghost'}
            size="sm"
            className="flex items-center gap-2 whitespace-nowrap"
            onClick={() => goToStep(s.id)}
          >
            <s.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{s.id}. {s.name}</span>
            <span className="sm:hidden">{s.id}</span>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <currentStepConfig.icon className="w-5 h-5" />
            Step {currentStep}: {currentStepConfig.name}
          </CardTitle>
          <CardDescription>{currentStepConfig.description}</CardDescription>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      <SectionNavigationFooter
        onPrevious={currentStep > 1 ? () => goToStep(currentStep - 1) : undefined}
        onNext={currentStep < STEPS.length ? () => goToStep(currentStep + 1) : undefined}
        previousLabel={currentStep > 1 ? STEPS[currentStep - 2].name : undefined}
        nextLabel={currentStep < STEPS.length ? STEPS[currentStep].name : undefined}
        showPrevious={currentStep > 1}
        showNext={currentStep < STEPS.length}
        showSave={false}
      />
    </div>
  );
}
