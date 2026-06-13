import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { EffectivenessReview } from '@/components/effectiveness/EffectivenessReview';
import { ModuleWorkflowBanner } from '@/components/layout/ModuleWorkflowBanner';
import { cn } from '@/lib/utils';

export default function AMLEffectiveness() {
  const { selectedEngagement } = useApp();
  const [workflowFlags, setWorkflowFlags] = useState({ isLocked: false, canEdit: true });

  if (!selectedEngagement) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Engagement Selected</CardTitle>
            <CardDescription>
              Please select a client and engagement from the top navigation to begin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prescribed Timeline</h1>
        <p className="text-muted-foreground mt-1">
          Two-year effectiveness review: an evaluation conducted at least every 2 years to test the effectiveness of your compliance program (policies and procedures, risk assessment, and ongoing training program and plan). The new review must start no later than 24 months from the start of the previous review, and the previous review must be completed before the next one begins.
        </p>
      </div>

      <ModuleWorkflowBanner
        engagementId={selectedEngagement.id}
        moduleKey="effectiveness"
        tableName="effectiveness_reviews"
        onLockStateChange={(state, isLocked, canEdit) => setWorkflowFlags({ isLocked, canEdit })}
      />

      <div className={cn(
        "space-y-6 transition-opacity duration-300",
        !workflowFlags.canEdit && "pointer-events-none opacity-75"
      )}>
        <EffectivenessReview engagementId={selectedEngagement.id} />
      </div>
    </div>
  );
}
