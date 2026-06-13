import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FindingsList } from './FindingsList';
import { FindingForm } from './FindingForm';
import { FindingsFilters, FilterState } from './FindingsFilters';
import { AlertTriangle, CheckCircle2, Eye, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  FINDING_TYPES,
  FindingType,
  getFindingTypeMeta,
  severityToFindingType,
  isDeficiency,
} from '@/lib/findingClassification';
import { cn } from '@/lib/utils';

interface FindingsModuleProps {
  engagementId: string;
}

export interface Finding {
  id: string;
  title: string;
  observation: string | null;
  description: string | null;
  module: string;
  submodule: string | null;
  regulation_reference: string | null;
  nature_of_obligation: string | null;
  /** FINTRAC harm-done classification. Primary classifier. */
  finding_type?: FindingType | null;
  /** documentation | application | both — what dimension of compliance failed. */
  compliance_dimension?: string | null;
  /** STR-relevant. true = no prior STR on subject ($500k); false = prior STR exists ($250k). */
  is_first_miss?: boolean | null;
  /** Audit-trail array of rules that fired during auto-classification. */
  auto_flag_weaknesses?: any | null;
  /** Legacy severity field (kept in sync by DB trigger). */
  severity: string;
  original_severity: string | null;
  severity_override_reason: string | null;
  status: string;
  recommendation: string | null;
  root_cause: string | null;
  evidence_ids: string[] | null;
  date_identified: string | null;
  created_at: string;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source_workpaper_id: string | null;
  source_interview_id: string | null;
  source_kyc_individual_id: string | null;
  source_kyc_business_id: string | null;
  source_reporting_sample_id: string | null;
  source_aml_finding_id: string | null;
  source_governance_response_id: string | null;
  is_consolidated: boolean | null;
  consolidated_from_ids: string[] | null;
  management_response: string | null;
  target_remediation_date: string | null;
  remediation_status: string | null;
}

function classifyFinding(f: Finding): FindingType {
  return (f.finding_type ?? severityToFindingType(f.severity)) as FindingType;
}

export function FindingsModule({ engagementId }: FindingsModuleProps) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    module: 'all',
    classification: 'all',
    status: 'all',
    search: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFindings();
  }, [engagementId]);

  const fetchFindings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('findings')
      .select('*')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading findings', description: error.message, variant: 'destructive' });
    } else {
      setFindings(((data as unknown) as Finding[]) || []);
    }
    setLoading(false);
  };

  const handleSaveFinding = async (finding: Partial<Finding>) => {
    const ft = (finding as Partial<Finding> & { finding_type?: FindingType }).finding_type;
    if (selectedFinding) {
      const { error } = await supabase
        .from('findings')
        .update({
          title: finding.title,
          observation: finding.observation,
          description: finding.description,
          module: finding.module,
          submodule: finding.submodule,
          regulation_reference: finding.regulation_reference,
          nature_of_obligation: finding.nature_of_obligation,
          ...(ft ? { finding_type: ft } as any : {}),
          compliance_dimension: finding.compliance_dimension ?? null,
          is_first_miss: finding.is_first_miss ?? null,
          severity: finding.severity,
          original_severity: finding.original_severity,
          severity_override_reason: finding.severity_override_reason,
          status: finding.status,
          recommendation: finding.recommendation,
          root_cause: finding.root_cause,
          management_response: finding.management_response,
          target_remediation_date: finding.target_remediation_date,
          remediation_status: finding.remediation_status,
          date_identified: finding.date_identified,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', selectedFinding.id);

      if (error) {
        toast({ title: 'Error updating finding', description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: 'Finding updated successfully' });
    } else {
      const { error } = await supabase
        .from('findings')
        .insert({
          engagement_id: engagementId,
          title: finding.title || '',
          module: finding.module || '',
          observation: finding.observation,
          description: finding.description,
          submodule: finding.submodule,
          regulation_reference: finding.regulation_reference,
          nature_of_obligation: finding.nature_of_obligation,
          ...(ft ? { finding_type: ft } as any : {}),
          compliance_dimension: finding.compliance_dimension ?? null,
          is_first_miss: finding.is_first_miss ?? null,
          severity: finding.severity || 'medium',
          original_severity: finding.original_severity,
          severity_override_reason: finding.severity_override_reason,
          status: finding.status || 'draft',
          recommendation: finding.recommendation,
          root_cause: finding.root_cause,
          management_response: finding.management_response,
          target_remediation_date: finding.target_remediation_date,
          remediation_status: finding.remediation_status,
          date_identified: finding.date_identified
        } as any);

      if (error) {
        toast({ title: 'Error creating finding', description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: 'Finding created successfully' });
    }

    await fetchFindings();
    setSelectedFinding(null);
    return true;
  };

  const handleDeleteFinding = async (findingId: string) => {
    const { error } = await supabase
      .from('findings')
      .delete()
      .eq('id', findingId);

    if (error) {
      toast({ title: 'Error deleting finding', description: error.message, variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Finding deleted successfully' });
    await fetchFindings();
  };

  const filteredFindings = findings.filter(f => {
    if (filters.module !== 'all' && f.module !== filters.module) return false;
    if (filters.classification !== 'all') {
      const ft = classifyFinding(f);
      if (filters.classification === 'deficiencies' && !isDeficiency(ft)) return false;
      if (filters.classification === 'observations' && ft !== 'observation') return false;
      if (filters.classification !== 'deficiencies' && filters.classification !== 'observations' && ft !== filters.classification) return false;
    }
    if (filters.status !== 'all' && f.status !== filters.status) return false;
    if (filters.search && !f.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const deficiencies = findings.filter(f => isDeficiency(classifyFinding(f)));
  const observations = findings.filter(f => classifyFinding(f) === 'observation');

  const stats = {
    total: findings.length,
    deficiencies: deficiencies.length,
    completeNc: findings.filter(f => classifyFinding(f) === 'complete_nc').length,
    observations: observations.length,
    final: findings.filter(f => f.status === 'final').length,
  };

  const moduleGroups = findings.reduce((acc, f) => {
    acc[f.module] = (acc[f.module] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Findings Register</h1>
          <p className="text-muted-foreground">Centralized audit issue register</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Deficiencies</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.deficiencies}</p>
            <p className="text-xs text-muted-foreground">Non-compliance findings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Complete NC</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{stats.completeNc}</p>
            <p className="text-xs text-muted-foreground">Highest penalty exposure</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Observations</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{stats.observations}</p>
            <p className="text-xs text-muted-foreground">Best-practice notes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Final</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.final}</p>
            <p className="text-xs text-muted-foreground">Signed-off findings</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({findings.length})</TabsTrigger>
          <TabsTrigger value="by-module">By module</TabsTrigger>
          <TabsTrigger value="by-classification">By classification</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {selectedFinding !== null ? (
            <FindingForm
              finding={selectedFinding || undefined}
              onSave={handleSaveFinding}
              onCancel={() => setSelectedFinding(null)}
              engagementId={engagementId}
            />
          ) : (
            <>
              <FindingsFilters 
                filters={filters} 
                onFiltersChange={setFilters}
                onNewFinding={() => setSelectedFinding(undefined as any)}
              />
              <FindingsList
                findings={filteredFindings}
                loading={loading}
                onSelect={setSelectedFinding}
                onDelete={handleDeleteFinding}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="by-module">
          <div className="grid gap-4">
            {Object.entries(moduleGroups).map(([module, count]) => (
              <Card key={module}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{module.replace(/_/g, ' ')}</CardTitle>
                    <Badge variant="secondary">{count} finding{count !== 1 ? 's' : ''}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <FindingsList
                    findings={findings.filter(f => f.module === module)}
                    loading={false}
                    onSelect={setSelectedFinding}
                    onDelete={handleDeleteFinding}
                    compact
                  />
                </CardContent>
              </Card>
            ))}
            {Object.keys(moduleGroups).length === 0 && (
              <p className="text-muted-foreground text-center py-8">No findings recorded yet.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="by-classification">
          <div className="grid gap-4">
            {FINDING_TYPES.map(meta => {
              const items = findings.filter(f => classifyFinding(f) === meta.type);
              if (items.length === 0) return null;
              return (
                <Card key={meta.type}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', meta.badge)}>
                          {meta.shortLabel}
                        </Badge>
                        <span className="font-normal text-sm text-muted-foreground">{meta.label}</span>
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {items.length} {meta.isDeficiency ? 'finding' : 'observation'}{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <FindingsList
                      findings={items}
                      loading={false}
                      onSelect={setSelectedFinding}
                      onDelete={handleDeleteFinding}
                      compact
                    />
                  </CardContent>
                </Card>
              );
            })}
            {findings.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No findings recorded yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
