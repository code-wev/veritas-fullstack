import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, MinusCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportingResultsProps {
  engagementId: string;
  reviewId: string;
}

type ResultValue = 'pass' | 'fail' | 'na' | 'pending';

interface ResultsSample {
  id: string;
  report_type: string;
  report_reference_id: string | null;
  transaction_date: string | null;
  fintrac_submission_date: string | null;
  transaction_amount: number | null;
  transaction_currency: string | null;
  timeliness_days_to_file: number | null;
  completeness_result: ResultValue;
  accuracy_overall: ResultValue;
  timeliness_result: ResultValue;
  overall_result: ResultValue;
  deficiencies: string | null;
}

const REPORT_TYPES: Array<{ key: string; label: string }> = [
  { key: 'lctr', label: 'LCTR' },
  { key: 'eftr', label: 'EFTR' },
  { key: 'str', label: 'STR' },
  { key: 'lvctr', label: 'LVCTR' },
  { key: 'lpepr', label: 'LPEPR' },
];

const RESULT_LABEL: Record<ResultValue, string> = {
  pass: 'Pass',
  fail: 'Fail',
  na: 'N/A',
  pending: 'Pending',
};

function ResultBadge({ value }: { value: ResultValue }) {
  switch (value) {
    case 'pass':
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Pass</Badge>;
    case 'fail':
      return <Badge variant="destructive">Fail</Badge>;
    case 'na':
      return <Badge variant="secondary">N/A</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

function ResultIcon({ value }: { value: ResultValue }) {
  const cls = 'w-4 h-4 inline-block align-text-bottom';
  switch (value) {
    case 'pass':
      return <CheckCircle2 className={`${cls} text-primary`} />;
    case 'fail':
      return <XCircle className={`${cls} text-destructive`} />;
    case 'na':
      return <MinusCircle className={`${cls} text-muted-foreground`} />;
    default:
      return <Clock className={`${cls} text-muted-foreground`} />;
  }
}

function fmtAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return '—';
  const cur = currency || 'CAD';
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-CA');
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(rows: ResultsSample[]) {
  const header = [
    'Ref ID', 'Report Type', 'Transaction Date', 'Filing Date', 'Days to File',
    'Amount', 'Currency', 'Completeness', 'Accuracy', 'Timeliness', 'Overall', 'Deficiencies',
  ];
  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push([
      r.report_reference_id ?? '',
      r.report_type.toUpperCase(),
      r.transaction_date ?? '',
      r.fintrac_submission_date ?? '',
      r.timeliness_days_to_file ?? '',
      r.transaction_amount ?? '',
      r.transaction_currency ?? '',
      RESULT_LABEL[r.completeness_result],
      RESULT_LABEL[r.accuracy_overall],
      RESULT_LABEL[r.timeliness_result],
      RESULT_LABEL[r.overall_result],
      r.deficiencies ?? '',
    ].map(csvEscape).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporting-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface DimensionTally {
  pass: number;
  fail: number;
  na: number;
  pending: number;
  total: number;
}

function emptyTally(): DimensionTally {
  return { pass: 0, fail: 0, na: 0, pending: 0, total: 0 };
}

function addToTally(t: DimensionTally, v: ResultValue) {
  t[v]++;
  t.total++;
}

function passRate(t: DimensionTally): string {
  const denom = t.total - t.na - t.pending;
  if (denom <= 0) return '—';
  return `${Math.round((t.pass / denom) * 100)}%`;
}

export function ReportingResults({ engagementId }: ReportingResultsProps) {
  const [samples, setSamples] = useState<ResultsSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('reporting_samples')
          .select(
            'id, report_type, report_reference_id, transaction_date, fintrac_submission_date, ' +
            'transaction_amount, transaction_currency, timeliness_days_to_file, ' +
            'completeness_result, accuracy_overall, timeliness_result, overall_result, deficiencies'
          )
          .eq('engagement_id', engagementId)
          .order('transaction_date', { ascending: false, nullsFirst: false });
        if (error) throw error;
        if (alive) setSamples(((data as unknown) as ResultsSample[]) || []);
      } catch (err: any) {
        toast({ title: 'Error loading results', description: err.message, variant: 'destructive' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [engagementId, toast]);

  const filtered = useMemo(() => {
    return samples.filter(s => {
      if (typeFilter !== 'all' && s.report_type !== typeFilter) return false;
      if (resultFilter !== 'all' && s.overall_result !== resultFilter) return false;
      return true;
    });
  }, [samples, typeFilter, resultFilter]);

  const aggregates = useMemo(() => {
    const totals = {
      total: samples.length,
      passAll: 0,
      anyFail: 0,
      completeness: emptyTally(),
      accuracy: emptyTally(),
      timeliness: emptyTally(),
      overall: emptyTally(),
    };
    const byType: Record<string, {
      total: number;
      completeness: DimensionTally;
      accuracy: DimensionTally;
      timeliness: DimensionTally;
      overall: DimensionTally;
    }> = {};
    for (const t of REPORT_TYPES) {
      byType[t.key] = { total: 0, completeness: emptyTally(), accuracy: emptyTally(), timeliness: emptyTally(), overall: emptyTally() };
    }
    for (const s of samples) {
      addToTally(totals.completeness, s.completeness_result);
      addToTally(totals.accuracy, s.accuracy_overall);
      addToTally(totals.timeliness, s.timeliness_result);
      addToTally(totals.overall, s.overall_result);
      const fails = [s.completeness_result, s.accuracy_overall, s.timeliness_result].filter(r => r === 'fail').length;
      const passes = [s.completeness_result, s.accuracy_overall, s.timeliness_result].filter(r => r === 'pass').length;
      if (fails > 0) totals.anyFail++;
      if (passes === 3) totals.passAll++;
      const tBucket = byType[s.report_type];
      if (tBucket) {
        tBucket.total++;
        addToTally(tBucket.completeness, s.completeness_result);
        addToTally(tBucket.accuracy, s.accuracy_overall);
        addToTally(tBucket.timeliness, s.timeliness_result);
        addToTally(tBucket.overall, s.overall_result);
      }
    }
    return { totals, byType };
  }, [samples]);

  const topDeficiencies = useMemo(() => {
    return samples
      .filter(s => s.deficiencies && s.deficiencies.trim().length > 0 && s.overall_result === 'fail')
      .slice(0, 5);
  }, [samples]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No samples have been reviewed yet.</p>
          <p className="text-sm mt-1">Upload reports or add samples in the LCTR / EFTR / STR / LVCTR / LPEPR tabs to populate this summary.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 reporting-results">
      {/* Action bar — hidden in print */}
      <div className="flex flex-wrap items-center justify-between gap-2 print-section-hide">
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All report types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All report types</SelectItem>
              {REPORT_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All results" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All results</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="na">N/A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCSV(filtered)}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* --- Page 1: Scorecard --- */}
      <section className="space-y-4 page-block">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Samples reviewed" value={aggregates.totals.total} />
          <StatTile label="Passed all dimensions" value={aggregates.totals.passAll} />
          <StatTile label="Failed ≥1 dimension" value={aggregates.totals.anyFail} tone="warn" />
          <StatTile label="Overall pass rate" value={passRate(aggregates.totals.overall)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DimensionCard title="Completeness" tally={aggregates.totals.completeness} />
          <DimensionCard title="Accuracy" tally={aggregates.totals.accuracy} />
          <DimensionCard title="Timeliness" tally={aggregates.totals.timeliness} />
        </div>

        <Card className="page-block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Breakdown by report type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report type</TableHead>
                  <TableHead className="text-right">Samples</TableHead>
                  <TableHead className="text-right">Completeness</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">Timeliness</TableHead>
                  <TableHead className="text-right">Overall pass</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REPORT_TYPES.map(t => {
                  const b = aggregates.byType[t.key];
                  if (!b || b.total === 0) {
                    return (
                      <TableRow key={t.key}>
                        <TableCell className="font-medium">{t.label}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow key={t.key}>
                      <TableCell className="font-medium">{t.label}</TableCell>
                      <TableCell className="text-right">{b.total}</TableCell>
                      <TableCell className="text-right">{b.completeness.pass}/{b.completeness.total} <span className="text-muted-foreground">({passRate(b.completeness)})</span></TableCell>
                      <TableCell className="text-right">{b.accuracy.pass}/{b.accuracy.total} <span className="text-muted-foreground">({passRate(b.accuracy)})</span></TableCell>
                      <TableCell className="text-right">{b.timeliness.pass}/{b.timeliness.total} <span className="text-muted-foreground">({passRate(b.timeliness)})</span></TableCell>
                      <TableCell className="text-right">{b.overall.pass}/{b.overall.total} <span className="text-muted-foreground">({passRate(b.overall)})</span></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {topDeficiencies.length > 0 && (
          <Card className="page-block">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sample deficiencies (first {topDeficiencies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {topDeficiencies.map(s => (
                  <li key={s.id} className="border-l-2 border-destructive/40 pl-3">
                    <span className="font-medium">{s.report_reference_id || 'Unnamed'} ({s.report_type.toUpperCase()})</span>
                    <span className="text-muted-foreground"> — </span>
                    <span>{s.deficiencies}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* --- Page 2+: Sample register --- */}
      <section className="space-y-2 page-break-before">
        <h3 className="text-base font-semibold">Sample register ({filtered.length}{filtered.length !== samples.length ? ` of ${samples.length}` : ''})</h3>
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Ref ID</TableHead>
                <TableHead className="w-16">Type</TableHead>
                <TableHead className="w-28">Txn Date</TableHead>
                <TableHead className="w-28">Filed</TableHead>
                <TableHead className="w-16 text-right">Days</TableHead>
                <TableHead className="w-28 text-right">Amount</TableHead>
                <TableHead className="w-16 text-center">Compl.</TableHead>
                <TableHead className="w-16 text-center">Accur.</TableHead>
                <TableHead className="w-16 text-center">Timel.</TableHead>
                <TableHead className="w-20 text-center">Overall</TableHead>
                <TableHead>Deficiencies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} className="register-row">
                  <TableCell className="font-mono text-xs">{s.report_reference_id || '—'}</TableCell>
                  <TableCell className="text-xs uppercase">{s.report_type}</TableCell>
                  <TableCell className="text-xs">{fmtDate(s.transaction_date)}</TableCell>
                  <TableCell className="text-xs">{fmtDate(s.fintrac_submission_date)}</TableCell>
                  <TableCell className="text-xs text-right">{s.timeliness_days_to_file ?? '—'}</TableCell>
                  <TableCell className="text-xs text-right">{fmtAmount(s.transaction_amount, s.transaction_currency)}</TableCell>
                  <TableCell className="text-center"><ResultIcon value={s.completeness_result} /></TableCell>
                  <TableCell className="text-center"><ResultIcon value={s.accuracy_overall} /></TableCell>
                  <TableCell className="text-center"><ResultIcon value={s.timeliness_result} /></TableCell>
                  <TableCell className="text-center"><ResultBadge value={s.overall_result} /></TableCell>
                  <TableCell className="text-xs">{s.deficiencies || '—'}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-6">No samples match the current filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' }) {
  return (
    <Card className="page-block">
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${tone === 'warn' ? 'text-destructive' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function DimensionCard({ title, tally }: { title: string; tally: DimensionTally }) {
  return (
    <Card className="page-block">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold">{passRate(tally)}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {tally.pass} pass · {tally.fail} fail · {tally.pending} pending · {tally.na} N/A
        </div>
      </CardContent>
    </Card>
  );
}
