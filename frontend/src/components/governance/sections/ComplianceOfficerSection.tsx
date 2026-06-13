import { GovernanceInterviewForm } from '../GovernanceInterviewForm';

interface ComplianceOfficerSectionProps {
  engagementId: string;
}

export function ComplianceOfficerSection({ engagementId }: ComplianceOfficerSectionProps) {
  return (
    <GovernanceInterviewForm
      engagementId={engagementId}
      submodule="compliance_officer"
      title="Compliance Officer Governance"
      description="Assess Compliance Officer independence, authority, and continuity"
    />
  );
}
