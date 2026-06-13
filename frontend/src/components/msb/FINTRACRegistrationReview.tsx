import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertCircle, AlertTriangle } from 'lucide-react';
import { RegistrationDetailsSection } from './sections/RegistrationDetailsSection';
import { StatusValidationSection } from './sections/StatusValidationSection';
import { ChangeDetectionSection } from './sections/ChangeDetectionSection';
import { MSBFindingsSection } from './sections/MSBFindingsSection';
import { RegistrySearchUploadSection } from './sections/RegistrySearchUploadSection';
import { SectionNavigationFooter } from '@/components/ui/section-navigation-footer';
import { toast } from 'sonner';

interface FINTRACRegistrationReviewProps {
  engagementId: string;
  clientId: string;
}

const TAB_ORDER = ['details', 'audit-checklist', 'change-detail', 'findings'];
const TAB_LABELS: Record<string, string> = {
  'details': 'Registration Details',
  'audit-checklist': 'Registration Status',
  'change-detail': 'Change Detection',
  'findings': 'Findings & Observations',
};

export function FINTRACRegistrationReview({ engagementId, clientId }: FINTRACRegistrationReviewProps) {
  const [activeSection, setActiveSection] = useState('details');
  const [missingMandatory, setMissingMandatory] = useState<string[]>([]);

  const { data: registration, isLoading } = useQuery({
    queryKey: ['msb-registration', engagementId, 'fintrac'],
    queryFn: async () => {
      const { data: existing, error: fetchError } = await supabase
        .from('msb_registrations')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('registration_type', 'fintrac')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing;

      const { data: newReg, error: insertError } = await supabase
        .from('msb_registrations')
        .insert({
          engagement_id: engagementId,
          registration_type: 'fintrac',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newReg;
    },
  });

  const currentIndex = TAB_ORDER.indexOf(activeSection);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < TAB_ORDER.length - 1;
  const isDetailsBlocking = missingMandatory.length > 0;

  const goToPrevious = () => {
    if (hasPrevious) setActiveSection(TAB_ORDER[currentIndex - 1]);
  };

  const tryGoTo = (tab: string) => {
    // Allow navigation even if mandatory fields missing — just warn once when leaving Details
    if (activeSection === 'details' && tab !== 'details' && isDetailsBlocking) {
      toast.warning(`Module incomplete — ${missingMandatory.length} mandatory field${missingMandatory.length > 1 ? 's' : ''} still empty`, {
        description: missingMandatory.slice(0, 4).join(' · ') + (missingMandatory.length > 4 ? '…' : ''),
      });
    }
    setActiveSection(tab);
  };

  const goToNext = () => {
    if (hasNext) tryGoTo(TAB_ORDER[currentIndex + 1]);
  };

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
      {/* FINTRAC Registry Link */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <Button asChild variant="default" size="sm">
            <a
              href="https://fintrac-canafe.canada.ca/msb-esm/reg-eng"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Access FINTRAC Registry
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Registry search evidence uploads */}
      <RegistrySearchUploadSection
        registrationId={registration.id}
        engagementId={engagementId}
        registryLabel="FINTRAC"
      />

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={tryGoTo} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TAB_ORDER.map((tab) => {
            const showIncomplete = tab !== 'details' && isDetailsBlocking;
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="text-xs"
                title={showIncomplete ? 'Registration Details incomplete — module marked incomplete' : undefined}
              >
                {showIncomplete && <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" />}
                {TAB_LABELS[tab]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {isDetailsBlocking && (
          <div className="flex items-start gap-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/5 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Module Incomplete</p>
              <p className="text-muted-foreground text-xs mt-1">
                {missingMandatory.length} mandatory Registration Detail field{missingMandatory.length > 1 ? 's' : ''} still empty. You can continue working in other tabs, but the module will remain flagged as incomplete until these are filled: {missingMandatory.slice(0, 6).join(' · ')}{missingMandatory.length > 6 ? '…' : ''}.
              </p>
            </div>
          </div>
        )}

        <TabsContent value="details">
          <RegistrationDetailsSection
            registration={registration}
            registrationType="fintrac"
            onValidityChange={setMissingMandatory}
          />
        </TabsContent>

        <TabsContent value="audit-checklist">
          <StatusValidationSection
            registrationId={registration.id}
            engagementId={engagementId}
            registration={registration}
            registrationType="fintrac"
          />
        </TabsContent>

        <TabsContent value="change-detail">
          <ChangeDetectionSection
            registrationId={registration.id}
            engagementId={engagementId}
            registrationType="fintrac"
          />
        </TabsContent>

        <TabsContent value="findings">
          <MSBFindingsSection
            registrationId={registration.id}
            registrationType="fintrac"
          />
        </TabsContent>
      </Tabs>

      {/* Navigation Footer */}
      <SectionNavigationFooter
        onPrevious={hasPrevious ? goToPrevious : undefined}
        onNext={hasNext ? goToNext : undefined}
        previousLabel={hasPrevious ? TAB_LABELS[TAB_ORDER[currentIndex - 1]] : undefined}
        nextLabel={hasNext ? TAB_LABELS[TAB_ORDER[currentIndex + 1]] : undefined}
        showPrevious={hasPrevious}
        showNext={hasNext}
        showSave={false}
      />
    </div>
  );
}
