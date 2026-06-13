---
name: Transaction Reporting nested preview structure
description: FINTRAC report preview uses nested parsed_json with report_header, aggregation, and transactions[] containing starting_action (requester + on_behalf_of) and completing_action (beneficiary + on_behalf_of). Multi-transaction selector when >1 transaction.
type: feature
---

The Transaction Reporting module preview panel (`ReportPreviewPanel.tsx`) renders FINTRAC reports using a nested JSON structure stored in `parsed_json`:

```
parsed_json = {
  report_header: { reporting_entity_name, reporting_entity_number, submitting_re_number, activity_sector, eft_direction, ministerial_directive, report_reference },
  aggregation: { is_aggregated, type_code, period_start, period_end },
  transactions: [{
    amount, currency, date_time, reference_number, exchange_rate,
    starting_action: {
      requester: { type, name, address, dob, occupation, identification, account, authorized_persons },
      on_behalf_of: [{ name, relationship, address }]
    },
    completing_action: {
      beneficiary: { type, name, address, identification, account, authorized_persons },
      on_behalf_of: [{ name, relationship, address }]
    }
  }]
}
```

Completeness test fields include 10 new FINTRAC validation-derived boolean columns:
activity_sector_code, eft_direction, ministerial_directive, submitting_re_number,
on_behalf_of_requester, on_behalf_of_beneficiary, requester_account,
requester_identification, beneficiary_identification, authorized_persons.

Fields marked (M) = mandatory (High severity if missing), (RM) = reasonable measures (Medium severity).
The checklist is report-level (not per-transaction) — analyst reviews all transactions in preview but fills one checklist.
Applied to all 5 report types: LCTR, EFTR, STR, LVCTR, LPEPR.
