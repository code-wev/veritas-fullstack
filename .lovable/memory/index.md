# Memory: index.md
Updated: just now

# Project Memory

## Core
- Platform: C&G Veritas AML Platform. Canadian FINTRAC & Revenu Quebec compliance context.
- Hierarchy: Clients -> Engagements -> Workpapers. Multi-tenancy via Supabase RLS.
- Access: Users only access explicitly assigned clients. Email/Password auth.
- Roles: Administrator, Partner, Lead Consultant, Manager, Analyst.
- Style: 'Big 4' professional, Navy/slate/deep green, 0.375rem radius, cv02/cv03 fonts.
- Layout: Top nav (Client/Engagement switchers), persistent sidebar, sticky nav footer.
- Audit integrity: Auto-flags or detected changes require mandatory analyst commentary.
- Findings: All deficiencies flow to central register with trace to evidence/workpapers.

## Memories
- [Hierarchy](mem://architecture/hierarchy) — Data multi-tenancy: Clients -> Engagements -> Workpapers
- [Security Model](mem://architecture/security-model) — Supabase RLS enforcing Client/Engagement access
- [Navigation Pattern](mem://ui/navigation-pattern) — QuickBooks-style top nav and persistent sidebar
- [Roles & Permissions](mem://auth/roles-and-permissions) — RBAC definitions across 4 main tier roles
- [Audit Workflow](mem://features/audit-workflow) — Findings severity, review locking, and audit logging
- [File Management](mem://features/file-management) — Central Vault and Module Attachments strategy
- [Branding](mem://style/branding) — Corporate color palette, radius, and typography specs
- [Permissions](mem://auth/permissions) — Client creation restrictions and auto-assignment
- [Client Categories](mem://domain/client-categories) — 17 FINTRAC reporting entity classifications
- [Transaction Reporting](mem://features/transaction-reporting) — LCTR, EFTR, STR testing workflows and AI extraction
- [Transaction Reporting Nested Structure](mem://features/transaction-reporting-nested-structure) — Nested parsed_json with starting/completing actions, multi-txn selector, 10 new FINTRAC fields
- [MSB Registration](mem://features/msb-registration-workflow) — 9-item FINTRAC audit checklist and change detection
- [Revenu Québec MSB](mem://features/msb-revenu-quebec-workflow) — Québec nexus triage gate, limited registry fields, conditional sections
- [Audit Integrity](mem://features/audit-integrity) — Mandatory commentary completion rules for auto-flags
- [Governance Review](mem://features/governance-review) — 6-submodule interview framework with auto-flags
- [P&P Review](mem://features/aml-program/policies-and-procedures) — 5-step audit workflow for Policies and Procedures
- [AML Program Overview](mem://features/aml-program/overview) — 4 primary components of AML Program review
- [Risk Assessment](mem://features/aml-program/risk-assessment) — 3-mode audit depth with 9-section wizard
- [Training Review](mem://features/aml-program/training-review) — Training framework governance and evaluation
- [KYC Review](mem://features/kyc-review) — Unified sampling and dynamic field requirements
- [Findings Register](mem://features/findings-register) — Centralized issue register with severity governance
- [Audit Report](mem://features/audit-report) — 9-pillar regulatory structure and auto-generation
- [Audit Report Governance](mem://features/audit-report/governance) — Field locking and narrative restrictions
- [Management Responses](mem://features/audit-report/management-responses) — Post-audit remediation tracking
- [Report Permissions](mem://features/audit-report/permissions) — Role-based access for report drafting and sign-off
- [Layout Management](mem://architecture/layout-management) — Conditional global layout bypass for specific routes
- [Client Selection Landing](mem://features/client-selection-landing) — Isolated entry page for explicit client workspace selection
- [Admin Management](mem://features/admin-management) — User roles, client assignment, and system settings
- [Inspection Interface](mem://features/transaction-reporting/inspection-interface) — Split-panel for report source visualization and testing
- [Navigation Footer](mem://ui/navigation-footer) — Unified sticky save/next footer for complex audit workflows
