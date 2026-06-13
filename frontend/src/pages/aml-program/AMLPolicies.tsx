import { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { PoliciesProceduresReview } from '@/components/aml-program/PoliciesProceduresReview';
import { ModuleWorkflowBanner } from '@/components/layout/ModuleWorkflowBanner';
import { cn } from '@/lib/utils';

export default function AMLPolicies() {
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
        <h1 className="text-2xl font-bold text-foreground">Policies & Procedures</h1>
        <p className="text-muted-foreground mt-1">
          Review AML compliance program documentation and adequacy
        </p>
      </div>

      <ModuleWorkflowBanner
        engagementId={selectedEngagement.id}
        moduleKey="aml_program"
        tableName="aml_program_reviews"
        onLockStateChange={(state, isLocked, canEdit) => setWorkflowFlags({ isLocked, canEdit })}
      />

      <div className={cn(
        "space-y-6 transition-opacity duration-300",
        !workflowFlags.canEdit && "pointer-events-none opacity-75"
      )}>
        <PoliciesProceduresReview engagementId={selectedEngagement.id} />
      </div>
    </div>
  );
}
