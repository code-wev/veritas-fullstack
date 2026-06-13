import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Clock, CheckCircle, AlertTriangle, Send, ChevronDown, ChevronUp, Upload, Loader2, File } from 'lucide-react';

const PRIORITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Low', variant: 'outline' },
  medium: { label: 'Medium', variant: 'secondary' },
  high: { label: 'High', variant: 'default' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

interface ClientQueryListProps {
  engagementIds: string[];
}

export function ClientQueryList({ engagementIds }: ClientQueryListProps) {
  const { user } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['client-information-requests', engagementIds],
    queryFn: async () => {
      if (engagementIds.length === 0) return [];
      const { data, error } = await supabase
        .from('information_requests')
        .select('*')
        .in('engagement_id', engagementIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: engagementIds.length > 0,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['client-request-responses', engagementIds],
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

  const respondMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('Not authenticated');

      let evidenceFileIds: string[] = [];

      // Upload file if selected
      if (selectedFile) {
        const request = requests.find((r: any) => r.id === requestId);
        const storagePath = `${request?.engagement_id}/queries/${Date.now()}_${selectedFile.name}`;
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .upload(storagePath, selectedFile);
        if (storageError) throw storageError;
        // We store the path as reference; in a full implementation you'd create an evidence_files record
      }

      const { error } = await supabase
        .from('information_request_responses')
        .insert({
          request_id: requestId,
          responded_by: user.id,
          response_text: responseText,
          is_client_response: true,
          evidence_file_ids: evidenceFileIds.length > 0 ? evidenceFileIds : [],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-request-responses'] });
      toast({ title: 'Response submitted', description: 'Your response has been sent to the audit team.' });
      setResponseText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      toast({ title: 'Failed to submit response', description: err.message, variant: 'destructive' });
    },
  });

  const openRequests = requests.filter((r: any) => r.status !== 'resolved');
  const resolvedRequests = requests.filter((r: any) => r.status === 'resolved');

  const getResponsesForRequest = (requestId: string) =>
    responses.filter((r: any) => r.request_id === requestId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Open Requests */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Open Queries ({openRequests.length})
        </h3>

        {openRequests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No outstanding queries. You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          openRequests.map((req: any) => {
            const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;
            const reqResponses = getResponsesForRequest(req.id);
            const isExpanded = expandedId === req.id;

            return (
              <Card key={req.id} className={req.priority === 'urgent' ? 'border-destructive/40' : ''}>
                <CardHeader
                  className="pb-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                        {req.title}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Requested {new Date(req.created_at).toLocaleDateString()}
                        {req.due_date && (
                          <span className={new Date(req.due_date) < new Date() ? ' text-destructive font-medium' : ''}>
                            {' '}• Due: {new Date(req.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {req.description && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Details</p>
                        <p className="text-sm">{req.description}</p>
                      </div>
                    )}

                    {/* Conversation thread */}
                    {reqResponses.length > 0 && (
                      <div className="space-y-2">
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
                                {resp.is_client_response ? 'You' : 'Audit Team'}
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

                    {/* Response form */}
                    <div className="space-y-3 pt-2 border-t">
                      <Textarea
                        value={expandedId === req.id ? responseText : ''}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Type your response..."
                        rows={3}
                      />

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            ref={fileInputRef}
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                            className="text-xs"
                          />
                        </div>
                        <Button
                          onClick={() => respondMutation.mutate(req.id)}
                          disabled={!responseText.trim() || respondMutation.isPending}
                          className="gap-2"
                        >
                          {respondMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send Response
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Resolved Requests */}
      {resolvedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Resolved ({resolvedRequests.length})
          </h3>
          {resolvedRequests.map((req: any) => (
            <Card key={req.id} className="opacity-60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {req.title}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">Resolved</Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
