import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { ReportContext, replacePlaceholders } from '@/lib/reportPlaceholders';

interface FullReportPreviewProps {
  report: any;
  sections: any[];
  findings: any[];
  reportContext: ReportContext;
  onClose: () => void;
}

export function FullReportPreview({ report, sections, findings, reportContext, onClose }: FullReportPreviewProps) {
  // Fetch findings summary
  const { data: findingsSummary } = useQuery({
    queryKey: ['audit-report-findings-summary', report?.id],
    queryFn: async () => {
      if (!report?.id) return [];
      const { data, error } = await supabase
        .from('audit_report_findings_summary')
        .select('*')
        .eq('report_id', report.id)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!report?.id,
  });

  const introSections = sections?.filter(s => 
    ['restrictions', 'scope', 'categorization', 'about_entity'].includes(s.section_key) && s.is_visible
  ) || [];

  const detailedSections = sections?.filter(s => 
    s.section_key.startsWith('detailed_') && s.is_visible
  ) || [];

  const formatContent = (content: string | null) => {
    if (!content) return null;
    
    // Replace placeholders with actual data
    const resolved = replacePlaceholders(content, reportContext);
    return resolved.split('\n').map((line, idx) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={idx} className="font-bold mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
      }
      if (line.match(/^\*\*.*\*\*$/)) {
        return <h4 key={idx} className="font-bold mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
      }
      if (line.startsWith('**')) {
        const parts = line.split('**');
        return (
          <p key={idx} className="mb-2">
            <strong>{parts[1]}</strong>{parts[2]}
          </p>
        );
      }
      if (line.match(/^\d+\./)) {
        return <li key={idx} className="ml-6 mb-1">{line.replace(/^\d+\.\s*/, '')}</li>;
      }
      if (line.trim() === '') {
        return <br key={idx} />;
      }
      return <p key={idx} className="mb-2">{line}</p>;
    });
  };

  const getCategorizationText = (cat: string | null) => {
    const map: Record<string, string> = {
      'complete_non_compliance': 'Complete Non-Compliance',
      'important_weakness': 'Important Weakness',
      'moderate_weakness': 'Moderate Weakness',
      'lesser_weakness': 'Lesser Weakness',
      'no_findings': 'No Findings',
    };
    return map[cat || ''] || cat || 'N/A';
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card">
        <Button variant="ghost" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Editor
        </Button>
        <div className="text-sm font-medium">Full Report Preview</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <ScrollArea className="h-[calc(100vh-56px)]">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-white text-black rounded-lg shadow-xl overflow-hidden">
            
            {/* ==================== COVER PAGE ==================== */}
            <div className="p-12 min-h-[800px] flex flex-col">
              <p className="text-xs tracking-[0.3em] text-gray-500 text-center">PRIVATE & CONFIDENTIAL</p>
              
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 py-16">
                <h1 className="text-2xl font-bold tracking-wide max-w-lg">
                  {report.report_title || 'AML/ATF COMPLIANCE REVIEW & EFFECTIVENESS TESTING: A REPORT'}
                </h1>
                <h2 className="text-xl text-gray-700">
                  REPORT FOR {(report.prepared_for_company || '[COMPANY NAME]').toUpperCase()}
                </h2>
                
                <div className="space-y-1 mt-8">
                  {report.draft_report_date && (
                    <p className="text-sm">DRAFT REPORT DATED: {format(new Date(report.draft_report_date), 'MMMM d, yyyy').toUpperCase()}</p>
                  )}
                  {report.final_report_date && (
                    <p className="text-sm">FINAL REPORT DATED: {format(new Date(report.final_report_date), 'MMMM d, yyyy').toUpperCase()}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-auto">
                <div>
                  <p className="text-xs text-gray-500 mb-2">PREPARED FOR:</p>
                  <p className="font-semibold">{report.prepared_for_name}</p>
                  <p className="text-sm">{report.prepared_for_title}</p>
                  <p className="text-sm whitespace-pre-line mt-2">{report.prepared_for_address}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">PREPARED BY:</p>
                  <p className="font-semibold">{report.prepared_by_company}</p>
                  <p className="text-sm whitespace-pre-line">{report.prepared_by_address}</p>
                  <p className="text-sm mt-2">{report.prepared_by_contact}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-300" />

            {/* ==================== TABLE OF CONTENTS ==================== */}
            <div className="p-12 border-b border-gray-200">
              <h2 className="text-xl font-bold mb-6 text-center">TABLE OF CONTENTS</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>1. Restrictions on Use and Distribution of this Report</span>
                  <span>3</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>2. Scope of Review and Procedures Performed</span>
                  <span>4</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>3. Categorization of Findings</span>
                  <span>5</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>4. About {reportContext.clientName || '[Entity]'}</span>
                  <span>6</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>5. Summary of Findings</span>
                  <span>7</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>6. Detailed Results of the Effectiveness Review</span>
                  <span>8</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>Appendix A – Schedule of Source Documents Reviewed</span>
                  <span>—</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>Appendix B – Management Action Plan</span>
                  <span>—</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                  <span>Appendix C – About Reviewer</span>
                  <span>—</span>
                </div>
              </div>
            </div>

            {/* ==================== INTRODUCTION SECTIONS ==================== */}
            {introSections.map((section, idx) => (
              <div key={section.id} className="p-12 border-b border-gray-200">
                <h2 className="text-lg font-bold mb-4">{idx + 1}. {section.section_title}</h2>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {formatContent(section.content)}
                </div>
              </div>
            ))}

            {/* ==================== SUMMARY OF FINDINGS ==================== */}
            <div className="p-12 border-b border-gray-200">
              <h2 className="text-lg font-bold mb-6">5. Summary of Findings</h2>
              
              {findingsSummary && findingsSummary.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Regulatory Requirement</th>
                      <th className="border border-gray-300 p-2 text-left">Finding Summary</th>
                      <th className="border border-gray-300 p-2 text-left">Categorization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findingsSummary.map((item) => (
                      <tr key={item.id}>
                        <td className="border border-gray-300 p-2">{item.regulatory_requirement}</td>
                        <td className="border border-gray-300 p-2">{item.finding_summary || 'No findings'}</td>
                        <td className="border border-gray-300 p-2">{getCategorizationText(item.categorization)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No findings summary available.</p>
                  <p className="text-sm mt-2">Click "Sync Findings" to populate this table from the Findings Register.</p>
                </div>
              )}
            </div>

            {/* ==================== DETAILED FINDINGS ==================== */}
            <div className="p-12 border-b border-gray-200">
              <h2 className="text-lg font-bold mb-6">6. Detailed Results of the Effectiveness Review</h2>
              
              {detailedSections.map((section, idx) => (
                <div key={section.id} className="mb-8">
                  <h3 className="text-base font-bold mb-4">
                    6.{idx + 1} {section.section_title}
                  </h3>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    {formatContent(section.content)}
                  </div>
                </div>
              ))}
            </div>

            {/* ==================== APPENDICES ==================== */}
            <div className="p-12">
              <h2 className="text-lg font-bold mb-6">Appendices</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-base font-bold mb-2">Appendix A – Schedule of Source Documents Reviewed</h3>
                  <p className="text-sm text-gray-600">[Document list will be populated from evidence files]</p>
                </div>
                
                <div>
                  <h3 className="text-base font-bold mb-2">Appendix B – Management Action Plan</h3>
                  <p className="text-sm text-gray-600">[Action plan will be populated from findings remediation status]</p>
                </div>
                
                <div>
                  <h3 className="text-base font-bold mb-2">Appendix C – About Reviewer</h3>
                  {report.lead_reviewer_name && (
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold">{report.lead_reviewer_name}</p>
                      <p>{report.lead_reviewer_credentials}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ==================== FOOTER ==================== */}
            <div className="bg-gray-100 p-4 text-center text-xs text-gray-500">
              <p>This report is confidential and intended solely for the addressee.</p>
              <p className="mt-1">© {new Date().getFullYear()} {report.prepared_by_company || 'C&G Professional Services Inc.'}</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
