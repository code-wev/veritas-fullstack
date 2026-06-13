import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserRole, ROLE_LABELS } from '@/hooks/useUserRole';
import { FileText, Settings, BookOpen, List, FileCheck, Download, RefreshCw, Eye, Target, MessageSquare, BarChart3, Lock } from 'lucide-react';
import { SectionNavigationFooter } from '@/components/ui/section-navigation-footer';
import { ReportCoverPage } from './sections/ReportCoverPage';
import { ScopeMethodologySection } from './sections/ScopeMethodologySection';
import { ExecutiveSummarySection } from './sections/ExecutiveSummarySection';
import { FindingsSummaryTable } from './sections/FindingsSummaryTable';
import { DetailedFindingsSection } from './sections/DetailedFindingsSection';
import { ManagementResponsesSection } from './sections/ManagementResponsesSection';
import { ReportAppendices } from './sections/ReportAppendices';
import { ReportSettings } from './sections/ReportSettings';
import { FullReportPreview } from './sections/FullReportPreview';
import { ReportContext, generateAboutEntityContent } from '@/lib/reportPlaceholders';

interface AuditReportModuleProps {
  engagementId: string;
}

const TAB_ORDER = ['cover', 'scope', 'executive', 'summary', 'detailed', 'responses', 'appendices', 'settings'] as const;
const TAB_LABELS: Record<string, string> = {
  cover: 'Cover Page',
  scope: 'Scope & Methodology',
  executive: 'Executive Summary',
  summary: 'Findings Summary',
  detailed: 'Detailed Findings',
  responses: 'Management Responses',
  appendices: 'Appendices',
  settings: 'Settings',
};

export function AuditReportModule({ engagementId }: AuditReportModuleProps) {
  const { selectedClient, selectedEngagement } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEditReport, canEditFindings, role } = useUserRole();
  const [activeTab, setActiveTab] = useState('cover');
  const [showFullPreview, setShowFullPreview] = useState(false);

  const currentIndex = TAB_ORDER.indexOf(activeTab as typeof TAB_ORDER[number]);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < TAB_ORDER.length - 1;

  const goToPrevious = () => {
    if (canGoPrevious) {
      setActiveTab(TAB_ORDER[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      setActiveTab(TAB_ORDER[currentIndex + 1]);
    }
  };

  // Fetch MSB registration data for placeholders
  const { data: msbData } = useQuery({
    queryKey: ['msb-registration-for-report', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msb_registrations')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('registration_type', 'fintrac')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch or create audit report
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['audit-report', engagementId],
    queryFn: async () => {
      const { data: existing, error: fetchError } = await supabase
        .from('audit_reports')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) return existing;

      // Create new report — auto-populate from client/engagement
      const { data: newReport, error: createError } = await supabase
        .from('audit_reports')
        .insert({
          engagement_id: engagementId,
          prepared_for_name: '',
          prepared_for_company: selectedClient?.name || '',
        })
        .select()
        .single();

      if (createError) throw createError;

      await supabase.rpc('initialize_audit_report_sections', { p_report_id: newReport.id });

      return newReport;
    },
  });

  // Build report context for placeholder replacement
  const reportContext: ReportContext = useMemo(() => ({
    clientName: selectedClient?.name,
    entityType: selectedClient?.entity_type,
    periodStart: selectedEngagement?.period_start,
    periodEnd: selectedEngagement?.period_end,
    preparedForName: report?.prepared_for_name,
    preparedForTitle: report?.prepared_for_title,
    preparedForCompany: report?.prepared_for_company || selectedClient?.name,
    preparedForAddress: report?.prepared_for_address,
    preparedByCompany: report?.prepared_by_company,
    preparedByAddress: report?.prepared_by_address,
    preparedByContact: report?.prepared_by_contact,
    leadReviewerName: report?.lead_reviewer_name,
    leadReviewerCredentials: report?.lead_reviewer_credentials,
    msbNumber: msbData?.registration_number || undefined,
    msbRegistrationDate: msbData?.initial_registration_date || undefined,
    msbExpiryDate: msbData?.expiry_date || undefined,
    incorporationNumber: msbData?.incorporation_number || undefined,
    incorporationDate: msbData?.date_of_incorporation || undefined,
    jurisdictionOfIncorporation: msbData?.jurisdiction_of_incorporation || undefined,
    businessAddress: msbData?.business_address || undefined,
    websiteAddress: msbData?.website_address || undefined,
    complianceOfficerName: msbData?.compliance_officer_name || undefined,
    msbActivities: msbData?.msb_activities || undefined,
  }), [selectedClient, selectedEngagement, report, msbData]);

  // Fetch report sections
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['audit-report-sections', report?.id],
    queryFn: async () => {
      if (!report?.id) return [];
      const { data, error } = await supabase
        .from('audit_report_sections')
        .select('*')
        .eq('report_id', report.id)
        .order('section_order');

      if (error) throw error;
      return data;
    },
    enabled: !!report?.id,
  });

  // Auto-populate "About the Reporting Entity" section from MSB data
  useEffect(() => {
    if (!sections || !reportContext.clientName) return;
    const aboutSection = sections.find(s => s.section_key === 'about_entity');
    if (!aboutSection) return;

    // Only auto-populate if the content still contains unresolved placeholders
    const hasUnresolvedPlaceholders = aboutSection.content && (
      aboutSection.content.includes('[MSB_NUMBER]') ||
      aboutSection.content.includes('[INCORPORATION_DATE]') ||
      aboutSection.content.includes('[JURISDICTION]') ||
      aboutSection.content.includes('[describe incorporation details')
    );
    
    // Also auto-populate if section is empty
    if (!aboutSection.content || hasUnresolvedPlaceholders) {
      const newContent = generateAboutEntityContent(reportContext);
      // Only update if content actually changed
      if (newContent !== aboutSection.content) {
        supabase
          .from('audit_report_sections')
          .update({ content: newContent, updated_at: new Date().toISOString() })
          .eq('id', aboutSection.id)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['audit-report-sections', report?.id] });
          });
      }
    }
  }, [sections, reportContext, report?.id]);

  // Fetch findings for auto-population
  const { data: findings } = useQuery({
    queryKey: ['engagement-findings', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('findings')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('severity', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Sync findings mutation
  const syncFindingsMutation = useMutation({
    mutationFn: async () => {
      if (!report?.id || !findings) return;

      await supabase
        .from('audit_report_findings_summary')
        .delete()
        .eq('report_id', report.id);

      const moduleMap: Record<string, any[]> = {};
      findings.forEach((f) => {
        if (!moduleMap[f.module]) moduleMap[f.module] = [];
        moduleMap[f.module].push(f);
      });

      const summaryItems = Object.entries(moduleMap).map(([module, moduleFindings], idx) => {
        const highestSeverity = moduleFindings.reduce((acc, f) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[f.severity as keyof typeof severityOrder] > severityOrder[acc as keyof typeof severityOrder] ? f.severity : acc;
        }, 'low');

        const categorizationMap: Record<string, string> = {
          critical: 'complete_non_compliance',
          high: 'important_weakness',
          medium: 'moderate_weakness',
          low: 'lesser_weakness',
        };

        return {
          report_id: report.id,
          finding_id: moduleFindings[0]?.id,
          regulatory_requirement: getModuleDisplayName(module),
          finding_summary: moduleFindings.map(f => f.title).join('; '),
          categorization: categorizationMap[highestSeverity] || 'no_findings',
          display_order: idx,
        };
      });

      if (summaryItems.length > 0) {
        await supabase.from('audit_report_findings_summary').insert(summaryItems);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report-findings-summary'] });
      toast({ title: 'Findings synchronized', description: 'Report findings have been updated from the Findings Register.' });
    },
  });

  const getModuleDisplayName = (module: string): string => {
    const names: Record<string, string> = {
      msb_registration: 'FINTRAC and Revenu Québec MSB Registration',
      governance: 'Appointment of a Compliance Officer',
      aml_program: 'Documentation of the Compliance Policies and Procedures',
      risk_assessment: 'Documentation of the AML/ATF Compliance Risk Assessment',
      training: 'Documentation and Effectiveness of the Ongoing Training Program',
      kyc: 'Client Identification and Record-keeping Obligations',
      reporting: 'Reporting Obligations – LVCTR, EFTs, STRs and TPRs',
      monitoring: 'Ongoing Monitoring Obligations',
    };
    return names[module] || module;
  };

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const introSections = sections?.filter(s => 
    ['restrictions', 'scope', 'categorization', 'about_entity'].includes(s.section_key)
  ) || [];

  const detailedSections = sections?.filter(s => 
    s.section_key.startsWith('detailed_')
  ) || [];

  const appendixSections = sections?.filter(s => 
    s.section_key.startsWith('appendix_')
  ) || [];

  // Show full preview if enabled
  if (showFullPreview && report && sections) {
    return (
      <FullReportPreview
        report={report}
        sections={sections}
        findings={findings || []}
        reportContext={reportContext}
        onClose={() => setShowFullPreview(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Report</h1>
          <p className="text-muted-foreground">
            AML/ATF Compliance Review & Effectiveness Testing Report
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFullPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Full Report
          </Button>
          <Button 
            variant="outline" 
            onClick={() => syncFindingsMutation.mutate()}
            disabled={syncFindingsMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncFindingsMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Findings
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Status & Role */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <FileCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Report Status: <span className="capitalize">{report?.status}</span></p>
            <p className="text-xs text-muted-foreground">
              {findings?.length || 0} findings from Findings Register • {sections?.length || 0} sections configured
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {role && (
            <Badge variant="outline">
              {ROLE_LABELS[role]}
            </Badge>
          )}
          {!canEditReport && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              View Only
            </Badge>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="cover" className="flex items-center gap-1 text-xs">
            <FileText className="h-3 w-3" />
            Cover
          </TabsTrigger>
          <TabsTrigger value="scope" className="flex items-center gap-1 text-xs">
            <Target className="h-3 w-3" />
            Scope
          </TabsTrigger>
          <TabsTrigger value="executive" className="flex items-center gap-1 text-xs">
            <BarChart3 className="h-3 w-3" />
            Executive
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-1 text-xs">
            <List className="h-3 w-3" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-1 text-xs">
            <FileText className="h-3 w-3" />
            Detailed
          </TabsTrigger>
          <TabsTrigger value="responses" className="flex items-center gap-1 text-xs">
            <MessageSquare className="h-3 w-3" />
            Responses
          </TabsTrigger>
          <TabsTrigger value="appendices" className="flex items-center gap-1 text-xs">
            <BookOpen className="h-3 w-3" />
            Appendices
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 text-xs">
            <Settings className="h-3 w-3" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cover" className="mt-6">
          {report && <ReportCoverPage report={report} reportContext={reportContext} />}
        </TabsContent>

        <TabsContent value="scope" className="mt-6">
          {report && <ScopeMethodologySection report={report} />}
        </TabsContent>

        <TabsContent value="executive" className="mt-6">
          {report && <ExecutiveSummarySection report={report} findings={findings || []} />}
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          {report && <FindingsSummaryTable reportId={report.id} findings={findings || []} />}
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <DetailedFindingsSection 
            sections={detailedSections} 
            findings={findings || []} 
            reportContext={reportContext}
          />
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <ManagementResponsesSection findings={findings || []} />
        </TabsContent>

        <TabsContent value="appendices" className="mt-6">
          {report && <ReportAppendices reportId={report.id} engagementId={engagementId} />}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          {report && <ReportSettings report={report} />}
        </TabsContent>
      </Tabs>

      {/* Navigation Footer */}
      <SectionNavigationFooter
        onPrevious={canGoPrevious ? goToPrevious : undefined}
        onNext={canGoNext ? goToNext : undefined}
        previousLabel={canGoPrevious ? TAB_LABELS[TAB_ORDER[currentIndex - 1]] : undefined}
        nextLabel={canGoNext ? TAB_LABELS[TAB_ORDER[currentIndex + 1]] : undefined}
        showPrevious={canGoPrevious}
        showNext={canGoNext}
        showSave={false}
      />
    </div>
  );
}
