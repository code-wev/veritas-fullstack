import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
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
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

  // Fetch the current review workflow / lock state
  const { data: record, isLoading, refetch } = useQuery({
    queryKey: ['workflow-state', tableName, engagementId],
    queryFn: async () => {
      // Fetch status, lock_state and logging fields
      const { data, error } = await supabase
        .from(tableName as any)
        .select('id, lock_state, finalized_at, finalized_by, last_unlocked_at, last_unlocked_by, unlock_count')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch analyst module assignments to check narrowing
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
      // Check opt-in scoping: if analyst has assignments, they must be assigned to this module
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

  // Workflow transition mutation
  const transitionMutation = useMutation({
    mutationFn: async (nextState: LockState) => {
      if (!record?.id) {
        // If the review record doesn't exist yet, insert it first
        const { data, error } = await supabase
          .from(tableName as any)
          .insert({
            engagement_id: engagementId,
            lock_state: nextState,
          } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
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
        return data;
      }
    },
    onSuccess: (data) => {
      refetch();
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

  return (
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

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Analyst Options */}
          {role === 'analyst' && lockState === 'draft' && (
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => transitionMutation.mutate('manager_review')}
              disabled={transitionMutation.isPending}
            >
              Submit for Manager Review <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          )}

          {/* Manager Options */}
          {role === 'manager' && (
            <>
              {lockState === 'draft' && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => transitionMutation.mutate('manager_review')}
                  disabled={transitionMutation.isPending}
                >
                  Submit for Manager Review
                </Button>
              )}
              {lockState === 'manager_review' && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => transitionMutation.mutate('partner_review')}
                  disabled={transitionMutation.isPending}
                >
                  Submit for Partner Review <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
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
                      onClick={() => transitionMutation.mutate('manager_review')}
                      disabled={transitionMutation.isPending}
                      className="mr-1"
                    >
                      Submit for QA
                    </Button>
                  )}
                  {lockState !== 'partner_review' && (
                    <Button 
                      size="sm"
                      variant="outline" 
                      onClick={() => transitionMutation.mutate('partner_review')}
                      disabled={transitionMutation.isPending}
                      className="mr-1"
                    >
                      Move to Partner Review
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    variant="default"
                    onClick={() => transitionMutation.mutate('finalized')}
                    disabled={transitionMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Finalize & Lock
                  </Button>
                </>
              )}
              {isLocked && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to unlock this module? Unlocking will log this action and increment the unlock count.')) {
                      transitionMutation.mutate('draft');
                    }
                  }}
                  disabled={transitionMutation.isPending}
                  className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                >
                  <Unlock className="h-3.5 w-3.5 mr-1.5" /> Unlock Module
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
