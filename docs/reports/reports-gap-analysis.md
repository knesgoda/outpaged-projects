# Reports feature gap analysis and implementation plan

## Current implementation snapshot
- The active `/reports` experience is a monolithic React page that fetches Supabase `tasks`, `time_entries`, and `projects` tables directly, exposes a handful of hard-coded metrics (tasks completed, hours tracked, team efficiency, blocked tasks), and renders a single bar chart and pie chart using Recharts without any configurable builder or data modeling layer.【F:src/pages/Reports.tsx†L68-L786】
- The CRUD surface for reports (`ReportsHome`, `ReportCreate`, `ReportEdit`, `ReportDetail`) is limited to listing stored report records, editing metadata, duplicating, deleting, and calling an `execute_report` RPC. There is no visual builder, scheduling, or advanced analytics surface in these flows yet.【F:src/pages/reports/ReportsHome.tsx†L1-L199】【F:src/pages/reports/ReportDetail.tsx†L68-L286】
- The services/types hooks simply perform Supabase queries and RPC invocations; there is no analytics engine, visualization registry, calculation framework, or governance metadata implemented.【F:src/services/reports.ts†L1-L240】【F:src/types/reports.ts†L1-L23】

## Gap analysis and implementation roadmap
The following tables map each requirement from the exhaustive specification to the current implementation status and the work needed to satisfy it. Every requirement is accounted for so the resulting program increment covers the full Reports surface.

### Data model and sources
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Primary entities (Items, Subitems, Epics, Versions, Sprints, Components, Boards, Projects, Programs, Users, Teams) | Missing | Build a reporting warehouse schema (e.g., Supabase schemas or dedicated analytics DB) that denormalizes these entities with slowly changing dimension handling. Implement ETL jobs (Supabase functions or Airflow/Edge Functions) to synchronize operational data into `dim_item`, `dim_epic`, `dim_project`, etc., with relations for rollups. |
| Time series events (status changes, assignments, comments, work logs, SLA clocks, deployments, incidents) | Missing | Capture event logs into fact tables (`fact_status_change`, `fact_assignment`, `fact_worklog`, etc.) via triggers/Change Data Capture. For external systems (deployments/incidents) integrate via webhook ingestion to store normalized events with timestamps and actor metadata. |
| Dimensions (Status, Assignee, Team, Label, Item type, Sprint, Version, Priority, Component, Date buckets, Geography, Custom fields) | Missing | Create dimension tables and metadata describing allowed values and hierarchies. Extend builder metadata service to mark which fields are available as discrete dimensions, including dynamic custom fields via JSON schema definitions and data typing. |
| Measures (Count of items, Sum of story points, Sum of duration, Sum of time spent, Average cycle time, 90th percentile lead time, MTTR, Build success rate) | Missing | Implement a metrics catalog service defining measures with SQL templates or transformation pipelines. Provide aggregated fact tables for durations and reliability metrics with percentile calculations using database window functions and maintainers. |
| Derived fields (Cycle time, Lead time, On time flag, Blocked duration, Throughput per week) | Missing | Add derived-column computation layer to ETL that materializes these fields per item/sprint/week. Surface them as calculated fields in the warehouse with refresh logic and documentation. |
| Join and rollup logic (cross-board joins, rollups from Subitems→Items→Epics→Projects→Programs; weightings) | Missing | Implement rollup views/functions that join relational hierarchies and support configurable weighting (by points, duration, count). Provide metadata describing available rollup paths for the builder. |
| Time intelligence (bucketization, relative windows) | Missing | Add time dimension table with multiple grains and helper SQL functions for relative windows. Expose these through builder UI controls and query generator. |
| Data freshness (live query, incremental snapshots, materialized rollups) | Missing | Introduce freshness policies per data source: direct queries against operational tables for lightweight views, incremental snapshot pipelines for heavy facts, and materialized views for cycle/lead time. Track and surface freshness metadata in the UI. |

### Report types and visualizations
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Basic visuals (Number KPI, Table, Pivot, Bar, Stacked variants, Column, Line, Area, Combo, Pie/Donut, Tree map, Heat map, Scatter/Bubble, Histogram, Box plot, Waterfall, Gauge, Bullet) | Missing | Build a visualization registry describing each chart's encodings, supported field roles, and default options. Use a charting library (e.g., Apache ECharts/vega-lite) with wrappers. Implement renderer components that map builder config to chart specs, including pivot grid and KPI card components. |
| Time visuals (Time series line/area, Calendar heat map, Control chart with mean/sigma, Rolling trends, Cumulative totals) | Missing | Extend visualization registry with time-series modules that use warehouse time-grain options, include statistical overlays (mean, sigma) and rolling calculations implemented via query engine. |
| Flow and funnel visuals (Funnel, Sankey, CFD, Burndown, Burnup, Velocity, WIP aging) | Missing | Implement specialized visuals using aggregated facts for workflow states. Provide query templates for each (e.g., CFD daily counts, sprint scope). Build React components or integrate libraries for Sankey and aging charts. |
| Quality and reliability visuals (Defect trend, Reopen rate, Escape rate, MTTR, MTTD, Change failure rate, Deployment frequency) | Missing | Add dedicated metrics queries for quality/reliability facts and chart presets using line/area combinations with statistical overlays. |
| Service management visuals (SLA attainment, FRT, resolution distributions, queue length, intake by channel) | Missing | Model ITSM facts (response/resolution durations, queue size). Provide histograms and percentile charts plus queue trend visuals within builder presets. |
| Resource and finance visuals (Workload, Capacity usage, Utilization, Time logged by category, Budget burn, Cost variance, Earned value, Forecast vs actual) | Missing | Extend data model with capacity plans, cost data, and time logs categorized by billing. Build chart templates (stacked bars, burn charts) with parameterized calculations. |
| Cohort and retention visuals (Acquisition cohorts, Retention curves, heat maps, conversion ladders) | Missing | Introduce cohort fact tables keyed by first activity date. Provide cohort builder that outputs matrix charts and survival curves using specialized chart components. |
| Geographic visuals (Choropleth, Pin map) | Missing | Integrate a mapping library (Mapbox/Leaflet). Normalize location fields to geo codes and supply tiles plus color scales, with builder UI gating on presence of location dimension. |

### Report Builder UI
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Canvas and shelves with live preview and field wells | Missing | Build a modular builder screen with drag/drop shelves, a preview canvas connected to reactive query config, and virtualization for field wells. |
| Field browser with search, grouping, tooltips | Missing | Implement left-side field tree fed by metadata catalog, including hover tooltips with descriptions and data types. |
| Drag and drop interactions | Missing | Use `@dnd-kit` or similar to enable dragging dimensions/measures into shelves, reorder for stacking/legend order. |
| Type switching with compatibility gating | Missing | Add visualization picker showing available charts, disabling incompatible ones with reason tooltips derived from registry rules. |
| Aggregations (Sum, Count, Distinct, Avg, etc.) | Missing | Provide aggregation selector per measure tied to query generator capable of SQL aggregation/win function translation. |
| Window functions (moving avg/median, lag/lead, etc.) | Missing | Extend query builder to support window function configuration, with UI controls for window length and offset. |
| Sorting and limiting (value/name/custom, Top/Bottom N with Others) | Missing | Add sorting configuration panel and query logic that applies ORDER BY, LIMIT, and grouping for "Others" bucket with stable ordering. |
| Formatting (number, currency, percent, duration, story points, abbreviations) | Missing | Introduce formatting service using Intl APIs and custom formatters, surface options in UI with previews per field. |
| Labels and legends controls | Missing | Provide UI toggles for data labels, label positions, legend placement, and apply to renderer props with collision handling. |
| Colors (palettes, locks, diverging, heat map scales) | Missing | Build color management module with predefined palettes, field-based color mapping, locking, diverging support, and continuous scales. |
| Reference lines and bands (static, target, average, percentile, control limits) | Missing | Extend chart config to support overlay lines/bands driven by either constants or computed statistics. |
| Annotations (point/range with text/link) | Missing | Add annotation layer storing metadata and rendering interactive markers; persist as part of report config with optional scoping. |
| Interactivity toggles (cross-filtering, brush, series toggle, zoom/pan) | Missing | Integrate interactive behaviors in chart components with builder toggles to enable/disable features; coordinate cross-filter events via state manager. |
| Validation (missing fields, incompatible aggregations, divide-by-zero) | Missing | Implement real-time validation engine that inspects config and displays inline errors, blocking run until resolved. |

### Filters, segments, and parameters
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Report filters with type-aware operators | Missing | Create filter bar with chips, operator pickers based on field type, and support for relative/absolute date pickers tied to query parameters. |
| Segments (saved filter sets, sharing) | Missing | Build segments model stored in Supabase, allow saving/reusing filter sets and sharing via permissions. |
| Parameters (typed inputs for formulas/filters) | Missing | Implement parameter definitions in report config with UI controls (dropdown, slider, checkbox, date picker) and bind to query/formula engine. |
| Global time control for dashboards | Missing | Add dashboard-level time slicer component that broadcasts selected range to tiles, with override rules per tile. |
| Exclusions (negative filters with cues) | Missing | Extend filter UI to support NOT operations with distinct pill styling and combine logic in query builder. |

### Drill, navigation, and exploration
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Hover tooltips with deltas, contribution, confidence intervals | Missing | Enhance chart tooltips to show multiple metrics, computed deltas vs previous periods, contributions, and optional confidence metrics using query metadata. |
| Click actions (drill, drill-through, open item, apply filter, copy) | Missing | Implement action menu per data point enabling drill down/up via hierarchy definitions, open detail panels, apply filters, and copy values. |
| Drill paths (configurable hierarchies) | Missing | Provide hierarchy configuration UI and query logic that swaps dimensions along defined paths. |
| Brushing for range selection | Missing | Add brush interactions on applicable charts that emit range filters to linked visuals. |
| Cross highlighting | Missing | Implement global selection state that dims non-selected data across visuals when enabled. |
| Back and breadcrumbs | Missing | Add breadcrumb trail UI showing drill stack with undo/back controls preserving selections. |

### Calculated fields and formulas
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Formula editor with syntax help and test pane | Missing | Build Monaco-based editor with syntax highlighting, autocomplete from function catalog, inline docs, and sample data test pane. |
| Functions (arithmetic, text, date/time, aggregation, window, time intelligence) | Missing | Implement expression parser/runtime that translates supported functions to SQL or in-memory evaluation, respecting context (row, aggregate, window). |
| Scopes (row, aggregate, window) | Missing | Provide UI toggle and engine awareness for evaluation scope, ensuring proper grouping semantics. |
| Security (field/row-level permissions respected) | Missing | Integrate permission checks so formulas referencing restricted fields yield masked outputs, leveraging metadata from governance module. |

### Specialized analytics
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Agile/delivery analytics (burndown, burnup, velocity, CFD, cycle/lead time, WIP aging, Monte Carlo) | Mostly missing (burndown/velocity placeholders only) | Populate warehouse with sprint metrics, implement dedicated visuals and calculators (e.g., Monte Carlo simulation service). Replace placeholders with dynamic charts fed by the new data marts. |
| ITSM analytics (SLA attainment, response/resolution metrics, MTTR/MTTD, backlog aging) | Missing | Model ITSM data, compute SLA compliance within business hours, and deliver specialized dashboards with control limits and histograms. |
| Quality analytics (defect trends, reopen, density, escape rates) | Missing | Create quality fact tables capturing defect lifecycle and integrate standard charts to track rates per component/release. |
| Resource/finance analytics (capacity vs planned/actual, overtime, billable mix, cost variance, earned value) | Missing | Gather resource allocations and financial data, compute EV metrics (PV, EV, AC, SPI, CPI), and expose forecast/burn charts. |
| Cohort/retention analytics (user/request cohorts, retention, churn, smoothing) | Missing | Implement cohort modeling with smoothing options and provide dedicated visuals like retention curves and heat maps. |

### Dashboards
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Canvas with responsive grid and drag-resize | Missing | Build dashboard editor using grid layout library (e.g., `react-grid-layout`) supporting drag/resize with alignment guides and row heights. |
| Tiles (reports, KPI, text, image, embed, link list, iframe, filter panels, date slicer) | Missing | Implement tile catalog allowing addition of each type, storing configuration, and rendering in viewer mode. |
| Cross filtering (global filters, opt-out, sibling interactions) | Missing | Add filter context store for dashboards with opt-out flags per tile and cross-filter signals emitted from visuals. |
| Layouts & views (multipage, themes, permissions) | Missing | Support multiple pages per dashboard, dark/light theme toggles, and view-level access controls integrated with auth. |
| Goals and targets (KPI goals, status, sparkline) | Missing | Extend KPI tiles with goal definitions, status evaluation rules, sparkline mini charts, and forecast-to-goal logic. |
| Presentation mode (full-screen rotation, TV refresh) | Missing | Provide presentation mode UI with page auto-advance, refresh intervals, and kiosk-safe view. |

### Scheduling, alerts, and sharing
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Scheduled delivery (Email/Slack/Teams, formats, cadence) | Missing | Build scheduler service that renders reports to PNG/PDF/CSV, integrates with email/Slack/Teams APIs, and supports cron-like cadence selection UI. |
| Parameterized schedules | Missing | Allow schedules to iterate over parameter sets with per-recipient row-level security enforcement. |
| Threshold alerts (threshold, percent change, sigma deviations, auto-create item) | Missing | Implement alerting engine evaluating report measures against rules, triggering notifications and optional item creation via API. |
| Subscriptions (self-serve digests) | Missing | Add subscription model enabling users to opt into digest frequencies, bundling multiple reports into email summaries. |
| Sharing and permissions (scopes, external shares, expiration) | Missing | Extend access control to include share dialogs, link tokenization with optional password and expiration, and integration with workspace/team/project permissions. |

### Export and print
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Static exports (PNG, SVG, PDF, CSV, XLSX with controls) | Missing | Integrate headless rendering service (e.g., serverless Chromium) for charts, PDF composition, and data export endpoints with column selection and encoding options. |
| Data downloads (raw records with limits/permissions) | Missing | Provide download API enforcing row limits and permission checks, reflecting applied filters. |
| Branding (logo, metadata, timestamps, filter summary) | Missing | Allow workspace admins to configure branding assets and include metadata blocks in export templates with toggles per export. |

### Performance and scale
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Query engine (vectorized aggregation, predicate pushdown, caching) | Missing | Implement a query orchestration layer that pushes filters to database, leverages columnar storage/materialized views, and caches results with invalidation on data changes. |
| Acceleration (precomputed rollups, incremental refresh) | Missing | Create scheduled jobs to maintain rollup tables (daily status counts, weekly throughput, sprint aggregates) with change tracking for incremental refresh. |
| Limits and safeguards (row caps, warnings, sampling) | Missing | Add guardrails in query engine to enforce limits, display warnings for high cardinality, and enable sampling for large scatter charts. |
| Virtualization (windowed rendering, streaming pivots) | Missing | Implement virtualized table/pivot components that stream data chunks and render progressively for large datasets. |

### Security, governance, and lineage
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Permissions (view/edit, field masking, row-level security) | Missing | Extend auth model to include report-level roles, integrate field masking policies, and enforce row-level security at the data warehouse/query level. |
| Governance (certification, tags, descriptions, data sources) | Missing | Build governance metadata store enabling certification workflows, tagging, required descriptions, and source tracking displayed in UI. |
| Lineage (upstream/downstream graph) | Missing | Implement lineage service that captures dependencies between datasets, reports, dashboards, and schedules, rendering interactive graph views. |
| Versioning (change history, diffs, restore, comments) | Missing | Add version control for report configs capturing diffs, enabling restore points, and allowing reviewers to comment on versions. |
| Audit (access logs, export/schedule logs, alert logs) | Missing | Create audit logging pipeline storing who viewed/exported/scheduled or triggered alerts, with admin UI to query logs. |

### Accessibility
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Keyboard navigation (builder and dashboards) | Missing | Ensure all interactive components support full keyboard interactions, with roving tab index, reorder shortcuts, and accessible focus management. |
| Screen reader support (data table view, ARIA labels, announcements) | Missing | Provide accessible data tables for each visual, attach ARIA labels/roles, and announce selections/filters via live regions. |
| Contrast and size (high contrast palettes, font scaling, focus indicators, skip links) | Missing | Offer accessible themes with high-contrast palettes, allow font scaling/pref sizes, and ensure focus indicators/skip links exist. |

### Mobile and touch
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Gestures (pinch zoom, tap drill, long press tooltip, two-finger pan) | Missing | Add responsive touch interactions using gesture libraries, ensuring chart components respond to pinch, tap, long-press, and multi-touch panning. |
| Adaptive layout (single-column dashboards, filter drawer, quick actions) | Missing | Implement responsive dashboard layouts that collapse to single column, convert filters to bottom sheet, and expose quick share/subscribe actions on mobile. |
| Offline snapshots (cached dashboards, staleness banner) | Missing | Build offline caching layer storing last viewed dashboards, expose manual clear controls, and show staleness indicators. |

### API and embedding
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Programmatic control (REST/GraphQL for CRUD/run with parameters) | Missing | Design API endpoints (REST/GraphQL) to manage reports, execute with parameters, and return JSON or rendered assets, enforcing auth scopes. |
| Embedding (iframe/SDK with SSO, parameter control, selection events) | Missing | Provide embeddable SDK that issues SSO tokens, allows host apps to set parameters, and sends selection events via postMessage/hooks. |
| Webhooks (schedule runs, alerts, publishes) | Missing | Implement webhook framework triggered on schedule executions, alerts, and publish events with signing and retry policies. |

### Error handling and recovery
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Validation errors (incompatible roles, missing aggregations, formula failures) | Missing | Enhance builder validation to produce precise error messages, highlight offending fields, and block execution until resolved. |
| Empty/sparse data handling (friendly empty states, zero-fill option) | Missing | Add dataset inspection logic to show empty-state messaging and toggles for zero-filling missing categories vs dropping them. |
| Time zone and DST handling | Missing | Standardize on user-preferred time zones with conversion utilities, support DST boundaries in hourly charts, and offer UTC switch in builder. |
| Conflict resolution for concurrent edits | Missing | Implement collaborative editing service that detects concurrent modifications, shows live diffs, and offers merge/discard options. |

### Examples of precise behaviors
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Cycle time percentile (P90 by team with exclusions/imputations) | Missing | Create metric definition for cycle time percentile with filters excluding incomplete items and optional imputation toggle, render via builder preset. |
| Cumulative flow diagram (state buckets, daily counts, hover details) | Missing | Implement CFD query/view producing daily To Do/In Progress/Done counts and stacked area chart with per-bucket hover details. |
| Burndown (workdays axis, scope changes) | Missing | Build sprint calendar aware of workdays, compute remaining scope, and overlay scope-change markers. |
| SLA attainment (business hour policy compliance) | Missing | Calculate SLA metrics respecting business calendars and provide grouped visuals by priority/queue. |
| Control chart (mean/3-sigma bands, outliers) | Missing | Implement control chart visualization with statistical calculations and explanatory tooltips for outliers. |
| Alert on backlog growth (weekly difference, threshold, alerting) | Missing | Set up derived metric for backlog delta, evaluate weekly, and integrate with alerting engine to notify and link to backlog list. |
| Monte Carlo forecast (throughput-based simulation) | Missing | Build Monte Carlo simulation service using trailing throughput to produce percentile completion dates and render ribbon chart. |

### Configuration and defaults
| Requirement | Status | Implementation plan |
| --- | --- | --- |
| Defaults for new reports (time range, date field detection, palette, legend, locale formatting) | Missing | Define default report config template applying last-30-days window, auto-selecting Completed or Updated date, default colors, right legend, and locale-based number formatting. |
| Admin controls (approved sources, certified fields, retention, row caps, export types, naming rules) | Missing | Build admin settings panel managing allowed data sources, certified dimensions/measures, retention policies, limits, and naming conventions enforced during report creation. |
| User preferences (timezone, number format, default chart type/download format, theme) | Missing | Store per-user preferences and apply them across builder, dashboards, and exports. |

## Next steps
1. Stand up the analytics data platform foundation (warehouse schema, ETL, metadata catalog, query engine).
2. Deliver the interactive report builder with visualization registry, calculation engine, filters/parameters, and validation.
3. Implement specialized analytics packs (agile, ITSM, quality, finance, cohorts) backed by the new data marts.
4. Build dashboards, scheduling/alerting, exports, and governance layers on top of the builder.
5. Ship accessibility, mobile, embedding, and API enhancements alongside performance hardening.

Executing this roadmap will transform the current placeholder Reports experience into the fully featured analytics platform described in the specification.
