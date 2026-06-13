import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Clock, MessageSquare, Send, Shield, FileText, Upload, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClientDocumentUpload } from '@/components/client-portal/ClientDocumentUpload';
import { ClientQueryList } from '@/components/client-portal/ClientQueryList';
import { ClientAuditReportReview } from '@/components/client-portal/ClientAuditReportReview';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  critical: { label: 'Complete Non-Compliance', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
  high: { label: 'Important Weaknesses', color: 'bg-orange-500 text-white', icon: AlertTriangle },
  medium: { label: 'Moderate Weaknesses', color: 'bg-yellow-500 text-white', icon: Shield },
  low: { label: 'Lesser Weaknesses', color: 'bg-blue-500 text-white', icon: Shield },
  observation: { label: 'Observation', color: 'bg-muted text-muted-foreground', icon: MessageSquare },
};

export default function ClientPortal() {
  const { user } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading: loadingInvitations } = useQuery({
    queryKey: ['client-invitations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_invitations')
        .select('*, clients(name), engagements(name, period_start, period_end)')
        .eq('status', 'accepted');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: pendingInvitations } = useQuery({
    queryKey: ['client-pending-invitations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_invitations')
        .select('*, clients(name), engagements(name, period_start, period_end)')
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('client_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-invitations'] });
      toast({ title: 'Invitation accepted', description: 'You can now view findings for this engagement.' });
    },
  });

  const engagementIds = invitations?.map((i: any) => i.engagement_id) ?? [];

  const { data: findings, isLoading: loadingFindings } = useQuery({
    queryKey: ['client-portal-findings', engagementIds],
    queryFn: async () => {
      if (engagementIds.length === 0) return [];
      const { data, error } = await supabase
        .from('findings')
        .select('*')
        .in('engagement_id', engagementIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: engagementIds.length > 0,
  });

  if (loadingInvitations) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Client Portal</h1>
        <p className="text-muted-foreground">Review findings, submit responses, and upload documents</p>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-background rounded-md border">
                <div>
                  <p className="font-medium text-sm">{(inv.clients as any)?.name}</p>
                  <p className="text-xs text-muted-foreground">{(inv.engagements as any)?.name}</p>
                </div>
                <Button size="sm" onClick={() => acceptInvitation.mutate(inv.id)}>
                  Accept
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs for Findings and Documents */}
      <Tabs defaultValue="findings" className="w-full">
        <TabsList>
          <TabsTrigger value="findings" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Findings
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Audit Report
          </TabsTrigger>
          <TabsTrigger value="queries" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Queries
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <Upload className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="mt-4">
          {findings && findings.length > 0 ? (
            <div className="space-y-4">
              {findings.map((finding: any) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  {engagementIds.length === 0
                    ? 'No active engagements. Please accept an invitation to get started.'
                    : 'No findings have been shared with you yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          {engagementIds.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Accept an invitation to view audit reports.</p>
              </CardContent>
            </Card>
          ) : (
            <ClientAuditReportReview engagementIds={engagementIds} />
          )}
        </TabsContent>

        <TabsContent value="queries" className="mt-4">
          {engagementIds.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Accept an invitation to view queries.</p>
              </CardContent>
            </Card>
          ) : (
            <ClientQueryList engagementIds={engagementIds} />
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {engagementIds.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  Accept an invitation to start uploading documents.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ClientDocumentUpload
              engagementIds={engagementIds}
              invitations={invitations || []}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FindingCard({ finding }: { finding: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState(finding.management_response || '');
  const [owner, setOwner] = useState(finding.management_response_owner || '');
  const [targetDate, setTargetDate] = useState(finding.target_remediation_date || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;

  const submitResponse = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('findings')
        .update({
          management_response: response,
          management_response_owner: owner,
          management_response_date: new Date().toISOString(),
          target_remediation_date: targetDate || null,
        })
        .eq('id', finding.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-findings'] });
      toast({ title: 'Response submitted', description: 'Your management response has been saved.' });
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">{finding.title}</CardTitle>
            <CardDescription className="text-xs">
              Module: {finding.module} {finding.submodule ? `› ${finding.submodule}` : ''}
            </CardDescription>
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {finding.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{finding.description}</p>
          </div>
        )}
        {finding.recommendation && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation</p>
            <p className="text-sm">{finding.recommendation}</p>
          </div>
        )}
        {finding.regulation_reference && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Regulatory Reference</p>
            <p className="text-sm text-muted-foreground">{finding.regulation_reference}</p>
          </div>
        )}
        {finding.management_response && (
          <div className="p-3 bg-muted/50 rounded-md border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-xs font-medium">Management Response</p>
              {finding.management_response_date && (
                <span className="text-xs text-muted-foreground">
                  ({new Date(finding.management_response_date).toLocaleDateString()})
                </span>
              )}
            </div>
            <p className="text-sm">{finding.management_response}</p>
            {finding.management_response_owner && (
              <p className="text-xs text-muted-foreground mt-1">Owner: {finding.management_response_owner}</p>
            )}
          </div>
        )}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Send className="h-3.5 w-3.5" />
              {finding.management_response ? 'Update Response' : 'Submit Management Response'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Management Response</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium">{finding.title}</p>
                <Badge className={`${config.color} mt-2`}>{config.label}</Badge>
              </div>
              <div className="space-y-2">
                <Label>Response</Label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Enter your management response..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsible Person</Label>
                  <Input
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Name / title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Remediation Date</Label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={() => submitResponse.mutate()}
                disabled={!response.trim() || submitResponse.isPending}
                className="w-full"
              >
                {submitResponse.isPending ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
