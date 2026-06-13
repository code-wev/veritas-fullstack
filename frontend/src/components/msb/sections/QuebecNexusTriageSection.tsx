import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, MapPin, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface QuebecNexusTriageSectionProps {
  registrationId: string;
  engagementId: string;
  onTriageResult?: (result: TriageResult) => void;
}

export type TriageResult =
  | { state: 'incomplete' }
  | { state: 'no_nexus' }                        // No QC presence/clients → skip remaining sections
  | { state: 'gap_unregistered' }                // Has QC nexus but not registered → registration gap finding
  | { state: 'registered_full_audit' };          // Registered with RQ → run full audit

const TRIAGE_QUESTIONS = [
  {
    key: 'has_physical_presence_qc' as const,
    label: 'Does the MSB have a physical location, branch, or agent in Québec?',
    triggers: true,
  },
  {
    key: 'serves_quebec_id_clients' as const,
    label: 'Does the MSB onboard or serve clients presenting Québec-issued ID or with a Québec address?',
    triggers: true,
  },
  {
    key: 'targets_quebec_residents' as const,
    label: 'Does the MSB market to, target, or process transactions originating from Québec residents?',
    triggers: false, // informational — does NOT trigger gap on its own
  },
];

export function QuebecNexusTriageSection({ registrationId, engagementId, onTriageResult }: QuebecNexusTriageSectionProps) {
  const queryClient = useQueryClient();

  const { data: triage, isLoading } = useQuery({
    queryKey: ['msb-qc-triage', registrationId],
    queryFn: async () => {
      const { data: existing } = await supabase
        .from('msb_quebec_nexus_triage')
        .select('*')
        .eq('registration_id', registrationId)
        .maybeSingle();
      if (existing) return existing;
      const { data: created, error } = await supabase
        .from('msb_quebec_nexus_triage')
        .insert({ registration_id: registrationId, engagement_id: engagementId })
        .select()
        .single();
      if (error) throw error;
      return created;
    },
  });

  const [form, setForm] = useState({
    has_physical_presence_qc: '',
    serves_quebec_id_clients: '',
    targets_quebec_residents: '',
    is_registered_with_rq: false,
    triage_notes: '',
  });

  useEffect(() => {
    if (triage) {
      setForm({
        has_physical_presence_qc: triage.has_physical_presence_qc || '',
        serves_quebec_id_clients: triage.serves_quebec_id_clients || '',
        targets_quebec_residents: triage.targets_quebec_residents || '',
        is_registered_with_rq: triage.is_registered_with_rq || false,
        triage_notes: triage.triage_notes || '',
      });
    }
  }, [triage?.id]);

  // Compute triage result (per user spec: physical presence OR Québec-ID clients trigger nexus)
  const computeResult = (data: typeof form): TriageResult => {
    const allAnswered = TRIAGE_QUESTIONS.every(q => data[q.key]);
    if (!allAnswered) return { state: 'incomplete' };

    const triggeringNexus =
      data.has_physical_presence_qc === 'yes' || data.serves_quebec_id_clients === 'yes';

    if (!triggeringNexus) return { state: 'no_nexus' };
    if (data.is_registered_with_rq) return { state: 'registered_full_audit' };
    return { state: 'gap_unregistered' };
  };

  const result = computeResult(form);

  useEffect(() => {
    onTriageResult?.(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.state]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('msb_quebec_nexus_triage')
        .update({
          has_physical_presence_qc: form.has_physical_presence_qc || null,
          serves_quebec_id_clients: form.serves_quebec_id_clients || null,
          targets_quebec_residents: form.targets_quebec_residents || null,
          is_registered_with_rq: form.is_registered_with_rq,
          triage_notes: form.triage_notes,
          triage_completed: result.state !== 'incomplete',
        })
        .eq('registration_id', registrationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-qc-triage', registrationId] });
      toast.success('Quebec nexus triage saved');
    },
    onError: (err) => toast.error('Save failed: ' + err.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Québec Nexus Triage
        </CardTitle>
        <CardDescription>
          Revenu Québec MSB registration applies only to MSBs operating in Québec, serving Québec residents,
          or with a physical presence in the province. Complete this triage before proceeding to the
          Revenu Québec audit checklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Triage questions */}
        <div className="space-y-5">
          {TRIAGE_QUESTIONS.map((q, idx) => (
            <div key={q.key} className="space-y-2 border-l-2 border-muted pl-4">
              <Label className="font-medium">
                {idx + 1}. {q.label}
                {q.triggers && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">(triggers nexus if Yes)</span>
                )}
              </Label>
              <RadioGroup
                value={form[q.key]}
                onValueChange={(v) => setForm(prev => ({ ...prev, [q.key]: v }))}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id={`${q.key}-yes`} />
                  <Label htmlFor={`${q.key}-yes`} className="cursor-pointer font-normal">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id={`${q.key}-no`} />
                  <Label htmlFor={`${q.key}-no`} className="cursor-pointer font-normal">No</Label>
                </div>
              </RadioGroup>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2 border-t">
            <Checkbox
              id="is_registered_with_rq"
              checked={form.is_registered_with_rq}
              onCheckedChange={(v) => setForm(prev => ({ ...prev, is_registered_with_rq: !!v }))}
            />
            <Label htmlFor="is_registered_with_rq" className="cursor-pointer">
              MSB is currently registered with Revenu Québec
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="triage_notes">Reviewer notes / supporting evidence</Label>
            <Textarea
              id="triage_notes"
              value={form.triage_notes}
              onChange={(e) => setForm(prev => ({ ...prev, triage_notes: e.target.value }))}
              placeholder="Document the basis for the answers above (e.g., reviewed client onboarding sample, confirmed no QC addresses in CRM, etc.)"
              rows={3}
            />
          </div>
        </div>

        {/* Result banner */}
        {result.state === 'no_nexus' && (
          <div className="flex items-start gap-2 p-4 rounded-md border border-primary/40 bg-primary/5 text-sm">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-primary">
                No Québec nexus established — Revenu Québec registration not required
              </p>
              <p className="text-muted-foreground text-xs">
                The remaining audit sections (Registration Details, Status Validation, Change Detection) are
                not applicable. Document this conclusion in Findings &amp; Observations.
              </p>
            </div>
          </div>
        )}

        {result.state === 'gap_unregistered' && (
          <div className="flex items-start gap-2 p-4 rounded-md border border-destructive/40 bg-destructive/10 text-sm">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-destructive">
                Registration Gap — MSB has Québec nexus but is not registered with Revenu Québec
              </p>
              <p className="text-muted-foreground text-xs">
                This will be auto-flagged as a finding. The MSB is expected to register with Revenu Québec
                under the Money-Services Businesses Act (Québec).
              </p>
            </div>
          </div>
        )}

        {result.state === 'registered_full_audit' && (
          <div className="flex items-start gap-2 p-4 rounded-md border border-primary/40 bg-primary/10 text-sm">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-primary">
                Québec nexus confirmed — proceed with full Revenu Québec audit
              </p>
              <p className="text-muted-foreground text-xs">
                Complete Registration Details, Status Validation, and Change Detection sections.
              </p>
            </div>
          </div>
        )}

        {result.state === 'incomplete' && (
          <div className="flex items-start gap-2 p-4 rounded-md border border-muted bg-muted/30 text-sm">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Answer all three triage questions to determine the Revenu Québec audit scope.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Triage'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
