import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageSquarePlus } from 'lucide-react';

const REQUEST_CATEGORIES = [
  { value: 'policies', label: 'Policies & Procedures' },
  { value: 'kyc_records', label: 'KYC Records' },
  { value: 'transaction_data', label: 'Transaction Data' },
  { value: 'training', label: 'Training Records' },
  { value: 'risk_assessment', label: 'Risk Assessment' },
  { value: 'governance', label: 'Governance' },
  { value: 'registration', label: 'Registration' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'clarification', label: 'Clarification' },
  { value: 'general', label: 'General' },
];

interface CreateQueryDialogProps {
  engagementId: string;
  clientId: string;
}

export function CreateQueryDialog({ engagementId, clientId }: CreateQueryDialogProps) {
  const { user } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('information_requests')
        .insert({
          engagement_id: engagementId,
          client_id: clientId,
          requested_by: user.id,
          title,
          description: description || null,
          category,
          priority,
          due_date: dueDate || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['information-requests'] });
      toast({ title: 'Query sent', description: 'The information request has been created and is visible to the client.' });
      setOpen(false);
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      setDueDate('');
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create query', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Raise Query
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise Information Request</DialogTitle>
          <DialogDescription>
            Create a query for the client to respond to with answers and evidence.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Provide updated KYC policy document"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about what is needed and why..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? 'Creating...' : 'Send Query to Client'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
