import { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, File, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagementId: string;
  reviewId: string;
  onReportsCreated: (reports: ParsedReport[]) => void;
}

export interface ParsedReport {
  report_type: 'lctr' | 'eftr' | 'str' | 'lvctr' | 'lpepr';
  report_reference_id: string | null;
  fintrac_submission_date: string | null;
  transaction_date: string | null;
  transaction_amount: number | null;
  transaction_currency: string | null;
  filing_method: 'manual' | 'batch';
  is_aggregated: boolean;
  aggregation_type: string | null;
  aggregation_period_start: string | null;
  aggregation_period_end: string | null;
  // Header
  header_reporting_entity: boolean | null;
  header_submission_timestamp: boolean | null;
  header_report_reference: boolean | null;
  activity_sector_code: boolean | null;
  eft_direction: boolean | null;
  ministerial_directive: boolean | null;
  submitting_re_number: boolean | null;
  // Transaction
  txn_amount: boolean | null;
  txn_currency: boolean | null;
  txn_date_time: boolean | null;
  txn_aggregation_indicator: boolean | null;
  txn_aggregation_type: boolean | null;
  txn_aggregation_period_start: boolean | null;
  txn_aggregation_period_end: boolean | null;
  // Requester (starting action)
  client_name: boolean | null;
  client_address: boolean | null;
  client_dob: boolean | null;
  client_occupation: boolean | null;
  requester_account: boolean | null;
  requester_identification: boolean | null;
  authorized_persons: boolean | null;
  on_behalf_of_requester: boolean | null;
  // Beneficiary (completing action)
  beneficiary_name: boolean | null;
  beneficiary_address: boolean | null;
  beneficiary_account_wallet: boolean | null;
  beneficiary_identification: boolean | null;
  on_behalf_of_beneficiary: boolean | null;
  // Third party (legacy)
  third_party_indicator: boolean | null;
  // Special
  exchange_rate: boolean | null;
  str_narrative: boolean | null;
  vc_identifiers: boolean | null;
  // Raw
  parsed_json: any;
  manual_notes: string | null;
}

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'complete' | 'error';

interface FileUploadState {
  file: File;
  status: UploadStatus;
  progress: number;
  result?: ParsedReport[];
  error?: string;
}

const REPORT_TYPE_CODES: Record<number, 'lctr' | 'eftr' | 'str' | 'lvctr' | 'lpepr'> = {
  142: 'lctr',
  145: 'eftr',
  140: 'str',
  146: 'lvctr',
  148: 'lpepr',
};

const ACTIVITY_SECTOR_MAP: Record<string, string> = {
  '1': 'Accountant', '2': 'Bank', '3': 'Caisse populaire', '4': 'Crown agent',
  '5': 'Casino', '6': 'Co-op credit society', '9': 'Life insurance broker/agent',
  '10': 'Life insurance company', '11': 'Money services business', '12': 'Provincial savings office',
  '13': 'Real estate', '14': 'Credit union', '15': 'Securities dealer',
  '16': 'Trust and/or loan company', '17': 'BC notary', '18': 'DPMS',
  '19': 'Credit union central', '20': 'Financial services cooperative',
  '21': 'Foreign MSB', '22': 'Mortgage administrators', '23': 'Armoured Cars',
  '24': 'Mortgage brokers', '25': 'Mortgage lenders', '26': 'Factor',
  '27': 'Financing or Leasing Entities',
};

function normalizeAggregation(report: any, rd: any) {
  const source = rd.twentyFourHourRule || rd.aggregation || report.twentyFourHourRule || report.aggregation || null;
  const isAggregated = !!source || rd.isAggregated === true || report.isAggregated === true;

  return {
    is_aggregated: isAggregated,
    type_code: source?.aggregationTypeCode || source?.typeCode || source?.type_code || source?.aggregation_type || null,
    period_start: source?.periodStart || source?.period_start || source?.startDateTime || source?.start_date_time || null,
    period_end: source?.periodEnd || source?.period_end || source?.endDateTime || source?.end_date_time || null,
  };
}

function buildDefinitionsMap(definitions: any[]): Record<string, any> {
  if (!definitions || definitions.length === 0) return {};
  const map: Record<string, any> = {};
  for (const def of definitions) {
    if (def.refId) map[def.refId] = def;
  }
  return map;
}

function resolveParty(ref: any, defsMap: Record<string, any>): any {
  if (!ref) return null;
  // Resolve from definitions map using refId
  const resolved = ref.refId ? { ...defsMap[ref.refId], ...ref } : ref;
  if (!resolved) return null;

  const isEntity = !!resolved.nameOfEntity;
  // Account info can live in the ref's details.accounts or at the definition level
  const accounts = ref.details?.accounts || resolved.accounts || [];
  const firstAccount = accounts[0];

  return {
    type: isEntity ? 'entity' : 'person',
    name: isEntity ? resolved.nameOfEntity : [resolved.givenName, resolved.surname].filter(Boolean).join(' '),
    address: resolved.address?.unstructured || [resolved.address?.streetAddress, resolved.address?.city, resolved.address?.provinceStateName, resolved.address?.countryCode].filter(Boolean).join(', ') || null,
    dob: resolved.dateOfBirth || null,
    occupation: resolved.occupation || null,
    nature_of_business: resolved.natureOfPrincipalBusiness || null,
    country_of_residence: resolved.countryOfResidenceCode || null,
    phone: resolved.telephoneNumber || null,
    email: resolved.emailAddress || null,
    client_number: ref.details?.clientNumber || resolved.clientNumber || null,
    incorporation_info: resolved.registrationsIncorporations?.[0]?.number || null,
    identification: resolved.identifications?.[0] ? {
      type: resolved.identifications[0].identifierTypeCode || null,
      number: resolved.identifications[0].number || null,
      jurisdiction: resolved.identifications[0].jurisdictionOfIssueCountryCode || null,
      province: resolved.identifications[0].jurisdictionOfIssueProvinceStateCode || null,
    } : null,
    account: firstAccount ? {
      number: firstAccount.referenceNumber || firstAccount.number || null,
      type: firstAccount.typeCode || null,
      currency: firstAccount.currencyCode || null,
      fi_number: firstAccount.financialInstitutionNumber || null,
      branch_number: firstAccount.branchNumber || null,
    } : null,
    authorized_persons: resolved.authorizedPersons || null,
    on_behalf_of_indicator: ref.details?.onBehalfOfIndicator || false,
  };
}

function buildOnBehalfOf(obos: any[], defsMap: Record<string, any>): any[] {
  if (!obos || obos.length === 0) return [];
  return obos.map(o => {
    const resolved = o.refId ? defsMap[o.refId] : o;
    return {
      name: resolved?.nameOfEntity || [resolved?.givenName, resolved?.surname].filter(Boolean).join(' ') || o.entityBasicDetails?.nameOfEntity || [o.personBasicDetails?.givenName, o.personBasicDetails?.surname].filter(Boolean).join(' ') || null,
      relationship: o.details?.relationshipWithRequesterCode || o.details?.relationshipWithBeneficiaryCode || null,
      address: resolved?.address?.unstructured || o.entityBasicDetails?.address?.unstructured || o.personBasicDetails?.address?.unstructured || null,
    };
  });
}

export function ReportUploadDialog({ open, onOpenChange, engagementId, reviewId, onReportsCreated }: ReportUploadDialogProps) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const acceptedFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/json', 'text/plain', 'text/json', 'text/csv'];

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }, []);
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) addFiles(Array.from(e.target.files)); }, []);

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(f => {
      const isValid = acceptedFileTypes.includes(f.type) || f.name.endsWith('.json') || f.name.endsWith('.txt') || f.name.endsWith('.csv');
      if (!isValid) toast({ title: 'Invalid file type', description: `${f.name} is not supported.`, variant: 'destructive' });
      return isValid;
    });
    setFiles(prev => [...prev, ...validFiles.map(file => ({ file, status: 'idle' as UploadStatus, progress: 0 }))]);
  };

  const parseCSVFile = async (file: File): Promise<ParsedReport[]> => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error('CSV is empty or has no data rows');

    const splitCSV = (line: string): string[] => {
      const out: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
        else cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim());
    };

    const headers = splitCSV(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = splitCSV(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return obj;
    });

    // Infer report type from filename
    const fname = file.name.toLowerCase();
    let inferredType: 'lctr' | 'eftr' | 'str' | 'lvctr' | 'lpepr' = 'lvctr';
    if (fname.includes('lctr')) inferredType = 'lctr';
    else if (fname.includes('eftr')) inferredType = 'eftr';
    else if (fname.includes('str')) inferredType = 'str';
    else if (fname.includes('lpepr')) inferredType = 'lpepr';
    else if (fname.includes('lvctr')) inferredType = 'lvctr';

    const pick = (row: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) {
        const nk = k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (row[nk] !== undefined && row[nk] !== '') return row[nk];
      }
      return null;
    };
    const toBool = (v: any) => v == null ? null : ['true', 'yes', 'y', '1'].includes(String(v).toLowerCase());
    const toNum = (v: any) => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(/[, ]/g, '')); return isNaN(n) ? null : n; };

    // Detect "report" column containing JSON payloads (FINTRAC export style)
    const jsonCol = headers.find(h => ['report', 'report_json', 'payload', 'json'].includes(h));
    if (jsonCol && rows.some(r => r[jsonCol]?.trim().startsWith('{'))) {
      const out: ParsedReport[] = [];
      rows.forEach((r, idx) => {
        const raw = r[jsonCol]?.trim();
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          const reportsArray = parsed.reports || [parsed];
          for (const rep of reportsArray) {
            out.push(buildReportFromJSON(rep, `CSV row ${idx + 1} of ${file.name}`));
          }
        } catch (e) {
          console.warn(`Skipping CSV row ${idx + 1}: invalid JSON in "${jsonCol}" column`, e);
        }
      });
      if (out.length === 0) throw new Error('CSV had a JSON column but no valid report payloads parsed');
      return out;
    }

    const reports: ParsedReport[] = rows.map((row) => {
      const aggType = pick(row, 'aggregation_type', 'aggregationtype', 'twentyfourhourrule_type', 'aggregation type code');
      const aggStart = pick(row, 'aggregation_period_start', 'period_start', 'periodstart', 'start_date_time');
      const aggEnd = pick(row, 'aggregation_period_end', 'period_end', 'periodend', 'end_date_time');
      const isAgg = !!aggType || !!aggStart || toBool(pick(row, 'is_aggregated', 'aggregation_indicator')) === true;

      return {
        report_type: (pick(row, 'report_type', 'reporttype') as any) || inferredType,
        report_reference_id: pick(row, 'report_reference_id', 'reference_id', 'reporting_entity_report_reference', 'report_reference'),
        fintrac_submission_date: pick(row, 'fintrac_submission_date', 'submission_date', 'submitted_date'),
        transaction_date: pick(row, 'transaction_date', 'txn_date', 'date_of_transaction', 'date_time_of_transaction'),
        transaction_amount: toNum(pick(row, 'transaction_amount', 'amount', 'txn_amount')),
        transaction_currency: pick(row, 'transaction_currency', 'currency', 'currency_code') || 'CAD',
        filing_method: 'batch',
        is_aggregated: isAgg,
        aggregation_type: aggType,
        aggregation_period_start: aggStart,
        aggregation_period_end: aggEnd,
        header_reporting_entity: !!pick(row, 'reporting_entity_number', 'reporting_entity_name'),
        header_submission_timestamp: !!pick(row, 'fintrac_submission_date', 'submission_date'),
        header_report_reference: !!pick(row, 'report_reference_id', 'reference_id'),
        activity_sector_code: !!pick(row, 'activity_sector_code', 'activity_sector'),
        eft_direction: !!pick(row, 'eft_direction', 'eft_direction_code'),
        ministerial_directive: !!pick(row, 'ministerial_directive', 'ministerial_directive_code'),
        submitting_re_number: !!pick(row, 'submitting_re_number', 'submitting_reporting_entity_number'),
        txn_amount: !!pick(row, 'transaction_amount', 'amount'),
        txn_currency: !!pick(row, 'transaction_currency', 'currency'),
        txn_date_time: !!pick(row, 'transaction_date', 'date_time_of_transaction'),
        txn_aggregation_indicator: isAgg,
        txn_aggregation_type: isAgg ? !!aggType : null,
        txn_aggregation_period_start: isAgg ? !!aggStart : null,
        txn_aggregation_period_end: isAgg ? !!aggEnd : null,
        client_name: !!pick(row, 'client_name', 'requester_name'),
        client_address: !!pick(row, 'client_address', 'requester_address'),
        client_dob: !!pick(row, 'client_dob', 'date_of_birth'),
        client_occupation: !!pick(row, 'client_occupation', 'occupation'),
        requester_account: !!pick(row, 'requester_account', 'account_number'),
        requester_identification: !!pick(row, 'requester_identification', 'identification_number'),
        authorized_persons: !!pick(row, 'authorized_persons'),
        on_behalf_of_requester: toBool(pick(row, 'on_behalf_of_requester', 'on_behalf_of_indicator')),
        beneficiary_name: !!pick(row, 'beneficiary_name'),
        beneficiary_address: !!pick(row, 'beneficiary_address'),
        beneficiary_account_wallet: !!pick(row, 'beneficiary_account', 'beneficiary_wallet'),
        beneficiary_identification: !!pick(row, 'beneficiary_identification'),
        on_behalf_of_beneficiary: toBool(pick(row, 'on_behalf_of_beneficiary')),
        third_party_indicator: toBool(pick(row, 'third_party_indicator')),
        exchange_rate: !!pick(row, 'exchange_rate'),
        str_narrative: inferredType === 'str' ? !!pick(row, 'str_narrative', 'narrative') : null,
        vc_identifiers: inferredType === 'lvctr' ? !!pick(row, 'vc_identifiers', 'wallet_address', 'virtual_currency_address') : null,
        parsed_json: { source: 'csv', filename: file.name, row },
        manual_notes: `Auto-imported from CSV: ${file.name}`,
      } as ParsedReport;
    });

    return reports;
  };

  const buildReportFromJSON = (report: any, sourceLabel: string): ParsedReport => {
    const rd = report.reportDetails || report;
    const reportType = REPORT_TYPE_CODES[rd.reportTypeCode] || 'eftr';
    const transactions = report.transactions || [];

    const reportHeader = {
      reporting_entity_name: rd.reportingEntityName || null,
      reporting_entity_number: rd.reportingEntityNumber || null,
      submitting_re_number: rd.submittingReportingEntityNumber || null,
      activity_sector: ACTIVITY_SECTOR_MAP[String(rd.activitySectorCode)] || rd.activitySectorCode || null,
      eft_direction: rd.eftDirectionCode === 1 ? 'Initiation' : rd.eftDirectionCode === 2 ? 'Final Receipt' : null,
      ministerial_directive: rd.ministerialDirectiveCode || null,
      report_reference: rd.reportingEntityReportReference || null,
    };

    const aggregation = normalizeAggregation(report, rd);
    const defsMap = buildDefinitionsMap(report.definitions);
    const parsedTransactions: any[] = [];

    for (const txn of transactions) {
      const sa = txn.startingActions?.[0];
      const ca = txn.completingActions?.[0];
      const requesterRef = sa?.requesters?.[0] || sa?.conductors?.[0];
      const beneficiaryRef = ca?.beneficiaries?.[0];

      const txnDetails = txn.electronicFundsTransactionDetails || txn.largeCashTransactionDetails || txn.suspiciousTransactionDetails || txn.largeVirtualCurrencyTransactionDetails || txn.virtualCurrencyTransactionDetails || {};
      const dateTime = txnDetails.dateTimeOfTransaction || txnDetails.dateOfTransaction || txnDetails.dateTimeReceived || txn.dateTimeOfTransaction || txn.dateOfTransaction || null;

      const initiator = txn.initiator?.refId ? defsMap[txn.initiator.refId] : null;
      const receiver = txn.receiver?.refId ? defsMap[txn.receiver.refId] : null;

      const vcIds = txnDetails.ids || sa?.details?.sendingVirtualCurrencyAddresses || ca?.details?.receivingVirtualCurrencyAddresses || null;

      parsedTransactions.push({
        transaction_number: parsedTransactions.length + 1,
        amount: sa?.details?.amount ? parseFloat(sa.details.amount) : null,
        currency: sa?.details?.currencyCode || sa?.details?.virtualCurrencyTypeCode || 'CAD',
        date_time: dateTime,
        reference_number: txnDetails.reportingEntityTransactionReference || txn.transactionReferenceNumber || null,
        exchange_rate: ca?.details?.exchangeRate || sa?.details?.exchangeRate || null,
        exchange_rate_source: ca?.details?.exchangeRateSource || null,
        threshold_indicator: txnDetails.thresholdIndicator ?? null,
        disposition_code: ca?.details?.dispositionCode || null,
        completing_amount: ca?.details?.amount ? parseFloat(ca.details.amount) : null,
        completing_currency: ca?.details?.currencyCode || ca?.details?.virtualCurrencyTypeCode || null,
        vc_identifiers: vcIds,
        initiator: initiator ? { name: initiator.nameOfEntity || [initiator.givenName, initiator.surname].filter(Boolean).join(' '), location: txn.initiator?.details?.reportingEntityLocation?.id || null } : null,
        receiver: receiver ? { name: receiver.nameOfEntity || [receiver.givenName, receiver.surname].filter(Boolean).join(' '), address: receiver.address?.unstructured || null } : null,
        starting_action: {
          requester: resolveParty(requesterRef, defsMap),
          on_behalf_of: buildOnBehalfOf(requesterRef?.onBehalfOfs, defsMap),
        },
        completing_action: {
          beneficiary: resolveParty(beneficiaryRef, defsMap),
          on_behalf_of: buildOnBehalfOf(beneficiaryRef?.onBehalfOfs, defsMap),
        },
      });
    }

    const firstTxn = parsedTransactions[0];
    return {
      report_type: reportType,
      report_reference_id: rd.reportingEntityReportReference || null,
      fintrac_submission_date: rd.submissionDate || rd.submittedDate || null,
      transaction_date: firstTxn?.date_time?.split('T')[0] || null,
      transaction_amount: firstTxn?.amount || null,
      transaction_currency: firstTxn?.currency || 'CAD',
      filing_method: 'batch',
      is_aggregated: !!aggregation.is_aggregated,
      aggregation_type: aggregation.type_code || null,
      aggregation_period_start: aggregation.period_start || null,
      aggregation_period_end: aggregation.period_end || null,
      header_reporting_entity: !!rd.reportingEntityNumber,
      header_submission_timestamp: !!rd.twentyFourHourRule?.periodStart,
      header_report_reference: !!rd.reportingEntityReportReference,
      activity_sector_code: !!rd.activitySectorCode,
      eft_direction: !!rd.eftDirectionCode,
      ministerial_directive: !!rd.ministerialDirectiveCode,
      submitting_re_number: !!rd.submittingReportingEntityNumber,
      txn_amount: !!firstTxn?.amount,
      txn_currency: !!firstTxn?.currency,
      txn_date_time: !!firstTxn?.date_time,
      txn_aggregation_indicator: !!aggregation.is_aggregated,
      txn_aggregation_type: aggregation.is_aggregated ? !!aggregation.type_code : null,
      txn_aggregation_period_start: aggregation.is_aggregated ? !!aggregation.period_start : null,
      txn_aggregation_period_end: aggregation.is_aggregated ? !!aggregation.period_end : null,
      client_name: !!firstTxn?.starting_action?.requester?.name,
      client_address: !!firstTxn?.starting_action?.requester?.address,
      client_dob: !!firstTxn?.starting_action?.requester?.dob,
      client_occupation: !!firstTxn?.starting_action?.requester?.occupation,
      requester_account: !!firstTxn?.starting_action?.requester?.account,
      requester_identification: !!firstTxn?.starting_action?.requester?.identification,
      authorized_persons: !!firstTxn?.starting_action?.requester?.authorized_persons?.length,
      on_behalf_of_requester: firstTxn?.starting_action?.on_behalf_of?.length > 0,
      beneficiary_name: !!firstTxn?.completing_action?.beneficiary?.name,
      beneficiary_address: !!firstTxn?.completing_action?.beneficiary?.address,
      beneficiary_account_wallet: !!firstTxn?.completing_action?.beneficiary?.account,
      beneficiary_identification: !!firstTxn?.completing_action?.beneficiary?.identification,
      on_behalf_of_beneficiary: firstTxn?.completing_action?.on_behalf_of?.length > 0,
      third_party_indicator: firstTxn?.starting_action?.on_behalf_of?.length > 0 || firstTxn?.completing_action?.on_behalf_of?.length > 0,
      exchange_rate: !!firstTxn?.exchange_rate,
      str_narrative: reportType === 'str' ? !!report.suspicionDetails?.narrative : null,
      vc_identifiers: reportType === 'lvctr' ? !!firstTxn?.vc_identifiers : null,
      parsed_json: {
        __source_type: sourceLabel.toLowerCase().includes('json') ? 'json' : sourceLabel.toLowerCase().includes('pdf') ? 'pdf' : 'csv',
        __source_label: sourceLabel,
        report_header: reportHeader,
        aggregation,
        transactions: parsedTransactions,
      },
      manual_notes: `Auto-imported from ${sourceLabel}`,
    };
  };

  const parseJSONFile = async (file: File): Promise<ParsedReport[]> => {
    const text = await file.text();
    let jsonData: any;
    try { jsonData = JSON.parse(text); } catch { throw new Error('Invalid JSON format'); }
    const reportsArray = jsonData.reports || [jsonData];
    return reportsArray.map((r: any) => buildReportFromJSON(r, `JSON batch file: ${file.name}`));
  };

  const parsePDFFile = async (file: File): Promise<ParsedReport[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    const { data, error } = await supabase.functions.invoke('parse-fintrac-report', {
      body: { fileData: base64, fileName: file.name, fileType: file.type },
    });
    if (error) throw new Error(error.message || 'Failed to parse PDF');
    return data.reports || [];
  };

  const processFile = async (index: number) => {
    const fileState = files[index];
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'uploading', progress: 20 } : f));
    try {
      const isCSV = fileState.file.type === 'text/csv' || fileState.file.name.toLowerCase().endsWith('.csv');
      const isJSON = !isCSV && (fileState.file.type === 'application/json' || fileState.file.type === 'text/json' || fileState.file.name.endsWith('.json') || fileState.file.name.endsWith('.txt'));
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'parsing', progress: 50 } : f));
      const reports = isCSV ? await parseCSVFile(fileState.file) : isJSON ? await parseJSONFile(fileState.file) : await parsePDFFile(fileState.file);
      const sourceType = isCSV ? 'csv' : isJSON ? 'json' : 'pdf';
      reports.forEach(r => {
        if (!r.parsed_json) r.parsed_json = {};
        if (!r.parsed_json.__source_type) r.parsed_json.__source_type = sourceType;
        if (!r.parsed_json.__source_label) r.parsed_json.__source_label = fileState.file.name;
      });
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'complete', progress: 100, result: reports } : f));
      return reports;
    } catch (error: any) {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'error', error: error.message } : f));
      return [];
    }
  };

  const processAllFiles = async () => {
    const allReports: ParsedReport[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'idle') {
        const reports = await processFile(i);
        allReports.push(...reports);
      }
    }
    if (allReports.length > 0) {
      const typeBreakdown = allReports.reduce((acc: Record<string, number>, r) => {
        acc[r.report_type] = (acc[r.report_type] || 0) + 1;
        return acc;
      }, {});
      console.log('[ReportUpload] Parsed reports by type:', typeBreakdown, allReports);
      onReportsCreated(allReports);
      // NOTE: Do not show success here – the actual DB insert + per-type filter
      // happens in the parent (handleReportsImported), which shows the final toast.
    } else {
      toast({ title: 'No reports parsed', description: 'No report data could be extracted from the selected file(s).', variant: 'destructive' });
    }
  };

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return <FileText className="w-5 h-5 text-destructive" />;
    if (file.type.startsWith('image/')) return <FileText className="w-5 h-5 text-primary" />;
    return <File className="w-5 h-5 text-accent-foreground" />;
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'uploading': case 'parsing': return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'complete': return <CheckCircle className="w-4 h-4 text-accent-foreground" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  const hasIdleFiles = files.some(f => f.status === 'idle');
  const isProcessing = files.some(f => f.status === 'uploading' || f.status === 'parsing');
  const totalReports = files.reduce((sum, f) => sum + (f.result?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload FINTRAC Reports</DialogTitle>
          <DialogDescription>
            Upload PDF, JPEG, PNG files for AI-assisted review, or JSON/TXT files for batch import.
            Reports will be automatically parsed with starting/completing action details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          >
            <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Drag and drop files here, or click to browse</p>
            <input type="file" id="file-upload" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.json,.txt,.csv" onChange={handleFileSelect} />
            <Button variant="outline" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">Select Files</label>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Supported: PDF, JPEG, PNG, JSON, CSV, TXT</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((fileState, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {getFileIcon(fileState.file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileState.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {(fileState.status === 'uploading' || fileState.status === 'parsing') ? (
                        <Progress value={fileState.progress} className="h-1 flex-1" />
                      ) : fileState.status === 'complete' ? (
                        <span className="text-xs text-accent-foreground">{fileState.result?.length || 0} report(s) parsed</span>
                      ) : fileState.status === 'error' ? (
                        <span className="text-xs text-destructive">{fileState.error}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ready to process</span>
                      )}
                    </div>
                  </div>
                  {getStatusIcon(fileState.status)}
                  {fileState.status !== 'uploading' && fileState.status !== 'parsing' && (
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)} title="Remove">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalReports > 0 && (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>{totalReports} report(s) ready to be imported into your review.</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={processAllFiles} disabled={!hasIdleFiles || isProcessing}>
              {isProcessing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>) : (<><Upload className="w-4 h-4 mr-2" />Process & Import</>)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
