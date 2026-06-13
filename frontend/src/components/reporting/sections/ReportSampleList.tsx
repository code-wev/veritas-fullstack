import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ReportSample } from './ReportTypeTesting';
import { cn } from '@/lib/utils';

interface ReportSampleListProps {
  samples: ReportSample[];
  selectedId?: string;
  onSelect: (sample: ReportSample) => void;
  onDelete: (id: string) => void;
}

const getResultIcon = (result: string) => {
  switch (result) {
    case 'pass':
      return <CheckCircle className="w-4 h-4 text-primary" />;
    case 'fail':
      return <XCircle className="w-4 h-4 text-destructive" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const getResultBadge = (result: string) => {
  switch (result) {
    case 'pass':
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Pass</Badge>;
    case 'fail':
      return <Badge variant="destructive">Fail</Badge>;
    case 'na':
      return <Badge variant="secondary">N/A</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

export function ReportSampleList({ samples, selectedId, onSelect, onDelete }: ReportSampleListProps) {
  if (samples.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No samples added yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-2">
        {samples.map((sample) => (
          <div
            key={sample.id}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-colors",
              selectedId === sample.id
                ? "bg-primary/5 border-primary"
                : "hover:bg-muted/50"
            )}
            onClick={() => onSelect(sample)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {sample.report_reference_id || 'Unnamed Sample'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sample.filing_method === 'batch' ? 'Batch (JSON)' : 'Manual'}
                    {sample.transaction_date && ` • ${new Date(sample.transaction_date).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getResultIcon(sample.overall_result)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(sample.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2 mt-2 flex-wrap">
              <div className="text-xs">
                <span className="text-muted-foreground">Completeness: </span>
                {getResultBadge(sample.completeness_result)}
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Accuracy: </span>
                {getResultBadge(sample.accuracy_overall)}
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Timeliness: </span>
                {getResultBadge(sample.timeliness_result)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
