import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Lock, Eye } from 'lucide-react';

interface ClientAuditReportReviewProps {
  engagementIds: string[];
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  client_review: { label: 'Awaiting Your Review', variant: 'default' },
  final: { label: 'Final Report', variant: 'outline' },
};

export function ClientAuditReportReview({ engagementIds }: ClientAuditReportReviewProps) {
  // Fetch reports that have been pushed for client review (status = client_review or final)
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['client-portal-reports', engagementIds],
    queryFn: async () => {
      if (engagementIds.length === 0) return [];
      const { data, error } = await supabase
        .from('audit_reports')
        .select('*')
        .in('engagement_id', engagementIds)
        .in('status', ['client_review', 'final'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: engagementIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No audit report has been shared with you yet. You'll be notified when the audit team pushes a report for your review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {reports.map((report: any) => (
        <ReportPreviewCard key={report.id} report={report} />
      ))}
    </div>
  );
}

function ReportPreviewCard({ report }: { report: any }) {
  const statusCfg = STATUS_LABELS[report.status] || STATUS_LABELS.client_review;

  const { data: sections = [] } = useQuery({
    queryKey: ['client-report-sections', report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_report_sections')
        .select('*')
        .eq('report_id', report.id)
        .eq('is_visible', true)
        .order('section_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: findingsSummary = [] } = useQuery({
    queryKey: ['client-report-findings-summary', report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_report_findings_summary')
        .select('*')
        .eq('report_id', report.id)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const formatContent = (content: string | null) => {
    if (!content) return null;
    return content.split('\n').map((line, idx) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={idx} className="font-bold mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="ml-4 text-sm leading-relaxed">{line.substring(2)}</li>;
      }
      if (line.match(/^\d+\.\s/)) {
        return <li key={idx} className="ml-4 text-sm leading-relaxed list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
      }
      if (line.trim() === '') return <br key={idx} />;
      // Inline bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      if (parts.length > 1) {
        return (
          <p key={idx} className="text-sm leading-relaxed">
            {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
          </p>
        );
      }
      return <p key={idx} className="text-sm leading-relaxed">{line}</p>;
    });
  };

  // Separate intro sections from detailed findings
  const introSections = sections.filter((s: any) =>
    ['restrictions', 'scope', 'categorization', 'about_entity', 'transmittal_letter'].includes(s.section_key)
  );
  const detailedSections = sections.filter((s: any) => s.section_key.startsWith('detailed_'));
  const appendixSections = sections.filter((s: any) => s.section_key.startsWith('appendix_'));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              {report.report_title || 'AML/ATF Compliance Review Report'}
            </CardTitle>
            <CardDescription className="mt-1">
              {report.prepared_for_company && `Prepared for: ${report.prepared_for_company}`}
              {report.draft_report_date && ` • Draft: ${new Date(report.draft_report_date).toLocaleDateString()}`}
            </CardDescription>
          </div>
          <Badge variant={statusCfg.variant} className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {statusCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-8 pr-4">
            {/* Cover Info */}
            {report.prepared_by_company && (
              <div className="text-center space-y-2 py-6 border-b">
                <h2 className="text-xl font-bold">{report.report_title || 'Independent Review Report'}</h2>
                <p className="text-sm text-muted-foreground">Prepared by: {report.prepared_by_company}</p>
                {report.prepared_for_company && (
                  <p className="text-sm text-muted-foreground">Prepared for: {report.prepared_for_company}</p>
                )}
              </div>
            )}

            {/* Executive Summary */}
            {report.executive_summary && (
              <div>
                <h3 className="text-base font-semibold mb-3">Executive Summary</h3>
                <div className="text-sm leading-relaxed whitespace-pre-line">{report.executive_summary}</div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* Intro Sections */}
            {introSections.map((section: any) => (
              <div key={section.id}>
                <h3 className="text-base font-semibold mb-3">{section.section_title}</h3>
                <div>{formatContent(section.content)}</div>
                <Separator className="mt-6" />
              </div>
            ))}

            {/* Findings Summary Table */}
            {findingsSummary.length > 0 && (
              <div>
                <h3 className="text-base font-semibold mb-3">Summary of Findings</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-2 text-left font-medium">#</th>
                        <th className="p-2 text-left font-medium">Regulatory Requirement</th>
                        <th className="p-2 text-left font-medium">Categorization</th>
                        <th className="p-2 text-left font-medium">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findingsSummary.map((fs: any, idx: number) => (
                        <tr key={fs.id} className={idx % 2 === 0 ? '' : 'bg-muted/20'}>
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">{fs.regulatory_requirement}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">{fs.categorization || '—'}</Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">{fs.finding_summary || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* Detailed Findings */}
            {detailedSections.map((section: any) => (
              <div key={section.id}>
                <h3 className="text-base font-semibold mb-3">{section.section_title}</h3>
                <div>{formatContent(section.content)}</div>
                <Separator className="mt-6" />
              </div>
            ))}

            {/* Appendices */}
            {appendixSections.length > 0 && (
              <>
                {appendixSections.map((section: any) => (
                  <div key={section.id}>
                    <h3 className="text-base font-semibold mb-3">{section.section_title}</h3>
                    <div>{formatContent(section.content)}</div>
                    <Separator className="mt-6" />
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
