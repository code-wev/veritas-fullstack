import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Save, X } from 'lucide-react';
import { ReportSample } from './ReportTypeTesting';
import { CompletenessTest } from './tests/CompletenessTest';
import { AccuracyTest } from './tests/AccuracyTest';
import { TimelinessTest } from './tests/TimelinessTest';
import { STRDecisionReview } from './tests/STRDecisionReview';

interface ReportSampleFormProps {
  sample: ReportSample;
  reportType: string;
  onSave: (sample: Partial<ReportSample>) => void;
  onCancel: () => void;
  isNew: boolean;
}

export function ReportSampleForm({ sample, reportType, onSave, onCancel, isNew }: ReportSampleFormProps) {
  const [formData, setFormData] = useState<Partial<ReportSample>>(sample);
  const [activeTest, setActiveTest] = useState('completeness');

  useEffect(() => {
    setFormData(sample);
  }, [sample]);

  const handleChange = (field: keyof ReportSample, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report Reference ID</Label>
              <Input
                value={formData.report_reference_id || ''}
                onChange={(e) => handleChange('report_reference_id', e.target.value)}
                placeholder="e.g., LCTR-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Filing Method</Label>
              <Select
                value={formData.filing_method || 'manual'}
                onValueChange={(value) => handleChange('filing_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (PDF/Image)</SelectItem>
                  <SelectItem value="batch">Batch (JSON)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Input
                type="date"
                value={formData.transaction_date || ''}
                onChange={(e) => handleChange('transaction_date', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>FINTRAC Submission Date</Label>
              <Input
                type="date"
                value={formData.fintrac_submission_date || ''}
                onChange={(e) => handleChange('fintrac_submission_date', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction Amount</Label>
              <Input
                type="number"
                value={formData.transaction_amount || ''}
                onChange={(e) => handleChange('transaction_amount', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="10000.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Manual Notes</Label>
            <Textarea
              value={formData.manual_notes || ''}
              onChange={(e) => handleChange('manual_notes', e.target.value)}
              placeholder="Notes for manual filing review..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Testing Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTest} onValueChange={setActiveTest}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="completeness">Completeness</TabsTrigger>
              <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
              <TabsTrigger value="timeliness">Timeliness</TabsTrigger>
              {reportType === 'str' && (
                <TabsTrigger value="str-decision">STR Decision</TabsTrigger>
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
        </CardContent>
      </Card>

      {/* Deficiencies & Overall */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Deficiencies & Overall Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Deficiencies Identified</Label>
            <Textarea
              value={formData.deficiencies || ''}
              onChange={(e) => handleChange('deficiencies', e.target.value)}
              placeholder="Document any deficiencies found during testing..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Completeness Result</Label>
              <Select
                value={formData.completeness_result || 'pending'}
                onValueChange={(value) => handleChange('completeness_result', value)}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Accuracy Result</Label>
              <Select
                value={formData.accuracy_overall || 'pending'}
                onValueChange={(value) => handleChange('accuracy_overall', value)}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Timeliness Result</Label>
              <Select
                value={formData.timeliness_result || 'pending'}
                onValueChange={(value) => handleChange('timeliness_result', value)}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Overall Result</Label>
              <Select
                value={formData.overall_result || 'pending'}
                onValueChange={(value) => handleChange('overall_result', value)}
              >
                <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          {isNew ? 'Create Sample' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
