import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Clock, CheckCircle, AlertTriangle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { CreateQueryDialog } from './CreateQueryDialog';

const PRIORITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Low', variant: 'outline' },
  medium: { label: 'Medium', variant: 'secondary' },
  high: { label: 'High', variant: 'default' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  open: { label: 'Open', icon: Clock },
  responded: { label: 'Responded', icon: MessageSquare },
  resolved: { label: 'Resolved', icon: CheckCircle },
};

interface QueryListProps {
  engagementId: string;
  clientId: string;
}

export function QueryList({ engagementId, clientId }: QueryListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['information-requests', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('information_requests')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['information-request-responses', engagementId],
    queryFn: async () => {
      const requestIds = requests.map((r: any) => r.id);
      if (requestIds.length === 0) return [];
      const { data, error } = await supabase
        .from('information_request_responses')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: requests.length > 0,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'resolved') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }
      const { error } = await supabase
        .from('information_requests')
        .update(updateData)
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['information-requests'] });
      toast({ title: 'Status updated' });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('information_request_responses')
        .insert({
          request_id: requestId,
          responded_by: user.id,
          response_text: staffNote,
          is_client_response: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['information-request-responses'] });
      toast({ title: 'Note added' });
      setStaffNote('');
    },
  });

  const getResponsesForRequest = (requestId: string) =>
    responses.filter((r: any) => r.request_id === requestId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Information Requests</h3>
          <p className="text-sm text-muted-foreground">
            Queries raised for the client ({requests.length} total)
          </p>
        </div>
        <CreateQueryDialog engagementId={engagementId} clientId={clientId} />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No information requests yet. Use "Raise Query" to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => {
            const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.open;
            const StatusIcon = statusCfg.icon;
            const reqResponses = getResponsesForRequest(req.id);
            const clientResponses = reqResponses.filter((r: any) => r.is_client_response);
            const isExpanded = expandedId === req.id;

            return (
              <Card key={req.id} className={req.status === 'resolved' ? 'opacity-70' : ''}>
                <CardHeader
                  className="pb-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {req.title}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {req.category} • {new Date(req.created_at).toLocaleDateString()}
                        {req.due_date && ` • Due: ${new Date(req.due_date).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {clientResponses.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {clientResponses.length} response{clientResponses.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      <Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {req.description && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm">{req.description}</p>
                      </div>
                    )}

                    {/* Conversation thread */}
                    {reqResponses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Responses</p>
                        {reqResponses.map((resp: any) => (
                          <div
                            key={resp.id}
                            className={`p-3 rounded-md border text-sm ${
                              resp.is_client_response
                                ? 'bg-primary/5 border-primary/20 ml-4'
                                : 'bg-muted/50 mr-4'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {resp.is_client_response ? 'Client' : 'Staff'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(resp.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p>{resp.response_text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Staff actions */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <Select
                        value={req.status}
                        onValueChange={(v) => updateStatusMutation.mutate({ requestId: req.id, status: v })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="responded">Responded</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex-1 flex gap-2">
                        <Textarea
                          value={expandedId === req.id ? staffNote : ''}
                          onChange={(e) => setStaffNote(e.target.value)}
                          placeholder="Add a staff note..."
                          rows={1}
                          className="min-h-[36px] resize-none"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={!staffNote.trim() || addNoteMutation.isPending}
                          onClick={() => addNoteMutation.mutate(req.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
