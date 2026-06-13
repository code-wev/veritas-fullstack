import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Engagement-scoped, user-scoped helpers for the Engagement Dashboard.
 *
 * `useEngagementRecentWork` — last items the current user touched on this
 * engagement (findings they authored or last reviewed). Sorted by recency.
 *
 * `useEngagementPendingTasks` — items needing the current user's action
 * (findings in draft status, audit reports awaiting review).
 */

export interface RecentWorkItem {
  kind: 'finding' | 'finding_review';
  id: string;
  title: string;
  module: string;
  timestamp: string;
  status: string;
  finding_type: string | null;
}

export function useEngagementRecentWork(engagementId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['eng-recent-work', engagementId, userId],
    enabled: !!engagementId && !!userId,
    queryFn: async (): Promise<RecentWorkItem[]> => {
      if (!engagementId || !userId) return [];
      const { data, error } = await supabase
        .from('findings')
        .select('id, title, module, status, finding_type, updated_at, created_at, created_by, reviewed_by, reviewed_at')
        .eq('engagement_id', engagementId)
        .or(`created_by.eq.${userId},reviewed_by.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(6);
      if (error || !data) return [];

      return data.map((f: any) => {
        const wasReviewer = f.reviewed_by === userId && f.reviewed_at;
        return {
          kind: wasReviewer ? 'finding_review' : 'finding',
          id: f.id,
          title: f.title,
          module: f.module,
          status: f.status,
          finding_type: f.finding_type,
          timestamp: (wasReviewer ? f.reviewed_at : f.updated_at) ?? f.created_at,
        } as RecentWorkItem;
      });
    },
  });
}

export interface PendingTaskItem {
  kind: 'draft_finding' | 'pending_review';
  id: string;
  title: string;
  module: string;
  age_days: number;
  finding_type: string | null;
}

export function useEngagementPendingTasks(engagementId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['eng-pending-tasks', engagementId, userId],
    enabled: !!engagementId && !!userId,
    queryFn: async (): Promise<PendingTaskItem[]> => {
      if (!engagementId || !userId) return [];

      // Findings still in draft authored by this user — they own moving them forward
      const draftFindingsRes = await supabase
        .from('findings')
        .select('id, title, module, status, finding_type, created_at')
        .eq('engagement_id', engagementId)
        .eq('status', 'draft')
        .eq('created_by', userId)
        .order('created_at', { ascending: true })
        .limit(10);

      // Reports pending review on this engagement (any reviewer can pick up)
      const pendingReportsRes = await supabase
        .from('audit_reports')
        .select('id, status, created_at')
        .eq('engagement_id', engagementId)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true })
        .limit(10);

      const now = Date.now();
      const items: PendingTaskItem[] = [];
      for (const f of draftFindingsRes.data ?? []) {
        items.push({
          kind: 'draft_finding',
          id: (f as any).id,
          title: (f as any).title,
          module: (f as any).module,
          finding_type: (f as any).finding_type,
          age_days: Math.floor((now - new Date((f as any).created_at).getTime()) / 86400000),
        });
      }
      for (const r of pendingReportsRes.data ?? []) {
        items.push({
          kind: 'pending_review',
          id: (r as any).id,
          title: 'Audit report awaiting sign-off',
          module: 'audit_report',
          finding_type: null,
          age_days: Math.floor((now - new Date((r as any).created_at).getTime()) / 86400000),
        });
      }
      // Oldest items first so they bubble up
      items.sort((a, b) => b.age_days - a.age_days);
      return items.slice(0, 6);
    },
  });
}
