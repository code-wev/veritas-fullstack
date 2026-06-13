import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, CheckCircle2, AlertCircle, MinusCircle, Globe, FileSearch } from 'lucide-react';
import { findingTypeToSeverity, type FindingType } from '@/lib/findingClassification';
import { ItemEvidenceUpload } from './ItemEvidenceUpload';

interface StatusValidationSectionProps {
  registrationId: string;
  engagementId: string;
  registration: any;
  /** Defaults to 'fintrac'. Quebec keeps the original 3-item triangle. */
  registrationType?: 'fintrac' | 'revenu_quebec';
}

interface AuditItem {
  key: string;             // result column on msb_status_validation (text yes/no/na)
  notesKey: string;        // notes column on msb_status_validation
  itemNumber: number;
  question: string;
  auditInstruction: string;
  evidence: string;
  failureLogic: string;
  findingTitle: string;
  findingSeverity: 'complete_nc' | 'partial_important' | 'partial_moderate' | 'partial_lesser';
  regulationReference: string;
}

interface AuditSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: AuditItem[];
}

// FINTRAC: simplified registration-status check. The 30-day change-notification
// test happens on the Change Detection tab (PCMLTFR s.11.13).
const FINTRAC_AUDIT_SECTIONS: AuditSection[] = [
  {
    id: 'A',
    title: 'Section A — Registry Status',
    icon: Globe,
    items: [
      {
        key: 'registration_confirmed_on_website',
        notesKey: 'validation_notes',
        itemNumber: 1,
        question: 'Active Registration & Non-Expired Status',
        auditInstruction:
          'Access the FINTRAC MSB registry and confirm that the entity is registered, that the registration status is active, that the registration number is consistent with the entity\'s internal records, and that the expiry date has not passed. Note the registration date and expiry date. If the registration is missing, expired, suspended, or otherwise not in active standing, document the date and circumstances in the Auditor Notes.',
        evidence: 'FINTRAC registry screenshot showing status + expiry · Certificate of incorporation · Corporate Profile Report (Federal or Provincial)',
        failureLogic: 'Not registered, expired, or suspended → Complete Non-Compliance (operating as unregistered MSB). Registered but with active-standing concerns → escalate to auditor judgment.',
        findingTitle: 'MSB is not currently registered with FINTRAC or registration is not in active standing',
        findingSeverity: 'complete_nc',
        regulationReference: 'PCMLTFA s.11.1; PCMLTFR s.11.11',
      },
      {
        key: 'fintrac_forms_obtained',
        notesKey: 'fintrac_forms_notes',
        itemNumber: 2,
        question: 'Renewal / Update Submitted Before Registration Expiry',
        auditInstruction:
          'Obtain the FINTRAC registration renewal or update form filed by the MSB. Verify the submission date on the form and compare it to the expiry date shown on the FINTRAC registry. ' +
          'If the form was submitted BEFORE the registry expiry date, the MSB is compliant even when the registry has not yet been updated — FINTRAC has a processing lag between receipt and registry update. ' +
          'If the form was submitted ON or AFTER the expiry date, the MSB operated unregistered during the gap period. Document the submission date, the registry expiry date, and the gap (in days) in the Auditor Notes. ' +
          'Mark N/A if no recent renewal or update is on file (e.g., the registration has been continuously active and no submission was due in this review period).',
        evidence: 'FINTRAC renewal or update form showing submission date · FINTRAC registry screenshot showing expiry date',
        failureLogic: 'Renewal or update submitted on or after the registry expiry date → Partial Non-Compliance (Important): MSB operated unregistered during the gap. Auditor may downgrade to Moderate if the gap is short and well-documented.',
        findingTitle: 'FINTRAC renewal or update was not submitted before the registration expiry date',
        findingSeverity: 'partial_important',
        regulationReference: 'PCMLTFR s.11.13; PCMLTFA s.11.11',
      },
    ],
  },
];

// Revenu Québec: Quebec-specific licence validation — references Revenu Québec
// and the Quebec Money-Services Businesses Act, no FINTRAC terminology.
const QUEBEC_AUDIT_SECTIONS: AuditSection[] = [
  {
    id: 'A',
    title: 'Section A — Revenu Québec Licence Status',
    icon: Globe,
    items: [
      {
        key: 'registration_confirmed_on_website',
        notesKey: 'validation_notes',
        itemNumber: 1,
        question: 'Active Revenu Québec Licence & Non-Expired Status',
        auditInstruction:
          'Access the Revenu Québec MSB registry and confirm the entity is licensed, the licence is active, and the expiry date has not passed. Revenu Québec MSB licences renew annually. Note the licence number, issuance date, and expiry date. If the licence is missing, expired, suspended, or revoked, document the date and circumstances in the Auditor Notes.',
        evidence: 'Revenu Québec MSB registry screenshot · Revenu Québec licence certificate · Corporate Profile Report (Federal or Provincial)',
        failureLogic: 'Not licensed, expired, suspended, or revoked → Complete Non-Compliance (operating as unlicensed MSB under the Money-Services Businesses Act).',
        findingTitle: 'MSB is not currently licensed by Revenu Québec or licence is not in active standing',
        findingSeverity: 'complete_nc',
        regulationReference: 'Money-Services Businesses Act (Québec), CQLR c E-12.000001',
      },
    ],
  },
];

function getAuditSections(registrationType: 'fintrac' | 'revenu_quebec'): AuditSection[] {
  return registrationType === 'revenu_quebec' ? QUEBEC_AUDIT_SECTIONS : FINTRAC_AUDIT_SECTIONS;
}

// Sync findings: when a checklist item is "fail" (no), upsert a finding;
// when it's pass/na/empty, remove the auto-generated finding for that source.
async function syncChecklistFindings(
  engagementId: string,
  registrationId: string,
  formData: Record<string, string>,
  items: AuditItem[]
) {
  // Fetch existing auto-created findings for this registration's checklist
  const { data: existing } = await supabase
    .from('findings')
    .select('id, submodule')
    .eq('engagement_id', engagementId)
    .eq('module', 'msb_registration')
    .like('submodule', `checklist:${registrationId}:%`);

  const existingMap = new Map((existing || []).map(f => [f.submodule, f.id]));

  for (const item of items) {
    const submoduleKey = `checklist:${registrationId}:${item.key}`;
    const result = formData[item.key];
    const shouldExist = result === 'no'; // 'no' = Fail in this DB schema

    if (shouldExist) {
      // findingSeverity in the spec uses FINTRAC harm-done codes
      // (complete_nc / partial_*). Write BOTH severity (legacy) and
      // finding_type (new) so the DB stays consistent regardless of which
      // column other UIs read.
      const findingType = item.findingSeverity as FindingType;
      const payload = {
        engagement_id: engagementId,
        module: 'msb_registration',
        submodule: submoduleKey,
        title: item.findingTitle,
        severity: findingTypeToSeverity(findingType),
        finding_type: findingType,
        status: 'open',
        description: item.auditInstruction,
        observation: formData[item.notesKey] || null,
        regulation_reference: item.regulationReference,
        date_identified: new Date().toISOString().split('T')[0],
      } as any;
      if (existingMap.has(submoduleKey)) {
        await supabase.from('findings').update({
          observation: payload.observation,
          description: payload.description,
        }).eq('id', existingMap.get(submoduleKey)!);
      } else {
        await supabase.from('findings').insert(payload);
      }
    } else if (existingMap.has(submoduleKey)) {
      await supabase.from('findings').delete().eq('id', existingMap.get(submoduleKey)!);
    }
  }
}

export function StatusValidationSection({ registrationId, engagementId, registrationType = 'fintrac' }: StatusValidationSectionProps) {
  const queryClient = useQueryClient();

  const auditSections = getAuditSections(registrationType);
  const allKeys = auditSections.flatMap(s => s.items.map(i => i.key));
  const allNotesKeys = [...new Set(auditSections.flatMap(s => s.items.map(i => i.notesKey)))];
  const allItems = auditSections.flatMap(s => s.items);

  const { data: validation, isLoading } = useQuery({
    queryKey: ['msb-status-validation', registrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msb_status_validation')
        .select('*')
        .eq('registration_id', registrationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (validation) {
      const data: Record<string, string> = {};
      allKeys.forEach(key => { data[key] = (validation as any)[key] || ''; });
      allNotesKeys.forEach(key => { data[key] = (validation as any)[key] || ''; });
      setFormData(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation, registrationType]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      if (validation) {
        const { error } = await supabase
          .from('msb_status_validation')
          .update(data as any)
          .eq('id', validation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('msb_status_validation')
          .insert({ ...data, registration_id: registrationId } as any);
        if (error) throw error;
      }
      // Auto-create / update / remove findings based on Fail items
      await syncChecklistFindings(engagementId, registrationId, data, allItems);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-status-validation', registrationId] });
      queryClient.invalidateQueries({ queryKey: ['msb-findings', engagementId] });
      toast.success('Audit checklist saved & findings synced');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusIcon = (value: string) => {
    switch (value) {
      case 'yes': return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'no':  return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'na':  return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
      default:    return <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground" />;
    }
  };

  const totalItems = allKeys.length;
  const answeredItems = allKeys.filter(k => formData[k] && formData[k] !== '').length;
  const failItems = allKeys.filter(k => formData[k] === 'no').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>FINTRAC Audit Checklist</CardTitle>
              <CardDescription>
                Lean {totalItems}-item testing across registry cross-check, form corroboration, and 30-day notification compliance. Fail items auto-create findings.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={answeredItems === totalItems ? 'default' : 'secondary'}>
                {answeredItems}/{totalItems} Complete
              </Badge>
              {failItems > 0 && (
                <Badge variant="destructive">
                  {failItems} Auto-Finding{failItems > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sections */}
      {auditSections.map((section) => {
        const SectionIcon = section.icon;
        const sectionAnswered = section.items.filter(i => formData[i.key] && formData[i.key] !== '').length;
        const sectionFails = section.items.filter(i => formData[i.key] === 'no').length;

        return (
          <Card key={section.id} className={sectionFails > 0 ? 'border-destructive/30' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <SectionIcon className="h-4 w-4 text-primary" />
                  {section.title}
                </CardTitle>
                <div className="flex gap-1">
                  <Badge variant={sectionAnswered === section.items.length ? 'default' : 'outline'} className="text-xs">
                    {sectionAnswered}/{section.items.length}
                  </Badge>
                  {sectionFails > 0 && (
                    <Badge variant="destructive" className="text-xs">{sectionFails} Fail</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.items.map((item) => (
                <div
                  key={item.key}
                  className={`p-4 border rounded-lg space-y-3 ${
                    formData[item.key] === 'no' ? 'border-destructive/30 bg-destructive/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      {getStatusIcon(formData[item.key] || '')}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="font-medium">
                          Item {item.itemNumber} — {item.question}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Audit Instruction:</span> {item.auditInstruction}
                        </p>
                      </div>

                      {/* Result */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Result</Label>
                        <RadioGroup
                          value={formData[item.key] || ''}
                          onValueChange={(value) => handleChange(item.key, value)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="yes" id={`${item.key}-pass`} />
                            <Label htmlFor={`${item.key}-pass`} className="flex items-center gap-1 cursor-pointer text-sm">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              Pass
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="no" id={`${item.key}-fail`} />
                            <Label htmlFor={`${item.key}-fail`} className="flex items-center gap-1 cursor-pointer text-sm">
                              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                              Fail
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="na" id={`${item.key}-na`} />
                            <Label htmlFor={`${item.key}-na`} className="flex items-center gap-1 cursor-pointer text-sm">
                              <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              N/A
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {formData[item.key] === 'no' && (
                        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span><strong>Auto-Finding on Save:</strong> {item.failureLogic}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Evidence Required</Label>
                            <ul className="text-sm space-y-1 list-disc pl-5 marker:text-muted-foreground">
                              {item.evidence.split('·').map((e, i) => {
                                const trimmed = e.trim();
                                if (!trimmed) return null;
                                return <li key={i}>{trimmed}</li>;
                              })}
                            </ul>
                          </div>
                          <div className="space-y-1 pt-1">
                            <Label className="text-xs text-muted-foreground">Uploaded Evidence</Label>
                            <ItemEvidenceUpload
                              registrationId={registrationId}
                              engagementId={engagementId}
                              itemKey={item.key}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Auditor Notes</Label>
                          <Textarea
                            value={formData[item.notesKey] || ''}
                            onChange={(e) => handleChange(item.notesKey, e.target.value)}
                            placeholder="Add auditor notes..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save & Sync Findings'}
        </Button>
      </div>
    </div>
  );
}
