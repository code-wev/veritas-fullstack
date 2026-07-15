import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MSB_ACTIVITIES,
  defaultActivitiesFor,
  isMsbEntityType,
} from '@/lib/msbActivities';

const ENTITY_TYPES = [
  'Accountants',
  'Acquirer services in relation to private automated banking machines',
  'Agents of the Crown',
  'Armoured cars',
  'British Columbia notaries',
  'Casinos',
  'Cheque cashers',
  'Dealers in precious metals and precious stones',
  'Factors',
  'Financing or leasing entities',
  'Financial entities',
  'Life insurance',
  'Money services businesses',
  'Mortgage',
  'Real estate',
  'Securities dealers',
  'Title insurers',
];

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientToEdit?: {
    id: string;
    name: string;
    entity_type: string;
    description?: string;
    msb_activities?: string[];
  } | null;
}

export function CreateClientDialog({ open, onOpenChange, clientToEdit }: CreateClientDialogProps) {
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('');
  const [msbActivities, setMsbActivities] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshClients, setSelectedClient } = useApp();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (clientToEdit) {
        setName(clientToEdit.name || '');
        setEntityType(clientToEdit.entity_type || '');
        setMsbActivities(clientToEdit.msb_activities || []);
        setDescription(clientToEdit.description || '');
      } else {
        setName('');
        setEntityType('');
        setMsbActivities([]);
        setDescription('');
      }
    }
  }, [open, clientToEdit]);

  const showMsbActivities = isMsbEntityType(entityType);

  const handleEntityTypeChange = (value: string) => {
    setEntityType(value);
    // Pre-fill activities from sensible defaults when the entity type implies one.
    setMsbActivities(defaultActivitiesFor(value));
  };

  const toggleActivity = (code: string, checked: boolean) => {
    setMsbActivities(prev =>
      checked ? Array.from(new Set([...prev, code])) : prev.filter(a => a !== code),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    if (clientToEdit) {
      // Update existing client
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          name,
          entity_type: entityType,
          description: description || null,
          msb_activities: showMsbActivities ? msbActivities : null,
        } as any)
        .eq('id', clientToEdit.id);

      if (clientError) {
        toast({
          title: 'Error updating client',
          description: clientError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Client updated',
        description: `${name} has been updated successfully.`,
      });

      await refreshClients();
      
      setLoading(false);
      onOpenChange(false);
    } else {
      // Create client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          name,
          entity_type: entityType,
          description: description || null,
          created_by: user.id,
          ...(showMsbActivities ? { msb_activities: msbActivities } as any : {}),
        } as any)
        .select()
        .single();

      if (clientError) {
        toast({
          title: 'Error creating client',
          description: clientError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Client created',
        description: `${name} has been added successfully.`,
      });

      await refreshClients();
      setSelectedClient(clientData);
      
      // Reset form
      setName('');
      setEntityType('');
      setMsbActivities([]);
      setDescription('');
      setLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clientToEdit ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {clientToEdit ? 'Update client details and MSB activities.' : 'Create a new client to begin AML effectiveness reviews.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select value={entityType} onValueChange={handleEntityTypeChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showMsbActivities && (
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div>
                  <Label>MSB activities</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select every activity this client performs. Drives which FINTRAC reports apply (LCTR, EFTR, LVCTR, STR, LPEPR).
                  </p>
                </div>
                <div className="space-y-2 pt-1">
                  {MSB_ACTIVITIES.map((activity) => {
                    const checked = msbActivities.includes(activity.value);
                    return (
                      <div key={activity.value} className="flex items-start gap-2">
                        <Checkbox
                          id={`activity-${activity.value}`}
                          checked={checked}
                          onCheckedChange={(c) => toggleActivity(activity.value, c === true)}
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor={`activity-${activity.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          <span className="font-medium">{activity.label}</span>
                          <span className="block text-xs text-muted-foreground">{activity.description}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the client"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name || !entityType}>
              {loading ? 'Saving...' : (clientToEdit ? 'Save Changes' : 'Create Client')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
