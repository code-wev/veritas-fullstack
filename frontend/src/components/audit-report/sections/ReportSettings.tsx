import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, FileCheck, Clock, CheckCircle2, Send } from 'lucide-react';

interface ReportSettingsProps {
  report: any;
}

export function ReportSettings({ report }: ReportSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(report.status);
  const [reportType, setReportType] = useState(report.report_type);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates: any = { 
        status, 
        report_type: reportType,
        updated_at: new Date().toISOString()
      };
      
      if (status === 'approved' && report.status !== 'approved') {
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('audit_reports')
        .update(updates)
        .eq('id', report.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report'] });
      toast({ title: 'Settings saved' });
    },
  });

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'review':
        return <FileCheck className="h-4 w-4" />;
      case 'client_review':
        return <Send className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
          <CardDescription>Configure report type and approval status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aml_effectiveness_review">AML Effectiveness Review</SelectItem>
                <SelectItem value="independent_review">Independent Review</SelectItem>
                <SelectItem value="management_letter">Management Letter</SelectItem>
                <SelectItem value="gap_analysis">Gap Analysis Report</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This determines the report template and structure
            </p>
          </div>

          {/* Report Status */}
          <div className="space-y-2">
            <Label>Report Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Draft
                  </div>
                </SelectItem>
                <SelectItem value="review">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Under Review
                  </div>
                </SelectItem>
                <SelectItem value="client_review">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Sent to Client for Review
                  </div>
                </SelectItem>
                <SelectItem value="approved">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Approved
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Save Button */}
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Report Info */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(report.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{new Date(report.updated_at).toLocaleString()}</p>
            </div>
            {report.approved_at && (
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="font-medium">{new Date(report.approved_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Download the report in various formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              Export to PDF
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </Button>
            <Button variant="outline" disabled>
              Export to Word
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export functionality will generate a professionally formatted document based on the report template.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
