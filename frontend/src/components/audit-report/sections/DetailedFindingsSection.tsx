import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { Save, AlertTriangle, CheckCircle2, Info, Lock, FileText, ExternalLink, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReportContext } from '@/lib/reportPlaceholders';
import { getFindingTypeMeta, severityToFindingType } from '@/lib/findingClassification';
import { cn } from '@/lib/utils';

interface DetailedFindingsSectionProps {
  sections: any[];
  findings: any[];
  reportContext?: ReportContext;
}

const moduleKeyMap: Record<string, string[]> = {
  'detailed_msb_registration': ['msb_registration'],
  'detailed_compliance_officer': ['governance'],
  'detailed_policies': ['aml_program'],
  'detailed_risk_assessment': ['risk_assessment'],
  'detailed_training': ['training'],
  'detailed_review_timeframe': ['governance'],
  'detailed_kyc': ['kyc'],
  'detailed_reporting': ['reporting', 'str', 'lctr', 'eftr', 'lvctr', 'tpr'],
  'detailed_monitoring': ['monitoring', 'sanctions', 'transaction_monitoring'],
};

export function DetailedFindingsSection({ sections, findings, reportContext }: DetailedFindingsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEditFindings, role } = useUserRole();
  const [activeSection, setActiveSection] = useState(sections[0]?.section_key || '');
  const [editedRecommendations, setEditedRecommendations] = useState<Record<string, string>>({});

  const updateFindingMutation = useMutation({
    mutationFn: async ({ findingId, recommendation }: { findingId: string; recommendation: string }) => {
      const { error } = await supabase
        .from('findings')
        .update({ recommendation, updated_at: new Date().toISOString() })
        .eq('id', findingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-findings'] });
      toast({ title: 'Recommendation updated' });
    },
  });

  const getModuleFindings = (sectionKey: string) => {
    const moduleKeys = moduleKeyMap[sectionKey];
    if (!moduleKeys || moduleKeys.length === 0) return [];
    return findings.filter(f => 
      moduleKeys.includes(f.module) || 
      moduleKeys.includes(f.submodule) ||
      (f.submodule && moduleKeys.some(key => f.submodule.includes(key)))
    );
  };

  const getFindingMeta = (finding: any) =>
    getFindingTypeMeta(finding.finding_type ?? severityToFindingType(finding.severity));

  const getSeverityIcon = (finding: any) => {
    const meta = getFindingMeta(finding);
    switch (meta.type) {
      case 'complete_nc':
      case 'partial_important':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'partial_moderate':
        return <Info className="h-4 w-4 text-warning" />;
      case 'observation':
        return <Eye className="h-4 w-4 text-primary" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (finding: any) => {
    const meta = getFindingMeta(finding);
    return (
      <Badge variant="outline" className={cn('text-xs whitespace-nowrap', meta.badge)}>
        {meta.shortLabel}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Permission Notice */}
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          Findings are pulled from the Findings Register. <strong>Severity, evidence, and regulatory citations are locked.</strong> Only recommendation wording can be edited.
        </span>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {sections.map((section) => {
            const moduleFindings = getModuleFindings(section.section_key);
            const hasCritical = moduleFindings.some(f => f.severity === 'critical' || f.severity === 'high');
            
            return (
              <TabsTrigger 
                key={section.section_key} 
                value={section.section_key}
                className="text-xs relative"
              >
                {section.section_title.replace('Documentation of the ', '').replace('Documentation and Effectiveness of the ', '')}
                {moduleFindings.length > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${hasCritical ? 'bg-destructive text-destructive-foreground' : 'bg-muted'}`}>
                    {moduleFindings.length}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sections.map((section) => {
          const moduleFindings = getModuleFindings(section.section_key);

          return (
            <TabsContent key={section.section_key} value={section.section_key} className="mt-6">
              <div className="space-y-4">
                {moduleFindings.length > 0 ? (
                  moduleFindings.map((finding) => (
                    <Card key={finding.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(finding)}
                            <div>
                              <CardTitle className="text-base">{finding.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                {getSeverityBadge(finding)}
                                <Badge variant="outline" className="text-xs">
                                  {finding.status}
                                </Badge>
                                {finding.regulation_reference && (
                                  <Badge variant="outline" className="text-xs">
                                    {finding.regulation_reference}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Observation - Read Only */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium">Observation</h4>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Locked - Edit in Findings Register</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            {finding.observation || finding.description || 'No observation documented.'}
                          </p>
                        </div>

                        {/* Regulatory Reference - Read Only */}
                        {finding.regulation_reference && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-medium">Regulatory Citation</h4>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Locked - Edit in Findings Register</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                              {finding.regulation_reference}
                            </p>
                          </div>
                        )}

                        {/* Severity - Locked with Override Info */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium">Severity</h4>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Severity changes require Findings Register approval</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg">
                            {getSeverityBadge(finding)}
                            {finding.severity_override_reason && (
                              <span className="text-xs text-muted-foreground">
                                (Overridden: {finding.severity_override_reason})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Evidence Links - Read Only */}
                        {finding.evidence_ids?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-medium">Evidence</h4>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Evidence links are locked</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex gap-2 flex-wrap bg-muted/50 p-3 rounded-lg">
                              {finding.evidence_ids.map((id: string, idx: number) => (
                                <Badge key={id} variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  Evidence {idx + 1}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendation - Editable (wording only) */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Recommendation</h4>
                            <Badge variant="outline" className="text-xs">Wording Editable</Badge>
                          </div>
                          <Textarea
                            value={editedRecommendations[finding.id] ?? finding.recommendation ?? ''}
                            onChange={(e) => canEditFindings && setEditedRecommendations({
                              ...editedRecommendations,
                              [finding.id]: e.target.value
                            })}
                            placeholder="Enter recommendation..."
                            rows={3}
                            disabled={!canEditFindings}
                            className="text-sm"
                          />
                          {canEditFindings && editedRecommendations[finding.id] !== undefined && 
                           editedRecommendations[finding.id] !== finding.recommendation && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => updateFindingMutation.mutate({
                                findingId: finding.id,
                                recommendation: editedRecommendations[finding.id]
                              })}
                              disabled={updateFindingMutation.isPending}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save Recommendation
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No findings identified for this regulatory area.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on our assessment, we did not identify any non-compliance issues.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
