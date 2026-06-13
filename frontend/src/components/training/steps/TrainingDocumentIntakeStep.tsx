import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

interface TrainingDocumentIntakeStepProps {
  review: {
    training_document_name: string | null;
    training_version: string | null;
    training_date_approved: string | null;
    training_approved_by: string | null;
    notes: string | null;
  };
  onUpdate: (updates: Record<string, unknown>) => void;
}

export function TrainingDocumentIntakeStep({ review, onUpdate }: TrainingDocumentIntakeStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Training Program Document
          </CardTitle>
          <CardDescription>
            Capture the training policy / program document being reviewed. These details flow into the audit report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="training_document_name">Document Name / Title</Label>
              <Input
                id="training_document_name"
                placeholder="e.g. AML Training Policy & Plan 2025"
                value={review.training_document_name || ''}
                onChange={(e) => onUpdate({ training_document_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training_version">Version Number</Label>
              <Input
                id="training_version"
                placeholder="e.g. v1.3"
                value={review.training_version || ''}
                onChange={(e) => onUpdate({ training_version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training_date_approved">Date Approved</Label>
              <Input
                id="training_date_approved"
                type="date"
                value={review.training_date_approved || ''}
                onChange={(e) => onUpdate({ training_date_approved: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training_approved_by">Approved By</Label>
              <Input
                id="training_approved_by"
                placeholder="e.g. CCO / Senior Management"
                value={review.training_approved_by || ''}
                onChange={(e) => onUpdate({ training_approved_by: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Intake Notes</Label>
            <Textarea
              id="notes"
              placeholder="Context about the document, scope of review, anything notable..."
              value={review.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
