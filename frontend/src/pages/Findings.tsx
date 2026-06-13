import { useApp } from '@/contexts/AppContext';
import { FindingsModule } from '@/components/findings/FindingsModule';
import { InviteClientDialog } from '@/components/dialogs/InviteClientDialog';
import { QueryList } from '@/components/queries/QueryList';
import { useUserRole } from '@/hooks/useUserRole';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, MessageSquare } from 'lucide-react';

export default function Findings() {
  const { selectedEngagement } = useApp();
  const { role } = useUserRole();

  const canInvite = role && ['admin', 'partner', 'manager'].includes(role);

  if (!selectedEngagement) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select an engagement to view the Findings Register.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canInvite && (
        <div className="flex justify-end">
          <InviteClientDialog />
        </div>
      )}

      <Tabs defaultValue="findings" className="w-full">
        <TabsList>
          <TabsTrigger value="findings" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Findings Register
          </TabsTrigger>
          <TabsTrigger value="queries" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Client Queries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="mt-4">
          <FindingsModule engagementId={selectedEngagement.id} />
        </TabsContent>

        <TabsContent value="queries" className="mt-4">
          <QueryList
            engagementId={selectedEngagement.id}
            clientId={selectedEngagement.client_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
