import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useUserRole, ROLE_LABELS } from '@/hooks/useUserRole';
import { 
  Save, Lock, AlertTriangle, AlertCircle, Info, CheckCircle2, 
  TrendingUp, TrendingDown, BarChart3 
} from 'lucide-react';

interface ExecutiveSummarySectionProps {
  report: any;
  findings: any[];
}

export function ExecutiveSummarySection({ report, findings }: ExecutiveSummarySectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEditReport, role } = useUserRole();
  
  const [summary, setSummary] = useState(report.executive_summary || '');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate findings statistics
  const stats = useMemo(() => {
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;
    const low = findings.filter(f => f.severity === 'low').length;
    const total = findings.length;

    // Detect high-risk themes (modules with most findings)
    const moduleCount: Record<string, number> = {};
    findings.forEach(f => {
      moduleCount[f.module] = (moduleCount[f.module] || 0) + 1;
    });
    const highRiskModules = Object.entries(moduleCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([module]) => module);

    return { critical, high, medium, low, total, highRiskModules };
  }, [findings]);

  // Generate auto-summary
  const generateAutoSummary = () => {
    const { critical, high, medium, low, total, highRiskModules } = stats;

    let overallAssessment = '';
    if (critical > 0) {
      overallAssessment = 'Based on our review, we identified significant compliance deficiencies that require immediate attention.';
    } else if (high > 0) {
      overallAssessment = 'Our review identified important compliance weaknesses that should be addressed as a priority.';
    } else if (medium > 0) {
      overallAssessment = 'Our review identified moderate compliance weaknesses that warrant management attention.';
    } else if (low > 0) {
      overallAssessment = 'Our review identified minor compliance gaps with recommendations for enhancement.';
    } else {
      overallAssessment = 'Based on our review, the compliance program appears to be operating effectively with no significant deficiencies identified.';
    }

    const moduleNames: Record<string, string> = {
      msb_registration: 'MSB Registration',
      governance: 'Governance',
      aml_program: 'AML Program',
      risk_assessment: 'Risk Assessment',
      training: 'Training',
      kyc: 'KYC',
      reporting: 'Transaction Reporting',
      monitoring: 'Ongoing Monitoring',
    };

    const riskAreas = highRiskModules.length > 0
      ? `Key areas requiring attention include: ${highRiskModules.map(m => moduleNames[m] || m).join(', ')}.`
      : '';

    return `${overallAssessment}

During the review period, we identified a total of ${total} finding${total !== 1 ? 's' : ''}:
• Critical: ${critical}
• High: ${high}
• Medium: ${medium}
• Low: ${low}

${riskAreas}

Management should prioritize remediation of ${critical > 0 ? 'critical and high' : high > 0 ? 'high' : 'identified'} severity findings and implement the recommendations detailed in this report.`;
  };

  // Validate summary doesn't contradict findings
  const validateSummary = (text: string) => {
    const errors: string[] = [];

    // Check for contradictions
    if (stats.critical > 0 || stats.high > 0) {
      const lowRiskPhrases = [
        'no significant',
        'operating effectively',
        'no deficiencies',
        'fully compliant',
        'no issues',
      ];
      const hasContradiction = lowRiskPhrases.some(phrase =>
        text.toLowerCase().includes(phrase)
      );
      if (hasContradiction) {
        errors.push(
          `Summary suggests low risk but there are ${stats.critical + stats.high} critical/high findings. Please provide justification or revise.`
        );
      }
    }

    // Check if downplaying high findings
    if (stats.critical > 0 && !text.toLowerCase().includes('critical')) {
      errors.push('Summary must acknowledge critical findings.');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!validateSummary(summary)) {
        throw new Error('Validation errors must be resolved');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('audit_reports')
        .update({
          executive_summary: summary,
          executive_summary_edited_by: user?.id,
          executive_summary_edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-report'] });
      toast({ title: 'Executive summary saved' });
    },
    onError: (error) => {
      toast({ 
        title: 'Cannot save', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  useEffect(() => {
    if (summary) {
      validateSummary(summary);
    }
  }, [summary, stats]);

  return (
    <div className="space-y-6">
      {/* Permission Banner */}
      {!canEditReport && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Only Lead Consultants and Partners can edit the executive summary.
          </span>
        </div>
      )}

      {/* Findings Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{stats.critical}</div>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive/80" />
              <div>
                <div className="text-2xl font-bold">{stats.high}</div>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-warning" />
              <div>
                <div className="text-2xl font-bold">{stats.medium}</div>
                <p className="text-xs text-muted-foreground">Medium</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.low}</div>
                <p className="text-xs text-muted-foreground">Low</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High-Risk Themes */}
      {stats.highRiskModules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Auto-Detected High-Risk Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {stats.highRiskModules.map(module => (
                <Badge key={module} variant="destructive">
                  {module.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Executive Summary Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Executive Summary</CardTitle>
              <CardDescription>
                High-level assessment for senior management and board reporting.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSummary(generateAutoSummary())}
                disabled={!canEditReport}
              >
                Auto-Generate
              </Button>
              {canEditReport && (
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || validationErrors.length > 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Summary
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={summary}
            onChange={(e) => canEditReport && setSummary(e.target.value)}
            placeholder="Enter executive summary..."
            rows={12}
            disabled={!canEditReport}
            className={`font-mono text-sm ${validationErrors.length > 0 ? 'border-destructive' : ''}`}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Controlled Narrative</Badge>
              <span>Summary cannot contradict or downplay findings without justification.</span>
            </div>
            {report.executive_summary_edited_at && (
              <span className="text-xs text-muted-foreground">
                Last edited: {new Date(report.executive_summary_edited_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
