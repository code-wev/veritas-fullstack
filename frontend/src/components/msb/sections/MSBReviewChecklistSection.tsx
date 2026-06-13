import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Save, Trash2, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface MSBReviewChecklistSectionProps {
  registrationId: string;
  registrationType: 'fintrac' | 'revenu_quebec';
}

const SECTIONS = [
  'General Compliance',
  'Document Review',
  'Interview Verification',
  'Other',
];

export function MSBReviewChecklistSection({ registrationId, registrationType }: MSBReviewChecklistSectionProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    section: '',
    question_text: '',
    answer: '',
    commentary: '',
  });

  const { data: checklistItems, isLoading } = useQuery({
    queryKey: ['msb-review-checklist', registrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('msb_review_checklist')
        .select('*')
        .eq('registration_id', registrationId)
        .order('section', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof newItem) => {
      const { error } = await supabase
        .from('msb_review_checklist')
        .insert({ ...data, registration_id: registrationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-review-checklist', registrationId] });
      toast.success('Checklist item added');
      setIsAddDialogOpen(false);
      setNewItem({ section: '', question_text: '', answer: '', commentary: '' });
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; answer?: string; commentary?: string }) => {
      const { error } = await supabase
        .from('msb_review_checklist')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-review-checklist', registrationId] });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('msb_review_checklist')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msb-review-checklist', registrationId] });
      toast.success('Item removed');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const handleNewChange = (field: string, value: string) => {
    setNewItem(prev => ({ ...prev, [field]: value }));
  };

  const getAnswerIcon = (answer: string | null) => {
    switch (answer) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'na':
        return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground" />;
    }
  };

  // Group items by section
  const groupedItems = checklistItems?.reduce((acc, item) => {
    const section = item.section || 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, typeof checklistItems>);

  const stats = {
    total: checklistItems?.length || 0,
    pass: checklistItems?.filter(i => i.answer === 'pass').length || 0,
    fail: checklistItems?.filter(i => i.answer === 'fail').length || 0,
    na: checklistItems?.filter(i => i.answer === 'na').length || 0,
    pending: checklistItems?.filter(i => !i.answer).length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Review Checklist</CardTitle>
            <CardDescription>
              Additional review checklist items with Pass/Fail/N/A assessment
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Badge variant="default">{stats.pass} Pass</Badge>
              <Badge variant="destructive">{stats.fail} Fail</Badge>
              <Badge variant="secondary">{stats.na} N/A</Badge>
              {stats.pending > 0 && (
                <Badge variant="outline">{stats.pending} Pending</Badge>
              )}
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Checklist Item</DialogTitle>
                  <DialogDescription>
                    Add a new review checklist question
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select
                      value={newItem.section}
                      onValueChange={(v) => handleNewChange('section', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(section => (
                          <SelectItem key={section} value={section}>{section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Textarea
                      value={newItem.question_text}
                      onChange={(e) => handleNewChange('question_text', e.target.value)}
                      placeholder="Enter the checklist question..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Initial Answer (Optional)</Label>
                    <Select
                      value={newItem.answer}
                      onValueChange={(v) => handleNewChange('answer', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select answer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Commentary (Optional)</Label>
                    <Textarea
                      value={newItem.commentary}
                      onChange={(e) => handleNewChange('commentary', e.target.value)}
                      placeholder="Add commentary..."
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addMutation.mutate(newItem)}
                    disabled={!newItem.section || !newItem.question_text || addMutation.isPending}
                  >
                    {addMutation.isPending ? 'Adding...' : 'Add Item'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {checklistItems?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No checklist items yet.</p>
            <p className="text-sm">Click "Add Item" to create custom review questions.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems || {}).map(([section, items]) => (
              <div key={section} className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {section}
                </h4>
                <div className="space-y-2">
                  {items?.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          {getAnswerIcon(item.answer)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="font-medium">{item.question_text}</p>
                          
                          <div className="flex items-center gap-2">
                            <Select
                              value={item.answer || ''}
                              onValueChange={(v) => updateMutation.mutate({ id: item.id, answer: v })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Answer" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pass">Pass</SelectItem>
                                <SelectItem value="fail">Fail</SelectItem>
                                <SelectItem value="na">N/A</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button variant="outline" size="sm" disabled>
                              Attach Evidence
                            </Button>
                          </div>

                          <Textarea
                            value={item.commentary || ''}
                            onChange={(e) => updateMutation.mutate({ id: item.id, commentary: e.target.value })}
                            placeholder="Add commentary..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
