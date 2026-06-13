import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { Save, Lock, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ScopeMethodologySectionProps {
  report: any;
}

export function ScopeMethodologySection({ report }: ScopeMethodologySectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEditReport, role } = useUserRole();
  
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    report.scope_selections || []
  );
  const [methodology, setMethodology] = useState(report.methodology_text || '');

  // Fetch scope templates
  const { data: templates } = useQuery({
    queryKey: ['scope-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_report_scope_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch tested modules to auto-detect scope
  const { data: testedModules } = useQuery({
    queryKey: ['engagement-tested-modules', report.engagement_id],
    queryFn: async () => {
      // Check which modules have findings or workpapers
      const { data: findings } = await supabase
        .from('findings')
        .select('module')
        .eq('engagement_id', report.engagement_id);

      const modules = new Set<string>();
      findings?.forEach(f => modules.add(f.module));
      return Array.from(modules);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('audit_reports')
        .update({
          scope_selections: selectedScopes,
          methodology_text: methodology,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report'] });
      toast({ title: 'Scope & methodology saved' });
    },
  });

  const toggleScope = (templateKey: string) => {
    if (!canEditReport) return;
    setSelectedScopes(prev =>
      prev.includes(templateKey)
        ? prev.filter(k => k !== templateKey)
        : [...prev, templateKey]
    );
  };

  // Map scope keys to module names for auto-detection
  const scopeToModuleMap: Record<string, string[]> = {
    scope_msb: ['msb_registration'],
    scope_compliance_officer: ['governance'],
    scope_policies: ['aml_program'],
    scope_risk_assessment: ['risk_assessment'],
    scope_training: ['training'],
    scope_kyc: ['kyc'],
    scope_reporting: ['reporting', 'str', 'lctr', 'eftr', 'lvctr', 'tpr'],
    scope_monitoring: ['monitoring', 'sanctions', 'transaction_monitoring'],
  };

  const isModuleTested = (templateKey: string) => {
    const moduleKeys = scopeToModuleMap[templateKey];
    if (!moduleKeys || !testedModules) return false;
    return moduleKeys.some(key => testedModules.includes(key));
  };

  const introTemplate = templates?.find(t => t.template_key === 'scope_intro');
  const scopeTemplates = templates?.filter(t => t.template_key !== 'scope_intro') || [];

  // Generate scope text for preview
  const generateScopeText = () => {
    const intro = introTemplate?.template_content || '';
    const selectedItems = scopeTemplates
      .filter(t => selectedScopes.includes(t.template_key))
      .map(t => `• ${t.template_content}`)
      .join('\n');
    return `${intro}\n\n${selectedItems}`;
  };

  return (
    <div className="space-y-6">
      {/* Permission Banner */}
      {!canEditReport && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Only Lead Consultants and Partners can edit the scope and methodology.
          </span>
        </div>
      )}

      {/* Scope Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Scope of Review
            {canEditReport && (
              <Button
                size="sm"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Scope
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Select the regulatory obligations included in this engagement. Green checkmarks indicate modules with documented testing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {scopeTemplates.map(template => {
              const isTested = isModuleTested(template.template_key);
              const isSelected = selectedScopes.includes(template.template_key);

              return (
                <div
                  key={template.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  } ${!canEditReport ? 'opacity-75' : 'cursor-pointer hover:border-primary/50'}`}
                  onClick={() => toggleScope(template.template_key)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={!canEditReport}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium cursor-pointer">
                        {template.template_name}
                      </Label>
                      {isTested && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.template_content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scope Summary */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Generated Scope Text</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {generateScopeText()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Methodology</CardTitle>
          <CardDescription>
            Describe the review methodology employed during this engagement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={methodology}
            onChange={(e) => canEditReport && setMethodology(e.target.value)}
            placeholder="Our review methodology included..."
            rows={6}
            disabled={!canEditReport}
            className="font-mono text-sm"
          />
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Badge variant="outline">Template-Driven</Badge>
            <span>Standard methodology text is pre-populated from organizational templates.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
