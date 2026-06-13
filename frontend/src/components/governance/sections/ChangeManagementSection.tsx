import { GovernanceInterviewForm } from '../GovernanceInterviewForm';

interface ChangeManagementSectionProps {
  engagementId: string;
}

export function ChangeManagementSection({ engagementId }: ChangeManagementSectionProps) {
  return (
    <GovernanceInterviewForm
      engagementId={engagementId}
      submodule="change_management"
      title="Change Management and Regulatory Escalation"
      description="Detect unreported or weakly governed changes and assess escalation controls"
    />
  );
}
