import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

interface RADocumentIntakeStepProps {
  review: {
    rba_document_name: string | null;
    rba_version: string | null;
    rba_date_approved: string | null;
    rba_approved_by: string | null;
    notes: string | null;
  };
  onUpdate: (updates: Record<string, unknown>) => void;
}

export function RADocumentIntakeStep({ review, onUpdate }: RADocumentIntakeStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Risk Assessment Document
          </CardTitle>
          <CardDescription>
            Capture the RBA document being reviewed. These details flow into the audit report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rba_document_name">Document Name / Title</Label>
              <Input
                id="rba_document_name"
                placeholder="e.g. AML/ATF Risk Assessment 2025"
                value={review.rba_document_name || ''}
                onChange={(e) => onUpdate({ rba_document_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rba_version">Version Number</Label>
              <Input
                id="rba_version"
                placeholder="e.g. v2.1"
                value={review.rba_version || ''}
                onChange={(e) => onUpdate({ rba_version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rba_date_approved">Date Approved</Label>
              <Input
                id="rba_date_approved"
                type="date"
                value={review.rba_date_approved || ''}
                onChange={(e) => onUpdate({ rba_date_approved: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rba_approved_by">Approved By</Label>
              <Input
                id="rba_approved_by"
                placeholder="e.g. Board / CCO Name"
                value={review.rba_approved_by || ''}
                onChange={(e) => onUpdate({ rba_approved_by: e.target.value })}
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
