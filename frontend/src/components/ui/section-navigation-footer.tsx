import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';

interface SectionNavigationFooterProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  previousLabel?: string;
  nextLabel?: string;
  saveLabel?: string;
  isSaving?: boolean;
  showPrevious?: boolean;
  showNext?: boolean;
  showSave?: boolean;
}

export function SectionNavigationFooter({
  onPrevious,
  onNext,
  onSave,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  saveLabel = 'Save Changes',
  isSaving = false,
  showPrevious = true,
  showNext = true,
  showSave = true,
}: SectionNavigationFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 bg-background border-t mt-6 py-4 flex items-center justify-between print-section-hide">
      <div>
        {showPrevious && onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {previousLabel}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showSave && onSave && (
          <Button onClick={onSave} disabled={isSaving} variant="default">
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : saveLabel}
          </Button>
        )}
        {showNext && onNext && (
          <Button onClick={onNext}>
            {nextLabel}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
