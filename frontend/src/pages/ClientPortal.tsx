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
import { AlertTriangle, CheckCircle, Clock, MessageSquare, Send, Shield, FileText, Upload, BookOpen, Eye, EyeOff } from 'lucide-react';
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

function AccountSetupForm({ user, onComplete }: { user: any; onComplete: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters long', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = null;

      // 1. Upload profile image if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.floor(Date.now() / 1000)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            upsert: true
          });

        if (uploadError) {
          if (uploadError.message.includes('bucket') || uploadError.message.includes('not_found') || uploadError.message.includes('not found')) {
            throw new Error("The 'avatars' storage bucket does not exist. Please ask your administrator to create a public storage bucket named 'avatars' in the Supabase Dashboard.");
          }
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        avatarUrl = publicUrl;

        // Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // 2. Update auth user password and clear first-login flag
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { needs_password_change: false }
      });

      if (authError) throw authError;

      toast({
        title: 'Account setup complete',
        description: 'Your password and profile have been secured successfully.'
      });

      // Reload window to refresh all state completely
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Failed to complete setup',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSetupSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
            minLength={6}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar">Profile Image (Optional)</Label>
        <Input
          id="avatar"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              setAvatarFile(files[0]);
            }
          }}
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          Supported formats: JPEG, PNG, GIF. Max size 2MB.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Securing Account...' : 'Complete Setup'}
      </Button>
    </form>
  );
}

export default function ClientPortal() {
  const { user } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch client assignments
  const { data: clientAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['client-assignments-portal', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('client_assignments')
        .select('client_id, clients(name)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const myClientIds = clientAssignments.map((a: any) => a.client_id) ?? [];

  // 2. Fetch engagements for those client ids
  const { data: directEngagements = [], isLoading: loadingDirect } = useQuery({
    queryKey: ['client-direct-engagements', myClientIds],
    queryFn: async () => {
      if (myClientIds.length === 0) return [];
      const { data, error } = await supabase
        .from('engagements')
        .select('id, name, client_id, period_start, period_end, clients(name)')
        .in('client_id', myClientIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: myClientIds.length > 0,
  });

  // 3. Fetch legacy invitations
  const { data: legacyInvitations = [], isLoading: loadingLegacy } = useQuery({
    queryKey: ['client-legacy-invitations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('client_invitations')
        .select('*, clients(name), engagements(name, period_start, period_end)')
        .eq('email', user.email)
        .eq('status', 'accepted');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.email,
  });

  const { data: pendingInvitations } = useQuery({
    queryKey: ['client-pending-invitations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('client_invitations')
        .select('*, clients(name), engagements(name, period_start, period_end)')
        .eq('email', user.email)
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
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
      queryClient.invalidateQueries({ queryKey: ['client-legacy-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-invitations'] });
      toast({ title: 'Invitation accepted', description: 'You can now view findings for this engagement.' });
    },
  });

  // Construct mock invitation structures for direct assignments
  const directAsInvitations = directEngagements.map((eng: any) => ({
    id: `direct-${eng.id}`,
    engagement_id: eng.id,
    client_id: eng.client_id,
    email: user?.email,
    status: 'accepted',
    clients: eng.clients,
    engagements: {
      name: eng.name,
      period_start: eng.period_start,
      period_end: eng.period_end
    }
  }));

  // Combine legacy accepted invitations and direct engagements
  const invitations = [
    ...legacyInvitations,
    ...directAsInvitations
  ];

  const engagementIds = invitations.map((i: any) => i.engagement_id);

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

  const loading = loadingAssignments || loadingDirect || loadingLegacy;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const needsPasswordChange = user?.user_metadata?.needs_password_change === true;

  if (needsPasswordChange) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="border-primary/20 shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary animate-pulse" />
              Finish Account Setup
            </CardTitle>
            <CardDescription>
              Welcome! Since this is your first login, please choose a new password and configure your profile image to secure your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountSetupForm user={user} onComplete={() => queryClient.invalidateQueries()} />
          </CardContent>
        </Card>
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
