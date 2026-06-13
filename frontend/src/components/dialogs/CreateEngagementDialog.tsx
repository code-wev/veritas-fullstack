import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateEngagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEngagementDialog({ open, onOpenChange }: CreateEngagementDialogProps) {
  const [name, setName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [scope, setScope] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, selectedClient, refreshEngagements, setSelectedEngagement } = useApp();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient) return;

    setLoading(true);

    // Create engagement
    const { data: engagementData, error: engagementError } = await supabase
      .from('engagements')
      .insert({
        client_id: selectedClient.id,
        name,
        period_start: periodStart,
        period_end: periodEnd,
        scope: scope || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (engagementError) {
      toast({
        title: 'Error creating engagement',
        description: engagementError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Assign current user to engagement
    await supabase.from('engagement_assignments').insert({
      engagement_id: engagementData.id,
      user_id: user.id,
      assigned_by: user.id,
    });

    toast({
      title: 'Engagement created',
      description: `${name} has been created successfully.`,
    });

    await refreshEngagements();
    setSelectedEngagement(engagementData);
    
    // Reset form
    setName('');
    setPeriodStart('');
    setPeriodEnd('');
    setScope('');
    setLoading(false);
    onOpenChange(false);
  };

  // Generate default name based on year
  const generateDefaultName = () => {
    if (periodStart && periodEnd) {
      const startYear = new Date(periodStart).getFullYear();
      const endYear = new Date(periodEnd).getFullYear();
      if (startYear === endYear) {
        return `${startYear} AML Effectiveness Review`;
      }
      return `${startYear}-${endYear} AML Effectiveness Review`;
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Engagement</DialogTitle>
          <DialogDescription>
            Create a new AML Effectiveness Review engagement for {selectedClient?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Engagement Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={generateDefaultName() || 'e.g., 2025 AML Effectiveness Review'}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Period Start</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">Period End</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">Scope (Optional)</Label>
              <Textarea
                id="scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Define the scope of this review..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name || !periodStart || !periodEnd}>
              {loading ? 'Creating...' : 'Create Engagement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
