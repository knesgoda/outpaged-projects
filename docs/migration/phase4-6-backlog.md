# Phase 4–6 Backlog Tracker

The following tables capture the Phase 4, Phase 5, and Phase 6 backlog items for the OutPaged production migration. Each entry mirrors the product requirements supplied by the stakeholder request so work can be planned and cross-referenced quickly.

## Phase 4

| ID | Title | Description | Acceptance Criteria | Team | Priority |
| --- | --- | --- | --- | --- | --- |
| OP-INC-001 | Incident Entity & Severity Ladder | As Operations, I want incidents with severities (Sev1–Sev4) so we can classify and route response. | Create Incident with title/desc/severity/affected services; Default SLA by severity applied; Incident states: Open → Mitigated → Monitoring → Resolved. | Operations | P1 |
| OP-INC-002 | On-Call Rotation & Paging | As Operations, I want on-call schedules and paging so Sev1 alerts reach the right engineer. | Admin can define rotations and time windows; Sev1 creates page to active on-call; Audit log shows who was paged and when. | Operations | P1 |
| OP-INC-003 | Incident Workspace (War Room) | As Operations, I want an incident workspace so cross-team collaboration is organized. | On incident Open: create workspace with timeline, tasks, links; Add responders; All actions timestamped in incident timeline. | Operations | P1 |
| OP-INC-004 | Postmortem Template & Actions | As Operations, I want a postmortem template to capture learnings and action items. | On Resolved: prompt to create Postmortem doc; Required fields: impact, root cause, corrective actions; Action items auto-created and linked. | Operations | P1 |
| OP-CHG-001 | Change Request Workflow | As Operations, I want a change workflow (Draft → Review → Approved → Implementing → Validated → Done) with gates. | Risk, Impact, Backout Plan required before Approved; Named approver recorded; Implementing blocked without approved state. | Operations | P1 |
| OP-CHG-002 | Change Calendar & Freeze Windows | As Operations, I want a change calendar and freeze windows to avoid risky deployments. | Calendar shows scheduled changes; Freeze windows block Approved→Implementing unless override by Admin; Conflicts flagged. | Operations | P2 |
| OP-SRV-001 | Service Registry & Ownership | As a Platform Lead, I want a service catalog with owners so incidents map to responsible teams. | Create Service with name, team owner, runbook link, tier; Items can link to Services; Ownership appears on incidents and changes. | Platform | P1 |
| OP-SRV-002 | Runbooks & Checklists | As Engineers, we want runbooks attached to services/incidents for faster resolution. | Attach runbooks (links/files) to Services; Incident shows relevant runbooks; Checklists can be marked complete and logged. | Platform | P2 |
| OP-DEP-001 | Dependency Graph View | As a Planner, I want a dependency graph so I can see cross-item dependencies visually. | Graph nodes = items/epics, edges = depends-on; Zoom, pan, filter by team/status; Clickthrough opens item. | Frontend | P1 |
| OP-DEP-002 | Impact Analysis (“What Breaks If This Slips”) | As a PM, I want to know downstream impact when a dependency slips. | Adjusting a date shows impacted items and delay estimate; Critical paths highlighted; Export impact list (CSV). | Frontend | P2 |
| OP-SLA-001 | Business Hour Calendars & Escalations | As Operations, I want SLA timers that respect business hours and escalate on breach. | Define business calendars; SLA pauses on specified states; Near-breach and breach escalate via notifications to on-call and leads. | Operations | P1 |
| OP-SEARCH-002 | Saved Searches & Sharing | As a power user, I want to save and share advanced queries. | Save query with name/visibility; Share link reproduces filters; Permission-aware visibility. | Frontend | P2 |
| OP-OPS-004 | Ops Dashboard | As Leadership, I want an Ops dashboard for MTTA/MTTR, SLA trends, change success rate. | Widgets show MTTA, MTTR, SLA compliance %, change failure rate; Time range filters; Export PNG/CSV. | Frontend | P2 |

## Phase 5

| ID | Title | Description | Acceptance Criteria | Team | Priority |
| --- | --- | --- | --- | --- | --- |
| OP-DOC-001 | Docs Editor with Templates | As a PM, I want a docs editor with PRD/RFC templates so specs live with work. | Create doc with rich text, headings, tables; Start from PRD/RFC templates; Autosave; Permission-aware sharing. | Frontend | P1 |
| OP-DOC-002 | Status Chips & Field Bindings in Docs | As a PM, I want live item chips and bound fields inside docs. | Insert item chip showing ID/status/assignee; Bind fields (e.g., due date) to items; Chips update live when items change. | Frontend | P1 |
| OP-DOC-003 | Doc Change Tracking & Approvals | As a Lead, I want tracked changes and approvals on docs. | Track insert/delete with author and timestamp; Request approval from reviewers; Doc cannot be marked Final without required approvals. | Frontend | P1 |
| OP-PORT-001 | Portfolio Dashboard & Initiative Health | As Leadership, I want a portfolio view to track initiative health and progress. | Initiatives with health (G/A/R), progress %, budget vs plan (optional); Drill-down to epics; Save/share views. | Frontend | P1 |
| OP-PORT-002 | Dependency Risk Heatmap | As Leadership, I want a heatmap of cross-team dependency risk. | Grid by team x team shows count/severity of blocking dependencies; Click reveals list; Export CSV. | Frontend | P2 |
| OP-OKR-001 | OKRs Linked to Work | As Leadership, I want OKRs connected to initiatives and items. | Create Objectives and KRs; Link KRs to epics/items; Rollup progress to Objective; Quarterly view and check-ins. | Frontend | P2 |
| OP-IMP-001 | CSV Importer Wizard | As an Admin, I want to import items from CSV with mapping and validation. | Upload CSV; Map columns to fields; Validate and preview; Import in batches with error report. | Admin | P1 |
| OP-IMP-002 | Jira Import (Projects/Issues/Sprints) | As an Admin, I want to import from Jira to accelerate migration. | OAuth/API or CSV; Map issue types/fields/statuses; Preserve comments/attachments when possible; Dry-run preview. | Admin | P1 |
| OP-IMP-003 | Monday Import (Boards/Groups/Items) | As an Admin, I want to import from Monday boards into projects. | API token; Map columns to fields; Convert groups to statuses or tags; Preview before import. | Admin | P2 |
| OP-EXP-001 | Exports & API Tokens | As a Data Analyst, I want CSV/JSON exports and personal API tokens. | Export current view to CSV/JSON; Create/revoke API tokens; All exports audited. | Platform | P1 |
| OP-DIG-001 | Executive Digest v2 (Email/Slack) | As Leadership, I want weekly executive digests with key deltas and risks. | Schedule digest by portfolio/team; Include top risks, slips, releases; Delivered to email and Slack channel; Permission-aware. | Platform | P2 |
| OP-REP-001 | Portfolio Reports Pack | As Leadership, I want printable/exportable portfolio reports. | Generate PDF/PNG for roadmap snapshot, initiative status, dependency risk; Time-stamped and shareable. | Frontend | P2 |

## Phase 6

| ID | Title | Description | Acceptance Criteria | Team | Priority |
| --- | --- | --- | --- | --- | --- |
| OP-PERF-001 | 10k+ Item Performance Hardening | As a user, I want smooth lists and filters even with 10k+ items. | Virtualized lists; Indexed queries; Sub-second filter on common fields; Performance budget CI checks. | Platform | P1 |
| OP-PERF-002 | Query Caching & N+1 Guardrails | As a Platform engineer, I want caching and safeguards to avoid N+1 and slow queries. | Add server-side caching on heavy endpoints; Query analyzer warnings in CI; Telemetry for slow queries. | Platform | P2 |
| OP-BCK-001 | Daily Backups & Project-Level PITR | As an Admin, I want backups and point-in-time restore for a single project. | Automated daily backups; Request restore of a project to timestamp T; Admin UI to initiate restore; Audit of restores. | Admin | P1 |
| OP-REL-004 | Multi-Region Readiness | As an Admin, I want failover readiness to improve resilience. | Health checks; Replication strategy documented/validated; Runbook for failover drill; Status banner during failover. | Admin | P2 |
| OP-MOB-001 | Mobile Apps v1 (iOS/Android) Sign-In & Inbox | As a user, I want to sign in on mobile and see my notifications/inbox. | Google SSO; Notification list with deep links; Mark read; Push enabled via provider. | Mobile | P1 |
| OP-MOB-002 | Quick Approvals & Comments (Mobile) | As a user, I want to approve and comment from my phone. | Approve/Reject on approvals; Comment composer with mentions; Offline queue for pending actions. | Mobile | P1 |
| OP-OFF-001 | Offline Create & Comment (Web/Mobile) | As a user, I want to create items and comment offline and have them sync later. | Local queue persists across reload; Automatic retry on reconnect; Conflict resolution prompts. | Platform | P2 |
| OP-ADM-001 | Sandbox & Config Promotion | As an Admin, I want a sandbox and promotion pipeline for workflows/templates. | Create sandbox env; Edit workflows/templates; Promote to prod with diff/approval; Version history retained. | Admin | P1 |
| OP-TEMP-001 | Template Governance & Versioning | As a PMO, I want template versioning and publishing approvals. | Templates have versions, changelog, owners; Publishing requires approval; Projects can pin to specific version. | Admin | P2 |
| OP-SCIM-001 | SCIM Provisioning & Deprovisioning | As an Admin, I want automated user lifecycle with our IdP. | SCIM integration to create/update/deprovision users and teams; Deprovision revokes sessions within 1 minute. | Admin | P2 |
| OP-ANA-001 | Operational Metrics & SLO Dashboard | As Engineering, I want SLO dashboards for API/UI health. | Define SLOs (availability/latency/error rate); Display burn-rate alerts; Export incidents linked to SLO breaches. | Platform | P2 |
