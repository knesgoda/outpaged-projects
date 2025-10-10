# Outpaged Project Management Platform — Comprehensive Deep Dive & Delivery Blueprint

## 1. Exhaustive Codebase Inventory

### 1.1 Application shell and composition
- `src/App.tsx` layers the theme provider, TanStack Query client, auth/profile/workspace providers, telemetry, feature flagging, security, accessibility, Slack, releases, marketing, and other domain contexts before mounting routing, command palette, and keyboard shortcuts, evidencing a composable but client-heavy shell without SSR or progressive bootstrapping.【F:src/App.tsx†L2-L74】
- Routing is centralized in `src/routes.tsx`, which wraps the `AppLayout` inside an `ErrorBoundary` and Suspense fallback, then exposes a wide set of route components for inbox, projects, docs, time, help, admin, etc. Every view is rendered entirely client-side with no loader guards, workspace gating, or progressive data fetching.【F:src/routes.tsx†L1-L153】
- `AppLayout` manages responsive sidebar collapse, keyboard shortcuts (F1 to help, `?` to open shortcuts modal), and wraps content with badge/feedback providers, confirming a desktop-first shell lacking presence indicators, focus mode, or task-level overlays demanded by the vision.【F:src/components/layout/AppLayout.tsx†L1-L106】

### 1.2 Tenanting, domain SDK, and infrastructure
- Tenant context derives organization/workspace/space IDs from the workspace state and publishes `tenant.changed` events, but no persistence of org/workspace entities exists yet, so IDs are inferred from workspace slices instead of authoritative hierarchy objects.【F:src/domain/tenant.tsx†L1-L68】
- `DomainClient` scopes Supabase queries for workspace or organization tables and republishes domain events but only knows about a handful of tables, signalling an incomplete multi-tenant abstraction.【F:src/domain/client.ts†L1-L103】
- Supabase bootstrap stubs out functionality when environment variables are missing, falling back to a hard-coded project; there is no environment detection, service discovery, or queue/backfill integration yet.【F:src/integrations/supabase/client.ts†L1-L140】

### 1.3 Data services and hooks
- Project service implements CRUD with name sanitization, workspace scoping, and domain event publishing, yet only touches a single `projects` table and does not relate to workspaces, boards, epics, or audit entities called for by the spec.【F:src/services/projects.ts†L1-L203】
- React Query hook `useProjects` handles caching, optimistic updates, and telemetry measurement, showcasing strong client patterns but limited domain coverage (no rollups, dependencies, or advanced filters).【F:src/hooks/useProjects.ts†L1-L132】
- Task page manually queries Supabase for tasks with join to projects and separate fetches for assignees, constructing UI-only fields (tags, comments counters) without subitems, dependency states, or workflow enforcement.【F:src/pages/Tasks.tsx†L108-L198】
- Notification service supports listing, marking, archiving, and creating notifications via Supabase tables, but lacks batching, digests, or external channel delivery integration.【F:src/services/notifications.ts†L1-L120】
- Automation hook orchestrates CRUD against `automation_rules`, triggers, and actions tables with toasts, but there is no execution engine, scheduling, or audit trail for runs yet.【F:src/hooks/useAutomation.tsx†L1-L156】

### 1.4 Feature-specific UI modules
- Projects page presents cards with action menus, hooking into dialogs and navigation helpers but still operating on a flat project list (no workspace/space segmentation, epics, or components).【F:src/pages/Projects.tsx†L1-L118】
- Reports page attempts to compute task completions, blocked tasks, and time entries directly from Supabase, mixing analytics logic in the client and lacking reusable data marts, governance, or scheduling.【F:src/pages/Reports.tsx†L1-L104】
- Docs detail page loads markdown docs with versioning actions (snapshot, restore), providing a foundation for knowledge management yet missing collaborative presence, permissions, or knowledge base taxonomy.【F:src/pages/docs/DocDetail.tsx†L1-L120】
- Automation rule builder offers UI to configure triggers/actions, calling the hook to persist rules but without validation of conflicting rules, per-project scoping UI, or preview/testing facilities.【F:src/components/automation/AutomationRuleBuilder.tsx†L1-L112】
- Security provider derives permissions from workspace members using feature flags to determine security level, logging audit events to a client stub—no true policy enforcement, RLS integration, or compliance workflows are wired in.【F:src/components/security/SecurityProvider.tsx†L1-L172】

### 1.5 Collaboration, admin, and auxiliary systems
- Routing exposes inbox, notifications, help center, admin, and API explorer pages, yet underlying services (comments, approvals, audit logs, billing) are not implemented beyond placeholders, highlighting breadth without depth.【F:src/routes.tsx†L7-L147】
- The notification service is limited to a single table; there is no watchers/followers list or Slack/Teams bridging despite provider shells being present.【F:src/services/notifications.ts†L1-L116】
- Docs versioning and automation modules exist but operate synchronously against Supabase with minimal error handling, lacking background jobs or conflict resolution to support scale requirements.【F:src/pages/docs/DocDetail.tsx†L64-L118】【F:src/hooks/useAutomation.tsx†L61-L156】

## 2. Gap Synthesis Against the Product Vision

| Vision Pillar | Specification Expectations | Observed Implementation | Primary Gaps |
| --- | --- | --- | --- |
| Unified hierarchy (Org → Workspace → Project → Board → Item → Subitem) | Persistent entities for each level, navigation controls, tenant-aware services | Only implicit workspace context and standalone project/task tables surfaced; DomainClient scopes a few tables but no real hierarchy UI | Model full hierarchy tables, tenant routing, workspace/space switchers, board configs, subitems, dependencies |
| Dynamic fields & workflows | Formula/rollup/mirror columns, workflow designer, validators, post-functions | Static task fields with manual fetch; no workflow designer UI or dynamic field renderer | Build metadata-driven field registry, workflow engine, transition guards |
| Automation engine | Trigger-condition-action builder, execution worker, auditing | Rule builder + CRUD hooks but no processing engine or logs | Implement automation runtime, scheduler, logs, recipe library, rate governance |
| Agile/ITSM tooling | Backlog, sprint, capacity, SLAs, approvals | Kanban/table views only; no sprint entities, SLA timers, or approvals | Add sprint/backlog modules, capacity planning, SLA tracking, approval workflows |
| Collaboration & intake | Threaded comments, watchers, forms, routing rules | Notifications CRUD only; no comments/threads/forms/approvals | Ship comments service, watcher lists, form builder, routing + approvals engine |
| Reporting & analytics | Dashboards, KPI library, scheduled exports, BI builder | Reports page queries Supabase directly per request | Create analytics warehouse, dashboard widgets, scheduler, metric definitions |
| Portfolio & OKRs | Programs, roadmaps, OKR alignment, risk registers | Only Projects/Portfolio placeholders; no data model | Introduce programs, objectives, key results, risk management, scenario planning |
| Integrations | Git/CI/CD/Slack/Calendar/CRM connectors, imports, webhooks | Slack provider shell, GitHub/Google pages exist but no actual connectors or sync workers | Develop integration framework, OAuth flows, sync jobs, monitoring UI |
| Governance & security | Custom roles, field-level security, audit logs, compliance tooling | Security provider infers roles, audit client stub logs to console | Implement comprehensive RBAC, RLS policies, audit store, compliance dashboards |
| Performance & scale | Real-time sync, virtualization, background compute | Direct table queries and synchronous actions; no virtualization or background workers | Add WebSocket sync, virtualization, worker queues, sharding strategies |

## 3. Delivery Blueprint for Full Functionality

### Phase 0 – Platform Foundations (Sprints 1-3)
1. **Data model expansion**: Create Supabase migrations for organizations, workspaces, spaces, boards, board_views, items, subitems, dependencies, relations, components, workflows, workflow_states, workflow_transitions, dynamic_fields (with field types), field_values, automation_rules, automation_runs, approvals, forms, SLA policies, time_entries, budgets, programs, objectives, key_results, and audit_logs. Ensure each table enforces tenant scoping via RLS keyed on organization/workspace/space IDs derived from `TenantProvider` context.【F:src/domain/tenant.tsx†L37-L68】【F:src/domain/client.ts†L9-L60】
2. **Domain SDK refactor**: Extend `DomainClient` to auto-scope every new table, expose typed repositories per domain (projects, boards, items, etc.), and centralize telemetry and audit publishing instead of manual Supabase calls sprinkled in hooks/services.【F:src/services/projects.ts†L1-L203】【F:src/hooks/useProjects.ts†L1-L132】
3. **Eventing and audit**: Replace console-based auditing with a Supabase function/edge worker that persists structured events, triggered by domain client `publish` calls and workflow transitions. Integrate with `SecurityProvider` to record permission decisions.【F:src/components/security/SecurityProvider.tsx†L96-L172】
4. **Workspace/org navigation**: Implement workspace and space selectors in `AppLayout`, loading user memberships from the new hierarchy tables and persisting selection in URL + local storage for multi-tenant experiences.【F:src/components/layout/AppLayout.tsx†L24-L78】

### Phase 1 – Core Work Management (Sprints 4-8)
1. **Board & item experience**: Build board list per project/space with saved views (table, kanban, timeline, calendar). Use dynamic field metadata to render columns and filters. Introduce virtualization for large datasets and server-driven pagination.【F:src/pages/Projects.tsx†L1-L118】【F:src/pages/Tasks.tsx†L108-L198】
2. **Item detail & subitems**: Create detail drawer modals with tabs for activity, checklist subitems, dependencies, relations, and time tracking. Wire watchers/followers, attachments, and doc linking via domain SDK.
3. **Workflow engine**: Deliver a visual designer for state machines per item type, storing transitions/post-functions/validators. Update task actions and Kanban drag handlers to invoke transition endpoints that validate required fields and trigger automations.【F:src/components/automation/AutomationRuleBuilder.tsx†L1-L112】
4. **Collaboration baseline**: Implement comments with threads, mentions, emoji reactions, and internal/private toggles. Integrate watchers and notifications service to emit events for comment/activity updates.【F:src/services/notifications.ts†L1-L120】

### Phase 2 – Agile, ITSM, and Operations (Sprints 9-14)
1. **Agile tooling**: Add backlog grooming view (ranking, bulk edit), sprint planning with capacity per user/team, and sprint board showing burn-down/burn-up charts from aggregated time/point data. Persist sprint velocity history for forecasting.
2. **ITSM/SLA**: Model incidents, problems, changes, and requests with SLA policies. Build form-driven intake and SLA timers (pause/resume on status) running in edge workers with escalation notifications.
3. **Time & budgets**: Implement timers, manual time entries, approvals, billable vs non-billable rates, budget caps, and alerts. Extend reports to show time/budget variance per project/component.
4. **Resource management**: Provide workload heatmap view aggregating assignments across projects with PTO calendars, skill tags, and overallocation warnings, plus “what-if” reassignment recommendations.

### Phase 3 – Automation, Integrations, and Analytics (Sprints 15-20)
1. **Automation engine**: Build backend worker processing triggers (item created/updated, scheduled, webhook). Add condition builder with field comparisons, templated actions, execution history UI, retry/dead-letter handling, and recipe library segmented by department.【F:src/hooks/useAutomation.tsx†L61-L156】
2. **Integration framework**: Ship OAuth-based connectors for GitHub/GitLab/Bitbucket, Slack/Teams, Google Workspace/Microsoft 365, Zendesk/Intercom, Salesforce/HubSpot, importers for CSV/Jira/Monday/Trello/Asana. Provide sync monitor dashboards and webhook management within admin routes.【F:src/routes.tsx†L7-L147】
3. **Analytics platform**: Create reporting warehouse tables, metric definitions (velocity, throughput, SLA compliance, DORA metrics), dashboard builder with tiles (charts, pivots, maps), drill-through to item lists, and scheduled delivery (email/Slack) with PDF/CSV exports.【F:src/pages/Reports.tsx†L1-L104】
4. **Portfolio & OKRs**: Implement programs with cross-project dependency visualizations (portfolio Gantt), OKR alignment (objectives roll up from KRs linked to items), risk registers, and scenario planning for staffing/scope changes.

### Phase 4 – Governance, Experience, and Scale (Sprints 21-26)
1. **Permissions & compliance**: Launch custom role designer, field-level security, project privacy, guest access, and audit dashboards with export/retention policies. Integrate SSO (SAML/OIDC), SCIM provisioning, and data residency controls in admin settings.【F:src/components/security/SecurityProvider.tsx†L40-L134】
2. **Quality guardrails**: Enforce Definition of Ready/Done checklists, duplicate detection, change control (draft/publish boards), and guardrail automations for required fields, validators, and approvals.
3. **Accessibility & localization**: Audit UI controls for WCAG AA, add keyboard navigation to all custom widgets, integrate localization framework with per-user locale/timezone formatting throughout date/time displays.【F:src/components/layout/AppLayout.tsx†L1-L106】
4. **Performance & offline**: Introduce websocket-based real-time sync, optimistic concurrency resolution, background compute for heavy reports, board virtualization, and offline-first mobile/desktop clients with conflict resolution.

### Phase 5 – Testing, Observability, and Enablement (Sprints 27-30)
1. **Testing strategy**: Expand Jest/unit coverage across services and hooks, add Playwright end-to-end flows for core scenarios, integrate Supabase function tests, and add accessibility (axe) & performance (Lighthouse) checks in CI.
2. **Observability**: Implement structured logging, tracing, and metrics for frontend/backend events, including automation runs, integrations health, SLA timers, and real-time usage analytics surfaced in admin dashboards.
3. **Migration & templates**: Deliver importers with dry-run/validation, template library provisioning scripts, and documentation for custom fields/workflows per template category.
4. **Documentation & change management**: Maintain user guides, API docs, release notes, and in-app onboarding tours. Provide training material for admins to configure governance, automations, and integrations.

## 4. Risk Management & Sequencing Notes
- **Critical dependencies**: Data model migrations and domain SDK refactor must precede higher-level features to avoid rework and ensure RLS-enforced governance.【F:src/domain/client.ts†L1-L103】
- **Parallelization**: After Phase 0, assign squads to Core Work Management, Agile/ITSM, Automation/Integrations, and Governance/Scale to progress concurrently while sharing platform services.
- **Change management**: Feature flag major modules (automation runtime, new boards, analytics) to allow staged rollout and tenant-by-tenant enablement while monitoring telemetry via `useTelemetry` hooks already present.【F:src/hooks/useProjects.ts†L19-L75】

This blueprint maps every observed implementation detail to the comprehensive Jira-meets-Monday vision, outlining the precise schema, service, UI, automation, and governance work needed to deliver the full platform.
