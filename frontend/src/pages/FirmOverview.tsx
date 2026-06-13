import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import {
  useFirmKPIs,
  usePriorityEngagements,
  useUpcomingDeadlines,
  useFindingsBreakdown,
  useClientHotspots,
  useThroughputTrend,
  useNewClientsTrend,
  useAmlReviewSchedule,
  useClientsByEntityType,
  type PriorityEngagement,
  type NewClientsRange,
  type NewClientsMode,
  type ReviewStatus,
} from '@/hooks/useFirmOverview';
import { DateRangeInput, type DateRange } from '@/components/ui/date-range-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck2,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const reasonStyles: Record<PriorityEngagement['reason'], string> = {
  critical_finding: 'border-destructive/40 text-destructive bg-destructive/10',
  overdue: 'border-destructive/40 text-destructive bg-destructive/10',
  report_ready: 'border-primary/40 text-primary bg-primary/10',
  client_query: 'border-warning/50 text-warning-foreground bg-warning/15',
  docs_pending: 'border-border text-muted-foreground bg-muted',
};

const NEEDS_ATTENTION_INITIAL = 4;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type NewClientsPreset = '30' | '90' | '180' | 'custom';

export default function FirmOverview() {
  const navigate = useNavigate();
  const { user, clients, setSelectedClient, setSelectedEngagement, engagements } = useApp();
  const [showAllPriority, setShowAllPriority] = useState(false);
  const currentYear = new Date().getFullYear();

  // New Clients tile — preset toggle + optional custom range
  const [newClientsPreset, setNewClientsPreset] = useState<NewClientsPreset>('30');
  const [newClientsCustom, setNewClientsCustom] = useState<DateRange>({ from: null, to: null });
  const newClientsMode: NewClientsMode =
    newClientsPreset === 'custom' && newClientsCustom.from && newClientsCustom.to
      ? { kind: 'custom', from: newClientsCustom.from, to: newClientsCustom.to }
      : { kind: 'preset', days: (Number(newClientsPreset === 'custom' ? '30' : newClientsPreset) as NewClientsRange) };

  // AML Review Schedule — year dropdown OR custom range
  const [reviewYear, setReviewYear] = useState<string>(String(currentYear));
  const [reviewCustom, setReviewCustom] = useState<DateRange>({ from: null, to: null });

  // Clients by entity type — same year/custom pattern
  const [entityYear, setEntityYear] = useState<string>('all');
  const [entityCustom, setEntityCustom] = useState<DateRange>({ from: null, to: null });

  const kpis = useFirmKPIs();
  const priority = usePriorityEngagements();
  const deadlines = useUpcomingDeadlines();
  const breakdown = useFindingsBreakdown();
  const hotspots = useClientHotspots();
  const throughput = useThroughputTrend();
  const newClients = useNewClientsTrend(newClientsMode);
  const reviewSchedule = useAmlReviewSchedule();

  // Clients by entity type — resolve the active date filter
  const entityRangeFor = (() => {
    if (entityCustom.from && entityCustom.to) return { from: entityCustom.from, to: entityCustom.to };
    if (entityYear === 'all') return { from: null, to: null };
    if (entityYear === 'ytd') {
      return { from: `${currentYear}-01-01`, to: new Date().toISOString().slice(0, 10) };
    }
    return { from: `${entityYear}-01-01`, to: `${entityYear}-12-31` };
  })();
  const clientsByEntity = useClientsByEntityType(entityRangeFor.from, entityRangeFor.to);

  // AML Review Schedule filter
  const filteredSchedule = (reviewSchedule.data ?? []).filter(r => {
    if (reviewCustom.from && reviewCustom.to) {
      if (!r.next_review_due) return false;
      return r.next_review_due >= reviewCustom.from && r.next_review_due <= reviewCustom.to;
    }
    if (reviewYear === 'all') return true;
    if (reviewYear === 'no_history') return r.status === 'no_history';
    if (!r.next_review_due) return false;
    return new Date(r.next_review_due).getFullYear() === Number(reviewYear);
  });

  const reviewYearOptions = (() => {
    const years = new Set<number>();
    for (const r of reviewSchedule.data ?? []) {
      if (r.next_review_due) years.add(new Date(r.next_review_due).getFullYear());
    }
    years.add(currentYear);
    years.add(currentYear + 1);
    years.add(currentYear + 2);
    return Array.from(years).sort();
  })();

  // Years available for the entity-type filter — drawn from client creation history
  const entityYearOptions = (() => {
    const years = new Set<number>();
    // We need actual created_at values; the hook returns aggregates. Default to a sensible recent set.
    const thisYear = currentYear;
    for (let y = thisYear - 4; y <= thisYear + 1; y++) years.add(y);
    return Array.from(years).sort();
  })();

  const newClientsRangeLabel =
    newClientsPreset === 'custom' && newClientsCustom.from && newClientsCustom.to
      ? `${new Date(newClientsCustom.from).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })} → ${new Date(newClientsCustom.to).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}`
      : newClientsPreset === '180' ? 'last 6 months'
      : `last ${newClientsPreset} days`;

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Auditor';

  const openEngagement = (clientId: string, engagementId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) setSelectedClient(client);
    const eng = engagements.find(e => e.id === engagementId);
    if (eng) setSelectedEngagement(eng);
    navigate('/dashboard');
  };

  const openClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) setSelectedClient(client);
    navigate('/clients');
  };

  const visiblePriority = showAllPriority
    ? priority.data ?? []
    : (priority.data ?? []).slice(0, NEEDS_ATTENTION_INITIAL);
  const hiddenCount = Math.max(0, (priority.data?.length ?? 0) - NEEDS_ATTENTION_INITIAL);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground">Firm overview</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {greeting()}, {firstName}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          {breakdown.data && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-foreground font-medium">{breakdown.data.openCount}</span> open deficiencies ·
              {' '}<span className="text-foreground font-medium">{breakdown.data.observationCount}</span> observations ·
              {' '}<span className="text-foreground font-medium">{breakdown.data.closedThisMonth}</span> closed this month
              {breakdown.data.avgDaysToClose != null && (
                <> · avg <span className="text-foreground font-medium">{breakdown.data.avgDaysToClose}d</span> to close</>
              )}
            </p>
          )}
        </div>
      </header>

      {/* KPI strip — clickable, with tinted backgrounds */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Active engagements"
          value={kpis.data?.activeEngagements}
          loading={kpis.isLoading}
          tone="info"
          hint="Across all clients"
          icon={Activity}
          onClick={() => navigate('/clients')}
        />
        <KpiCard
          label="Past period end"
          value={kpis.data?.overdue}
          loading={kpis.isLoading}
          tone="destructive"
          hint="Engagements overdue"
          icon={Clock}
          onClick={() => navigate('/clients')}
        />
        <KpiCard
          label="Awaiting client"
          value={kpis.data?.awaitingClient}
          loading={kpis.isLoading}
          tone="warning"
          hint="Open queries / docs"
          icon={Users}
          onClick={() => navigate('/clients')}
        />
        <KpiCard
          label="Pending sign-off"
          value={kpis.data?.awaitingReview}
          loading={kpis.isLoading}
          tone="primary"
          hint="Reports for review"
          icon={FileCheck2}
          onClick={() => navigate('/audit-report')}
        />
        <KpiCard
          label="Critical findings"
          value={kpis.data?.criticalFindings}
          loading={kpis.isLoading}
          tone="destructive"
          hint="Unresolved"
          icon={AlertTriangle}
          onClick={() => navigate('/findings')}
        />
      </section>

      {/* AML Review Schedule — moved up, now with optional custom date range */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" /> AML review schedule
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              FINTRAC requires a biennial effectiveness review (PCMLTFA s.71). Next due = last engagement period end + 2 years.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={reviewYear} onValueChange={(v) => { setReviewYear(v); setReviewCustom({ from: null, to: null }); }}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {reviewYearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
                <SelectItem value="no_history">No history</SelectItem>
              </SelectContent>
            </Select>
            <DateRangeInput
              value={reviewCustom}
              onChange={(r) => { setReviewCustom(r); if (r.from && r.to) setReviewYear('all'); }}
              placeholder="Custom range"
            />
          </div>
        </CardHeader>
        <CardContent>
          {reviewSchedule.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : filteredSchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {reviewYear === 'no_history' ? 'Every client has at least one engagement on record.' : 'No clients in the selected range.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Last review period end</TableHead>
                  <TableHead className="hidden md:table-cell">Next review due</TableHead>
                  <TableHead className="text-right">In</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedule.map(r => (
                  <TableRow
                    key={r.client_id}
                    onClick={() => openClient(r.client_id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{r.client_name}</div>
                      {r.entity_type && (
                        <div className="text-[11px] text-muted-foreground">{r.entity_type}</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {r.last_period_end
                        ? new Date(r.last_period_end).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
                        : '—'}
                      {r.last_engagement_name && (
                        <div className="text-[10px] text-muted-foreground/70 truncate max-w-[180px]">
                          {r.last_engagement_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {r.next_review_due
                        ? new Date(r.next_review_due).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {r.days_until == null
                        ? '—'
                        : r.days_until < 0
                          ? `${Math.abs(r.days_until)}d ago`
                          : `${r.days_until}d`}
                    </TableCell>
                    <TableCell className="text-right">
                      <ReviewStatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Needs Attention + Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Needs attention</CardTitle>
            <Badge variant="outline" className="text-xs font-normal">Ranked by risk</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {priority.isLoading ? (
              <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : !priority.data?.length ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="text-sm text-foreground font-medium">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">No engagements need immediate attention.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {visiblePriority.map(p => (
                    <button
                      key={p.engagement_id}
                      onClick={() => openEngagement(p.client_id, p.engagement_id)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground truncate">{p.engagement_name}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground truncate">{p.client_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{p.detail}</p>
                      </div>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 border rounded text-[10px] font-medium uppercase tracking-wide shrink-0',
                        reasonStyles[p.reason],
                      )}>
                        {p.reason_label}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
                {hiddenCount > 0 && (
                  <div className="border-t border-border px-4 py-2.5 bg-muted/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllPriority(v => !v)}
                      className="w-full text-xs text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <ChevronDown className={cn('w-4 h-4 mr-1 transition-transform', showAllPriority && 'rotate-180')} />
                      {showAllPriority ? 'Show fewer' : `View all (${hiddenCount} more)`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines.isLoading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)
            ) : !deadlines.data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-2">No deadlines in next 30 days.</p>
            ) : (
              deadlines.data.map(d => {
                const pct = Math.max(5, Math.min(100, ((30 - d.days_left) / 30) * 100));
                const tone = d.days_left <= 3 ? 'bg-destructive' : d.days_left <= 10 ? 'bg-warning' : 'bg-primary';
                return (
                  <div key={d.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })} · T-{d.days_left}d
                      </span>
                      <span className="font-medium text-foreground truncate ml-2 max-w-[60%] text-right">{d.client_name}</span>
                    </div>
                    <div className="h-1.5 bg-muted overflow-hidden rounded-sm">
                      <div className={cn('h-full transition-all', tone)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Throughput + New Clients — 2-col row of firm-wide trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Engagement throughput
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Opened vs. completed, last 6 months</p>
          </CardHeader>
          <CardContent>
            {throughput.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={throughput.data} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="opened-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(94 60% 50%)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(94 60% 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="completed-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={30} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="opened" stroke="hsl(94 60% 50%)" strokeWidth={2} fill="url(#opened-gradient)" name="Opened" />
                    <Area type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#completed-gradient)" name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> New clients
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Added in the {newClientsRangeLabel}
              </p>
            </div>
            <ToggleGroup
              type="single"
              value={newClientsPreset}
              onValueChange={(v) => v && setNewClientsPreset(v as NewClientsPreset)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="30" className="text-xs px-2.5 h-7">30d</ToggleGroupItem>
              <ToggleGroupItem value="90" className="text-xs px-2.5 h-7">90d</ToggleGroupItem>
              <ToggleGroupItem value="180" className="text-xs px-2.5 h-7">6mo</ToggleGroupItem>
              <ToggleGroupItem value="custom" className="text-xs px-2.5 h-7">Custom</ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {newClientsPreset === 'custom' && (
              <div className="mb-4 flex justify-end">
                <DateRangeInput
                  value={newClientsCustom}
                  onChange={setNewClientsCustom}
                  placeholder="Pick a range"
                />
              </div>
            )}
            {newClients.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : newClientsPreset === 'custom' && (!newClientsCustom.from || !newClientsCustom.to) ? (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                Pick a date range to see the count.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline gap-4">
                  <div className="text-5xl font-semibold text-primary tabular-nums leading-none">
                    {newClients.data?.total ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    new client{(newClients.data?.total ?? 0) === 1 ? '' : 's'}
                  </div>
                </div>
                {newClients.data?.byEntityType?.length ? (
                  <ul className="space-y-1 pt-2 border-t border-border">
                    {newClients.data.byEntityType.map((row) => (
                      <li key={row.entity_type} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="text-foreground truncate">{row.entity_type}</span>
                          {row.is_msb && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/40 text-primary">MSB</Badge>
                          )}
                        </span>
                        <span className="font-medium text-foreground tabular-nums shrink-0 ml-2">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clients by entity type — firm-wide breakdown with year/custom filter */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Clients by entity type
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              How your client portfolio breaks down by FINTRAC sector
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={entityYear} onValueChange={(v) => { setEntityYear(v); setEntityCustom({ from: null, to: null }); }}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="ytd">Year-to-date</SelectItem>
                {entityYearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeInput
              value={entityCustom}
              onChange={(r) => { setEntityCustom(r); if (r.from && r.to) setEntityYear('all'); }}
              placeholder="Custom range"
            />
          </div>
        </CardHeader>
        <CardContent>
          {clientsByEntity.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !clientsByEntity.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No clients in this range.</p>
          ) : (
            <ul className="space-y-2.5">
              {clientsByEntity.data.map((row) => {
                const max = clientsByEntity.data![0].count || 1;
                const pct = (row.count / max) * 100;
                const color = row.is_msb ? 'bg-primary' : 'bg-primary/40';
                return (
                  <li key={row.entity_type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-foreground truncate">{row.entity_type}</span>
                        {row.is_msb && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/40 text-primary">MSB</Badge>
                        )}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">{row.count}</span>
                    </div>
                    <div className="h-2 bg-muted overflow-hidden rounded-sm">
                      <div className={cn('h-full transition-all', color)} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
              <li className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <span>Total clients</span>
                <span className="font-medium text-foreground tabular-nums">
                  {clientsByEntity.data.reduce((sum, r) => sum + r.count, 0)}
                </span>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Client hotspots — moved to the bottom. Firm-wide ranking, less immediately
          actionable than the items above so it's lower in the visual hierarchy. */}
      <Card className="border-l-4 border-l-warning/70">
        <CardHeader className="flex flex-row items-center justify-between pb-2 flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Client hotspots</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clients ranked by open critical findings, open findings, and open queries
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-normal">
            c = critical · f = findings · q = queries
          </Badge>
        </CardHeader>
        <CardContent>
          {hotspots.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !hotspots.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No high-risk clients.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
              {hotspots.data.map(c => {
                const max = hotspots.data![0].riskScore || 1;
                const pct = (c.riskScore / max) * 100;
                return (
                  <button
                    key={c.client_id}
                    onClick={() => openClient(c.client_id)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground font-medium truncate group-hover:text-primary">{c.client_name}</span>
                      <span className="text-muted-foreground tabular-nums shrink-0 ml-2 text-xs">
                        {c.criticalCount > 0 && <span className="text-destructive font-medium">{c.criticalCount}c</span>}
                        {c.criticalCount > 0 && (c.openFindings > c.criticalCount || c.openQueries > 0) && ' · '}
                        {c.openFindings > c.criticalCount && `${c.openFindings - c.criticalCount}f`}
                        {c.openQueries > 0 && c.openFindings > c.criticalCount && ' · '}
                        {c.openQueries > 0 && `${c.openQueries}q`}
                      </span>
                    </div>
                    <div className="h-2 bg-muted overflow-hidden rounded-sm">
                      <div className={cn(
                        'h-full transition-all',
                        c.criticalCount > 0 ? 'bg-destructive' : c.openFindings > 5 ? 'bg-warning' : 'bg-primary/70'
                      )} style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  switch (status) {
    case 'overdue':
      return <Badge variant="destructive" className="text-[10px]">Overdue</Badge>;
    case 'due_soon':
      return <Badge variant="outline" className="text-[10px] border-warning/50 bg-warning/15 text-warning-foreground">Due soon</Badge>;
    case 'upcoming':
      return <Badge variant="outline" className="text-[10px] border-primary/40 bg-primary/10 text-primary">Upcoming</Badge>;
    case 'no_history':
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">No history</Badge>;
  }
}

const TONE_STYLES: Record<string, { bg: string; valueText: string; iconText: string; ring: string }> = {
  destructive: {
    bg: 'bg-destructive/5 hover:bg-destructive/10 border-destructive/30',
    valueText: 'text-destructive',
    iconText: 'text-destructive/80',
    ring: 'group-hover:ring-destructive/30',
  },
  warning: {
    bg: 'bg-warning/5 hover:bg-warning/10 border-warning/30',
    valueText: 'text-warning-foreground',
    iconText: 'text-warning/80',
    ring: 'group-hover:ring-warning/30',
  },
  primary: {
    bg: 'bg-primary/5 hover:bg-primary/10 border-primary/30',
    valueText: 'text-primary',
    iconText: 'text-primary/80',
    ring: 'group-hover:ring-primary/30',
  },
  info: {
    bg: 'bg-accent hover:bg-accent/80 border-accent-foreground/20',
    valueText: 'text-accent-foreground',
    iconText: 'text-accent-foreground/70',
    ring: 'group-hover:ring-accent-foreground/30',
  },
  default: {
    bg: 'hover:bg-muted/30',
    valueText: 'text-foreground',
    iconText: 'text-muted-foreground/60',
    ring: 'group-hover:ring-border',
  },
};

function KpiCard({
  label,
  value,
  loading,
  tone,
  hint,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  tone?: 'destructive' | 'warning' | 'primary' | 'info';
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const styles = TONE_STYLES[tone ?? 'default'];
  const isClickable = !!onClick;

  const inner = (
    <CardContent className={cn('pt-5 pb-4', isClickable && 'cursor-pointer')}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {Icon && <Icon className={cn('w-4 h-4 shrink-0', styles.iconText)} />}
      </div>
      {loading ? (
        <Skeleton className="h-9 w-12" />
      ) : (
        <p className={cn('text-3xl font-semibold tabular-nums leading-none', styles.valueText)}>
          {value ?? 0}
        </p>
      )}
      {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
    </CardContent>
  );

  if (!isClickable) {
    return <Card className={cn(styles.bg, 'border transition-colors')}>{inner}</Card>;
  }

  return (
    <button onClick={onClick} className="group text-left">
      <Card className={cn(
        styles.bg,
        'border transition-all hover:shadow-md hover:-translate-y-0.5 ring-1 ring-transparent',
        styles.ring,
      )}>
        {inner}
      </Card>
    </button>
  );
}
