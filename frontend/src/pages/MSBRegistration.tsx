import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FINTRACRegistrationReview } from '@/components/msb/FINTRACRegistrationReview';
import { RevenuQuebecRegistrationReview } from '@/components/msb/RevenuQuebecRegistrationReview';
import { Building2, FileText } from 'lucide-react';
import { ModuleWorkflowBanner } from '@/components/layout/ModuleWorkflowBanner';
import { cn } from '@/lib/utils';

export default function MSBRegistration() {
  const { selectedClient, selectedEngagement } = useApp();
  const [activeTab, setActiveTab] = useState('fintrac');
  const [workflowFlags, setWorkflowFlags] = useState({ isLocked: false, canEdit: true });

  if (!selectedClient || !selectedEngagement) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Engagement Selected</CardTitle>
            <CardDescription>
              Please select a client and engagement from the sidebar to access the MSB Registration module.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">MSB Registration</h1>
        <p className="text-muted-foreground">
          Review and validate Money Services Business registration compliance for {selectedClient.name}
        </p>
      </div>

      {/* Workflow Banner */}
      <ModuleWorkflowBanner
        engagementId={selectedEngagement.id}
        moduleKey="msb_registration"
        tableName="msb_registrations"
        onLockStateChange={(state, isLocked, canEdit) => setWorkflowFlags({ isLocked, canEdit })}
      />

      {/* Purpose Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Purpose & Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Purpose:</p>
            <p className="text-muted-foreground">
              To verify compliance with FINTRAC and provincial registration requirements, including renewals and updates.
            </p>
          </div>
          <div>
            <p className="font-medium">Requirements under the PCMLTFR:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Every MSB is required to register with FINTRAC</li>
              <li>Any new information or changes must be updated within 30 days of awareness</li>
              <li>MSB registration shall be renewed every two years</li>
              <li>Provide clarifications FINTRAC may request within 30 days</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Registration Tabs */}
      <div className={cn(
        "space-y-4 transition-opacity duration-300",
        !workflowFlags.canEdit && "pointer-events-none opacity-75"
      )}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="fintrac" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              FINTRAC
            </TabsTrigger>
            <TabsTrigger value="revenu_quebec" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Revenu Québec
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fintrac" className="space-y-4">
            <FINTRACRegistrationReview 
              engagementId={selectedEngagement.id} 
              clientId={selectedClient.id}
            />
          </TabsContent>

          <TabsContent value="revenu_quebec" className="space-y-4">
            <RevenuQuebecRegistrationReview 
              engagementId={selectedEngagement.id}
              clientId={selectedClient.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
