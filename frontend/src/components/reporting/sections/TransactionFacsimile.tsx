import { format } from 'date-fns';
import { ReportSample } from './ReportTypeTesting';

interface TransactionFacsimileProps {
  txn: any;
  header: any;
  aggregation: any;
  reportType: string;
  sample: ReportSample;
}

const fmtCurrency = (amt: any, ccy: any) => {
  if (amt == null || amt === '') return '—';
  const n = typeof amt === 'number' ? amt : parseFloat(String(amt));
  if (isNaN(n)) return String(amt);
  try { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: ccy || 'CAD' }).format(n); }
  catch { return n.toLocaleString(); }
};
const fmtDate = (d: any) => {
  if (!d) return '—';
  try { return format(new Date(d), 'yyyy-MM-dd HH:mm:ss'); } catch { return String(d); }
};

const REPORT_TITLES: Record<string, string> = {
  lctr: 'Large Cash Transaction Report',
  eftr: 'Electronic Funds Transfer Report',
  str: 'Suspicious Transaction Report',
  lvctr: 'Large Virtual Currency Transaction Report',
  lpepr: 'Listed Person/Entity Property Report',
};

function Field({ num, label, value }: { num: string; label: string; value: any }) {
  const has = value != null && value !== '';
  return (
    <div className="grid grid-cols-[40px_1fr] gap-2 py-1 border-b border-dashed border-muted last:border-0">
      <div className="text-[10px] font-mono text-muted-foreground pt-0.5">{num}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-sm ${has ? 'font-medium' : 'italic text-muted-foreground'}`}>{has ? String(value) : '—'}</div>
      </div>
    </div>
  );
}

function PartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-foreground/20">
      <div className="bg-foreground text-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
        {title}
      </div>
      <div className="p-3 space-y-1 bg-background">{children}</div>
    </section>
  );
}

function PartyBlock({ party, role }: { party: any; role: string }) {
  if (!party) return <p className="text-xs italic text-muted-foreground">No {role.toLowerCase()} information available.</p>;
  const isEntity = party.type === 'entity';
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide font-semibold text-primary">{role} {isEntity ? '(Entity)' : '(Individual)'}</div>
      <Field num="" label={isEntity ? 'Entity name' : 'Full name'} value={party.name} />
      {!isEntity && <Field num="" label="Date of birth" value={party.dob} />}
      {!isEntity && <Field num="" label="Occupation" value={party.occupation} />}
      {isEntity && <Field num="" label="Nature of business" value={party.nature_of_business} />}
      <Field num="" label="Address" value={party.address} />
      {party.identification && (
        <>
          <Field num="" label="ID type" value={party.identification.type} />
          <Field num="" label="ID number" value={party.identification.number} />
          <Field num="" label="ID jurisdiction" value={party.identification.jurisdiction} />
        </>
      )}
      {party.account && (
        <>
          <Field num="" label="Account number" value={party.account.number} />
          <Field num="" label="Account type" value={party.account.type} />
          <Field num="" label="Account currency" value={party.account.currency} />
        </>
      )}
    </div>
  );
}

export function TransactionFacsimile({ txn, header, aggregation, reportType, sample }: TransactionFacsimileProps) {
  const obo = (arr: any[] | undefined) => (arr && arr.length > 0 ? arr : null);

  return (
    <div className="bg-background text-foreground font-serif text-sm border border-foreground/20 shadow-sm">
      {/* Title block */}
      <div className="text-center border-b-2 border-foreground p-4 space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">FINTRAC</div>
        <h2 className="text-base font-bold uppercase">{REPORT_TITLES[reportType] || reportType.toUpperCase()}</h2>
        <div className="text-xs text-muted-foreground">
          Reference: {header.report_reference || sample.report_reference_id || 'Unassigned'}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Part A */}
        <PartBlock title="Part A — Reporting Entity Information">
          <Field num="A1" label="Reporting entity name" value={header.reporting_entity_name} />
          <Field num="A2" label="Reporting entity number" value={header.reporting_entity_number} />
          <Field num="A3" label="Submitting RE number" value={header.submitting_re_number} />
          <Field num="A4" label="Activity sector" value={header.activity_sector} />
          {(reportType === 'eftr' || reportType === 'lvctr') && (
            <Field num="A5" label="EFT direction" value={header.eft_direction} />
          )}
          <Field num="A6" label="Ministerial directive" value={header.ministerial_directive} />
          <Field num="A7" label="Submission date" value={fmtDate(sample.fintrac_submission_date)} />
        </PartBlock>

        {/* Aggregation if present */}
        {aggregation?.is_aggregated && (
          <PartBlock title="24-Hour Aggregation">
            <Field num="" label="Aggregation type" value={aggregation.type_code} />
            <Field num="" label="Period start" value={fmtDate(aggregation.period_start)} />
            <Field num="" label="Period end" value={fmtDate(aggregation.period_end)} />
          </PartBlock>
        )}

        {/* Part B */}
        <PartBlock title="Part B — Transaction Details">
          <div className="grid grid-cols-2 gap-3">
            <Field num="B1" label="Date / time" value={fmtDate(txn?.date_time)} />
            <Field num="B2" label="Amount" value={fmtCurrency(txn?.amount, txn?.currency)} />
            <Field num="B3" label="Currency" value={txn?.currency} />
            <Field num="B4" label="Reference number" value={txn?.reference_number} />
            {txn?.exchange_rate && <Field num="B5" label="Exchange rate" value={txn.exchange_rate} />}
            {txn?.exchange_rate_source && <Field num="B6" label="Rate source" value={txn.exchange_rate_source} />}
            {txn?.disposition_code && <Field num="B7" label="Disposition code" value={txn.disposition_code} />}
          </div>
        </PartBlock>

        {/* Part C */}
        <PartBlock title="Part C — Starting Action (Sender / Requester)">
          <PartyBlock party={txn?.starting_action?.requester} role="Requester" />
          {obo(txn?.starting_action?.on_behalf_of) && (
            <div className="mt-3 pt-3 border-t border-dashed">
              <div className="text-[10px] uppercase font-semibold text-primary mb-1">On Behalf Of</div>
              {txn.starting_action.on_behalf_of.map((p: any, i: number) => (
                <div key={i} className="ml-2 mb-2">
                  <Field num="" label="Name" value={p.name} />
                  <Field num="" label="Relationship" value={p.relationship} />
                  <Field num="" label="Address" value={p.address} />
                </div>
              ))}
            </div>
          )}
        </PartBlock>

        {/* Part D */}
        {(reportType === 'eftr' || reportType === 'lvctr' || txn?.completing_action) && (
          <PartBlock title="Part D — Completing Action (Beneficiary / Receiver)">
            {(txn?.completing_amount || txn?.completing_currency) && (
              <div className="grid grid-cols-2 gap-3 pb-2 mb-2 border-b border-dashed">
                <Field num="D1" label="Disposition amount" value={fmtCurrency(txn.completing_amount, txn.completing_currency)} />
                <Field num="D2" label="Disposition currency" value={txn.completing_currency} />
              </div>
            )}
            <PartyBlock party={txn?.completing_action?.beneficiary} role="Beneficiary" />
            {obo(txn?.completing_action?.on_behalf_of) && (
              <div className="mt-3 pt-3 border-t border-dashed">
                <div className="text-[10px] uppercase font-semibold text-primary mb-1">On Behalf Of</div>
                {txn.completing_action.on_behalf_of.map((p: any, i: number) => (
                  <div key={i} className="ml-2 mb-2">
                    <Field num="" label="Name" value={p.name} />
                    <Field num="" label="Relationship" value={p.relationship} />
                    <Field num="" label="Address" value={p.address} />
                  </div>
                ))}
              </div>
            )}
          </PartBlock>
        )}

        {/* VC */}
        {reportType === 'lvctr' && txn?.vc_identifiers && (
          <PartBlock title="Virtual Currency Identifiers">
            {Array.isArray(txn.vc_identifiers)
              ? txn.vc_identifiers.map((v: any, i: number) => (
                  <Field key={i} num="" label={`Address ${i + 1}`} value={typeof v === 'string' ? v : JSON.stringify(v)} />
                ))
              : (
                <>
                  <Field num="" label="Transaction ID" value={txn.vc_identifiers.transaction_id} />
                  <Field num="" label="Wallet address" value={txn.vc_identifiers.wallet_address} />
                </>
              )}
          </PartBlock>
        )}
      </div>

      <div className="text-center text-[10px] text-muted-foreground border-t p-2">
        Facsimile representation — refer to original FINTRAC submission for legal record.
      </div>
    </div>
  );
}
