import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReportSample } from './ReportTypeTesting';
import { FieldGridView } from './FieldGridView';
import { TransactionLedgerView } from './TransactionLedgerView';
import { TransactionFacsimile } from './TransactionFacsimile';
import {
  FileText, Building2, User, ArrowRightLeft, Calendar, DollarSign,
  MapPin, Hash, Briefcase, Phone, Mail, CreditCard, ChevronDown,
  ChevronRight, Shield, ArrowRight, Users, Globe
} from 'lucide-react';
import { format } from 'date-fns';

interface ReportPreviewPanelProps {
  sample: ReportSample;
  reportType: string;
}

const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
  if (amount == null) return null;
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  }).format(amount);
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
};

const formatTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), 'HH:mm:ss');
  } catch {
    return dateStr;
  }
};

const getReportTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    lctr: 'Large Cash Transaction Report',
    eftr: 'Electronic Funds Transfer Report',
    str: 'Suspicious Transaction Report',
    lvctr: 'Large Virtual Currency Transaction Report',
    lpepr: 'Listed Person/Entity Property Report',
  };
  return labels[type] || type.toUpperCase();
};

const DataField = ({ label, value, icon: Icon, highlight = false }: {
  label: string;
  value: string | number | boolean | null | undefined;
  icon?: React.ElementType;
  highlight?: boolean;
}) => {
  const stringValue = value != null ? String(value) : '';
  const hasValue = stringValue.trim() !== '';
  return (
    <div className={`${highlight && hasValue ? 'bg-primary/5 border border-primary/20 rounded-md p-2 -m-1' : ''}`}>
      <span className="text-muted-foreground text-xs flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <p className={`font-medium ${hasValue ? 'text-foreground' : 'text-muted-foreground italic'}`}>
        {hasValue ? stringValue : '—'}
      </p>
    </div>
  );
};

// --- Party Section (person or entity) ---
function PartySection({ title, party, icon: Icon, bgClass }: {
  title: string;
  party: any;
  icon: React.ElementType;
  bgClass?: string;
}) {
  if (!party) return null;
  const isEntity = party.type === 'entity';
  return (
    <div className={`${bgClass || 'bg-muted/50'} rounded-md p-4 space-y-3 text-sm`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
        {isEntity && <Badge variant="outline" className="text-[10px] h-5">Entity</Badge>}
        {party.type === 'person' && <Badge variant="outline" className="text-[10px] h-5">Person</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DataField label={isEntity ? 'Entity Name' : 'Name'} value={party.name} icon={User} />
        {!isEntity && <DataField label="Date of Birth" value={party.dob} icon={Calendar} />}
        {isEntity && <DataField label="Nature of Business" value={party.nature_of_business} icon={Briefcase} />}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DataField label="Address" value={party.address} icon={MapPin} />
        {!isEntity && <DataField label="Occupation" value={party.occupation} icon={Briefcase} />}
        {isEntity && <DataField label="Incorporation Info" value={party.incorporation_info} />}
      </div>
      {(party.phone || party.email || party.client_number) && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          {party.phone && <DataField label="Phone" value={party.phone} icon={Phone} />}
          {party.email && <DataField label="Email" value={party.email} icon={Mail} />}
          {party.client_number && <DataField label="Client #" value={party.client_number} icon={Hash} />}
        </div>
      )}
      {party.identification && (
        <div className="pt-2 border-t">
          <span className="text-xs text-muted-foreground font-medium">Identification</span>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <DataField label="ID Type" value={party.identification.type} icon={CreditCard} />
            <DataField label="ID Number" value={party.identification.number} />
            <DataField label="Jurisdiction" value={party.identification.jurisdiction} icon={Globe} />
          </div>
        </div>
      )}
      {party.account && (
        <div className="pt-2 border-t">
          <span className="text-xs text-muted-foreground font-medium">Account Details</span>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <DataField label="Account #" value={party.account.number} icon={CreditCard} />
            <DataField label="Type" value={party.account.type} />
            <DataField label="Currency" value={party.account.currency} icon={DollarSign} />
          </div>
          {(party.account.fi_number || party.account.branch_number) && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <DataField label="FI Number" value={party.account.fi_number} icon={Building2} />
              <DataField label="Branch #" value={party.account.branch_number} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- On-Behalf-Of parties ---
function OnBehalfOfSection({ parties }: { parties: any[] }) {
  if (!parties || parties.length === 0) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
        <ChevronRight className="w-3 h-3 transition-transform ui-open:rotate-90" />
        <Users className="w-3 h-3" />
        <span>On Behalf Of ({parties.length} {parties.length === 1 ? 'party' : 'parties'})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 space-y-2 mt-1">
        {parties.map((p: any, i: number) => (
          <div key={i} className="bg-accent/30 border border-accent/50 rounded-md p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <DataField label="Name" value={p.name} icon={User} />
              <DataField label="Relationship" value={p.relationship} />
            </div>
            <DataField label="Address" value={p.address} icon={MapPin} />
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// --- Authorized Persons ---
function AuthorizedPersonsSection({ persons }: { persons: any[] }) {
  if (!persons || persons.length === 0) return null;
  return (
    <div className="pt-2 border-t">
      <span className="text-xs text-muted-foreground font-medium">Authorized Persons</span>
      <div className="space-y-1 mt-1">
        {persons.map((p: any, i: number) => (
          <div key={i} className="text-sm flex items-center gap-2">
            <User className="w-3 h-3 text-muted-foreground" />
            <span>{p.given_name} {p.surname}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type ViewMode = 'classic' | 'facsimile' | 'ledger' | 'grid';

export function ReportPreviewPanel({ sample, reportType }: ReportPreviewPanelProps) {
  const parsed = sample.parsed_json || {};
  const header = parsed.report_header || {};
  const aggregation = parsed.aggregation || {};
  const transactions: any[] = parsed.transactions || [];
  const [selectedTxnIndex, setSelectedTxnIndex] = useState(0);

  const sourceType: string = parsed.__source_type || 'manual';
  const hasNestedStructure = transactions.length > 0;
  const defaultMode: ViewMode = sourceType === 'json'
    ? 'grid'
    : hasNestedStructure && transactions.length > 1
      ? 'ledger'
      : 'facsimile';
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);




  const switcher = (
    <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 flex items-center gap-2 print-section-hide">
      <span className="text-xs text-muted-foreground">View:</span>
      <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="facsimile">FINTRAC Facsimile</SelectItem>
          <SelectItem value="ledger" disabled={!hasNestedStructure}>Transaction Ledger</SelectItem>
          <SelectItem value="grid">Field Grid (JSON)</SelectItem>
          <SelectItem value="classic">Classic Cards</SelectItem>
        </SelectContent>
      </Select>
      <Badge variant="outline" className="text-[10px] ml-auto uppercase">
        Source: {sourceType}
      </Badge>
    </div>
  );

  if (viewMode === 'grid') {
    return (
      <div className="h-full flex flex-col">
        {switcher}
        <div className="flex-1 overflow-hidden">
          <FieldGridView sample={sample} onSave={() => { /* parent handles persistence */ }} />
        </div>
      </div>
    );
  }

  if (viewMode === 'ledger' && hasNestedStructure) {
    return (
      <div className="h-full flex flex-col">
        {switcher}
        <div className="flex-1 overflow-hidden">
          <TransactionLedgerView sample={sample} reportType={reportType} />
        </div>
      </div>
    );
  }

  if (viewMode === 'facsimile' && hasNestedStructure) {
    const currentTxn = transactions[selectedTxnIndex];
    return (
      <div className="h-full flex flex-col">
        {switcher}
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div className="max-w-2xl mx-auto space-y-3">
            {transactions.length > 1 && (
              <Select value={String(selectedTxnIndex)} onValueChange={(v) => setSelectedTxnIndex(Number(v))}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactions.map((_: any, i: number) => (
                    <SelectItem key={i} value={String(i)}>Transaction {i + 1} of {transactions.length}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <TransactionFacsimile
              txn={currentTxn}
              header={header}
              aggregation={aggregation}
              reportType={reportType}
              sample={sample}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---- Classic view (legacy fallback) ----
  const legacyRequester = !hasNestedStructure ? {
    name: parsed.client_name || parsed.clientName || parsed.conductor_name,
    dob: parsed.client_dob || parsed.date_of_birth,
    address: parsed.client_address || parsed.address,
    occupation: parsed.client_occupation || parsed.occupation,
    phone: parsed.client_phone || parsed.phone,
    email: parsed.client_email || parsed.email,
    identification: parsed.identification_number ? { number: parsed.identification_number, type: null, jurisdiction: null } : null,
    account: null,
  } : null;

  const legacyBeneficiary = !hasNestedStructure ? {
    name: parsed.beneficiary_name || parsed.beneficiaryName,
    address: parsed.beneficiary_address || parsed.beneficiaryAddress,
    account: parsed.beneficiary_account || parsed.account_number ? {
      number: parsed.beneficiary_account || parsed.account_number || parsed.wallet_address,
      type: null, currency: null, fi_number: null, branch_number: null,
    } : null,
    identification: null,
  } : null;

  const currentTxn = hasNestedStructure ? transactions[selectedTxnIndex] : null;

  const reportingEntityName = header.reporting_entity_name || parsed.reporting_entity_name || parsed.entity_name || '';
  const strNarrative = parsed.str_narrative_text || parsed.str_narrative || parsed.narrative || parsed.suspicion_details;

  return (
    <div className="h-full flex flex-col">
      {switcher}
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
      <div className="bg-background border rounded-lg shadow-sm max-w-2xl mx-auto">
        {/* Header Bar */}
        <div className="bg-primary text-primary-foreground px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="font-semibold">FINTRAC Report</span>
            </div>
            <Badge variant="secondary" className="bg-background/20 text-primary-foreground">
              {reportType.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div className="text-center border-b pb-4">
            <h2 className="text-lg font-bold text-foreground">{getReportTypeLabel(reportType)}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Reference: {sample.report_reference_id || header.report_reference || 'Not assigned'}
            </p>
          </div>

          {/* ═══ REPORT HEADER ═══ */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Report Header
              </h3>
            </div>
            <div className="bg-muted/50 rounded-md p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Reporting Entity" value={reportingEntityName} icon={Building2} />
                <DataField label="Reporting Entity #" value={header.reporting_entity_number} icon={Hash} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Submitting RE #" value={header.submitting_re_number} icon={Hash} />
                <DataField label="Activity Sector" value={header.activity_sector} icon={Briefcase} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(reportType === 'eftr' || reportType === 'lvctr') && (
                  <DataField label="EFT Direction" value={header.eft_direction} icon={ArrowRightLeft} />
                )}
                <DataField label="Ministerial Directive" value={header.ministerial_directive} icon={Shield} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Submission Date" value={formatDate(sample.fintrac_submission_date)} icon={Calendar} />
                <DataField label="Filing Method" value={sample.filing_method?.charAt(0).toUpperCase() + sample.filing_method?.slice(1)} />
              </div>
            </div>
          </section>

          {/* ═══ 24-HOUR AGGREGATION ═══ */}
          {(sample.is_aggregated || aggregation.is_aggregated) && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    24-Hour Aggregation
                  </h3>
                </div>
                <div className="bg-accent/30 border border-accent/50 rounded-md p-4 text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <DataField label="Aggregation Type" value={aggregation.type_code || 'Aggregated'} />
                    <DataField label="Period Start" value={formatTime(aggregation.period_start)} icon={Calendar} />
                    <DataField label="Period End" value={formatTime(aggregation.period_end)} icon={Calendar} />
                  </div>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* ═══ TRANSACTIONS ═══ */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  {hasNestedStructure && transactions.length > 1 ? 'Transactions' : 'Transaction Details'}
                </h3>
              </div>
              {hasNestedStructure && transactions.length > 1 && (
                <Select
                  value={String(selectedTxnIndex)}
                  onValueChange={(v) => setSelectedTxnIndex(Number(v))}
                >
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transactions.map((_: any, i: number) => (
                      <SelectItem key={i} value={String(i)}>
                        Transaction {i + 1} of {transactions.length}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Transaction Summary */}
            <div className="bg-muted/50 rounded-md p-4 space-y-3 text-sm mb-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-xs">Amount</span>
                    <p className="font-semibold text-base text-primary">
                      {formatCurrency(
                        currentTxn?.amount ?? sample.transaction_amount,
                        currentTxn?.currency ?? sample.transaction_currency
                      ) || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-xs">Date/Time</span>
                    <p className="font-medium">{formatDate(currentTxn?.date_time ?? sample.transaction_date) || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-xs">Currency</span>
                    <p className="font-medium">{currentTxn?.currency ?? sample.transaction_currency ?? 'CAD'}</p>
                  </div>
                </div>
              </div>
              {currentTxn?.reference_number && (
                <DataField label="Transaction Reference" value={currentTxn.reference_number} icon={Hash} />
              )}
              {(currentTxn?.exchange_rate || currentTxn?.exchange_rate_source) && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <DataField label="Exchange Rate" value={currentTxn?.exchange_rate} icon={ArrowRightLeft} />
                  <DataField label="Rate Source" value={currentTxn?.exchange_rate_source} />
                </div>
              )}
            </div>

            {/* ── Starting Action ── */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 bg-primary/5 border border-primary/20 rounded-t-md hover:bg-primary/10 transition-colors">
                <ChevronDown className="w-4 h-4 transition-transform" />
                <ArrowRight className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-primary">Starting Action</span>
                <span className="text-xs text-muted-foreground ml-1">(Requester / Sender)</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="border border-t-0 border-primary/20 rounded-b-md p-3 space-y-3">
                <PartySection
                  title="Requester"
                  party={currentTxn?.starting_action?.requester || legacyRequester}
                  icon={User}
                  bgClass="bg-primary/5 border border-primary/20"
                />
                <OnBehalfOfSection parties={currentTxn?.starting_action?.on_behalf_of} />
                <AuthorizedPersonsSection persons={currentTxn?.starting_action?.requester?.authorized_persons} />
              </CollapsibleContent>
            </Collapsible>

            {/* ── Completing Action ── */}
            {(reportType === 'eftr' || reportType === 'lvctr' || currentTxn?.completing_action) && (
              <Collapsible defaultOpen className="mt-3">
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 bg-primary/5 border border-primary/20 rounded-t-md hover:bg-primary/10 transition-colors">
                  <ChevronDown className="w-4 h-4 transition-transform" />
                  <ArrowRight className="w-4 h-4 text-primary rotate-180" />
                  <span className="font-semibold text-sm text-primary">Completing Action</span>
                  <span className="text-xs text-muted-foreground ml-1">(Beneficiary / Receiver)</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="border border-t-0 border-primary/20 rounded-b-md p-3 space-y-3">
                  {/* Disposition Details */}
                  {(currentTxn?.completing_action?.amount || currentTxn?.completing_action?.disposition_code || currentTxn?.completing_action?.currency) && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-2 text-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Disposition Details</p>
                      <div className="grid grid-cols-3 gap-3">
                        <DataField label="Amount" value={formatCurrency(currentTxn.completing_action.amount, currentTxn.completing_action.currency)} icon={DollarSign} highlight />
                        <DataField label="Currency" value={currentTxn.completing_action.currency} />
                        <DataField label="Disposition Code" value={currentTxn.completing_action.disposition_code} icon={Hash} />
                      </div>
                      {(currentTxn.completing_action.exchange_rate || currentTxn.completing_action.exchange_rate_source) && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <DataField label="Exchange Rate" value={currentTxn.completing_action.exchange_rate} icon={ArrowRightLeft} />
                          <DataField label="Rate Source" value={currentTxn.completing_action.exchange_rate_source} />
                        </div>
                      )}
                    </div>
                  )}
                  <PartySection
                    title="Beneficiary"
                    party={currentTxn?.completing_action?.beneficiary || legacyBeneficiary}
                    icon={User}
                    bgClass="bg-primary/5 border border-primary/20"
                  />
                  <OnBehalfOfSection parties={currentTxn?.completing_action?.on_behalf_of} />
                  <AuthorizedPersonsSection persons={currentTxn?.completing_action?.beneficiary?.authorized_persons} />
                </CollapsibleContent>
              </Collapsible>
            )}
          </section>

          {/* ═══ THIRD PARTY (legacy fallback) ═══ */}
          {!hasNestedStructure && (sample.third_party_indicator || parsed.third_party_name) && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Third Party Information
                  </h3>
                </div>
                <div className="bg-muted/50 rounded-md p-4 space-y-3 text-sm">
                  <DataField label="Third Party Name" value={parsed.third_party_name} icon={User} highlight />
                  <DataField label="Relationship" value={parsed.third_party_relationship} />
                  <DataField label="Address" value={parsed.third_party_address} icon={MapPin} />
                </div>
              </section>
            </>
          )}

          {/* ═══ STR NARRATIVE ═══ */}
          {reportType === 'str' && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    STR Narrative / Suspicion Details
                  </h3>
                </div>
                <div className="bg-destructive/5 border border-destructive/20 rounded-md p-4 text-sm">
                  <p className={`whitespace-pre-wrap ${strNarrative || sample.str_decision_notes ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                    {strNarrative || sample.str_decision_notes || '— No narrative provided —'}
                  </p>
                </div>
              </section>
            </>
          )}

          {/* ═══ VC IDENTIFIERS ═══ */}
          {reportType === 'lvctr' && currentTxn?.vc_identifiers && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Virtual Currency Identifiers
                  </h3>
                </div>
                <div className="bg-muted/50 rounded-md p-4 text-sm">
                  <DataField label="VC Transaction ID" value={currentTxn.vc_identifiers.transaction_id} />
                  <DataField label="Wallet Address" value={currentTxn.vc_identifiers.wallet_address} />
                </div>
              </section>
            </>
          )}

          {/* Manual Notes */}
          {sample.manual_notes && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Additional Notes
                  </h3>
                </div>
                <div className="bg-muted/30 border border-dashed rounded-md p-4 text-sm">
                  <p className="whitespace-pre-wrap text-muted-foreground">{sample.manual_notes}</p>
                </div>
              </section>
            </>
          )}

          {/* Footer */}
          <div className="pt-4 border-t text-center text-xs text-muted-foreground">
            <p>This is a preview representation of the FINTRAC report data.</p>
            <p>Refer to original source documents for verification.</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

