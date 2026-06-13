import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Search, CheckCircle2 } from 'lucide-react';
import { ReportSample } from './ReportTypeTesting';

interface FieldGridViewProps {
  sample: ReportSample;
  onSave: (sample: Partial<ReportSample>) => void;
}

interface Leaf {
  path: string;
  value: string;
  group: string;
}

const SKIP_KEYS = new Set(['__source_type', '__source_label']);

function flatten(obj: any, prefix = ''): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];
  if (obj == null) return out;
  if (typeof obj !== 'object') {
    out.push({ path: prefix || '(root)', value: String(obj) });
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...flatten(v, `${prefix}[${i}]`)));
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (SKIP_KEYS.has(k)) continue;
    const next = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object') out.push(...flatten(v, next));
    else out.push({ path: next, value: v == null || v === '' ? '' : String(v) });
  }
  return out;
}

export function FieldGridView({ sample, onSave }: FieldGridViewProps) {
  const parsed = sample.parsed_json || {};
  const [search, setSearch] = useState('');
  const [showEmpty, setShowEmpty] = useState(true);
  const [showTested, setShowTested] = useState(true);
  const [tested, setTested] = useState<Record<string, boolean>>(
    (parsed.__field_tested as Record<string, boolean>) || {}
  );
  const [dirty, setDirty] = useState(false);

  const groups = useMemo(() => {
    const g: Record<string, Leaf[]> = {};
    const header = parsed.report_header;
    const aggregation = parsed.aggregation;
    const transactions: any[] = parsed.transactions || [];

    if (header) g['Report Header'] = flatten(header).map(x => ({ ...x, group: 'Report Header' }));
    if (aggregation) g['Aggregation'] = flatten(aggregation).map(x => ({ ...x, group: 'Aggregation' }));
    if (transactions.length) {
      transactions.forEach((t, i) => {
        const label = `Transaction ${i + 1}${transactions.length > 1 ? ` of ${transactions.length}` : ''}`;
        g[label] = flatten(t).map(x => ({ ...x, group: label }));
      });
    }
    // Anything else at top-level
    const others: Leaf[] = [];
    for (const [k, v] of Object.entries(parsed)) {
      if (SKIP_KEYS.has(k) || ['report_header', 'aggregation', 'transactions', '__field_tested'].includes(k)) continue;
      flatten(v, k).forEach(x => others.push({ ...x, group: 'Other' }));
    }
    if (others.length) g['Other'] = others;
    return g;
  }, [parsed]);

  const totals = useMemo(() => {
    let count = 0, testedCount = 0;
    Object.values(groups).forEach(rows => rows.forEach(r => {
      count++;
      if (tested[r.path]) testedCount++;
    }));
    return { count, testedCount };
  }, [groups, tested]);

  const matchesSearch = (r: Leaf) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.path.toLowerCase().includes(s) || r.value.toLowerCase().includes(s);
  };
  const matchesFilters = (r: Leaf) => {
    if (!showEmpty && r.value === '') return false;
    if (!showTested && tested[r.path]) return false;
    return true;
  };

  const toggle = (path: string) => {
    setTested(prev => ({ ...prev, [path]: !prev[path] }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave({ id: sample.id, parsed_json: { ...parsed, __field_tested: tested } });
    setDirty(false);
  };

  return (
    <div className="h-full overflow-auto bg-muted/30 p-4">
      <div className="bg-background border rounded-lg shadow-sm max-w-4xl mx-auto">
        <div className="bg-primary text-primary-foreground px-6 py-3 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            Field-by-Field Grid
            <Badge variant="secondary" className="bg-background/20 text-primary-foreground">
              {totals.testedCount}/{totals.count} tested
            </Badge>
          </div>
          {dirty && (
            <Button size="sm" variant="secondary" onClick={handleSave}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Save progress
            </Button>
          )}
        </div>

        <div className="p-4 space-y-3 sticky top-0 bg-background z-10 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search field path or value..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={showEmpty} onCheckedChange={v => setShowEmpty(!!v)} />
              Show empty
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={showTested} onCheckedChange={v => setShowTested(!!v)} />
              Show tested
            </label>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {Object.entries(groups).map(([groupName, rows]) => {
            const visible = rows.filter(r => matchesSearch(r) && matchesFilters(r));
            if (visible.length === 0) return null;
            const groupTested = rows.filter(r => tested[r.path]).length;
            return (
              <Collapsible key={groupName} defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 bg-muted/50 hover:bg-muted rounded-md text-left">
                  <ChevronRight className="w-4 h-4 transition-transform ui-open:rotate-90" />
                  <span className="font-semibold text-sm">{groupName}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {groupTested}/{rows.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-md mt-1 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr className="text-left">
                          <th className="px-2 py-1.5 w-10">✓</th>
                          <th className="px-2 py-1.5">Field</th>
                          <th className="px-2 py-1.5">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map(r => {
                          const isTested = !!tested[r.path];
                          const empty = r.value === '';
                          return (
                            <tr
                              key={`${groupName}-${r.path}`}
                              className={`border-t hover:bg-muted/30 ${isTested ? 'bg-primary/5' : ''}`}
                            >
                              <td className="px-2 py-1.5 align-top">
                                <Checkbox checked={isTested} onCheckedChange={() => toggle(r.path)} />
                              </td>
                              <td className="px-2 py-1.5 align-top font-mono text-[11px] text-muted-foreground break-all">
                                {r.path}
                              </td>
                              <td className={`px-2 py-1.5 align-top break-words ${empty ? 'italic text-muted-foreground' : 'font-medium'}`}>
                                {empty ? '—' : r.value}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {totals.count === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No structured data parsed for this report.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
