import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Save, AlertTriangle, CheckCircle, CheckCircle2, AlertCircle, MinusCircle, FileSearch } from 'lucide-react';

interface ChangeDetectionSectionProps {
  registrationId: string;
  engagementId?: string;
  /** Defaults to 'fintrac'. Quebec hides the Sources Reviewed UI to keep
   *  the original pre-redesign behavior. */
  registrationType?: 'fintrac' | 'revenu_quebec';
}

interface ChangeCategory {
  key: string;            // boolean column - changed?
  label: string;
  notesKey: string;       // text column - description of change
  result30DayKey: string; // text column - yes/no/na
  findingTitle: string;
}

/**
 * The catalog of evidence sources an auditor may consult. Each change
 * category below lists which subset is relevant; the UI only shows those.
 */
const SOURCE_CATALOG: Record<string, { label: string }> = {
  corporate_profile: { label: 'Corporate Profile Report (federal/provincial)' },
  articles: { label: 'Articles of incorporation / shareholders register' },
  compliance_officer_interview: { label: 'Compliance officer interview' },
  management_interview: { label: 'Management interview' },
  internal_records: { label: 'Internal records (agent registers, branch lists, bank statements)' },
};

/**
 * Per-category map of relevant evidence sources. Drives which checkboxes
 * appear under each change category when it's toggled on.
 */
const CATEGORY_SOURCES: Record<string, string[]> = {
  board_of_directors_changed:    ['corporate_profile', 'articles', 'management_interview'],
  senior_management_changed:     ['corporate_profile', 'management_interview'],
  compliance_officer_changed:    ['compliance_officer_interview', 'management_interview'],
  shareholders_changed:          ['corporate_profile', 'articles', 'management_interview'],
  business_activities_changed:   ['management_interview', 'compliance_officer_interview', 'internal_records'],
  agents_branches_changed:       ['management_interview', 'internal_records'],
  head_office_address_changed:   ['corporate_profile', 'management_interview'],
  banking_relationships_changed: ['management_interview', 'internal_records'],
  authorized_persons_changed:    ['management_interview', 'compliance_officer_interview'],
};

type CategorySources = Record<string, string[]>;

// FINTRAC labels — user renamed "Board of Directors" → "Directors" and
// "Senior Management" → "Officers" to match how FINTRAC names them.
const FINTRAC_CHANGE_CATEGORIES: ChangeCategory[] = [
  { key: 'board_of_directors_changed', label: 'Directors', notesKey: 'board_notes', result30DayKey: 'board_30day_result', findingTitle: 'Directors change not reported to FINTRAC within 30 days' },
  { key: 'senior_management_changed', label: 'Officers', notesKey: 'management_notes', result30DayKey: 'management_30day_result', findingTitle: 'Officers change not reported to FINTRAC within 30 days' },
  { key: 'compliance_officer_changed', label: 'Compliance Officer', notesKey: 'compliance_officer_notes', result30DayKey: 'compliance_officer_30day_result', findingTitle: 'Compliance Officer change not reported to FINTRAC within 30 days' },
  { key: 'shareholders_changed', label: 'Shareholders or Beneficial Owners', notesKey: 'shareholders_notes', result30DayKey: 'shareholders_30day_result', findingTitle: 'Shareholder/beneficial owner change not reported to FINTRAC within 30 days' },
  { key: 'business_activities_changed', label: 'Business activities or services offered', notesKey: 'activities_notes', result30DayKey: 'activities_30day_result', findingTitle: 'Business activities change not reported to FINTRAC within 30 days' },
  { key: 'agents_branches_changed', label: 'Agents or branches added or removed', notesKey: 'agents_notes', result30DayKey: 'agents_30day_result', findingTitle: 'Agents/branches change not reported to FINTRAC within 30 days' },
  { key: 'head_office_address_changed', label: 'Head office or business address', notesKey: 'address_notes', result30DayKey: 'address_30day_result', findingTitle: 'Head office address change not reported to FINTRAC within 30 days' },
  { key: 'banking_relationships_changed', label: 'Banking relationships (new or closed accounts)', notesKey: 'banking_notes', result30DayKey: 'banking_30day_result', findingTitle: 'Banking relationships change not reported to FINTRAC within 30 days' },
  { key: 'authorized_persons_changed', label: 'Authorized persons on FINTRAC profile', notesKey: 'authorized_persons_notes', result30DayKey: 'authorized_persons_30day_result', findingTitle: 'Authorized persons change not reported to FINTRAC within 30 days' },
];

// Quebec labels — kept verbatim from the original pre-redesign content per
// explicit user instruction not to change Quebec.
const QUEBEC_CHANGE_CATEGORIES: ChangeCategory[] = [
  { key: 'board_of_directors_changed', label: 'Board of Directors', notesKey: 'board_notes', result30DayKey: 'board_30day_result', findingTitle: 'Board of Directors change not reported to FINTRAC within 30 days' },
  { key: 'senior_management_changed', label: 'Senior Management', notesKey: 'management_notes', result30DayKey: 'management_30day_result', findingTitle: 'Senior Management change not reported to FINTRAC within 30 days' },
  { key: 'compliance_officer_changed', label: 'Compliance Officer', notesKey: 'compliance_officer_notes', result30DayKey: 'compliance_officer_30day_result', findingTitle: 'Compliance Officer change not reported to FINTRAC within 30 days' },
  { key: 'shareholders_changed', label: 'Shareholders or Beneficial Owners', notesKey: 'shareholders_notes', result30DayKey: 'shareholders_30day_result', findingTitle: 'Shareholder/beneficial owner change not reported to FINTRAC within 30 days' },
  { key: 'business_activities_changed', label: 'Business activities or services offered', notesKey: 'activities_notes', result30DayKey: 'activities_30day_result', findingTitle: 'Business activities change not reported to FINTRAC within 30 days' },
  { key: 'agents_branches_changed', label: 'Agents or branches added or removed', notesKey: 'agents_notes', result30DayKey: 'agents_30day_result', findingTitle: 'Agents/branches change not reported to FINTRAC within 30 days' },
  { key: 'head_office_address_changed', label: 'Head office or business address', notesKey: 'address_notes', result30DayKey: 'address_30day_result', findingTitle: 'Head office address change not reported to FINTRAC within 30 days' },
  { key: 'banking_relationships_changed', label: 'Banking relationships (new or closed accounts)', notesKey: 'banking_notes', result30DayKey: 'banking_30day_result', findingTitle: 'Banking relationships change not reported to FINTRAC within 30 days' },
  { key: 'authorized_persons_changed', label: 'Authorized persons on FINTRAC profile', notesKey: 'authorized_persons_notes', result30DayKey: 'authorized_persons_30day_result', findingTitle: 'Authorized persons change not reported to FINTRAC within 30 days' },
];

function getChangeCategories(registrationType: 'fintrac' | 'revenu_quebec'): ChangeCategory[] {
  return registrationType === 'revenu_quebec' ? QUEBEC_CHANGE_CATEGORIES : FINTRAC_CHANGE_CATEGORIES;
}

async function syncCategoryFindings(
  engagementId: string,
  registrationId: string,
  formData: Record<string, any>,
  categories: ChangeCategory[],
) {
  const { data: existing } = await supabase
    .from('findings')
    .select('id, submodule')
    .eq('engagement_id', engagementId)
    .eq('module', 'msb_registration')
    .like('submodule', `change-30day:${registrationId}:%`);

  const existingMap = new Map((existing || []).map(f => [f.submodule, f.id]));

  for (const cat of categories) {
    const submoduleKey = `change-30day:${registrationId}:${cat.key}`;
    const changed = formData[cat.key] === true;
    const result = formData[cat.result30DayKey];
    const shouldExist = changed && result === 'no';

    if (shouldExist) {
      const payload = {
        engagement_id: engagementId,
        module: 'msb_registration',
        submodule: submoduleKey,
        title: cat.findingTitle,
        severity: 'partial_important',
        status: 'open',
        description: `A change was identified in ${cat.label} but FINTRAC was not notified within 30 days as required by PCMLTFR s.11.13.`,
        observation: formData[cat.notesKey] || null,
        regulation_reference: 'PCMLTFR s.11.13; PCMLTFR s.156(1)(a)',
        date_identified: new Date().toISOString().split('T')[0],
      };
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

  // Clean up legacy single-finding from old standalone 30-day card
  await supabase.from('findings').delete()
    .eq('engagement_id', engagementId)
    .eq('module', 'msb_registration')
    .eq('submodule', `change-notification:${registrationId}`);
}

export function ChangeDetectionSection({ registrationId, engagementId, registrationType = 'fintrac' }: ChangeDetectionSectionProps) {
  const showSourcesReviewed = registrationType !== 'revenu_quebec';
  const categories = getChangeCategories(registrationType);
  const queryClient = useQueryClient();

  const { data: changeData, isLoading } = useQuery({
    queryKey: ['msb-change-detection', registrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msb_change_detection')
        .select('*')
        .eq('registration_id', registrationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const buildInitial = (): Record<string, any> => {
    const s: Record<string, any> = { category_sources: {} as CategorySources };
    categories.forEach(cat => {
      s[cat.key] = false;
      s[cat.notesKey] = '';
      s[cat.result30DayKey] = '';
    });
    return s;
  };

  const [formData, setFormData] = useState<Record<string, any>>(buildInitial);

  useEffect(() => {
    if (changeData) {
      const next: Record<string, any> = {
        category_sources: ((changeData as any).category_sources ?? {}) as CategorySources,
      };
      categories.forEach(cat => {
        next[cat.key] = (changeData as any)[cat.key] || false;
        next[cat.notesKey] = (changeData as any)[cat.notesKey] || '';
        next[cat.result30DayKey] = (changeData as any)[cat.result30DayKey] || '';
      });
      setFormData(next);
    }
  }, [changeData]);

  const getSourcesFor = (categoryKey: string): string[] => {
    const m = (formData.category_sources ?? {}) as CategorySources;
    return m[categoryKey] ?? [];
  };

  const toggleCategorySource = (categoryKey: string, sourceCode: string, checked: boolean) => {
    setFormData(prev => {
      const current = ((prev.category_sources ?? {}) as CategorySources)[categoryKey] ?? [];
      const next = checked
        ? Array.from(new Set([...current, sourceCode]))
        : current.filter((c: string) => c !== sourceCode);
      return {
        ...prev,
        category_sources: {
          ...((prev.category_sources ?? {}) as CategorySources),
          [categoryKey]: next,
        },
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // When a toggle is off, clear its embedded fields so stale data doesn't linger
      const clean: Record<string, any> = { ...data };
      categories.forEach(cat => {
        if (!clean[cat.key]) {
          clean[cat.notesKey] = null;
          clean[cat.result30DayKey] = null;
        }
      });

      if (changeData) {
        const { error } = await supabase
          .from('msb_change_detection')
          .update(clean as any)
          .eq('id', changeData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('msb_change_detection')
          .insert({ ...clean, registration_id: registrationId } as any);
        if (error) throw error;
      }
      if (engagementId) {
        await syncCategoryFindings(engagementId, registrationId, clean, categories);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-change-detection', registrationId] });
      if (engagementId) queryClient.invalidateQueries({ queryKey: ['msb-findings', engagementId] });
      toast.success('Change detection saved & findings synced');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const changesDetected = categories.filter(cat => formData[cat.key] === true).length;
  const lateNotifications = categories.filter(
    cat => formData[cat.key] === true && formData[cat.result30DayKey] === 'no'
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Change Detection</CardTitle>
              <CardDescription>
                Toggle a category to "Changed" to capture details and confirm whether FINTRAC was notified within 30 days. A "No" answer auto-creates a finding on save.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={changesDetected > 0 ? 'destructive' : 'default'}>
                {changesDetected} Change{changesDetected !== 1 ? 's' : ''}
              </Badge>
              {lateNotifications > 0 && (
                <Badge variant="destructive">{lateNotifications} Late Notification{lateNotifications !== 1 ? 's' : ''}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-1">Instructions:</p>
            <p>For each category, indicate whether a change occurred during the review period. When marked as Changed, provide details and confirm if FINTRAC was notified within 30 days (PCMLTFR s.11.13).</p>
          </div>

          {categories.map((category) => {
            const isChanged = formData[category.key] === true;
            const result = formData[category.result30DayKey];
            const isLate = isChanged && result === 'no';

            return (
              <div
                key={category.key}
                className={`p-4 border rounded-lg space-y-3 ${
                  isLate ? 'border-destructive/30 bg-destructive/5' : isChanged ? 'border-amber-500/30 bg-amber-500/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isLate ? (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    ) : isChanged ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                    <Label htmlFor={category.key} className="font-medium cursor-pointer">
                      {category.label}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {isChanged ? 'Changed' : 'No Change'}
                    </span>
                    <Switch
                      id={category.key}
                      checked={isChanged}
                      onCheckedChange={(checked) => handleToggle(category.key, checked)}
                    />
                  </div>
                </div>

                {/* Sources Reviewed — always visible (FINTRAC only). Sits outside
                    the isChanged conditional so the auditor records what they
                    consulted to reach their toggle decision, not just after the
                    fact. */}
                {showSourcesReviewed && (
                  <div className="ml-8 space-y-2 pt-2 border-t">
                    <Label className="text-sm flex items-center gap-1.5">
                      <FileSearch className="h-3.5 w-3.5 text-muted-foreground" />
                      Sources reviewed for this category:
                    </Label>
                    <div className="space-y-1.5 pl-1">
                      {(CATEGORY_SOURCES[category.key] ?? []).map((sourceCode) => {
                        const src = SOURCE_CATALOG[sourceCode];
                        if (!src) return null;
                        const id = `${category.key}__${sourceCode}`;
                        const checked = getSourcesFor(category.key).includes(sourceCode);
                        return (
                          <div key={sourceCode} className="flex items-start gap-2">
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={(c) => toggleCategorySource(category.key, sourceCode, c === true)}
                              className="mt-0.5"
                            />
                            <Label htmlFor={id} className="text-sm font-normal cursor-pointer leading-tight">
                              {src.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isChanged && (
                  <div className="ml-8 space-y-4 pt-2 border-t">
                    {/* 30-day notification question */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Was the change communicated to FINTRAC within 30 days?
                      </Label>
                      <RadioGroup
                        value={result || ''}
                        onValueChange={(value) => handleChange(category.result30DayKey, value)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id={`${category.key}-yes`} />
                          <Label htmlFor={`${category.key}-yes`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id={`${category.key}-no`} />
                          <Label htmlFor={`${category.key}-no`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                            No
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="na" id={`${category.key}-na`} />
                          <Label htmlFor={`${category.key}-na`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            N/A
                          </Label>
                        </div>
                      </RadioGroup>
                      {isLate && (
                        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span><strong>Auto-Finding on Save:</strong> Late or no notification → Partial Non-Compliance (Important)</span>
                        </div>
                      )}
                    </div>

                    {/* Details of change */}
                    <div className="space-y-2">
                      <Label htmlFor={category.notesKey} className="text-sm">
                        Details of change:
                      </Label>
                      <Textarea
                        id={category.notesKey}
                        value={formData[category.notesKey] || ''}
                        onChange={(e) => handleChange(category.notesKey, e.target.value)}
                        placeholder="Describe the change, including dates and relevant details..."
                        rows={2}
                      />
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
