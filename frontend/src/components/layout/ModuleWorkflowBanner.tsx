import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertCircle, 
  UserCheck, 
  FileText, 
  ShieldAlert, 
  History, 
  ArrowRight,
  Loader2,
  MessageSquare,
  Trash2,
  Send,
  CornerDownRight,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export type LockState = 'draft' | 'manager_review' | 'partner_review' | 'finalized';

interface ModuleWorkflowBannerProps {
  engagementId: string;
  moduleKey: string;
  tableName: string;
  onLockStateChange?: (lockState: LockState, isLocked: boolean, canEdit: boolean) => void;
}

const STATE_DETAILS: Record<LockState, { label: string; description: string; color: string; icon: any }> = {
  draft: {
    label: 'Draft',
    description: 'Analyst is actively performing testing and working papers.',
    color: 'bg-muted text-muted-foreground border-muted-foreground/30',
    icon: FileText,
  },
  manager_review: {
    label: 'Manager Review',
    description: 'Preparer work is complete. Undergoing Quality Assurance review.',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    icon: UserCheck,
  },
  partner_review: {
    label: 'Partner Review',
    description: 'Manager review completed. Ready for senior sign-off.',
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    icon: ShieldAlert,
  },
  finalized: {
    label: 'Finalized',
    description: 'Review locked as the firm\'s official position. No further edits allowed.',
    color: 'bg-green-500/10 text-green-500 border-green-500/30',
    icon: Lock,
  },
};

const getFriendlyModuleName = (key: string): string => {
  const mapping: Record<string, string> = {
    msb_registration: 'MSB Registration',
    governance: 'Governance',
    aml_program: 'AML Program',
    risk_assessment: 'Risk Assessment',
    training: 'Training',
    kyc: 'KYC Review',
    reporting: 'Transaction Reporting',
    transaction_monitoring: 'Transaction Monitoring',
  };
  return mapping[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const getActionType = (from: LockState, to: LockState): string => {
  if (to === 'manager_review') return 'submit';
  if (to === 'partner_review') return from === 'draft' ? 'submit' : 'approve';
  if (from === 'manager_review' && to === 'draft') return 'reject';
  if (from === 'partner_review' && to === 'manager_review') return 'reject';
  if (from === 'partner_review' && to === 'draft') return 'reject';
  if (to === 'finalized') return 'finalize';
  if (from === 'finalized') return 'unlock';
  return 'update';
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'partner':
      return <Badge variant="outline" className="border-orange-500/30 text-orange-600 bg-orange-50/50 dark:bg-orange-950/20 text-[10px] py-0 px-1.5 h-4 font-semibold uppercase">Partner</Badge>;
    case 'manager':
      return <Badge variant="outline" className="border-purple-500/30 text-purple-600 bg-purple-50/50 dark:bg-purple-950/20 text-[10px] py-0 px-1.5 h-4 font-semibold uppercase">Manager</Badge>;
    case 'analyst':
      return <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-[10px] py-0 px-1.5 h-4 font-semibold uppercase">Analyst</Badge>;
    case 'admin':
      return <Badge variant="outline" className="border-red-500/30 text-red-600 bg-red-50/50 dark:bg-red-950/20 text-[10px] py-0 px-1.5 h-4 font-semibold uppercase">Admin</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 uppercase">{role}</Badge>;
  }
};

export function ModuleWorkflowBanner({
  engagementId,
  moduleKey,
  tableName,
  onLockStateChange,
}: ModuleWorkflowBannerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, isAdmin } = useUserRole();
  const { user } = useApp();
  
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [newReply, setNewReply] = useState('');

  // Transition dialog states
  const [pendingTransition, setPendingTransition] = useState<{ nextState: LockState; actionLabel: string } | null>(null);
  const [transitionNote, setTransitionNote] = useState('');

  // Fetch the current review workflow / lock state
  const { data: record, isLoading, refetch } = useQuery({
    queryKey: ['workflow-state', tableName, engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('id, lock_state, finalized_at, finalized_by, last_unlocked_at, last_unlocked_by, unlock_count')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch analyst module assignments
  const { data: moduleAssignments = [] } = useQuery({
    queryKey: ['my-module-assignments', engagementId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('engagement_module_assignments')
        .select('module')
        .eq('user_id', user.id)
        .eq('engagement_id', engagementId);
      if (error) throw error;
      return data.map((d: any) => d.module) as string[];
    },
    enabled: !!user && role === 'analyst',
  });

  // Fetch threaded comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['module-comments', engagementId, moduleKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_comments')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('module_key', moduleKey)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch review history audit log
  const { data: historyLogs = [], refetch: refetchHistory } = useQuery({
    queryKey: ['module-review-history', engagementId, moduleKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_review_history')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('module_key', moduleKey)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const lockState = (record?.lock_state || 'draft') as LockState;
  const isLocked = lockState === 'finalized';

  // Compute if the user has edit capability
  const canEdit = (() => {
    if (isLocked) return false;
    if (role === 'admin' || role === 'partner') return true;
    if (role === 'manager') {
      return lockState !== 'partner_review';
    }
    if (role === 'analyst') {
      if (moduleAssignments.length > 0 && !moduleAssignments.includes(moduleKey)) {
        return false;
      }
      return lockState === 'draft';
    }
    return false;
  })();

  // Resolve user emails/names for finalize/unlock logging
  useEffect(() => {
    const ids = [record?.finalized_by, record?.last_unlocked_by].filter(Boolean) as string[];
    if (ids.length === 0) return;

    supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)
      .then(({ data }) => {
        if (data) {
          const namesMap: Record<string, string> = {};
          data.forEach((p) => {
            namesMap[p.id] = p.full_name || p.email;
          });
          setProfileNames(namesMap);
        }
      });
  }, [record?.finalized_by, record?.last_unlocked_by]);

  // Propagate state changes back to parent
  useEffect(() => {
    if (!isLoading && onLockStateChange) {
      onLockStateChange(lockState, isLocked, canEdit);
    }
  }, [lockState, isLocked, canEdit, isLoading]);

  const recordHistory = async (fromState: string, toState: string, actionType: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('module_review_history')
        .insert({
          engagement_id: engagementId,
          module_key: moduleKey,
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
          user_role: role || 'analyst',
          from_state: fromState,
          to_state: toState,
          action_type: actionType,
          notes: notes || null,
        });
      if (error) console.error('Failed to log review history:', error);
    } catch (err) {
      console.error('Error logging review history:', err);
    }
  };

  // Workflow transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ nextState, notes }: { nextState: LockState; notes?: string }) => {
      // 1. Log transition history
      const actionType = getActionType(lockState, nextState);
      await recordHistory(lockState, nextState, actionType, notes);

      // 2. Perform DB update
      let result;
      if (!record?.id) {
        const { data, error } = await supabase
          .from(tableName as any)
          .insert({
            engagement_id: engagementId,
            lock_state: nextState,
          } as any)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from(tableName as any)
          .update({
            lock_state: nextState,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', record.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      // 3. Send email notification if transitioning to partner_review directly from draft by an analyst
      if (nextState === 'partner_review' && role === 'analyst') {
        try {
          // Fetch engagement details
          const { data: engData } = await supabase
            .from('engagements')
            .select('name, client_id, clients(name)')
            .eq('id', engagementId)
            .single();

          const engagementName = engData?.name || 'Engagement';
          const clientName = (engData as unknown as { clients: { name: string } | null })?.clients?.name || 'Client';

          // A. Fetch partners assigned to this engagement
          const { data: assignments, error: assError } = await supabase
            .from('engagement_assignments')
            .select('user_id')
            .eq('engagement_id', engagementId);

          let partnerEmails: string[] = [];

          if (!assError && assignments && assignments.length > 0) {
            const userIds = assignments.map(a => a.user_id);
            const { data: partners } = await supabase
              .from('user_roles')
              .select('user_id')
              .in('user_id', userIds)
              .eq('role', 'partner');
            
            if (partners && partners.length > 0) {
              const partnerIds = partners.map(p => p.user_id);
              const { data: partnerProfiles } = await supabase
                .from('profiles')
                .select('email')
                .in('id', partnerIds);
              
              if (partnerProfiles) {
                partnerEmails = partnerProfiles.map(p => p.email).filter(Boolean);
              }
            }
          }

          // B. If no partners are assigned, fallback to all partners
          if (partnerEmails.length === 0) {
            const { data: allPartners } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'partner');
            
            if (allPartners && allPartners.length > 0) {
              const partnerIds = allPartners.map(p => p.user_id);
              const { data: partnerProfiles } = await supabase
                .from('profiles')
                .select('email')
                .in('id', partnerIds);
              
              if (partnerProfiles) {
                partnerEmails = partnerProfiles.map(p => p.email).filter(Boolean);
              }
            }
          }

          // C. Send email to each partner
          const analystName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'An analyst';
          const moduleName = getFriendlyModuleName(moduleKey);

          for (const email of partnerEmails) {
            const emailSubject = `[Veritas Review Action] Module Ready for Partner Review: ${moduleName}`;
            const emailHtml = `
              <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #ea580c; border-bottom: 2px solid #f97316; padding-bottom: 10px; margin-top: 0;">Partner Review Requested</h2>
                <p>Hello,</p>
                <p>An analyst has directly submitted a module for your senior sign-off:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Client:</td>
                    <td style="padding: 8px 0;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Engagement:</td>
                    <td style="padding: 8px 0;">${engagementName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Module:</td>
                    <td style="padding: 8px 0; color: #1e3a8a; font-weight: bold;">${moduleName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Submitted By:</td>
                    <td style="padding: 8px 0;">${analystName} (${user?.email})</td>
                  </tr>
                  ${notes ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Notes:</td>
                    <td style="padding: 8px 0; background-color: #f9fafb; padding: 8px; border-radius: 4px; font-style: italic;">"${notes}"</td>
                  </tr>
                  ` : ''}
                </table>
                <p style="margin-top: 25px;">Please log in to the Veritas AML Platform to review the module and finalize/lock it.</p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${window.location.origin}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="font-size: 11px; color: #666; text-align: center;">This is an automated notification from Veritas AML Platform.</p>
              </div>
            `;

            await supabase.rpc('send_resend_email_secure', {
              to_email: email,
              subject: emailSubject,
              html_content: emailHtml
            });
          }
        } catch (err) {
          console.error("Failed to send partner notifications:", err);
        }
      }

      return result;
    },
    onSuccess: (data) => {
      refetch();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast({
        title: `Stage updated to ${STATE_DETAILS[data.lock_state as LockState].label}`,
        description: 'Module lock state successfully transitioned.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Transition failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Comments mutations
  const addCommentMutation = useMutation({
    mutationFn: async ({ text, parentId }: { text: string; parentId?: string | null }) => {
      const { data, error } = await supabase
        .from('module_comments')
        .insert({
          engagement_id: engagementId,
          module_key: moduleKey,
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
          user_role: role || 'analyst',
          comment_text: text,
          parent_comment_id: parentId || null,
        })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setNewComment('');
      setReplyingToId(null);
      setNewReply('');
      refetchComments();
      toast({ title: 'Comment added' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to add comment', description: err.message, variant: 'destructive' });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('module_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchComments();
      toast({ title: 'Comment deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to delete comment', description: err.message, variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <Card className="border border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-4 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading workflow status...</span>
        </CardContent>
      </Card>
    );
  }

  const StateIcon = STATE_DETAILS[lockState].icon;

  // Thread logic
  const parentComments = comments.filter(c => !c.parent_comment_id);
  const repliesByParentId = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      if (!acc[c.parent_comment_id]) acc[c.parent_comment_id] = [];
      acc[c.parent_comment_id].push(c);
    }
    return acc;
  }, {} as Record<string, typeof comments>);

  const handlePostTransition = () => {
    if (pendingTransition) {
      transitionMutation.mutate({
        nextState: pendingTransition.nextState,
        notes: transitionNote.trim() || undefined
      });
      setPendingTransition(null);
      setTransitionNote('');
    }
  };

  return (
    <div className="space-y-4">
      <Card className={cn(
        "border backdrop-blur-sm shadow-sm transition-all duration-300",
        isLocked 
          ? "border-green-500/30 bg-green-500/5" 
          : "border-border/60 bg-card/60"
      )}>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* State Information */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg border",
              isLocked ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground"
            )}>
              <StateIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">Review Stage:</span>
                <Badge variant="outline" className={STATE_DETAILS[lockState].color}>
                  {STATE_DETAILS[lockState].label}
                </Badge>
                {isLocked ? (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-0 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Locked
                  </Badge>
                ) : canEdit ? (
                  <Badge variant="outline" className="border-green-500/30 text-green-500">
                    Editable
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Read Only
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {STATE_DETAILS[lockState].description}
              </p>
              
              {/* Audit Log / Logged State Data */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                {isLocked && record?.finalized_at && (
                  <span className="flex items-center gap-1 text-green-600/90 font-medium">
                    <Lock className="h-3 w-3" />
                    Finalized by {record.finalized_by ? (profileNames[record.finalized_by] || 'System') : 'Partner'} on {new Date(record.finalized_at).toLocaleDateString()}
                  </span>
                )}
                {record?.unlock_count > 0 && (
                  <span className="flex items-center gap-1">
                    <History className="h-3 w-3" />
                    Unlocked {record.unlock_count} {record.unlock_count === 1 ? 'time' : 'times'}
                    {record.last_unlocked_at && (
                      <> (Last: {record.last_unlocked_by ? (profileNames[record.last_unlocked_by] || 'Partner') : 'Partner'} on {new Date(record.last_unlocked_at).toLocaleDateString()})</>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Controls & Utilities */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {/* Threaded Comments Toggle */}
            <Button
              variant="outline"
              size="sm"
              className={cn("relative border-border/80 h-9", showComments && "bg-muted/80")}
              onClick={() => {
                setShowComments(!showComments);
                setShowHistory(false);
              }}
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Comments
              {comments.length > 0 && (
                <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-semibold px-1">
                  {comments.length}
                </span>
              )}
            </Button>

            {/* Audit Trail Toggle */}
            <Button
              variant="outline"
              size="sm"
              className={cn("border-border/80 h-9", showHistory && "bg-muted/80")}
              onClick={() => {
                setShowHistory(!showHistory);
                setShowComments(false);
              }}
            >
              <History className="h-4 w-4 mr-1.5" />
              Audit Trail
            </Button>

            <div className="border-l border-border/80 h-6 mx-1" />

            {/* Analyst Options */}
            {role === 'analyst' && lockState === 'draft' && (
              <div className="flex items-center gap-2">
                <Button 
                  size="sm"
                  variant="outline" 
                  onClick={() => setPendingTransition({ nextState: 'manager_review', actionLabel: 'Submit for Manager Review' })}
                  disabled={transitionMutation.isPending}
                  className="h-9"
                >
                  Submit for Manager Review <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
                <Button 
                  size="sm"
                  variant="default" 
                  onClick={() => setPendingTransition({ nextState: 'partner_review', actionLabel: 'Submit directly to Partner Review' })}
                  disabled={transitionMutation.isPending}
                  className="h-9 bg-orange-600 hover:bg-orange-700 text-white border-0"
                >
                  Submit directly to Partner <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            )}

            {/* Manager Options */}
            {role === 'manager' && (
              <>
                {lockState === 'draft' && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingTransition({ nextState: 'manager_review', actionLabel: 'Submit for Manager Review' })}
                    disabled={transitionMutation.isPending}
                    className="h-9"
                  >
                    Submit for Manager Review
                  </Button>
                )}
                {lockState === 'manager_review' && (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      variant="destructive"
                      onClick={() => setPendingTransition({ nextState: 'draft', actionLabel: 'Return to Draft' })}
                      disabled={transitionMutation.isPending}
                      className="h-9"
                    >
                      Return to Draft
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingTransition({ nextState: 'partner_review', actionLabel: 'Submit for Partner Review' })}
                      disabled={transitionMutation.isPending}
                      className="h-9"
                    >
                      Submit for Partner Review <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Partner / Admin Options */}
            {(role === 'partner' || role === 'admin') && (
              <>
                {lockState !== 'finalized' && (
                  <>
                    {lockState === 'draft' && (
                      <Button 
                        size="sm"
                        variant="outline" 
                        onClick={() => setPendingTransition({ nextState: 'manager_review', actionLabel: 'Submit for QA' })}
                        disabled={transitionMutation.isPending}
                        className="mr-1 h-9"
                      >
                        Submit for QA
                      </Button>
                    )}
                    {lockState !== 'partner_review' && (
                      <Button 
                        size="sm"
                        variant="outline" 
                        onClick={() => setPendingTransition({ nextState: 'partner_review', actionLabel: 'Move to Partner Review' })}
                        disabled={transitionMutation.isPending}
                        className="mr-1 h-9"
                      >
                        Move to Partner Review
                      </Button>
                    )}
                    {lockState === 'partner_review' && (
                      <>
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={() => setPendingTransition({ nextState: 'manager_review', actionLabel: 'Return to Manager' })}
                          disabled={transitionMutation.isPending}
                          className="mr-1 h-9"
                        >
                          Return to Manager
                        </Button>
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={() => setPendingTransition({ nextState: 'draft', actionLabel: 'Return to Draft' })}
                          disabled={transitionMutation.isPending}
                          className="mr-1 h-9"
                        >
                          Return to Draft
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm"
                      variant="default"
                      onClick={() => setPendingTransition({ nextState: 'finalized', actionLabel: 'Finalize & Lock' })}
                      disabled={transitionMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white h-9"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Finalize & Lock
                    </Button>
                  </>
                )}
                {isLocked && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingTransition({ nextState: 'draft', actionLabel: 'Unlock Module' })}
                    disabled={transitionMutation.isPending}
                    className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10 h-9"
                  >
                    <Unlock className="h-3.5 w-3.5 mr-1.5" /> Unlock Module
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 1. Collapsible Comments Section */}
      {showComments && (
        <Card className="border border-border/60 bg-card shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Review Comments & Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Exchange feedback, request updates, and discuss questions.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowComments(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
            {parentComments.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No comments posted yet. Write the first note below.
              </div>
            ) : (
              <div className="space-y-4">
                {parentComments.map((comment) => (
                  <div key={comment.id} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">{comment.user_name}</span>
                          {getRoleBadge(comment.user_role)}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap mt-1 pr-6 leading-relaxed">
                          {comment.comment_text}
                        </p>
                      </div>
                      
                      {/* Delete comment */}
                      {user?.id === comment.user_id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Replies */}
                    <div className="pl-4 mt-2 border-l-2 border-muted space-y-2">
                      {repliesByParentId[comment.id]?.map((reply) => (
                        <div key={reply.id} className="flex items-start justify-between gap-2 py-1">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-[11px] font-semibold text-foreground">{reply.user_name}</span>
                              {getRoleBadge(reply.user_role)}
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-foreground/80 pl-5 whitespace-pre-wrap pr-6 leading-relaxed">
                              {reply.comment_text}
                            </p>
                          </div>
                          
                          {/* Delete reply */}
                          {user?.id === reply.user_id && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => deleteCommentMutation.mutate(reply.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}

                      {/* Reply Input Box */}
                      {replyingToId === comment.id ? (
                        <div className="flex items-center gap-2 mt-2 pl-5">
                          <input
                            type="text"
                            placeholder="Reply to comment..."
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newReply.trim()) {
                                addCommentMutation.mutate({ text: newReply, parentId: comment.id });
                              }
                            }}
                            className="text-xs flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <Button 
                            size="icon" 
                            className="h-8 w-8 shrink-0" 
                            disabled={!newReply.trim() || addCommentMutation.isPending}
                            onClick={() => addCommentMutation.mutate({ text: newReply, parentId: comment.id })}
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              setReplyingToId(null);
                              setNewReply('');
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="link" 
                          className="text-[11px] p-0 h-4 text-primary pl-5"
                          onClick={() => setReplyingToId(comment.id)}
                        >
                          Reply
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Post Main Comment Input */}
            <div className="flex gap-2 items-end pt-3 border-t border-border/40">
              <Textarea
                placeholder="Write a review comment or request changes..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="text-xs min-h-[50px] resize-none"
              />
              <Button 
                size="icon" 
                className="h-10 w-10 shrink-0" 
                disabled={!newComment.trim() || addCommentMutation.isPending}
                onClick={() => addCommentMutation.mutate({ text: newComment })}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Collapsible Audit Trail Section */}
      {showHistory && (
        <Card className="border border-border/60 bg-card shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Workflow Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                History of stage submissions, approvals, returns, and unlocks.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {historyLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No history recorded yet. Changes will be logged here.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 border-l border-muted/80 ml-2 py-2">
                {historyLogs.map((log) => {
                  let actionColor = "bg-muted text-muted-foreground";
                  if (log.action_type === 'submit') actionColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                  if (log.action_type === 'approve') actionColor = "bg-orange-500/10 text-orange-500 border-orange-500/20";
                  if (log.action_type === 'reject') actionColor = "bg-destructive/10 text-destructive border-destructive/20";
                  if (log.action_type === 'finalize') actionColor = "bg-green-500/10 text-green-500 border-green-500/20";
                  if (log.action_type === 'unlock') actionColor = "bg-orange-500/10 text-orange-600 border-orange-500/20";

                  return (
                    <div key={log.id} className="relative">
                      {/* Circle indicator */}
                      <span className="absolute -left-[30px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-muted-foreground/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      </span>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">{log.user_name}</span>
                          {getRoleBadge(log.user_role || 'analyst')}
                          <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 h-4 font-semibold uppercase", actionColor)}>
                            {log.action_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Transitioned from <span className="font-medium text-foreground">{STATE_DETAILS[log.from_state as LockState]?.label || log.from_state}</span> to <span className="font-medium text-foreground">{STATE_DETAILS[log.to_state as LockState]?.label || log.to_state}</span>.
                        </p>

                        {log.notes && (
                          <div className="mt-1 bg-muted/40 dark:bg-muted/10 border-l-2 border-primary/50 px-2 py-1 text-[11px] text-foreground/90 italic rounded-r">
                            "{log.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Transition Comment/Note Dialog */}
      <Dialog open={pendingTransition !== null} onOpenChange={(open) => !open && setPendingTransition(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {pendingTransition?.actionLabel}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide an optional note to document the reason for this workflow transition (e.g. revision feedback, approval notes).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Add optional notes for the audit trail..."
              value={transitionNote}
              onChange={(e) => setTransitionNote(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPendingTransition(null);
                setTransitionNote('');
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={transitionMutation.isPending}
              onClick={handlePostTransition}
              className="text-xs"
            >
              {transitionMutation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
