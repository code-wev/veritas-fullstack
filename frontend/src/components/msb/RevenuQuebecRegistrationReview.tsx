import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Lock } from 'lucide-react';
import { QuebecNexusTriageSection, type TriageResult } from './sections/QuebecNexusTriageSection';
import { QuebecRegistrationDetailsSection } from './sections/QuebecRegistrationDetailsSection';
import { StatusValidationSection } from './sections/StatusValidationSection';
import { MSBFindingsSection } from './sections/MSBFindingsSection';
import { RegistrySearchUploadSection } from './sections/RegistrySearchUploadSection';
import { SectionNavigationFooter } from '@/components/ui/section-navigation-footer';
import { toast } from 'sonner';

interface RevenuQuebecRegistrationReviewProps {
  engagementId: string;
  clientId: string;
}

const TAB_ORDER = ['triage', 'details', 'validation', 'findings'];
const TAB_LABELS: Record<string, string> = {
  'triage': 'Québec Nexus Triage',
  'details': 'Registration Details',
  'validation': 'Status Validation',
  'findings': 'Findings & Observations',
};

export function RevenuQuebecRegistrationReview({ engagementId, clientId }: RevenuQuebecRegistrationReviewProps) {
  const [activeSection, setActiveSection] = useState('triage');
  const [triageResult, setTriageResult] = useState<TriageResult>({ state: 'incomplete' });

  const { data: registration, isLoading } = useQuery({
    queryKey: ['msb-registration', engagementId, 'revenu_quebec'],
    queryFn: async () => {
      const { data: existing, error: fetchError } = await supabase
        .from('msb_registrations')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('registration_type', 'revenu_quebec')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing;

      const { data: newReg, error: insertError } = await supabase
        .from('msb_registrations')
        .insert({
          engagement_id: engagementId,
          registration_type: 'revenu_quebec',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newReg;
    },
  });

  // Sync auto-finding for unregistered Quebec MSBs with nexus
  useEffect(() => {
    if (!registration) return;
    const submoduleKey = `qc-registration-gap:${registration.id}`;
    const sync = async () => {
      const { data: existing } = await supabase
        .from('findings')
        .select('id')
        .eq('engagement_id', engagementId)
        .eq('submodule', submoduleKey)
        .maybeSingle();

      if (triageResult.state === 'gap_unregistered') {
        if (!existing) {
          const { error } = await supabase.from('findings').insert({
            engagement_id: engagementId,
            module: 'msb_registration',
            submodule: submoduleKey,
            title: 'MSB has Québec nexus but is not registered with Revenu Québec',
            description:
              'The reviewer confirmed the MSB has a physical presence in Québec or serves clients with Québec-issued ID/Québec address, but is not registered with Revenu Québec under the Money-Services Businesses Act.',
            severity: 'complete',
            nature_of_obligation: 'Registration with Revenu Québec',
            regulation_reference: 'Money-Services Businesses Act (Québec), CQLR c E-12.000001',
            recommendation: 'Register the MSB with Revenu Québec without delay and maintain registration in good standing.',
            status: 'open',
          });
          if (error) console.error('Auto-finding insert failed', error);
          else toast.info('Auto-finding created: Revenu Québec registration gap');
        }
      } else if (existing) {
        await supabase.from('findings').delete().eq('id', existing.id);
      }
    };
    sync();
  }, [triageResult.state, registration?.id, engagementId]);

  const triagePassed = triageResult.state === 'registered_full_audit' || triageResult.state === 'gap_unregistered';
  const noNexus = triageResult.state === 'no_nexus';

  // Filter visible tabs based on triage outcome
  const visibleTabs = TAB_ORDER.filter((t) => {
    if (t === 'triage') return true;
    if (t === 'findings') return triagePassed || noNexus;
    // details / validation / changes only when full audit needed
    return triagePassed;
  });

  const currentIndex = visibleTabs.indexOf(activeSection);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < visibleTabs.length - 1;
  const goToPrevious = () => hasPrevious && setActiveSection(visibleTabs[currentIndex - 1]);
  const goToNext = () => hasNext && setActiveSection(visibleTabs[currentIndex + 1]);

  // Reset to a valid tab when triage outcome changes
  useEffect(() => {
    if (!visibleTabs.includes(activeSection)) {
      setActiveSection(visibleTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs.join(',')]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!registration) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Unable to load registration data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Revenu Québec Registry Link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Link to Revenu Québec Registry</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            The Revenu Québec MSB registry only supports <span className="font-semibold">search by business name</span> (no licence/registration number search). Use the legal or operating name of the MSB to locate the record.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild variant="default" size="sm">
            <a 
              href="https://www.revenuquebec.ca/en/businesses/sector-specific-measures/money-services-businesses-msbs/register/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Access Revenu Québec (search by name)
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Registry search evidence uploads */}
      <RegistrySearchUploadSection
        registrationId={registration.id}
        engagementId={engagementId}
        registryLabel="Revenu Québec"
      />


      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TAB_ORDER.map((tab) => {
            const isLocked = !visibleTabs.includes(tab);
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="text-xs"
                disabled={isLocked}
                title={isLocked ? 'Complete the Québec Nexus Triage to unlock' : undefined}
              >
                {isLocked && <Lock className="h-3 w-3 mr-1" />}
                {TAB_LABELS[tab]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="triage">
          <QuebecNexusTriageSection
            registrationId={registration.id}
            engagementId={engagementId}
            onTriageResult={setTriageResult}
          />
        </TabsContent>

        <TabsContent value="details">
          <QuebecRegistrationDetailsSection registration={registration} />
        </TabsContent>

        <TabsContent value="validation">
          <StatusValidationSection
            registrationId={registration.id}
            engagementId={engagementId}
            registration={registration}
            registrationType="revenu_quebec"
          />
        </TabsContent>

        <TabsContent value="findings">
          <MSBFindingsSection 
            registrationId={registration.id} 
            registrationType="revenu_quebec"
          />
        </TabsContent>
      </Tabs>

      {/* Navigation Footer */}
      <SectionNavigationFooter
        onPrevious={hasPrevious ? goToPrevious : undefined}
        onNext={hasNext ? goToNext : undefined}
        previousLabel={hasPrevious ? TAB_LABELS[visibleTabs[currentIndex - 1]] : undefined}
        nextLabel={hasNext ? TAB_LABELS[visibleTabs[currentIndex + 1]] : undefined}
        showPrevious={hasPrevious}
        showNext={hasNext}
        showSave={false}
      />
    </div>
  );
}
