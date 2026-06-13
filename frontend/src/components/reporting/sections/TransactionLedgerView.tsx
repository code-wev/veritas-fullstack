import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ReportSample } from './ReportTypeTesting';
import { TransactionFacsimile } from './TransactionFacsimile';

interface TransactionLedgerViewProps {
  sample: ReportSample;
  reportType: string;
}

const fmtCurrency = (amt: any, ccy: any) => {
  if (amt == null || amt === '') return '—';
  const n = typeof amt === 'number' ? amt : parseFloat(String(amt));
  if (isNaN(n)) return String(amt);
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: ccy || 'CAD' }).format(n);
  } catch {
    return n.toLocaleString();
  }
};
const fmtDate = (d: any) => {
  if (!d) return '—';
  try { return format(new Date(d), 'yyyy-MM-dd HH:mm'); } catch { return String(d); }
};

export function TransactionLedgerView({ sample, reportType }: TransactionLedgerViewProps) {
  const parsed = sample.parsed_json || {};
  const header = parsed.report_header || {};
  const aggregation = parsed.aggregation || {};
  const transactions: any[] = parsed.transactions || [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => transactions.map((t, i) => ({
    idx: i,
    ref: t.reference_number || '—',
    date: t.date_time,
    amount: t.amount,
    currency: t.currency,
    requester: t.starting_action?.requester?.name || t.initiator?.name || '—',
    beneficiary: t.completing_action?.beneficiary?.name || t.receiver?.name || '—',
  })), [transactions]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [r.ref, r.requester, r.beneficiary, String(r.amount ?? '')].some(v =>
      String(v).toLowerCase().includes(s),
    );
  });

  const totalAmount = transactions.reduce((acc, t) => acc + (typeof t.amount === 'number' ? t.amount : 0), 0);

  return (
    <div className="h-full overflow-auto bg-muted/30 p-4">
      <div className="bg-background border rounded-lg shadow-sm max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-6 py-3 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            Transaction Ledger
            <Badge variant="secondary" className="bg-background/20 text-primary-foreground">
              {reportType.toUpperCase()}
            </Badge>
          </div>
          <span className="text-xs opacity-90">{transactions.length} transaction(s)</span>
        </div>

        {/* Report header summary */}
        <div className="p-4 border-b bg-muted/20 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground">Reporting Entity</div>
            <div className="font-medium truncate">{header.reporting_entity_name || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">RE Number</div>
            <div className="font-medium">{header.reporting_entity_number || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Reference</div>
            <div className="font-medium">{header.report_reference || sample.report_reference_id || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Amount</div>
            <div className="font-semibold text-primary">{fmtCurrency(totalAmount, transactions[0]?.currency || 'CAD')}</div>
          </div>
          {aggregation?.is_aggregated && (
            <>
              <div>
                <div className="text-muted-foreground">Aggregation</div>
                <div className="font-medium">{aggregation.type_code || 'Yes'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">Period</div>
                <div className="font-medium">{fmtDate(aggregation.period_start)} → {fmtDate(aggregation.period_end)}</div>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ref, party, amount..."
              className="pl-9 h-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Ledger table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Date / Time</th>
                <th className="px-3 py-2 text-left">Reference</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Requester / Sender</th>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2 text-left">Beneficiary / Receiver</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No transactions match.</td></tr>
              )}
              {filtered.map(r => (
                <tr
                  key={r.idx}
                  onClick={() => setOpenIdx(r.idx)}
                  className="border-t hover:bg-primary/5 cursor-pointer"
                >
                  <td className="px-3 py-2 font-medium">{r.idx + 1}</td>
                  <td className="px-3 py-2">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{r.ref}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtCurrency(r.amount, r.currency)}</td>
                  <td className="px-3 py-2 truncate max-w-[180px]">{r.requester}</td>
                  <td className="px-3 py-2 text-muted-foreground"><ArrowRight className="w-3 h-3" /></td>
                  <td className="px-3 py-2 truncate max-w-[180px]">{r.beneficiary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={openIdx !== null} onOpenChange={o => !o && setOpenIdx(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Transaction {openIdx !== null ? openIdx + 1 : ''} of {transactions.length}
            </SheetTitle>
          </SheetHeader>
          {openIdx !== null && (
            <div className="mt-4">
              <TransactionFacsimile
                txn={transactions[openIdx]}
                header={header}
                aggregation={aggregation}
                reportType={reportType}
                sample={sample}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
