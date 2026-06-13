import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Calendar,
  Target,
  ArrowRight,
  Activity,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import {
  FINDING_TYPE_META,
  FINDING_TYPES,
  FindingType,
  severityToFindingType,
} from '@/lib/findingClassification';
import {
  useEngagementRecentWork,
  useEngagementPendingTasks,
} from '@/hooks/useEngagementUser';
import { History, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Finding = {
  id: string;
  title: string;
  module: string;
  severity: string;
  /** FINTRAC harm-done classification — preferred over severity for grouping. */
  finding_type?: string | null;
  status: string;
  date_identified: string | null;
  created_at: string;
};

const MODULES: { key: string; label: string; route: string }[] = [
  { key: 'msb_registration', label: 'MSB Registration', route: '/msb-registration' },
  { key: 'governance', label: 'Governance', route: '/governance' },
  { key: 'aml_program', label: 'AML Program', route: '/aml-program' },
  { key: 'risk_assessment', label: 'Risk Assessment', route: '/aml-program/risk-assessment' },
  { key: 'training', label: 'Training', route: '/aml-program/training' },
  { key: 'kyc', label: 'KYC Review', route: '/kyc-review' },
  { key: 'reporting', label: 'Transaction Reporting', route: '/transaction-reporting' },
  { key: 'transaction_monitoring', label: 'Transaction Monitoring', route: '/transaction-monitoring' },
];

// FINTRAC harm-done classification colors (mirrors the firm-overview palette)
const TYPE_COLORS: Record<FindingType, string> = {
  complete_nc: 'hsl(var(--destructive))',
  partial_important: 'hsl(35 90% 50%)',
  partial_moderate: 'hsl(45 85% 55%)',
  partial_lesser: 'hsl(var(--muted-foreground))',
  observation: 'hsl(var(--primary))',
};

const RANGE_DAYS: Record<string, number> = { '7': 7, '30': 30, '90': 90 };

function classifyFinding(f: { finding_type?: string | null; severity: string }): FindingType {
  return (f.finding_type ?? severityToFindingType(f.severity)) as FindingType;
}

export default function Dashboard() {
  const { user, selectedClient, selectedEngagement } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [kycCount, setKycCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [range, setRange] = useState<'7' | '30' | '90'>('30');

  const recentWork = useEngagementRecentWork(selectedEngagement?.id, user?.id);
  const pendingTasks = useEngagementPendingTasks(selectedEngagement?.id, user?.id);

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    if (!selectedEngagement) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const engId = selectedEngagement.id;
      const kycReview = await supabase
        .from('kyc_reviews')
        .select('id')
        .eq('engagement_id', engId)
        .maybeSingle();
      const reviewId = (kycReview.data as { id: string } | null)?.id;
      const [fRes, kIRes, kBRes, rRes] = await Promise.all([
        supabase.from('findings').select('*').eq('engagement_id', engId),
        reviewId
          ? (supabase.from('kyc_individual_samples') as any).select('id', { count: 'exact', head: true }).eq('review_id', reviewId)
          : Promise.resolve({ count: 0 }),
        reviewId
          ? (supabase.from('kyc_business_samples') as any).select('id', { count: 'exact', head: true }).eq('review_id', reviewId)
          : Promise.resolve({ count: 0 }),
        supabase.from('reporting_samples').select('id', { count: 'exact', head: true }).eq('engagement_id', engId),
      ]);
      if (cancelled) return;
      setFindings((fRes.data as Finding[]) || []);
      setKycCount((kIRes.count || 0) + (kBRes.count || 0));
      setReportCount(rRes.count || 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedEngagement]);

  const filteredFindings = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
    return findings.filter((f) => new Date(f.created_at).getTime() >= cutoff);
  }, [findings, range]);

  const openFindings = findings.filter((f) => f.status !== 'closed' && f.status !== 'final');
  // "Action items" = Complete NC + Partial: Important findings still open
  const criticalHigh = openFindings.filter((f) => {
    const t = classifyFinding(f);
    return t === 'complete_nc' || t === 'partial_important';
  });

  const classificationData = useMemo(() => {
    const counts: Record<FindingType, number> = {
      complete_nc: 0,
      partial_important: 0,
      partial_moderate: 0,
      partial_lesser: 0,
      observation: 0,
    };
    openFindings.forEach((f) => {
      counts[classifyFinding(f)]++;
    });
    return FINDING_TYPES.map(meta => ({
      type: meta.type,
      name: meta.shortLabel,
      value: counts[meta.type],
      color: TYPE_COLORS[meta.type],
    }));
  }, [openFindings]);

  const moduleData = useMemo(() => {
    return MODULES.map((m) => {
      const modFindings = findings.filter((f) => f.module === m.key);
      const counts: Record<FindingType, number> = {
        complete_nc: 0,
        partial_important: 0,
        partial_moderate: 0,
        partial_lesser: 0,
        observation: 0,
      };
      modFindings.forEach(f => counts[classifyFinding(f)]++);
      return {
        name: m.label,
        route: m.route,
        key: m.key,
        total: modFindings.length,
        ...counts,
      };
    });
  }, [findings]);

  const trendData = useMemo(() => {
    const days = RANGE_DAYS[range];
    const buckets: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ date: key, count: 0 });
    }
    filteredFindings.forEach((f) => {
      const key = new Date(f.created_at).toISOString().slice(0, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) b.count++;
    });
    return buckets.map((b) => ({
      date: new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: b.count,
    }));
  }, [filteredFindings, range]);

  const periodEnd = selectedEngagement ? new Date(selectedEngagement.period_end) : null;
  const daysRemaining = periodEnd
    ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (!selectedClient) {
    return (
      <EmptyState
        icon={<Target className="w-8 h-8 text-muted-foreground" />}
        title="No Client Selected"
        message="Select a client from the top navigation to view the dashboard."
      />
    );
  }
  if (!selectedEngagement) {
    return (
      <EmptyState
        icon={<Calendar className="w-8 h-8 text-muted-foreground" />}
        title="No Engagement Selected"
        message={`Create a new engagement for ${selectedClient.name} to begin your AML Effectiveness Review.`}
      />
    );
  }

  const moduleRoute = (key: string) => MODULES.find((m) => m.key === key)?.route || '/findings';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-sm text-muted-foreground">Welcome back, {firstName}</h2>
          <h1 className="text-2xl font-bold text-foreground">{selectedEngagement.name}</h1>
          <p className="text-sm text-muted-foreground">
            {selectedClient.name} • {new Date(selectedEngagement.period_start).toLocaleDateString()} –{' '}
            {new Date(selectedEngagement.period_end).toLocaleDateString()}
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={range}
          onValueChange={(v) => v && setRange(v as '7' | '30' | '90')}
          className="border rounded-md"
        >
          <ToggleGroupItem value="7" className="text-xs px-3">7d</ToggleGroupItem>
          <ToggleGroupItem value="30" className="text-xs px-3">30d</ToggleGroupItem>
          <ToggleGroupItem value="90" className="text-xs px-3">90d</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Action Items */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                Action Items
              </CardTitle>
              <CardDescription>Items needing your attention right now</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/findings')}>
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : criticalHigh.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              No critical or high-severity items pending. Great work.
            </div>
          ) : (
            <div className="space-y-2">
              {criticalHigh.slice(0, 5).map((f) => {
                const type = classifyFinding(f);
                const meta = FINDING_TYPE_META[type];
                return (
                  <button
                    key={f.id}
                    onClick={() => navigate(moduleRoute(f.module))}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-md border bg-background hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] whitespace-nowrap ${meta.badge}`}
                      >
                        {meta.shortLabel}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {f.module.replace(/_/g, ' ')} • {f.status}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards (clickable) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Open Findings"
          value={openFindings.length}
          subtitle={`${criticalHigh.length} critical/high`}
          icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
          loading={loading}
          onClick={() => navigate('/findings')}
        />
        <KpiCard
          title="KYC Samples"
          value={kycCount}
          subtitle="Reviewed"
          icon={<FileText className="w-4 h-4 text-muted-foreground" />}
          loading={loading}
          onClick={() => navigate('/kyc-review')}
        />
        <KpiCard
          title="Reports Tested"
          value={reportCount}
          subtitle="LCTR / EFTR / STR"
          icon={<Activity className="w-4 h-4 text-muted-foreground" />}
          loading={loading}
          onClick={() => navigate('/transaction-reporting')}
        />
        <KpiCard
          title="Days Remaining"
          value={Math.max(daysRemaining, 0)}
          subtitle={daysRemaining < 0 ? 'Past due' : 'Until period end'}
          icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
          loading={loading}
          onClick={() => navigate('/audit-report')}
        />
      </div>

      {/* Your recent work + Pending tasks — user-scoped on this engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Your recent work
            </CardTitle>
            <CardDescription>Findings you created or last reviewed on this engagement</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentWork.isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !recentWork.data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nothing yet — your finding edits will show here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentWork.data.map((w) => {
                  const meta = w.finding_type
                    ? FINDING_TYPE_META[w.finding_type as FindingType]
                    : null;
                  return (
                    <li key={`${w.kind}-${w.id}`}>
                      <button
                        onClick={() => navigate(moduleRoute(w.module))}
                        className="w-full px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{w.title}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">
                              {w.module.replace(/_/g, ' ')}
                              {' · '}
                              {w.kind === 'finding_review' ? 'Reviewed' : 'Edited'}
                              {' '}
                              {formatDistanceToNow(new Date(w.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                          {meta && (
                            <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${meta.badge}`}>
                              {meta.shortLabel}
                            </Badge>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" /> Pending tasks
            </CardTitle>
            <CardDescription>Items waiting on you (draft findings, reports awaiting sign-off)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pendingTasks.isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !pendingTasks.data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inbox zero. Nothing waiting on you.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {pendingTasks.data.map((t) => {
                  const meta = t.finding_type
                    ? FINDING_TYPE_META[t.finding_type as FindingType]
                    : null;
                  const ageBadge =
                    t.age_days >= 14 ? 'text-destructive' :
                    t.age_days >= 7 ? 'text-warning' : 'text-muted-foreground';
                  return (
                    <li key={`${t.kind}-${t.id}`}>
                      <button
                        onClick={() => navigate(t.kind === 'pending_review' ? '/audit-report' : moduleRoute(t.module))}
                        className="w-full px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{t.title}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">
                              {t.kind === 'pending_review' ? 'Audit report' : `${t.module.replace(/_/g, ' ')} · draft`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] tabular-nums font-medium ${ageBadge}`}>
                              {t.age_days}d
                            </span>
                            {meta && (
                              <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${meta.badge}`}>
                                {meta.shortLabel}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts — FINTRAC classification, scoped to this engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Findings by classification</CardTitle>
            <CardDescription>Open issues by Deficiency Severity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : openFindings.length === 0 ? (
              <EmptyChart message="No open findings yet." />
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classificationData.filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {classificationData.filter((d) => d.value > 0).map((entry) => (
                        <Cell key={entry.type} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-3 flex-wrap mt-2">
                  {classificationData.filter((d) => d.value > 0).map((d) => (
                    <div key={d.type} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Findings by module</CardTitle>
            <CardDescription>Stacked by classification · click a bar to open the module</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleData} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                      cursor={{ fill: 'hsl(var(--accent))' }}
                      formatter={(value: any, name: string) => {
                        const meta = FINDING_TYPE_META[name as FindingType];
                        return [value, meta?.shortLabel ?? name];
                      }}
                    />
                    {FINDING_TYPES.map((meta, i) => (
                      <Bar
                        key={meta.type}
                        dataKey={meta.type}
                        stackId="classification"
                        fill={TYPE_COLORS[meta.type]}
                        radius={i === FINDING_TYPES.length - 1 ? [0, 4, 4, 0] : 0}
                        onClick={(d: any) => navigate(d.route)}
                        className="cursor-pointer"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-3 flex-wrap mt-2">
                  {FINDING_TYPES.map((meta) => (
                    <div key={meta.type} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_COLORS[meta.type] }} />
                      <span className="text-muted-foreground">{meta.shortLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Findings trend — full width now that Recent Activity is gone */}
      <Card>
        <CardHeader>
          <CardTitle>Findings trend</CardTitle>
          <CardDescription>New findings over the last {range} days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  onClick,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
