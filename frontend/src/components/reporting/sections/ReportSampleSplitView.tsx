import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ReportSample } from './ReportTypeTesting';
import { ReportPreviewPanel } from './ReportPreviewPanel';
import { ReportTestingPanel } from './ReportTestingPanel';

interface ReportSampleSplitViewProps {
  sample: ReportSample;
  reportType: string;
  onSave: (sample: Partial<ReportSample>) => void;
  onCancel: () => void;
  isNew: boolean;
}

export function ReportSampleSplitView({ 
  sample, 
  reportType, 
  onSave, 
  onCancel, 
  isNew 
}: ReportSampleSplitViewProps) {
  return (
    <div className="h-[calc(100vh-300px)] min-h-[600px] border rounded-lg overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel - Report Preview */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <ReportPreviewPanel sample={sample} reportType={reportType} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Testing Form */}
        <ResizablePanel defaultSize={55} minSize={35}>
          <ReportTestingPanel
            sample={sample}
            reportType={reportType}
            onSave={onSave}
            onCancel={onCancel}
            isNew={isNew}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
