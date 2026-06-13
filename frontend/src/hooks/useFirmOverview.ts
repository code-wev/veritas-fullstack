import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export interface FirmKPIs {
  activeEngagements: number;
  overdue: number;
  awaitingClient: number;
  awaitingReview: number;
  criticalFindings: number;
}

export interface PriorityEngagement {
  engagement_id: string;
  engagement_name: string;
  client_id: string;
  client_name: string;
  reason: 'overdue' | 'client_query' | 'report_ready' | 'critical_finding' | 'docs_pending';
  reason_label: string;
  detail: string;
  risk_score: number;
}

export interface QueueItem {
  id: string;
  type: 'finding' | 'query' | 'report' | 'document';
  title: string;
  client_name: string;
  due_at: string | null;
  priority: 'urgent' | 'high' | 'normal';
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  kind: 'upload' | 'query_response' | 'finding' | 'report';
  text: string;
  client_name: string;
}

export interface Deadline {
  id: string;
  client_name: string;
  engagement_name: string;
  label: string;
  date: string;
  days_left: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function useFirmKPIs() {
  return useQuery({
    queryKey: ['firm-kpis'],
    queryFn: async (): Promise<FirmKPIs> => {
      const todayStr = today();

      const [engagementsRes, overdueRes, queriesRes, reportsRes, findingsRes] = await Promise.all([
        supabase.from('engagements').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
        supabase.from('engagements').select('id', { count: 'exact', head: true }).lt('period_end', todayStr).neq('status', 'completed'),
        supabase.from('information_requests').select('id', { count: 'exact', head: true }).in('status', ['open', 'sent']),
        supabase.from('audit_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('findings').select('id', { count: 'exact', head: true }).eq('severity', 'critical').neq('status', 'closed'),
      ]);

      return {
        activeEngagements: engagementsRes.count ?? 0,
        overdue: overdueRes.count ?? 0,
        awaitingClient: queriesRes.count ?? 0,
        awaitingReview: reportsRes.count ?? 0,
        criticalFindings: findingsRes.count ?? 0,
      };
    },
  });
}

export function usePriorityEngagements() {
  return useQuery({
    queryKey: ['priority-engagements'],
    queryFn: async (): Promise<PriorityEngagement[]> => {
      const todayStr = today();
      const { data: engagements } = await supabase
        .from('engagements')
        .select('id, name, client_id, period_end, status, clients!inner(name)')
        .neq('status', 'completed')
        .order('period_end', { ascending: true })
        .limit(50);

      if (!engagements) return [];

      const engagementIds = engagements.map(e => e.id);

      const [openQueries, criticalFindings, pendingReports] = await Promise.all([
        supabase.from('information_requests').select('engagement_id, created_at').in('engagement_id', engagementIds).in('status', ['open', 'sent']),
        supabase.from('findings').select('engagement_id, severity').in('engagement_id', engagementIds).eq('severity', 'critical').neq('status', 'closed'),
        supabase.from('audit_reports').select('engagement_id, status').in('engagement_id', engagementIds).eq('status', 'pending_review'),
      ]);

      const queryMap = new Map<string, number>();
      openQueries.data?.forEach(q => queryMap.set(q.engagement_id, (queryMap.get(q.engagement_id) ?? 0) + 1));
      const criticalMap = new Map<string, number>();
      criticalFindings.data?.forEach(f => criticalMap.set(f.engagement_id, (criticalMap.get(f.engagement_id) ?? 0) + 1));
      const reportMap = new Set(pendingReports.data?.map(r => r.engagement_id) ?? []);

      const priority: PriorityEngagement[] = [];

      for (const e of engagements) {
        const isOverdue = new Date(e.period_end) < new Date(todayStr);
        const daysOverdue = isOverdue
          ? Math.floor((Date.now() - new Date(e.period_end).getTime()) / 86400000)
          : 0;
        const queries = queryMap.get(e.id) ?? 0;
        const criticals = criticalMap.get(e.id) ?? 0;
        const reportReady = reportMap.has(e.id);

        const clientName = (e.clients as { name: string } | null)?.name ?? 'Unknown';

        if (criticals > 0) {
          priority.push({
            engagement_id: e.id, engagement_name: e.name, client_id: e.client_id, client_name: clientName,
            reason: 'critical_finding', reason_label: `CRITICAL // ${criticals} OPEN`,
            detail: `${criticals} unresolved critical finding${criticals > 1 ? 's' : ''}`,
            risk_score: 100 + criticals * 10,
          });
        } else if (isOverdue) {
          priority.push({
            engagement_id: e.id, engagement_name: e.name, client_id: e.client_id, client_name: clientName,
            reason: 'overdue', reason_label: `OVERDUE // ${daysOverdue}D`,
            detail: `Past period end by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
            risk_score: 80 + Math.min(daysOverdue, 30),
          });
        } else if (reportReady) {
          priority.push({
            engagement_id: e.id, engagement_name: e.name, client_id: e.client_id, client_name: clientName,
            reason: 'report_ready', reason_label: 'REPORT // FINAL APPROVAL',
            detail: 'Audit report awaiting partner approval',
            risk_score: 60,
          });
        } else if (queries > 0) {
          priority.push({
            engagement_id: e.id, engagement_name: e.name, client_id: e.client_id, client_name: clientName,
            reason: 'client_query', reason_label: `QUERY // ${queries} UNANSWERED`,
            detail: `${queries} client quer${queries > 1 ? 'ies' : 'y'} unanswered`,
            risk_score: 40 + queries,
          });
        }
      }

      return priority.sort((a, b) => b.risk_score - a.risk_score).slice(0, 8);
    },
  });
}

export function useMyQueue() {
  const { user } = useApp();
  return useQuery({
    queryKey: ['my-queue', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<QueueItem[]> => {
      if (!user) return [];

      const [pendingReports, openQueries] = await Promise.all([
        supabase.from('audit_reports').select('id, status, engagement_id, engagements!inner(name, clients!inner(name))').eq('status', 'pending_review').limit(10),
        supabase.from('information_requests').select('id, title, due_date, priority, engagement_id, engagements!inner(name, clients!inner(name))').in('status', ['open', 'sent']).order('due_date', { ascending: true, nullsFirst: false }).limit(10),
      ]);

      const items: QueueItem[] = [];

      pendingReports.data?.forEach(r => {
        const eng = r.engagements as { name: string; clients: { name: string } | null } | null;
        items.push({
          id: r.id, type: 'report',
          title: `Approve audit report — ${eng?.name ?? ''}`,
          client_name: eng?.clients?.name ?? 'Unknown',
          due_at: null, priority: 'high',
        });
      });

      openQueries.data?.forEach(q => {
        const eng = q.engagements as { name: string; clients: { name: string } | null } | null;
        items.push({
          id: q.id, type: 'query',
          title: q.title,
          client_name: eng?.clients?.name ?? 'Unknown',
          due_at: q.due_date,
          priority: q.priority === 'urgent' ? 'urgent' : q.priority === 'high' ? 'high' : 'normal',
        });
      });

      return items.slice(0, 6);
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const [docs, responses, findings] = await Promise.all([
        supabase.from('client_documents').select('id, filename, created_at, clients!inner(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('information_request_responses').select('id, created_at, response_text, information_requests!inner(title, engagements!inner(clients!inner(name)))').order('created_at', { ascending: false }).limit(5),
        supabase.from('findings').select('id, title, created_at, severity, engagements!inner(clients!inner(name))').order('created_at', { ascending: false }).limit(5),
      ]);

      const items: ActivityItem[] = [];

      docs.data?.forEach(d => items.push({
        id: `doc-${d.id}`, timestamp: d.created_at, kind: 'upload',
        text: `Client uploaded ${d.filename}`,
        client_name: (d.clients as { name: string } | null)?.name ?? 'Unknown',
      }));

      responses.data?.forEach(r => {
        const req = r.information_requests as { title: string; engagements: { clients: { name: string } | null } | null } | null;
        items.push({
          id: `resp-${r.id}`, timestamp: r.created_at, kind: 'query_response',
          text: `Client responded to "${req?.title ?? 'query'}"`,
          client_name: req?.engagements?.clients?.name ?? 'Unknown',
        });
      });

      findings.data?.forEach(f => {
        const eng = f.engagements as { clients: { name: string } | null } | null;
        items.push({
          id: `find-${f.id}`, timestamp: f.created_at, kind: 'finding',
          text: `${f.severity.toUpperCase()} finding raised: ${f.title}`,
          client_name: eng?.clients?.name ?? 'Unknown',
        });
      });

      return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
    },
  });
}

import {
  FINDING_TYPE_META,
  FindingType,
  severityToFindingType,
} from '@/lib/findingClassification';

export interface FindingsBreakdown {
  /** Total rows (deficiencies + observations) */
  total: number;
  /** Deficiency count only */
  deficiencyCount: number;
  observationCount: number;
  byType: { type: FindingType; label: string; shortLabel: string; count: number }[];
  byModule: { module: string; count: number }[];
  closedThisMonth: number;
  avgDaysToClose: number | null;
  /** Open deficiencies (status != closed AND not observation) */
  openCount: number;
}

export function useFindingsBreakdown() {
  return useQuery({
    queryKey: ['findings-breakdown'],
    queryFn: async (): Promise<FindingsBreakdown> => {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthAgoStr = monthAgo.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('findings')
        .select('id, severity, module, status, created_at, reviewed_at, finding_type')
        .limit(2000);
      if (error || !data) {
        return { total: 0, deficiencyCount: 0, observationCount: 0, byType: [], byModule: [], closedThisMonth: 0, avgDaysToClose: null, openCount: 0 };
      }

      const typeMap = new Map<FindingType, number>();
      const modMap = new Map<string, number>();
      let closedThisMonth = 0;
      let openCount = 0;
      let deficiencyCount = 0;
      let observationCount = 0;
      let totalDaysToClose = 0;
      let closedWithDates = 0;

      for (const f of data) {
        const type: FindingType = (f as any).finding_type ?? severityToFindingType(f.severity);
        typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
        if (FINDING_TYPE_META[type].isDeficiency) {
          deficiencyCount++;
          if (f.status !== 'closed') openCount++;
        } else {
          observationCount++;
        }
        const mod = f.module || 'Other';
        modMap.set(mod, (modMap.get(mod) ?? 0) + 1);
        if (f.status === 'closed' && f.reviewed_at) {
          if (f.reviewed_at >= monthAgoStr) closedThisMonth++;
          const days = (new Date(f.reviewed_at).getTime() - new Date(f.created_at).getTime()) / 86400000;
          if (days >= 0 && days < 365) {
            totalDaysToClose += days;
            closedWithDates++;
          }
        }
      }

      const byType = Array.from(typeMap.entries())
        .map(([type, count]) => ({
          type,
          label: FINDING_TYPE_META[type].label,
          shortLabel: FINDING_TYPE_META[type].shortLabel,
          count,
        }))
        .sort((a, b) => FINDING_TYPE_META[a.type].rank - FINDING_TYPE_META[b.type].rank);
      const byModule = Array.from(modMap.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      return {
        total: data.length,
        deficiencyCount,
        observationCount,
        byType,
        byModule,
        closedThisMonth,
        avgDaysToClose: closedWithDates > 0 ? Math.round(totalDaysToClose / closedWithDates) : null,
        openCount,
      };
    },
  });
}

export interface ClientHotspot {
  client_id: string;
  client_name: string;
  openFindings: number;
  criticalCount: number;
  openQueries: number;
  activeEngagements: number;
  riskScore: number;
}

export function useClientHotspots() {
  return useQuery({
    queryKey: ['client-hotspots'],
    queryFn: async (): Promise<ClientHotspot[]> => {
      const [engagementsRes, findingsRes, queriesRes] = await Promise.all([
        supabase.from('engagements').select('id, client_id, status, clients!inner(name)').neq('status', 'completed').limit(500),
        supabase.from('findings').select('engagement_id, severity, status').neq('status', 'closed').limit(2000),
        supabase.from('information_requests').select('engagement_id, status').in('status', ['open', 'sent']).limit(1000),
      ]);

      const engagements = engagementsRes.data ?? [];
      const findings = findingsRes.data ?? [];
      const queries = queriesRes.data ?? [];

      const engagementToClient = new Map<string, { client_id: string; client_name: string }>();
      const clientAgg = new Map<string, ClientHotspot>();

      for (const e of engagements) {
        const client_name = (e.clients as { name: string } | null)?.name ?? 'Unknown';
        engagementToClient.set(e.id, { client_id: e.client_id, client_name });
        const existing = clientAgg.get(e.client_id);
        if (!existing) {
          clientAgg.set(e.client_id, {
            client_id: e.client_id,
            client_name,
            openFindings: 0,
            criticalCount: 0,
            openQueries: 0,
            activeEngagements: 1,
            riskScore: 0,
          });
        } else {
          existing.activeEngagements++;
        }
      }

      for (const f of findings) {
        const mapped = engagementToClient.get(f.engagement_id);
        if (!mapped) continue;
        const agg = clientAgg.get(mapped.client_id);
        if (!agg) continue;
        agg.openFindings++;
        if (f.severity === 'critical') agg.criticalCount++;
      }

      for (const q of queries) {
        const mapped = engagementToClient.get(q.engagement_id);
        if (!mapped) continue;
        const agg = clientAgg.get(mapped.client_id);
        if (!agg) continue;
        agg.openQueries++;
      }

      const list = Array.from(clientAgg.values()).map(c => ({
        ...c,
        riskScore: c.criticalCount * 25 + c.openFindings * 4 + c.openQueries * 2,
      }));
      return list.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
    },
  });
}

export type NewClientsRange = 30 | 90 | 180;

export interface NewClientPoint {
  /** ISO date for the bucket start (day if range=30, week-start if 90/180). */
  bucket: string;
  /** Human label for the X axis. */
  label: string;
  count: number;
}

export interface NewClientsEntityCount {
  entity_type: string;
  count: number;
  is_msb: boolean;
}

export interface NewClientsTrend {
  total: number;
  /** Breakdown of the same `total` count by entity_type, sorted desc by count. */
  byEntityType: NewClientsEntityCount[];
  points: NewClientPoint[];
}

export type NewClientsMode =
  | { kind: 'preset'; days: NewClientsRange }
  | { kind: 'custom'; from: string; to: string };

/**
 * New clients opened — supports preset ranges (30d / 90d / 180d) or a custom
 * from/to. Returns the total count and (for preset mode) bucketed points.
 */
export function useNewClientsTrend(mode: NewClientsMode = { kind: 'preset', days: 30 }) {
  return useQuery({
    queryKey: ['new-clients-trend', mode],
    queryFn: async (): Promise<NewClientsTrend> => {
      const now = new Date();
      let from: Date;
      let to: Date = now;
      if (mode.kind === 'custom') {
        from = new Date(mode.from);
        to = new Date(mode.to);
        // Make the upper bound inclusive of the end-of-day
        to.setHours(23, 59, 59, 999);
      } else {
        from = new Date(now);
        from.setDate(from.getDate() - mode.days);
      }
      const fromStr = from.toISOString();
      const toStr = to.toISOString();

      const { data, error } = await supabase
        .from('clients')
        .select('id, created_at, entity_type')
        .gte('created_at', fromStr)
        .lte('created_at', toStr)
        .order('created_at', { ascending: true })
        .limit(1000);
      if (error || !data) return { total: 0, byEntityType: [], points: [] };

      const { isMsbEntityType } = await import('@/lib/msbActivities');
      const typeCounts = new Map<string, number>();
      for (const c of data) {
        const key = c.entity_type || 'Unspecified';
        typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1);
      }
      const byEntityType: NewClientsEntityCount[] = Array.from(typeCounts.entries())
        .map(([entity_type, count]) => ({
          entity_type,
          count,
          is_msb: isMsbEntityType(entity_type),
        }))
        .sort((a, b) => b.count - a.count);

      const spanDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
      const weekly = spanDays > 30;
      const dayMs = 86400000;
      const step = weekly ? 7 : 1;

      const bucketStart = (d: Date): Date => {
        if (!weekly) {
          // Floor to start of day (UTC)
          const x = new Date(d);
          x.setUTCHours(0, 0, 0, 0);
          return x;
        }
        // Floor to ISO-week-aligned 7-day bucket: floor(ms / week) * week
        const t = Math.floor(d.getTime() / (7 * dayMs)) * 7 * dayMs;
        return new Date(t);
      };

      // Pre-seed all buckets in range so the chart shows zero-count points
      const buckets = new Map<string, number>();
      const startFloor = bucketStart(from);
      const endFloor = bucketStart(to);
      for (let t = startFloor.getTime(); t <= endFloor.getTime(); t += step * dayMs) {
        buckets.set(new Date(t).toISOString().slice(0, 10), 0);
      }

      for (const c of data) {
        const key = bucketStart(new Date(c.created_at)).toISOString().slice(0, 10);
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }

      const points: NewClientPoint[] = Array.from(buckets.entries()).map(([bucket, count]) => {
        const d = new Date(bucket);
        const label = weekly
          ? d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
          : d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
        return { bucket, label, count };
      });

      return { total: data.length, byEntityType, points };
    },
  });
}

export interface EntityTypeCount {
  entity_type: string;
  count: number;
  /** Whether this entity type counts as an MSB activity. */
  is_msb: boolean;
}

/**
 * Clients grouped by entity_type, optionally filtered by creation date range.
 */
export function useClientsByEntityType(from?: string | null, to?: string | null) {
  return useQuery({
    queryKey: ['clients-by-entity-type', from ?? null, to ?? null],
    queryFn: async (): Promise<EntityTypeCount[]> => {
      let q = supabase.from('clients').select('id, entity_type, created_at').limit(2000);
      if (from) q = q.gte('created_at', from);
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        q = q.lte('created_at', toEnd.toISOString());
      }
      const { data, error } = await q;
      if (error || !data) return [];

      // Defer the MSB check to the lib to keep a single source of truth.
      // Imported lazily to avoid a circular dependency on browser bundles.
      const { isMsbEntityType } = await import('@/lib/msbActivities');

      const counts = new Map<string, number>();
      for (const c of data) {
        const key = c.entity_type || 'Unspecified';
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .map(([entity_type, count]) => ({
          entity_type,
          count,
          is_msb: isMsbEntityType(entity_type),
        }))
        .sort((a, b) => b.count - a.count);
    },
  });
}

export type ReviewStatus = 'overdue' | 'due_soon' | 'upcoming' | 'no_history';

export interface AmlReviewItem {
  client_id: string;
  client_name: string;
  entity_type: string | null;
  last_engagement_id: string | null;
  last_engagement_name: string | null;
  last_period_end: string | null;
  next_review_due: string | null;
  days_until: number | null;
  status: ReviewStatus;
}

/**
 * AML review schedule per client. FINTRAC PCMLTFA s.71 requires a biennial
 * effectiveness review. For each client we find the most recent engagement
 * (by period_end) and project the next review due date as last_period_end
 * + 2 years.
 *
 *   overdue   = next_review_due < today
 *   due_soon  = within 90 days
 *   upcoming  = > 90 days out
 *   no_history = no engagement on record
 */
export function useAmlReviewSchedule() {
  return useQuery({
    queryKey: ['aml-review-schedule'],
    queryFn: async (): Promise<AmlReviewItem[]> => {
      const [clientsRes, engRes] = await Promise.all([
        supabase.from('clients').select('id, name, entity_type').limit(500),
        supabase
          .from('engagements')
          .select('id, client_id, name, period_end, status')
          .order('period_end', { ascending: false })
          .limit(2000),
      ]);

      const clients = clientsRes.data ?? [];
      const engagements = engRes.data ?? [];

      // Most-recent engagement per client (engagements are pre-sorted desc by period_end).
      const lastByClient = new Map<string, typeof engagements[0]>();
      for (const e of engagements) {
        if (e.client_id && !lastByClient.has(e.client_id)) {
          lastByClient.set(e.client_id, e);
        }
      }

      const now = Date.now();
      const dayMs = 86400000;

      const items: AmlReviewItem[] = clients.map(c => {
        const last = lastByClient.get(c.id);
        if (!last || !last.period_end) {
          return {
            client_id: c.id,
            client_name: c.name,
            entity_type: c.entity_type,
            last_engagement_id: null,
            last_engagement_name: null,
            last_period_end: null,
            next_review_due: null,
            days_until: null,
            status: 'no_history',
          };
        }
        const lastEnd = new Date(last.period_end);
        const next = new Date(lastEnd);
        next.setFullYear(next.getFullYear() + 2);
        const days = Math.ceil((next.getTime() - now) / dayMs);
        let status: ReviewStatus;
        if (days < 0) status = 'overdue';
        else if (days <= 90) status = 'due_soon';
        else status = 'upcoming';
        return {
          client_id: c.id,
          client_name: c.name,
          entity_type: c.entity_type,
          last_engagement_id: last.id,
          last_engagement_name: last.name ?? null,
          last_period_end: last.period_end,
          next_review_due: next.toISOString().slice(0, 10),
          days_until: days,
          status,
        };
      });

      // Sort: overdue and due-soon first by days ascending, then upcoming, then no_history.
      const statusOrder: Record<ReviewStatus, number> = {
        overdue: 0,
        due_soon: 1,
        upcoming: 2,
        no_history: 3,
      };
      items.sort((a, b) => {
        const so = statusOrder[a.status] - statusOrder[b.status];
        if (so !== 0) return so;
        return (a.days_until ?? Infinity) - (b.days_until ?? Infinity);
      });

      return items;
    },
  });
}

export interface ThroughputPoint {
  month: string;
  completed: number;
  opened: number;
}

export function useThroughputTrend() {
  return useQuery({
    queryKey: ['throughput-trend'],
    queryFn: async (): Promise<ThroughputPoint[]> => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const fromStr = sixMonthsAgo.toISOString().slice(0, 10);

      const [completedRes, openedRes] = await Promise.all([
        supabase.from('engagements').select('id, updated_at').eq('status', 'completed').gte('updated_at', fromStr).limit(500),
        supabase.from('engagements').select('id, created_at').gte('created_at', fromStr).limit(500),
      ]);

      const buckets = new Map<string, { completed: number; opened: number }>();
      for (let i = 0; i < 6; i++) {
        const d = new Date(sixMonthsAgo);
        d.setMonth(sixMonthsAgo.getMonth() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        buckets.set(key, { completed: 0, opened: 0 });
      }
      const keyOf = (iso: string) => iso.slice(0, 7);

      completedRes.data?.forEach(e => {
        const b = buckets.get(keyOf(e.updated_at));
        if (b) b.completed++;
      });
      openedRes.data?.forEach(e => {
        const b = buckets.get(keyOf(e.created_at));
        if (b) b.opened++;
      });

      return Array.from(buckets.entries()).map(([month, v]) => ({
        month: new Date(month + '-01').toLocaleDateString(undefined, { month: 'short' }),
        completed: v.completed,
        opened: v.opened,
      }));
    },
  });
}

export function useUpcomingDeadlines() {
  return useQuery({
    queryKey: ['upcoming-deadlines'],
    queryFn: async (): Promise<Deadline[]> => {
      const todayStr = today();
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 30);

      const { data } = await supabase
        .from('engagements')
        .select('id, name, period_end, clients!inner(name)')
        .gte('period_end', todayStr)
        .lte('period_end', horizon.toISOString().slice(0, 10))
        .neq('status', 'completed')
        .order('period_end', { ascending: true })
        .limit(6);

      return (data ?? []).map(e => {
        const days = Math.ceil((new Date(e.period_end).getTime() - Date.now()) / 86400000);
        return {
          id: e.id,
          client_name: (e.clients as { name: string } | null)?.name ?? 'Unknown',
          engagement_name: e.name,
          label: 'Period End',
          date: e.period_end,
          days_left: days,
        };
      });
    },
  });
}
