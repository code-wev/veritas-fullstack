import { GovernanceInterviewForm } from '../GovernanceInterviewForm';

interface ComplianceFunctionSectionProps {
  engagementId: string;
}

export function ComplianceFunctionSection({ engagementId }: ComplianceFunctionSectionProps) {
  return (
    <GovernanceInterviewForm
      engagementId={engagementId}
      submodule="compliance_function"
      title="Compliance Function and Resourcing"
      description="Determine whether compliance capacity matches organizational risk"
    />
  );
}
