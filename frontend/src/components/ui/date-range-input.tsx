import { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DateRange {
  from: string | null;  // ISO date YYYY-MM-DD
  to: string | null;    // ISO date YYYY-MM-DD
}

interface DateRangeInputProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
  placeholder?: string;
}

/**
 * Compact date-range picker. Two HTML date inputs in a Popover —
 * intentionally minimal so it works without pulling in extra calendar deps.
 * Suitable for filter UIs where range is optional and the user mostly types
 * or pastes dates.
 */
export function DateRangeInput({ value, onChange, placeholder = 'Pick a range' }: DateRangeInputProps) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.from ?? '');
  const [to, setTo] = useState(value.to ?? '');

  const handleApply = () => {
    onChange({ from: from || null, to: to || null });
    setOpen(false);
  };

  const handleClear = () => {
    setFrom('');
    setTo('');
    onChange({ from: null, to: null });
    setOpen(false);
  };

  const label = (() => {
    if (!value.from && !value.to) return placeholder;
    const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
    return `${fmt(value.from)} → ${fmt(value.to)}`;
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs justify-between gap-2 min-w-[180px]">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="truncate">{label}</span>
          </span>
          {(value.from || value.to) && (
            <X
              className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dr-from" className="text-xs">From</Label>
            <Input id="dr-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dr-to" className="text-xs">To</Label>
            <Input id="dr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" />
          </div>
          <div className="flex justify-between pt-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClear}>Clear</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
