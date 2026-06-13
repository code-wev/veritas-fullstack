---
name: Revenu Québec Nexus Triage
description: Quebec-specific MSB workflow with nexus triage gate, limited registry fields, and conditional audit sections
type: feature
---
The Revenu Québec MSB review starts with a mandatory **Québec Nexus Triage** gate (3 questions): physical presence in QC, serves Québec-ID/Québec-address clients, and targets Québec residents. Per business rule, only physical presence OR Québec-ID clients establish nexus; targeting alone is informational.

**Branching outcomes:**
- **No nexus** (both nexus-triggering answers = No): Lock Registration Details / Status Validation / Change Detection. Only Findings & Observations remains accessible to document the conclusion.
- **Nexus + not registered with RQ**: Auto-creates a "complete non-compliance" finding `qc-registration-gap:{registrationId}` citing the Money-Services Businesses Act (Québec). Full audit unlocked.
- **Nexus + registered**: Full audit unlocked, no auto-finding.

**Quebec-specific Registration Details** (`QuebecRegistrationDetailsSection`) replaces the FINTRAC field set with the limited Revenu Québec registry fields: Name, Licence Number, Address, Other Names, Authorized Class of Services (6 options matching the registry: Currency exchange, Funds transfer, Issuing/redeeming traveller's cheques, Cheque cashing, ATM operation, Cryptoasset ATM operation), Mandataries, Branches, ATMs, Cryptoasset ATMs.

**Database**: `msb_quebec_nexus_triage` table (one-per-registration) stores triage answers and `is_registered_with_rq`. New columns on `msb_registrations`: `qc_licence_number`, `qc_other_names[]`, `qc_authorized_services[]`, `qc_mandataries`, `qc_branches`, `qc_atms`, `qc_crypto_atms`.

FINTRAC workflow is unchanged and continues to use the original `RegistrationDetailsSection` with the full federal field set.
