import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { FileText, AlertTriangle, CheckCircle, FileCheck, Loader2 } from 'lucide-react';

interface SummaryStepProps {
  ppReview: {
    id: string;
    document_names: string[];
    approval_present: string | null;
    version_control_present: string | null;
    overall_design_rating: string | null;
    summary_narrative: string | null;
    status: string;
  };
  autoFlags: Array<{ question: string; reason: string; severity: string }>;
  onUpdate: (updates: any) => Promise<void>;
}

export function SummaryStep({ ppReview, autoFlags, onUpdate }: SummaryStepProps) {
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(ppReview.overall_design_rating || '');
  const [narrative, setNarrative] = useState(ppReview.summary_narrative || '');

  const generateSummary = () => {
    const docs = ppReview.document_names?.filter(d => d.trim()).join(', ') || 'No documents specified';
    const approvalStatus = ppReview.approval_present === 'yes' 
      ? 'Approval evidence was provided'
      : ppReview.approval_present === 'partial'
      ? 'Partial approval evidence was provided'
      : 'No approval evidence was provided';
    const versionStatus = ppReview.version_control_present === 'yes'
      ? 'Version control is documented'
      : ppReview.version_control_present === 'partial'
      ? 'Partial version control is documented'
      : 'Version control is not documented';

    const flagsSummary = autoFlags.length > 0
      ? `\n\nKey Gaps Identified:\n${autoFlags.map(f => `• ${f.reason}`).join('\n')}`
      : '\n\nNo significant gaps were identified in the core control checklist.';

    const template = `Documents Reviewed:
${docs}

Document Governance:
• ${approvalStatus}
• ${versionStatus}
${flagsSummary}

Conclusion:
Based on our review of the AML policies and procedures, the program design is assessed as [RATING]. ${
      autoFlags.length > 0
        ? 'Management should address the identified gaps to strengthen the AML compliance framework.'
        : 'The policies and procedures adequately address the core AML program requirements.'
    }`;

    setNarrative(template);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        overall_design_rating: rating || null,
        summary_narrative: narrative || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    if (!rating) {
      return;
    }
    setSaving(true);
    try {
      await onUpdate({
        overall_design_rating: rating,
        summary_narrative: narrative || null,
        status: 'ready_for_review',
      });
    } finally {
      setSaving(false);
    }
  };

  const highSeverityFlags = autoFlags.filter(f => f.severity === 'high').length;
  const mediumSeverityFlags = autoFlags.filter(f => f.severity === 'medium').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {ppReview.document_names?.filter(d => d.trim()).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Documents Reviewed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {ppReview.approval_present === 'yes' ? 'Yes' : ppReview.approval_present === 'partial' ? 'Partial' : 'No'}
                </p>
                <p className="text-sm text-muted-foreground">Approval Evidence</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{highSeverityFlags}</p>
                <p className="text-sm text-muted-foreground">High Severity Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{mediumSeverityFlags}</p>
                <p className="text-sm text-muted-foreground">Medium Severity Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flags Summary */}
      {autoFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Identified Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {autoFlags.map((flag, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <span className="text-sm">{flag.reason}</span>
                  <Badge
                    variant={flag.severity === 'high' ? 'destructive' : 'default'}
                  >
                    {flag.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating and Narrative */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Step 5: Summary for Audit Report
          </CardTitle>
          <CardDescription>
            Provide an overall assessment and narrative summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Rating */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Overall Design Rating *</Label>
            <RadioGroup
              value={rating}
              onValueChange={setRating}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="effective" id="rating-effective" />
                <Label htmlFor="rating-effective" className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Effective
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="needs_improvement" id="rating-needs" />
                <Label htmlFor="rating-needs" className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Needs Improvement
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ineffective" id="rating-ineffective" />
                <Label htmlFor="rating-ineffective" className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Ineffective
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Narrative */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Summary Narrative</Label>
              <Button variant="outline" size="sm" onClick={generateSummary}>
                Generate Template
              </Button>
            </div>
            <Textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Enter summary narrative for the audit report..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <div className="flex items-center gap-2">
              <Badge variant={ppReview.status === 'ready_for_review' ? 'default' : 'secondary'}>
                Status: {ppReview.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Draft'
                )}
              </Button>
              <Button
                onClick={handleMarkReady}
                disabled={saving || !rating || ppReview.status === 'ready_for_review'}
              >
                Mark Ready for Review
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
