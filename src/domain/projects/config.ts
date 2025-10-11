export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  recommendedModules: string[];
  defaultSchemes: {
    permission: string;
    notification: string;
    sla: string;
  };
}

export interface ProjectModuleOption {
  id: string;
  name: string;
  description: string;
  category: "work" | "governance" | "insights" | "delivery";
}

export interface SchemeOption {
  id: string;
  name: string;
  description: string;
  type: "permission" | "notification" | "sla";
}

export interface ImportOption {
  id: string;
  name: string;
  description: string;
  sources?: string[];
}

export interface LifecyclePreset {
  id: string;
  name: string;
  description: string;
  phases: { key: string; label: string; description: string }[];
}

export interface ProjectFieldPreset {
  id: string;
  name: string;
  description: string;
  fields: string[];
}

export interface ProjectWorkflowBlueprint {
  id: string;
  name: string;
  description: string;
  states: string[];
}

export interface ProjectScreenPack {
  id: string;
  name: string;
  description: string;
  screens: string[];
}

export interface ProjectComponentPack {
  id: string;
  name: string;
  description: string;
  components: string[];
}

export interface ProjectVersionStrategy {
  id: string;
  name: string;
  description: string;
  cadence: string;
}

export interface ProjectAutomationRecipe {
  id: string;
  name: string;
  description: string;
  triggers: string[];
}

export interface ProjectIntegrationOption {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ProjectViewCollection {
  id: string;
  name: string;
  description: string;
  views: string[];
}

export interface ProjectDashboardStarter {
  id: string;
  name: string;
  description: string;
  widgets: string[];
}

export interface ProjectArchivalWorkflow {
  id: string;
  name: string;
  description: string;
  retention: string;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "agile_delivery",
    name: "Agile Delivery",
    description: "Scrum and Kanban hybrid with sprint planning, backlog refinement, and release governance.",
    category: "software",
    recommendedModules: ["backlog", "board", "release", "qa", "automations"],
    defaultSchemes: {
      permission: "standard_delivery",
      notification: "iterative_updates",
      sla: "team_owned",
    },
  },
  {
    id: "it_service",
    name: "IT Service Management",
    description: "Request intake, triage, change enablement, and SLAs for internal IT operations.",
    category: "service",
    recommendedModules: ["requests", "knowledge", "sla", "calendar", "integrations"],
    defaultSchemes: {
      permission: "support_desk",
      notification: "major_incident",
      sla: "24x7_premium",
    },
  },
  {
    id: "business_program",
    name: "Business Program",
    description: "Portfolio planning with roadmap, KPI dashboards, stakeholder updates, and risk registers.",
    category: "business",
    recommendedModules: ["roadmap", "goals", "risks", "timeline", "dashboards"],
    defaultSchemes: {
      permission: "executive_program",
      notification: "stakeholder_digest",
      sla: "milestone_commitments",
    },
  },
];

export const PROJECT_MODULES: ProjectModuleOption[] = [
  { id: "backlog", name: "Backlog", description: "Manage and prioritize incoming work items across teams.", category: "work" },
  { id: "board", name: "Boards", description: "Kanban-style delivery boards with WIP limits and swimlanes.", category: "work" },
  { id: "release", name: "Release Management", description: "Coordinate release trains, approvals, and launch readiness.", category: "delivery" },
  { id: "qa", name: "Quality Assurance", description: "Automated and manual testing workflows with sign-off gates.", category: "delivery" },
  { id: "automations", name: "Automations", description: "No-code triggers, conditions, and actions for repetitive tasks.", category: "insights" },
  { id: "requests", name: "Service Requests", description: "Branded portals, intake forms, and routing rules for support.", category: "work" },
  { id: "knowledge", name: "Knowledge Base", description: "Centralized runbooks, SOPs, and troubleshooting guides.", category: "governance" },
  { id: "sla", name: "SLA Tracking", description: "Contract monitoring, breach alerts, and customer-facing reports.", category: "governance" },
  { id: "calendar", name: "Change Calendar", description: "Visualize events, freeze windows, and capacity across teams.", category: "governance" },
  { id: "integrations", name: "Integrations Hub", description: "Connect Slack, GitHub, Jira, ServiceNow, and more.", category: "insights" },
  { id: "roadmap", name: "Roadmaps", description: "Communicate priorities and commitments across time horizons.", category: "delivery" },
  { id: "goals", name: "Goals & OKRs", description: "Track outcomes, health, and key results with drill-down analytics.", category: "insights" },
  { id: "risks", name: "Risk Register", description: "Identify, assess, and mitigate program-level risks.", category: "governance" },
  { id: "timeline", name: "Timeline", description: "Milestones, dependencies, and visual program increments.", category: "delivery" },
  { id: "dashboards", name: "Dashboards", description: "Operational and executive dashboards with live KPIs.", category: "insights" },
];

export const PROJECT_SCHEMES: SchemeOption[] = [
  { id: "standard_delivery", name: "Delivery Team", description: "Scrum masters manage boards, PMs control scope, contributors update tasks.", type: "permission" },
  { id: "support_desk", name: "Support Desk", description: "Agents triage requests, managers approve changes, requesters view progress.", type: "permission" },
  { id: "executive_program", name: "Executive Program", description: "Leadership read-outs with controlled edit rights for working groups.", type: "permission" },
  { id: "iterative_updates", name: "Sprint Updates", description: "Notifications on sprint events, delivery risks, and release trains.", type: "notification" },
  { id: "major_incident", name: "Major Incident", description: "Escalations to duty managers, war-room invites, and resolution digests.", type: "notification" },
  { id: "stakeholder_digest", name: "Stakeholder Digest", description: "Weekly roll-ups to sponsors, finance partners, and change teams.", type: "notification" },
  { id: "team_owned", name: "Team-Owned SLAs", description: "Best-effort with breach nudges and contextual reminders.", type: "sla" },
  { id: "24x7_premium", name: "24x7 Premium", description: "Follow-the-sun rotations with contractual breach penalties.", type: "sla" },
  { id: "milestone_commitments", name: "Milestone Commitments", description: "Phase gates with sponsor approvals and go/no-go records.", type: "sla" },
];

export const PROJECT_IMPORT_OPTIONS: ImportOption[] = [
  {
    id: "blank_slate",
    name: "Start Fresh",
    description: "Create a clean workspace with sample issues and starter workflows.",
  },
  {
    id: "spreadsheet_upload",
    name: "Upload Spreadsheet",
    description: "Import CSV or XLS with automatic field mapping and deduplication.",
    sources: ["csv", "xlsx"],
  },
  {
    id: "external_sync",
    name: "Sync Existing Tool",
    description: "Connect to Jira, Azure DevOps, or Linear and mirror in-flight items.",
    sources: ["jira", "azure_devops", "linear"],
  },
];

export const PROJECT_LIFECYCLE_PRESETS: LifecyclePreset[] = [
  {
    id: "discover_deliver",
    name: "Discover, Deliver, Operate",
    description: "Balanced lifecycle for modern product teams blending discovery and delivery.",
    phases: [
      { key: "discovery", label: "Discovery", description: "Research problems, validate ideas, align on scope." },
      { key: "delivery", label: "Delivery", description: "Plan sprints, execute work, demo value." },
      { key: "stabilize", label: "Stabilize", description: "Hardening, readiness, and change communications." },
      { key: "operate", label: "Operate", description: "Measure adoption, iterate, and manage SLAs." },
    ],
  },
  {
    id: "service_runbook",
    name: "Request to Resolution",
    description: "Intake, triage, fulfillment, and continuous improvement for service teams.",
    phases: [
      { key: "intake", label: "Intake", description: "Capture demand through forms, chat, or APIs." },
      { key: "triage", label: "Triage", description: "Route based on priority, ownership, and SLA commitments." },
      { key: "resolution", label: "Resolution", description: "Implement change, communicate updates, validate outcomes." },
      { key: "review", label: "Review", description: "Run retros, track health, and feed improvements back." },
    ],
  },
];

export const DEFAULT_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Australia/Sydney",
];

export const PROJECT_FIELD_PRESETS: ProjectFieldPreset[] = [
  {
    id: "software_standard",
    name: "Software Delivery",
    description: "Stories, defects, epics, estimates, deployments, and sprint health fields.",
    fields: ["Epic", "Story Points", "Swimlane", "Env", "Deployment Window", "Risk Level"],
  },
  {
    id: "service_desk",
    name: "Service Desk",
    description: "Requester context, impact, urgency, workaround, and satisfaction tracking.",
    fields: ["Requester", "Impact", "Urgency", "Category", "Workaround", "CSAT"],
  },
];

export const PROJECT_WORKFLOW_BLUEPRINTS: ProjectWorkflowBlueprint[] = [
  {
    id: "agile_incremental",
    name: "Agile Incremental",
    description: "Backlog to Done with refinement, commitment, QA, and release gates.",
    states: ["Backlog", "Ready", "In Progress", "In Review", "QA", "Ready for Release", "Done"],
  },
  {
    id: "service_lifecycle",
    name: "Request Lifecycle",
    description: "Intake, triage, investigate, fulfill, verify, and close",
    states: ["Intake", "Triage", "In Progress", "Pending", "Verification", "Closed"],
  },
];

export const PROJECT_SCREEN_PACKS: ProjectScreenPack[] = [
  {
    id: "delivery_starter",
    name: "Delivery Starter",
    description: "Create, edit, transition, and retrospective screens optimised for delivery teams.",
    screens: ["Create Story", "Edit Issue", "Sprint Review", "Release Readiness"],
  },
  {
    id: "support_center",
    name: "Support Center",
    description: "Customer portal, agent triage, resolver hand-off, and closure summary screens.",
    screens: ["Submit Request", "Agent Intake", "Resolver Update", "Close & Survey"],
  },
];

export const PROJECT_COMPONENT_PACKS: ProjectComponentPack[] = [
  {
    id: "platform_stack",
    name: "Platform Stack",
    description: "APIs, web, mobile, infra, tooling, and shared services components.",
    components: ["API", "Web", "Mobile", "Infrastructure", "Tooling", "Shared Services"],
  },
  {
    id: "service_catalog",
    name: "Service Catalog",
    description: "Identity, workplace, finance, procurement, and facilities services.",
    components: ["Identity", "Workplace", "Finance", "Procurement", "Facilities"],
  },
];

export const PROJECT_VERSION_STRATEGIES: ProjectVersionStrategy[] = [
  {
    id: "timeboxed",
    name: "Timeboxed Releases",
    description: "Sprint and quarter aligned releases with semantic versioning.",
    cadence: "Every 2 weeks with quarterly Program Increments",
  },
  {
    id: "continuous",
    name: "Continuous Delivery",
    description: "Always-on deployment train with feature flags and dark launches.",
    cadence: "Daily deploy window and on-demand patches",
  },
];

export const PROJECT_AUTOMATION_RECIPES: ProjectAutomationRecipe[] = [
  {
    id: "quality_guardrails",
    name: "Quality Guardrails",
    description: "Escalate blockers, re-open failed QA, notify release managers of risk.",
    triggers: ["Status changed", "Build failed", "Risk score high"],
  },
  {
    id: "support_triage",
    name: "Support Triage",
    description: "Auto-assign by service, send SLA warnings, and sync closure notes to knowledge base.",
    triggers: ["Request created", "SLA breach imminent", "Ticket solved"],
  },
];

export const PROJECT_INTEGRATION_OPTIONS: ProjectIntegrationOption[] = [
  { id: "slack", name: "Slack", description: "Notify channels, run triage from huddles, and capture updates inline.", category: "collaboration" },
  { id: "github", name: "GitHub", description: "Link commits, pull requests, and deployments to work items.", category: "development" },
  { id: "zendesk", name: "Zendesk", description: "Sync customer escalations and satisfaction scores.", category: "support" },
  { id: "pagerduty", name: "PagerDuty", description: "Page on-call responders and track incident postmortems.", category: "operations" },
];

export const PROJECT_VIEW_COLLECTIONS: ProjectViewCollection[] = [
  {
    id: "delivery_views",
    name: "Delivery Essentials",
    description: "Sprint board, dependency matrix, burndown, and release calendar.",
    views: ["Team Board", "Dependencies", "Burndown", "Release Calendar"],
  },
  {
    id: "service_views",
    name: "Service Control",
    description: "Intake queue, SLA monitor, request aging, and customer sentiment.",
    views: ["Intake Queue", "SLA Monitor", "Aging Report", "CSAT Trends"],
  },
];

export const PROJECT_DASHBOARD_STARTERS: ProjectDashboardStarter[] = [
  {
    id: "delivery_dashboard",
    name: "Delivery Health",
    description: "Velocity, predictability, blocker hotspots, and release readiness.",
    widgets: ["Velocity", "Predictability", "Blockers", "Release Health"],
  },
  {
    id: "service_dashboard",
    name: "Service Insights",
    description: "Volume, SLA attainment, satisfaction, and automation savings.",
    widgets: ["Request Volume", "SLA", "CSAT", "Automation Savings"],
  },
];

export const PROJECT_ARCHIVAL_WORKFLOWS: ProjectArchivalWorkflow[] = [
  {
    id: "governed_export",
    name: "Governed Export",
    description: "Notify stakeholders, export to data lake, retain 13 months.",
    retention: "13 months",
  },
  {
    id: "lightweight_close",
    name: "Lightweight Close",
    description: "Archive after launch, export documentation bundle, retain 6 months.",
    retention: "6 months",
  },
];
