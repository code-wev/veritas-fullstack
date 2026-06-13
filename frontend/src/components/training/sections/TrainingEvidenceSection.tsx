import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, Circle } from 'lucide-react';

interface TrainingEvidenceSectionProps {
  reviewId: string;
}

const EVIDENCE_CHECKLIST = [
  { key: 'training_policy', label: 'AML Training Policy', description: 'Documented training policy or program' },
  { key: 'training_materials', label: 'Training Materials', description: 'Slides, videos, handouts, or course content' },
  { key: 'attendance_records', label: 'Attendance Records', description: 'Sign-in sheets, LMS completion logs' },
  { key: 'assessment_results', label: 'Assessment Results', description: 'Test scores, quiz results, certifications' },
  { key: 'trainer_credentials', label: 'Third-Party Trainer Credentials', description: 'If applicable - qualifications of external trainers' },
  { key: 'training_schedule', label: 'Training Schedule', description: 'Calendar or schedule of training sessions' },
  { key: 'remediation_evidence', label: 'Remediation/Retraining Evidence', description: 'Evidence of follow-up for failed assessments' },
  { key: 'approval_evidence', label: 'Approval Evidence', description: 'Board or senior management approval of training program' },
];

export function TrainingEvidenceSection({ reviewId }: TrainingEvidenceSectionProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize all items as unchecked
    const initial: Record<string, boolean> = {};
    EVIDENCE_CHECKLIST.forEach(item => {
      initial[item.key] = false;
    });
    setCheckedItems(initial);
  }, []);

  const handleToggle = (key: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = EVIDENCE_CHECKLIST.length;
  const progress = Math.round((checkedCount / totalCount) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Section 7: Evidence Checklist</CardTitle>
            <CardDescription>
              Track required supporting documentation
            </CardDescription>
          </div>
          <Badge variant={checkedCount === totalCount ? 'default' : 'secondary'}>
            {checkedCount} / {totalCount} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Evidence collection progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-4">
          {EVIDENCE_CHECKLIST.map((item) => (
            <div
              key={item.key}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                checkedItems[item.key] ? 'bg-primary/5 border-primary/20' : 'bg-card hover:bg-muted/50'
              }`}
            >
              <Checkbox
                id={item.key}
                checked={checkedItems[item.key]}
                onCheckedChange={() => handleToggle(item.key)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={item.key}
                  className={`text-sm font-medium cursor-pointer flex items-center gap-2 ${
                    checkedItems[item.key] ? 'text-primary' : ''
                  }`}
                >
                  {checkedItems[item.key] ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  {item.label}
                </Label>
                <p className="text-sm text-muted-foreground pl-6">
                  {item.description}
                </p>
              </div>
              <FileText className={`w-5 h-5 ${checkedItems[item.key] ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Evidence Summary</h4>
          <p className="text-sm text-muted-foreground">
            {checkedCount === 0 && 'No evidence items have been collected yet.'}
            {checkedCount > 0 && checkedCount < totalCount && 
              `${checkedCount} of ${totalCount} evidence items collected. Continue gathering remaining documentation.`
            }
            {checkedCount === totalCount && 
              'All required evidence has been collected. Ready for review.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
