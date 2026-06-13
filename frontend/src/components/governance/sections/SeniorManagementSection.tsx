import { GovernanceInterviewForm } from '../GovernanceInterviewForm';

interface SeniorManagementSectionProps {
  engagementId: string;
}

export function SeniorManagementSection({ engagementId }: SeniorManagementSectionProps) {
  return (
    <GovernanceInterviewForm
      engagementId={engagementId}
      submodule="senior_management"
      title="Senior Management Oversight"
      description="Confirm management accountability, resource allocation, and AML support"
    />
  );
}
