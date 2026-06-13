import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ReportContext } from '@/lib/reportPlaceholders';

interface ReportCoverPageProps {
  report: any;
  reportContext: ReportContext;
}

export function ReportCoverPage({ report, reportContext }: ReportCoverPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    report_title: report.report_title || 'AML/ATF COMPLIANCE REVIEW & EFFECTIVENESS TESTING: A REPORT',
    draft_report_date: report.draft_report_date || '',
    final_report_date: report.final_report_date || '',
    prepared_for_name: report.prepared_for_name || '',
    prepared_for_title: report.prepared_for_title || '',
    prepared_for_company: report.prepared_for_company || '',
    prepared_for_address: report.prepared_for_address || '',
    prepared_by_company: report.prepared_by_company || '',
    prepared_by_address: report.prepared_by_address || '',
    prepared_by_contact: report.prepared_by_contact || '',
    lead_reviewer_name: report.lead_reviewer_name || '',
    lead_reviewer_credentials: report.lead_reviewer_credentials || '',
  });

  // Auto-populate empty fields from context on first load
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      prepared_for_company: prev.prepared_for_company || reportContext.clientName || '',
      prepared_for_address: prev.prepared_for_address || reportContext.businessAddress || '',
    }));
  }, [reportContext.clientName, reportContext.businessAddress]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('audit_reports')
        .update(data)
        .eq('id', report.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report'] });
      toast({ title: 'Cover page saved' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (showPreview) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowPreview(false)}>
          ← Back to Edit
        </Button>
        
        <div className="bg-white text-black p-12 rounded-lg shadow-lg max-w-4xl mx-auto" style={{ minHeight: '800px' }}>
          <div className="text-center space-y-8">
            <p className="text-sm tracking-widest text-gray-600">PRIVATE & CONFIDENTIAL</p>
            
            <div className="space-y-4 mt-16">
              <h1 className="text-2xl font-bold tracking-wide">{formData.report_title}</h1>
              <h2 className="text-xl">REPORT FOR {formData.prepared_for_company?.toUpperCase()}</h2>
            </div>

            <div className="space-y-2 mt-12">
              {formData.draft_report_date && (
                <p className="text-sm">DRAFT REPORT DATED: {format(new Date(formData.draft_report_date), 'MMMM d, yyyy').toUpperCase()}</p>
              )}
              {formData.final_report_date && (
                <p className="text-sm">FINAL REPORT DATED: {format(new Date(formData.final_report_date), 'MMMM d, yyyy').toUpperCase()}</p>
              )}
            </div>

            <div className="mt-24 text-left space-y-8">
              <div>
                <p className="text-sm text-gray-600 mb-2">PREPARED FOR:</p>
                <p className="font-semibold">{formData.prepared_for_name}</p>
                <p>{formData.prepared_for_title}</p>
                <p className="whitespace-pre-line text-sm mt-2">{formData.prepared_for_address}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">PREPARED BY:</p>
                <p className="font-semibold">{formData.prepared_by_company}</p>
                <p className="whitespace-pre-line text-sm">{formData.prepared_by_address}</p>
                <p className="text-sm mt-2">{formData.prepared_by_contact}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>Fields are auto-populated from client and engagement data. All fields remain editable.</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Cover Page
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Report Title */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Report Title</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={formData.report_title}
              onChange={(e) => setFormData({ ...formData, report_title: e.target.value })}
              placeholder="AML/ATF COMPLIANCE REVIEW & EFFECTIVENESS TESTING: A REPORT"
            />
          </CardContent>
        </Card>

        {/* Report Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Draft Report Date</Label>
              <Input
                type="date"
                value={formData.draft_report_date}
                onChange={(e) => setFormData({ ...formData, draft_report_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Final Report Date</Label>
              <Input
                type="date"
                value={formData.final_report_date}
                onChange={(e) => setFormData({ ...formData, final_report_date: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prepared For */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prepared For</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Recipient Name</Label>
              <Input
                value={formData.prepared_for_name}
                onChange={(e) => setFormData({ ...formData, prepared_for_name: e.target.value })}
                placeholder="e.g., Matt Shovein"
              />
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={formData.prepared_for_title}
                onChange={(e) => setFormData({ ...formData, prepared_for_title: e.target.value })}
                placeholder="e.g., Group Head of Compliance"
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={formData.prepared_for_company}
                onChange={(e) => setFormData({ ...formData, prepared_for_company: e.target.value })}
                placeholder="e.g., MoneyMaple Tech Ltd."
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.prepared_for_address}
                onChange={(e) => setFormData({ ...formData, prepared_for_address: e.target.value })}
                placeholder="Full address..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prepared By */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Prepared By</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.prepared_by_company}
                    onChange={(e) => setFormData({ ...formData, prepared_by_company: e.target.value })}
                    placeholder="e.g., C&G Professional Services Inc."
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={formData.prepared_by_address}
                    onChange={(e) => setFormData({ ...formData, prepared_by_address: e.target.value })}
                    placeholder="Full address..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Contact Information</Label>
                  <Input
                    value={formData.prepared_by_contact}
                    onChange={(e) => setFormData({ ...formData, prepared_by_contact: e.target.value })}
                    placeholder="Email, phone, website..."
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Lead Reviewer Name</Label>
                  <Input
                    value={formData.lead_reviewer_name}
                    onChange={(e) => setFormData({ ...formData, lead_reviewer_name: e.target.value })}
                    placeholder="e.g., Claudius Otegbade"
                  />
                </div>
                <div>
                  <Label>Credentials</Label>
                  <Input
                    value={formData.lead_reviewer_credentials}
                    onChange={(e) => setFormData({ ...formData, lead_reviewer_credentials: e.target.value })}
                    placeholder="e.g., CPA (US), CAMS, CFCS, CFE"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
