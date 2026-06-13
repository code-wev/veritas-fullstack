import { useState } from 'react';
import { Finding } from './FindingsModule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Link2, Info } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import {
  FINDING_TYPES,
  FindingType,
  findingTypeToSeverity,
  getFindingTypeMeta,
  severityToFindingType,
} from '@/lib/findingClassification';
import { cn } from '@/lib/utils';

interface FindingFormProps {
  finding?: Finding;
  onSave: (finding: Partial<Finding>) => Promise<boolean>;
  onCancel: () => void;
  engagementId: string;
}

const MODULE_OPTIONS = [
  { value: 'msb_registration', label: 'MSB Registration' },
  { value: 'governance', label: 'Governance' },
  { value: 'aml_program', label: 'AML Program' },
  { value: 'kyc', label: 'KYC Testing' },
  { value: 'transaction_reporting', label: 'Transaction Reporting' },
  { value: 'transaction_monitoring', label: 'Transaction Monitoring' },
  { value: 'sanctions_screening', label: 'Sanctions Screening' },
];

const SUBMODULE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  aml_program: [
    { value: 'policies_procedures', label: 'Policies & Procedures' },
    { value: 'risk_assessment', label: 'Risk Assessment' },
    { value: 'training', label: 'Training Program' },
  ],
  kyc: [
    { value: 'individuals', label: 'Individuals' },
    { value: 'businesses', label: 'Businesses' },
    { value: 'transactions', label: 'Transactions' },
  ],
  transaction_reporting: [
    { value: 'lctr', label: 'LCTR' },
    { value: 'eftr', label: 'EFTR' },
    { value: 'str', label: 'STR' },
    { value: 'lvctr', label: 'LVCTR' },
    { value: 'lpepr', label: 'LPEPR' },
  ],
  governance: [
    { value: 'board_oversight', label: 'Board Oversight' },
    { value: 'senior_management', label: 'Senior Management' },
    { value: 'compliance_officer', label: 'Compliance Officer' },
    { value: 'compliance_function', label: 'Compliance Function' },
  ],
};

type FindingDraft = Partial<Finding> & {
  finding_type?: FindingType;
  severity_changed_by?: string | null;
  severity_changed_at?: string | null;
};

export function FindingForm({ finding, onSave, onCancel, engagementId }: FindingFormProps) {
  const { user } = useApp();
  const initialType: FindingType =
    (finding as FindingDraft | undefined)?.finding_type ??
    severityToFindingType(finding?.severity);

  const [formData, setFormData] = useState<FindingDraft>({
    title: finding?.title || '',
    observation: finding?.observation || '',
    description: finding?.description || '',
    module: finding?.module || '',
    submodule: finding?.submodule || '',
    regulation_reference: finding?.regulation_reference || '',
    nature_of_obligation: finding?.nature_of_obligation || 'mandatory',
    finding_type: initialType,
    compliance_dimension: finding?.compliance_dimension ?? null,
    is_first_miss: finding?.is_first_miss ?? null,
    auto_flag_weaknesses: finding?.auto_flag_weaknesses ?? null,
    severity: findingTypeToSeverity(initialType),
    original_severity: finding?.original_severity || null,
    severity_override_reason: finding?.severity_override_reason || null,
    status: finding?.status || 'draft',
    recommendation: finding?.recommendation || '',
    root_cause: finding?.root_cause || '',
    management_response: finding?.management_response || '',
    target_remediation_date: finding?.target_remediation_date || null,
    remediation_status: finding?.remediation_status || 'open',
    date_identified: finding?.date_identified || new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClassificationChange = (next: FindingType) => {
    setFormData(prev => {
      const original = (finding as FindingDraft | undefined)?.finding_type ??
        severityToFindingType(finding?.severity);
      const changedFromOriginal = finding != null && next !== original;
      return {
        ...prev,
        finding_type: next,
        severity: findingTypeToSeverity(next),
        // Stash original severity for audit trail when user overrides an auto-flag default
        original_severity: changedFromOriginal
          ? prev.original_severity || finding?.severity
          : prev.original_severity,
        severity_changed_by: changedFromOriginal ? user?.id : prev.severity_changed_by,
        severity_changed_at: changedFromOriginal ? new Date().toISOString() : prev.severity_changed_at,
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.module) {
      return;
    }
    setSaving(true);
    const success = await onSave(formData);
    setSaving(false);
  };

  const getSourceInfo = () => {
    if (!finding) return null;
    
    const sources = [];
    if (finding.source_kyc_individual_id) sources.push({ type: 'KYC Individual Sample', id: finding.source_kyc_individual_id });
    if (finding.source_kyc_business_id) sources.push({ type: 'KYC Business Sample', id: finding.source_kyc_business_id });
    if (finding.source_reporting_sample_id) sources.push({ type: 'Transaction Report', id: finding.source_reporting_sample_id });
    if (finding.source_aml_finding_id) sources.push({ type: 'AML Program Finding', id: finding.source_aml_finding_id });
    if (finding.source_governance_response_id) sources.push({ type: 'Governance Response', id: finding.source_governance_response_id });
    if (finding.source_workpaper_id) sources.push({ type: 'Workpaper', id: finding.source_workpaper_id });
    if (finding.source_interview_id) sources.push({ type: 'Interview', id: finding.source_interview_id });
    
    return sources.length > 0 ? sources : null;
  };

  const sourceInfo = getSourceInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{finding ? 'Edit Finding' : 'New Finding'}</h2>
          <p className="text-sm text-muted-foreground">
            {finding ? `Finding ID: ${finding.id.slice(0, 8)}...` : 'Create a new audit finding'}
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={saving || !formData.title || !formData.module}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Finding'}
        </Button>
      </div>

      {/* Source Traceability Banner */}
      {sourceInfo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Linked to:</span>
              {sourceInfo.map((source, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {source.type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finding Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Finding Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Short, factual description of the issue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observation">Observation (What was found)</Label>
                <Textarea
                  id="observation"
                  value={formData.observation || ''}
                  onChange={e => handleChange('observation', e.target.value)}
                  placeholder="Describe what was identified during testing..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regulation_reference">Regulatory Reference</Label>
                <Input
                  id="regulation_reference"
                  value={formData.regulation_reference || ''}
                  onChange={e => handleChange('regulation_reference', e.target.value)}
                  placeholder="e.g., PCMLTFR s. 64.1(1)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="root_cause">Root Cause (Optional)</Label>
                <Textarea
                  id="root_cause"
                  value={formData.root_cause || ''}
                  onChange={e => handleChange('root_cause', e.target.value)}
                  placeholder="Underlying cause of the deficiency..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recommendation">Issue-Level Recommendation</Label>
                <Textarea
                  id="recommendation"
                  value={formData.recommendation || ''}
                  onChange={e => handleChange('recommendation', e.target.value)}
                  placeholder="Action-oriented recommendation to address the finding..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This is an input to the Audit Report, not final wording.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Management Response & Remediation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="management_response">Management Response</Label>
                <Textarea
                  id="management_response"
                  value={formData.management_response || ''}
                  onChange={e => handleChange('management_response', e.target.value)}
                  placeholder="Client's response to the finding..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_remediation_date">Target Remediation Date</Label>
                  <Input
                    id="target_remediation_date"
                    type="date"
                    value={formData.target_remediation_date || ''}
                    onChange={e => handleChange('target_remediation_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remediation_status">Remediation Status</Label>
                  <Select
                    value={formData.remediation_status || 'open'}
                    onValueChange={v => handleChange('remediation_status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="remediated">Remediated</SelectItem>
                      <SelectItem value="accepted_risk">Accepted Risk</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select
                  value={formData.module || ''}
                  onValueChange={v => {
                    handleChange('module', v);
                    handleChange('submodule', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.module && SUBMODULE_OPTIONS[formData.module] && (
                <div className="space-y-2">
                  <Label>Sub-module</Label>
                  <Select
                    value={formData.submodule || ''}
                    onValueChange={v => handleChange('submodule', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-module" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBMODULE_OPTIONS[formData.module].map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nature of Obligation</Label>
                <Select
                  value={formData.nature_of_obligation || 'mandatory'}
                  onValueChange={v => handleChange('nature_of_obligation', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mandatory">Mandatory</SelectItem>
                    <SelectItem value="reasonable_measures">Reasonable Measures</SelectItem>
                    <SelectItem value="best_practice">Best Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classification</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Firm's internal Deficiency Severity grading. Drives the narrative and remediation priority in the audit report.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.finding_type ?? 'partial_moderate'}
                  onValueChange={v => handleClassificationChange(v as FindingType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-w-sm">
                    {FINDING_TYPES.map(t => (
                      <SelectItem key={t.type} value={t.type}>
                        <div className="flex flex-col items-start py-0.5">
                          <span className="text-sm font-medium">{t.label}</span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {t.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className={cn(
                  'text-xs',
                  getFindingTypeMeta(formData.finding_type).badge,
                )}>
                  {getFindingTypeMeta(formData.finding_type).shortLabel}
                </Badge>
              </div>

              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{getFindingTypeMeta(formData.finding_type).description}</span>
              </div>

              <div className="space-y-2">
                <Label>Compliance dimension</Label>
                <Select
                  value={formData.compliance_dimension ?? 'unset'}
                  onValueChange={v => handleChange('compliance_dimension', v === 'unset' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not specified</SelectItem>
                    <SelectItem value="documentation">Documentation — policy / procedure missing or incomplete</SelectItem>
                    <SelectItem value="application">Application — documented but not followed in practice</SelectItem>
                    <SelectItem value="both">Both — neither documented nor applied</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  FINTRAC weights application failures more heavily than documentation gaps.
                </p>
              </div>

              {formData.finding_type === 'complete_nc' && formData.submodule === 'STR' && (
                <div className="space-y-2">
                  <Label>STR recurrence</Label>
                  <Select
                    value={
                      formData.is_first_miss === true ? 'first'
                      : formData.is_first_miss === false ? 'recurrent'
                      : 'unset'
                    }
                    onValueChange={v => handleChange('is_first_miss', v === 'first' ? true : v === 'recurrent' ? false : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Unknown</SelectItem>
                      <SelectItem value="first">First miss — no prior STR on subject (FINTRAC Level 1, ~$500k)</SelectItem>
                      <SelectItem value="recurrent">Recurrent — prior STR exists on similar suspicion (Level 2, ~$250k)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {Array.isArray(formData.auto_flag_weaknesses) && formData.auto_flag_weaknesses.length > 0 && (
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                  <p className="font-medium text-foreground">Auto-classification trace</p>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {formData.auto_flag_weaknesses.map((w: any, i: number) => (
                      <li key={i} className="flex gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {getFindingTypeMeta(w.finding_type).shortLabel}
                        </Badge>
                        <span className="capitalize">{String(w.dimension).replace('_', ' ')}:</span>
                        <span>{w.rationale}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {formData.original_severity && formData.original_severity !== formData.severity && (
                <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/50 rounded border border-warning/30">
                  <p className="font-medium text-foreground">Reclassified from auto-flag default</p>
                  <p>Original severity: <strong>{formData.original_severity}</strong> ({severityToFindingType(formData.original_severity).replace('_', ' ')})</p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status || 'draft'}
                  onValueChange={v => handleChange('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Identified</Label>
                <Input
                  type="date"
                  value={formData.date_identified || ''}
                  onChange={e => handleChange('date_identified', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
