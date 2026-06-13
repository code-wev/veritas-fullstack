import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Save, X, CheckCircle2, XCircle, MinusCircle, Clock } from 'lucide-react';
import { ReportSample } from './ReportTypeTesting';
import { CompletenessTest } from './tests/CompletenessTest';
import { AccuracyTest } from './tests/AccuracyTest';
import { TimelinessTest } from './tests/TimelinessTest';
import { STRDecisionReview } from './tests/STRDecisionReview';

interface ReportTestingPanelProps {
  sample: ReportSample;
  reportType: string;
  onSave: (sample: Partial<ReportSample>) => void;
  onCancel: () => void;
  isNew: boolean;
}

const getResultIcon = (result: string) => {
  switch (result) {
    case 'pass':
      return <CheckCircle2 className="w-4 h-4 text-primary" />;
    case 'fail':
      return <XCircle className="w-4 h-4 text-destructive" />;
    case 'na':
      return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
    default:
      return <Clock className="w-4 h-4 text-accent-foreground" />;
  }
};

const getResultBadge = (result: string) => {
  switch (result) {
    case 'pass':
      return <Badge variant="default">Pass</Badge>;
    case 'fail':
      return <Badge variant="destructive">Fail</Badge>;
    case 'na':
      return <Badge variant="secondary">N/A</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

export function ReportTestingPanel({ sample, reportType, onSave, onCancel, isNew }: ReportTestingPanelProps) {
  const [formData, setFormData] = useState<Partial<ReportSample>>(sample);
  const [activeTest, setActiveTest] = useState('completeness');

  useEffect(() => {
    setFormData(sample);
  }, [sample]);

  const handleChange = (field: keyof ReportSample, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      if (field === 'is_aggregated') {
        next.txn_aggregation_indicator = value === true;
        next.txn_aggregation_type = value === true ? Boolean(next.aggregation_type) : null;
        next.txn_aggregation_period_start = value === true ? Boolean(next.aggregation_period_start) : null;
        next.txn_aggregation_period_end = value === true ? Boolean(next.aggregation_period_end) : null;
      }

      if (field === 'aggregation_type') {
        next.is_aggregated = Boolean(value) || Boolean(next.aggregation_period_start) || Boolean(next.aggregation_period_end);
        next.txn_aggregation_indicator = next.is_aggregated ? true : null;
        next.txn_aggregation_type = next.is_aggregated ? Boolean(value) : null;
      }

      if (field === 'aggregation_period_start') {
        next.is_aggregated = Boolean(next.aggregation_type) || Boolean(value) || Boolean(next.aggregation_period_end);
        next.txn_aggregation_indicator = next.is_aggregated ? true : null;
        next.txn_aggregation_period_start = next.is_aggregated ? Boolean(value) : null;
      }

      if (field === 'aggregation_period_end') {
        next.is_aggregated = Boolean(next.aggregation_type) || Boolean(next.aggregation_period_start) || Boolean(value);
        next.txn_aggregation_indicator = next.is_aggregated ? true : null;
        next.txn_aggregation_period_end = next.is_aggregated ? Boolean(value) : null;
      }

      return next;
    });
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Testing Checklist</h3>
            <p className="text-xs text-muted-foreground">
              {sample.report_reference_id || 'New Sample'} • {reportType.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getResultBadge(formData.overall_result || 'pending')}
          </div>
        </div>
      </div>

      {/* Test Results Summary Bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            {getResultIcon(formData.completeness_result || 'pending')}
            <span>Completeness</span>
          </div>
          <div className="flex items-center gap-1">
            {getResultIcon(formData.accuracy_overall || 'pending')}
            <span>Accuracy</span>
          </div>
          <div className="flex items-center gap-1">
            {getResultIcon(formData.timeliness_result || 'pending')}
            <span>Timeliness</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">24-hour Aggregation Details</Label>
                <p className="text-xs text-muted-foreground">Capture aggregation type and exact period boundaries from the report.</p>
              </div>
              <Select
                value={formData.is_aggregated ? 'yes' : 'no'}
                onValueChange={(value) => handleChange('is_aggregated', value === 'yes')}
              >
                <SelectTrigger className="h-9 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Aggregation Type</Label>
                <Input
                  value={formData.aggregation_type || ''}
                  onChange={(e) => handleChange('aggregation_type', e.target.value || null)}
                  placeholder="Type/code"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Period Start</Label>
                <Input
                  type="datetime-local"
                  step="1"
                  value={formData.aggregation_period_start?.slice(0, 19) || ''}
                  onChange={(e) => handleChange('aggregation_period_start', e.target.value || null)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Period End</Label>
                <Input
                  type="datetime-local"
                  step="1"
                  value={formData.aggregation_period_end?.slice(0, 19) || ''}
                  onChange={(e) => handleChange('aggregation_period_end', e.target.value || null)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Testing Tabs */}
          <div className="testing-tabs">
          <Tabs value={activeTest} onValueChange={setActiveTest}>
            <TabsList className={`grid w-full ${reportType === 'str' ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="completeness" className="text-xs">
                Completeness
              </TabsTrigger>
              <TabsTrigger value="accuracy" className="text-xs">
                Accuracy
              </TabsTrigger>
              <TabsTrigger value="timeliness" className="text-xs">
                Timeliness
              </TabsTrigger>
              {reportType === 'str' && (
                <TabsTrigger value="str-decision" className="text-xs">
                  STR Decision
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="completeness" className="mt-4">
              <CompletenessTest
                formData={formData}
                reportType={reportType}
                onChange={handleChange}
              />
            </TabsContent>

            <TabsContent value="accuracy" className="mt-4">
              <AccuracyTest
                formData={formData}
                onChange={handleChange}
              />
            </TabsContent>

            <TabsContent value="timeliness" className="mt-4">
              <TimelinessTest
                formData={formData}
                reportType={reportType}
                onChange={handleChange}
              />
            </TabsContent>

            {reportType === 'str' && (
              <TabsContent value="str-decision" className="mt-4">
                <STRDecisionReview
                  formData={formData}
                  onChange={handleChange}
                />
              </TabsContent>
            )}
          </Tabs>
          </div>

          <div className="section-print-only space-y-6">
            <section className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-2">Completeness</h4>
              <CompletenessTest formData={formData} reportType={reportType} onChange={handleChange} />
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-2">Accuracy</h4>
              <AccuracyTest formData={formData} onChange={handleChange} />
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-2">Timeliness</h4>
              <TimelinessTest formData={formData} reportType={reportType} onChange={handleChange} />
            </section>

            {reportType === 'str' && (
              <section className="space-y-3">
                <h4 className="text-sm font-semibold border-b pb-2">STR Decision</h4>
                <STRDecisionReview formData={formData} onChange={handleChange} />
              </section>
            )}
          </div>

          {/* Deficiencies & Overall Result */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Deficiencies Identified</Label>
              <Textarea
                value={formData.deficiencies || ''}
                onChange={(e) => handleChange('deficiencies', e.target.value)}
                placeholder="Document any deficiencies found during testing..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Completeness Result</Label>
                <Select
                  value={formData.completeness_result || 'pending'}
                  onValueChange={(value) => handleChange('completeness_result', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Accuracy Result</Label>
                <Select
                  value={formData.accuracy_overall || 'pending'}
                  onValueChange={(value) => handleChange('accuracy_overall', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Timeliness Result</Label>
                <Select
                  value={formData.timeliness_result || 'pending'}
                  onValueChange={(value) => handleChange('timeliness_result', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Overall Result</Label>
                <Select
                  value={formData.overall_result || 'pending'}
                  onValueChange={(value) => handleChange('overall_result', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex-shrink-0 px-4 py-3 border-t bg-muted/30 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="w-4 h-4 mr-1" />
          {isNew ? 'Create' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
