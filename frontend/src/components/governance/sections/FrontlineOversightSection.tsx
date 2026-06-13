import { GovernanceInterviewForm } from '../GovernanceInterviewForm';

interface FrontlineOversightSectionProps {
  engagementId: string;
}

export function FrontlineOversightSection({ engagementId }: FrontlineOversightSectionProps) {
  return (
    <GovernanceInterviewForm
      engagementId={engagementId}
      submodule="frontline_oversight"
      title="Frontline and Customer-Facing Staff Oversight"
      description="Confirm first-line awareness, training, and escalation effectiveness"
    />
  );
}
