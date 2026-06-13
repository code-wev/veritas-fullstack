import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

export function InviteClientDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const { selectedClient, selectedEngagement, user } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invite = useMutation({
    mutationFn: async () => {
      if (!selectedClient || !selectedEngagement || !user) throw new Error('Missing context');

      // Create account for the client user if they don't exist
      // The client will use the standard sign-in flow

      const { error } = await supabase
        .from('client_invitations')
        .insert({
          client_id: selectedClient.id,
          engagement_id: selectedEngagement.id,
          email: email.trim().toLowerCase(),
          invited_by: user.id,
        });

      if (error) {
        if (error.code === '23505') throw new Error('This email has already been invited to this engagement.');
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Invitation sent', description: `Client portal invitation sent to ${email}` });
      setEmail('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['client-invitations-list'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Client to Portal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-md text-sm">
            <p><span className="font-medium">Client:</span> {selectedClient?.name}</p>
            <p><span className="font-medium">Engagement:</span> {selectedEngagement?.name}</p>
          </div>
          <div className="space-y-2">
            <Label>Client Email Address</Label>
            <Input
              type="email"
              placeholder="client@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The client will need to create an account with this email, then accept the invitation to view findings.
            </p>
          </div>
          <Button
            onClick={() => invite.mutate()}
            disabled={!email.trim() || invite.isPending}
            className="w-full"
          >
            {invite.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
