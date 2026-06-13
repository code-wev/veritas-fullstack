import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { TransactionMonitoringModule } from '@/components/transaction-monitoring/TransactionMonitoringModule';
import { useParams } from 'react-router-dom';
import type { SubmoduleKey } from '@/components/transaction-monitoring/checklistTemplates';
import { ModuleWorkflowBanner } from '@/components/layout/ModuleWorkflowBanner';
import { cn } from '@/lib/utils';

const SLUG_TO_SUBMODULE: Record<string, SubmoduleKey> = {
  screening: 'sanctions_screening',
  alerts: 'alert_review',
  edd: 'edd',
  'risk-recalc': 'risk_recalc',
  'fintrac-remediation': 'fintrac_remediation',
  'prior-review-remediation': 'prior_review_remediation',
};

export default function TransactionMonitoring() {
  const { selectedEngagement } = useApp();
  const { submodule } = useParams<{ submodule?: string }>();
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

  const initialSubmodule = submodule ? SLUG_TO_SUBMODULE[submodule] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transaction Monitoring</h1>
        <p className="text-muted-foreground mt-1">
          Sanctions/PEP/HIO/adverse-media screening, alert review, high-risk EDD testing,
          risk-rating recalculation, and remediation tracking for FINTRAC and prior AML reviews.
        </p>
      </div>

      <ModuleWorkflowBanner
        engagementId={selectedEngagement.id}
        moduleKey="monitoring"
        tableName="tm_reviews"
        onLockStateChange={(state, isLocked, canEdit) => setWorkflowFlags({ isLocked, canEdit })}
      />

      <div className={cn(
        "space-y-6 transition-opacity duration-300",
        !workflowFlags.canEdit && "pointer-events-none opacity-75"
      )}>
        <TransactionMonitoringModule
          engagementId={selectedEngagement.id}
          initialSubmodule={initialSubmodule}
        />
      </div>
    </div>
  );
}

