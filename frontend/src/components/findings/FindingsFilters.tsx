import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, X } from 'lucide-react';
import { FINDING_TYPES } from '@/lib/findingClassification';

export interface FilterState {
  module: string;
  /** finding_type or 'all' or 'deficiencies' or 'observations' */
  classification: string;
  status: string;
  search: string;
}

interface FindingsFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onNewFinding: () => void;
}

export function FindingsFilters({ filters, onFiltersChange, onNewFinding }: FindingsFiltersProps) {
  const handleChange = (field: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const clearFilters = () => {
    onFiltersChange({ module: 'all', classification: 'all', status: 'all', search: '' });
  };

  const hasActiveFilters = filters.module !== 'all' || filters.classification !== 'all' || filters.status !== 'all' || filters.search !== '';

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search findings..."
          value={filters.search}
          onChange={e => handleChange('search', e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.module} onValueChange={v => handleChange('module', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Module" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Modules</SelectItem>
          <SelectItem value="msb_registration">MSB Registration</SelectItem>
          <SelectItem value="governance">Governance</SelectItem>
          <SelectItem value="aml_program">AML Program</SelectItem>
          <SelectItem value="kyc">KYC Testing</SelectItem>
          <SelectItem value="transaction_reporting">Transaction Reporting</SelectItem>
          <SelectItem value="transaction_monitoring">Transaction Monitoring</SelectItem>
          <SelectItem value="sanctions_screening">Sanctions Screening</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.classification} onValueChange={v => handleChange('classification', v)}>
        <SelectTrigger className="w-[210px]">
          <SelectValue placeholder="Classification" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All classifications</SelectItem>
          <SelectItem value="deficiencies">Deficiencies only</SelectItem>
          <SelectItem value="observations">Observations only</SelectItem>
          {FINDING_TYPES.map(t => (
            <SelectItem key={t.type} value={t.type}>{t.shortLabel}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={v => handleChange('status', v)}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="reviewed">Reviewed</SelectItem>
          <SelectItem value="final">Final</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      <Button onClick={onNewFinding}>
        <Plus className="h-4 w-4 mr-2" />
        New Finding
      </Button>
    </div>
  );
}
