import { useApp } from '@/contexts/AppContext';
import { AuditReportModule } from '@/components/audit-report/AuditReportModule';

export default function AuditReport() {
  const { selectedEngagement } = useApp();

  if (!selectedEngagement) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select an engagement to generate the Audit Report.</p>
      </div>
    );
  }

  return <AuditReportModule engagementId={selectedEngagement.id} />;
}
