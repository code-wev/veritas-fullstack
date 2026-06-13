import { useApp } from '@/contexts/AppContext';
import { KYCReviewModule } from '@/components/kyc/KYCReviewModule';

export default function KYCReview() {
  const { selectedEngagement } = useApp();

  if (!selectedEngagement) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select an engagement to begin KYC Review.</p>
      </div>
    );
  }

  return <KYCReviewModule engagementId={selectedEngagement.id} />;
}
