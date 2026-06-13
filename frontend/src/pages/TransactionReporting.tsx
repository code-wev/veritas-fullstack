import { useApp } from '@/contexts/AppContext';
import { TransactionReportingModule } from '@/components/reporting/TransactionReportingModule';

export default function TransactionReporting() {
  const { selectedEngagement } = useApp();

  if (!selectedEngagement) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select an engagement to begin Transaction Reporting Review.</p>
      </div>
    );
  }

  return <TransactionReportingModule engagementId={selectedEngagement.id} />;
}
