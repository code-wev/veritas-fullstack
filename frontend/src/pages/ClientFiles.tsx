import { useMemo } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { DocumentRequestChecklist } from '@/components/client-files/DocumentRequestChecklist';
import { SampleEvidenceManager } from '@/components/client-files/SampleEvidenceManager';

const MSB_HINTS = [
  'money services business', 'msb', 'psp', 'cheque', 'armoured', 'crowdfunding',
  'acquirer services in relation to private automated banking machines',
];

function detectProfile(entityType?: string | null): 'msb' | 'trust' {
  if (!entityType) return 'msb';
  const v = entityType.toLowerCase();
  if (v.includes('trust')) return 'trust';
  if (MSB_HINTS.some((h) => v.includes(h))) return 'msb';
  // Default to MSB list (most common). Trust list is shown only when entity_type clearly says trust.
  return 'msb';
}

export default function ClientFiles() {
  const { selectedClient, selectedEngagement } = useApp();

  const profile = useMemo(() => detectProfile(selectedClient?.entity_type), [selectedClient]);

  if (!selectedEngagement || !selectedClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Engagement Selected</CardTitle>
            <CardDescription>
              Please select a client and engagement from the top navigation to begin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Client Files</h1>
        <p className="text-muted-foreground mt-1">
          Centralised vault for the document request list and the actual sample records collected during testing.
          Auto-switches between the MSB and Trust Company request lists based on the client's entity type.
          Exact-duplicate uploads (same file content) are blocked within the engagement.
        </p>
      </div>

      <Tabs defaultValue="checklist" className="w-full">
        <TabsList>
          <TabsTrigger value="checklist">Document Request List</TabsTrigger>
          <TabsTrigger value="samples">Sample Evidence</TabsTrigger>
        </TabsList>
        <TabsContent value="checklist" className="mt-4">
          <DocumentRequestChecklist
            engagementId={selectedEngagement.id}
            clientId={selectedClient.id}
            entityProfile={profile}
          />
        </TabsContent>
        <TabsContent value="samples" className="mt-4">
          <SampleEvidenceManager
            engagementId={selectedEngagement.id}
            clientId={selectedClient.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
