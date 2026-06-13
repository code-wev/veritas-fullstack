import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Landmark, Store, Briefcase, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { CreateClientDialog } from '@/components/dialogs/CreateClientDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

const entityTypeIcons: Record<string, React.ReactNode> = {
  'msb': <Store className="w-8 h-8" />,
  'bank': <Landmark className="w-8 h-8" />,
  'credit_union': <Building2 className="w-8 h-8" />,
  'securities': <Briefcase className="w-8 h-8" />,
};

const entityTypeLabels: Record<string, string> = {
  'msb': 'Money Services Business',
  'bank': 'Bank',
  'credit_union': 'Credit Union',
  'securities': 'Securities Dealer',
  'life_insurance': 'Life Insurance',
  'trust': 'Trust Company',
  'dealer': 'Dealer in Precious Metals',
  'casino': 'Casino',
  'real_estate': 'Real Estate',
  'accountant': 'Accountant',
  'bc_notary': 'BC Notary',
};

export default function ClientSelection() {
  const { clients, setSelectedClient, setSelectedEngagement, user } = useApp();
  const { canCreateClients } = useUserRole();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 
                    user?.email?.split('@')[0] || 
                    'there';

  const handleClientSelect = (client: typeof clients[0]) => {
    setSelectedClient(client);
    setSelectedEngagement(null); // Reset engagement when switching clients
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1 -ml-2 mb-2 h-8 px-2"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a client to continue, or create a new one.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Your Clients</h2>
          {canCreateClients && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          )}
        </div>

        {clients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Clients Yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                {canCreateClients 
                  ? "Get started by creating your first client. You'll be able to create engagements and begin your AML reviews."
                  : "You haven't been assigned to any clients yet. Please contact your administrator."}
              </p>
              {canCreateClients && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Card 
                key={client.id} 
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => handleClientSelect(client)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {entityTypeIcons[client.entity_type] || <Building2 className="w-8 h-8" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {client.name}
                      </h3>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {entityTypeLabels[client.entity_type] || client.entity_type}
                      </Badge>
                      {client.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {client.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Client Card (for those with permission) */}
            {canCreateClients && (
              <Card 
                className="cursor-pointer border-dashed hover:border-primary/50 hover:bg-accent/50 transition-all"
                onClick={() => setShowCreateDialog(true)}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-3">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Add New Client
                  </span>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <CreateClientDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />
    </div>
  );
}
