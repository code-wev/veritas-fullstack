import { GovernanceInterviewForm } from '../GovernanceInterviewForm';

interface BoardOversightSectionProps {
  engagementId: string;
}

export function BoardOversightSection({ engagementId }: BoardOversightSectionProps) {
  return (
    <GovernanceInterviewForm
      engagementId={engagementId}
      submodule="board_oversight"
      title="Board of Directors Oversight"
      description="Assess tone at the top, Board accountability, and AML oversight effectiveness"
    />
  );
}
