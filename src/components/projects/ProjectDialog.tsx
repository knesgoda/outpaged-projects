import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useToast } from "@/hooks/use-toast";
import { useCreateProject } from "@/hooks/useProjects";
import { useApplyProjectTemplate, useProjectTemplates } from "@/hooks/useProjectTemplates";
import { useTelemetry } from "@/components/telemetry/TelemetryProvider";
import { useTenant } from "@/domain/tenant";
import type { ProjectStatus } from "@/services/projects";
import { orchestrateProjectArtifacts } from "@/services/projects/projectCreationOrchestrator";
import { PROJECT_STATUS_FILTER_OPTIONS } from "@/utils/project-status";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TIMEZONES,
  PROJECT_ARCHIVAL_WORKFLOWS,
  PROJECT_AUTOMATION_RECIPES,
  PROJECT_COMPONENT_PACKS,
  PROJECT_DASHBOARD_STARTERS,
  PROJECT_FIELD_PRESETS,
  PROJECT_IMPORT_OPTIONS,
  PROJECT_INTEGRATION_OPTIONS,
  PROJECT_LIFECYCLE_PRESETS,
  PROJECT_MODULES,
  PROJECT_SCHEMES,
  PROJECT_SCREEN_PACKS,
  PROJECT_VERSION_STRATEGIES,
  PROJECT_VIEW_COLLECTIONS,
  PROJECT_WORKFLOW_BLUEPRINTS,
} from "@/domain/projects/config";

const AUTOSAVE_STORAGE_KEY = "project-dialog.creation-state";

const generateIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const toProjectKey = (name: string) => {
  const sanitized = name
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
  if (sanitized.length >= 2) {
    return sanitized;
  }
  if (!sanitized && name) {
    const ascii = name
      .normalize("NFD")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
    if (ascii.length >= 2) {
      return ascii.slice(0, 10);
    }
  }
  return sanitized;
};

const PROJECT_VISIBILITY_OPTIONS = [
  { id: "private", label: "Private" },
  { id: "team", label: "Team" },
  { id: "org", label: "Organization" },
];

const PROJECT_ICON_OPTIONS = ["🚀", "📈", "🛠️", "🎯", "🧭", "📦"];

const PROJECT_COLOR_OPTIONS = [
  "#2563eb",
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
];

const WORKING_DAY_OPTIONS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const LANGUAGE_OPTIONS = [
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "es-ES", label: "Spanish" },
  { id: "de-DE", label: "German" },
  { id: "fr-FR", label: "French" },
];

type StepComponent = (props: ProjectCreationStepContext) => JSX.Element;

type BoardColumnConfig = {
  id: string;
  name: string;
  group: string;
  wipLimit?: number | null;
};

type WorkflowTransitionConfig = {
  id: string;
  from: string;
  to: string;
  rule: string;
};

type BoardConfiguration = {
  methodology: "scrum" | "kanban";
  backlogMapping: string;
  estimationField: string;
  defaultBoard: string;
};

type SprintConfiguration = {
  cadence: string;
  capacity: number;
  releaseCadence: string;
};

type ComponentRoutingConfig = {
  id: string;
  name: string;
  owner: string;
  routingQueue: string;
};

type IntakeFormDefinition = {
  id: string;
  name: string;
  audience: "public" | "internal";
  routing: string;
};

type AutomationSelection = {
  id: string;
  enabled: boolean;
};

type IntegrationMapping = {
  id: string;
  enabled: boolean;
  projectKey: string;
};

type MemberInvite = {
  id: string;
  name: string;
  role: string;
  email: string;
};

type PermissionOverride = {
  scope: string;
  role: string;
  access: string;
};

type ImportMapping = {
  source: string;
  target: string;
  sample?: string;
};

interface StepDefinition {
  id:
    | "basics"
    | "template"
    | "columns"
    | "workflow"
    | "boards"
    | "sprints"
    | "components"
    | "forms"
    | "automations"
    | "integrations"
    | "members"
    | "permissions"
    | "data"
    | "review";
  title: string;
  description: string;
  Component: StepComponent;
}

interface StepValidationResult {
  valid: boolean;
  issues: string[];
}

interface StepValidationContext {
  selectedTemplate: TemplateSummary | null;
  selectedFieldPreset?: (typeof PROJECT_FIELD_PRESETS)[number];
  selectedWorkflow?: (typeof PROJECT_WORKFLOW_BLUEPRINTS)[number];
  selectedScreenPack?: (typeof PROJECT_SCREEN_PACKS)[number];
  selectedComponentPack?: (typeof PROJECT_COMPONENT_PACKS)[number];
  selectedVersionStrategy?: (typeof PROJECT_VERSION_STRATEGIES)[number];
}

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    id: "basics",
    title: "Project Basics",
    description: "Name, description, timeline, and tracking status.",
    Component: PRJCreateStepABasics,
  },
  {
    id: "template",
    title: "Template & Structure",
    description: "Select templates, fields, workflows, and initial presets.",
    Component: PRJCreateStepBTemplate,
  },
  {
    id: "columns",
    title: "Columns & Groups",
    description: "Seed board columns and swimlane groupings for work visualization.",
    Component: PRJCreateStepCColumnsGroups,
  },
  {
    id: "workflow",
    title: "Workflow & Status",
    description: "Configure statuses, transitions, and WIP policies.",
    Component: PRJCreateStepDWorkflowStatus,
  },
  {
    id: "boards",
    title: "Boards",
    description: "Choose Scrum or Kanban setups and backlog mapping.",
    Component: PRJCreateStepEBoards,
  },
  {
    id: "sprints",
    title: "Sprints & Releases",
    description: "Define sprint cadence, capacity, and release conventions.",
    Component: PRJCreateStepFSprintsReleases,
  },
  {
    id: "components",
    title: "Components & Routing",
    description: "Assign component owners and routing defaults.",
    Component: PRJCreateStepGComponentsRouting,
  },
  {
    id: "forms",
    title: "Forms & Intake",
    description: "Set up public and internal request forms with routing rules.",
    Component: PRJCreateStepHFormsIntake,
  },
  {
    id: "automations",
    title: "Automations & Recipes",
    description: "Select starter automations and no-code flows.",
    Component: PRJCreateStepIAutomations,
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "Enable source tool connections and mapping preferences.",
    Component: PRJCreateStepJIntegrations,
  },
  {
    id: "members",
    title: "Members & Roles",
    description: "Invite teammates and assign default roles.",
    Component: PRJCreateStepKMembersRoles,
  },
  {
    id: "permissions",
    title: "Permissions & Notifications",
    description: "Pick schemes, privacy defaults, and overrides.",
    Component: PRJCreateStepLPermissions,
  },
  {
    id: "data",
    title: "Data & Import",
    description: "Review sample data, import mappings, and launch readiness.",
    Component: PRJCreateStepMDataImport,
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm configuration before creating the project.",
    Component: PRJCreateStepOReview,
  },
];

type StepId = StepDefinition["id"];

type CreationState = {
  name: string;
  description: string;
  code: string;
  status: Exclude<ProjectStatus, "archived">;
  visibility: string;
  icon: string;
  color: string;
  workingDays: string[];
  language: string;
  workspacePath: string;
  codeManuallyEdited: boolean;
  startDate?: Date;
  endDate?: Date;
  templateKey: string;
  modules: string[];
  permissionScheme: string;
  notificationScheme: string;
  slaScheme: string;
  fieldPreset: string;
  workflowBlueprint: string;
  screenPack: string;
  componentPack: string;
  versionStrategy: string;
  automationRecipe: string;
  integrationOptions: string[];
  viewCollection: string;
  dashboardStarter: string;
  importStrategy: string;
  lifecyclePreset: string;
  lifecycleNotes: string;
  lifecycleMission: string;
  lifecycleSuccessMetrics: string;
  lifecycleStakeholders: string;
  lifecycleChannels: string;
  kickoffDate?: Date;
  discoveryComplete?: Date;
  launchTarget?: Date;
  reviewCadence: string;
  maintenanceWindow: string;
  calendarId: string;
  timezone: string;
  archivalWorkflow: string;
  boardGroups: string[];
  boardColumns: BoardColumnConfig[];
  workflowStatuses: string[];
  workflowTransitions: WorkflowTransitionConfig[];
  boardConfiguration: BoardConfiguration;
  sprintConfiguration: SprintConfiguration;
  componentCatalog: ComponentRoutingConfig[];
  intakeForms: IntakeFormDefinition[];
  automationSelections: AutomationSelection[];
  integrationMappings: IntegrationMapping[];
  invitees: MemberInvite[];
  permissionOverrides: PermissionOverride[];
  privacyDefault: string;
  notificationDefaults: string;
  importMappings: ImportMapping[];
};

type ProjectSchemeOption = (typeof PROJECT_SCHEMES)[number];

type TemplateSummary = ReturnType<typeof useProjectTemplates>["data"] extends Array<infer T> ? T : never;

type ProjectCreationStepContext = {
  formData: CreationState;
  setFormData: Dispatch<SetStateAction<CreationState>>;
  templates: TemplateSummary[];
  loadingTemplates: boolean;
  handleTemplateChange: (templateId: string) => void;
  selectedTemplate: TemplateSummary | null;
  selectedFieldPreset: (typeof PROJECT_FIELD_PRESETS)[number] | undefined;
  selectedWorkflow: (typeof PROJECT_WORKFLOW_BLUEPRINTS)[number] | undefined;
  selectedScreenPack: (typeof PROJECT_SCREEN_PACKS)[number] | undefined;
  selectedComponentPack: (typeof PROJECT_COMPONENT_PACKS)[number] | undefined;
  selectedVersionStrategy: (typeof PROJECT_VERSION_STRATEGIES)[number] | undefined;
  selectedAutomation: (typeof PROJECT_AUTOMATION_RECIPES)[number] | undefined;
  selectedViewCollection: (typeof PROJECT_VIEW_COLLECTIONS)[number] | undefined;
  selectedDashboard: (typeof PROJECT_DASHBOARD_STARTERS)[number] | undefined;
  selectedLifecyclePreset: (typeof PROJECT_LIFECYCLE_PRESETS)[number] | undefined;
  selectedArchival: (typeof PROJECT_ARCHIVAL_WORKFLOWS)[number] | undefined;
  selectedImportOption: (typeof PROJECT_IMPORT_OPTIONS)[number] | undefined;
  selectedModules: (typeof PROJECT_MODULES)[number][];
  selectedIntegrations: (typeof PROJECT_INTEGRATION_OPTIONS)[number][];
  permissionSchemes: ProjectSchemeOption[];
  notificationSchemes: ProjectSchemeOption[];
  slaSchemes: ProjectSchemeOption[];
  toggleModule: (moduleId: string) => void;
  toggleIntegration: (integrationId: string) => void;
};

const calendarOptions = [
  { id: "delivery-calendar", name: "Delivery Calendar" },
  { id: "change-calendar", name: "Change Calendar" },
  { id: "program-increment", name: "Program Increment Calendar" },
];

const reviewCadenceOptions = [
  "Weekly ops review",
  "Bi-weekly sprint reviews",
  "Monthly steering committee",
];

const maintenanceWindowOptions = [
  "Fridays 16:00-18:00 UTC",
  "Sundays 02:00-04:00 UTC",
  "Change-free during critical launches",
];

const toISODate = (date?: Date) => (date ? date.toISOString().split("T")[0] : undefined);

const splitList = (value: string) =>
  value
    .split(/[\n,]+/)
    .map(entry => entry.trim())
    .filter(Boolean);

const DEFAULT_BOARD_GROUPS = ["Planned", "Active", "Done"];

const createDefaultBoardColumns = (): BoardColumnConfig[] => {
  const [firstWorkflow] = PROJECT_WORKFLOW_BLUEPRINTS;
  if (!firstWorkflow) {
    return [];
  }
  return firstWorkflow.states.map((state, index, array) => ({
    id: state.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: state,
    group:
      index === 0
        ? DEFAULT_BOARD_GROUPS[0]
        : index === array.length - 1
        ? DEFAULT_BOARD_GROUPS[2]
        : DEFAULT_BOARD_GROUPS[1],
    wipLimit: index > 0 && index < array.length - 1 ? 5 : null,
  }));
};

const createDefaultWorkflowStatuses = (): string[] => {
  const [firstWorkflow] = PROJECT_WORKFLOW_BLUEPRINTS;
  return firstWorkflow ? [...firstWorkflow.states] : [];
};

const createDefaultWorkflowTransitions = (): WorkflowTransitionConfig[] => {
  const statuses = createDefaultWorkflowStatuses();
  return statuses.slice(0, -1).map((status, index) => ({
    id: `${status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-to-${statuses[index + 1]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`,
    from: status,
    to: statuses[index + 1] ?? status,
    rule: "Forward progression",
  }));
};

const createDefaultComponentCatalog = (): ComponentRoutingConfig[] => {
  const [firstPack] = PROJECT_COMPONENT_PACKS;
  if (!firstPack) {
    return [];
  }
  return firstPack.components.map((component, index) => ({
    id: `${firstPack.id}-${index}`,
    name: component,
    owner: index === 0 ? "Platform Lead" : "Unassigned",
    routingQueue: index === 0 ? "Core Team" : "Default",
  }));
};

const createDefaultIntakeForms = (): IntakeFormDefinition[] => [
  { id: "public-intake", name: "Public Intake", audience: "public", routing: "Front Desk" },
  { id: "internal-intake", name: "Internal Intake", audience: "internal", routing: "Core Team" },
];

const createDefaultAutomationSelections = (): AutomationSelection[] =>
  PROJECT_AUTOMATION_RECIPES.map((recipe, index) => ({
    id: recipe.id,
    enabled: index === 0,
  }));

const createDefaultIntegrationMappings = (): IntegrationMapping[] =>
  PROJECT_INTEGRATION_OPTIONS.map((integration, index) => ({
    id: integration.id,
    enabled: index < 2,
    projectKey: integration.id === "github" ? "main-repo" : "",
  }));

const createDefaultInvitees = (): MemberInvite[] => [
  { id: "owner", name: "Delivery Lead", role: "Project Admin", email: "" },
  { id: "scrum-master", name: "Scrum Master", role: "Manager", email: "" },
];

const createDefaultPermissionOverrides = (): PermissionOverride[] => [
  { scope: "Backlog", role: "Contributors", access: "Edit" },
  { scope: "Releases", role: "Stakeholders", access: "View" },
];

const createDefaultImportMappings = (): ImportMapping[] => [
  { source: "Summary", target: "Title", sample: "Improve onboarding experience" },
  { source: "Assignee", target: "Owner", sample: "alex@example.com" },
];

const computeStepValidation = (
  state: CreationState,
  context: StepValidationContext,
): Record<StepId, StepValidationResult> => {
  const basicsIssues: string[] = [];
  const trimmedName = state.name.trim();
  const trimmedCode = state.code.trim();
  if (!trimmedName) {
    basicsIssues.push("Project name is required.");
  }
  if (!trimmedCode) {
    basicsIssues.push("Project key is required.");
  } else {
    if (trimmedCode.length < 2 || trimmedCode.length > 10) {
      basicsIssues.push("Project key must be between 2 and 10 characters.");
    }
    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
      basicsIssues.push("Project key must contain only letters and numbers.");
    }
  }
  if (!state.visibility) {
    basicsIssues.push("Select a visibility level.");
  }
  if (!state.icon) {
    basicsIssues.push("Choose an icon for the project.");
  }
  if (!state.color) {
    basicsIssues.push("Select a color for the project.");
  }
  if (!state.timezone) {
    basicsIssues.push("Timezone is required.");
  }
  if (!state.workingDays.length) {
    basicsIssues.push("Select at least one working day.");
  }
  if (!state.language) {
    basicsIssues.push("Choose a default language.");
  }

  const templateIssues: string[] = [];
  if (!state.templateKey && !context.selectedTemplate) {
    templateIssues.push("Pick a starting template.");
  }
  if (!context.selectedFieldPreset) {
    templateIssues.push("Select a field preset.");
  }
  if (!context.selectedWorkflow) {
    templateIssues.push("Select a workflow blueprint.");
  }
  if (!context.selectedScreenPack) {
    templateIssues.push("Select screen packs for item types.");
  }
  if (!context.selectedComponentPack) {
    templateIssues.push("Select a component catalog.");
  }
  if (!context.selectedVersionStrategy) {
    templateIssues.push("Choose a versioning strategy.");
  }

  const columnsIssues: string[] = [];
  const groupSet = new Set(state.boardGroups.map(group => group.trim()).filter(Boolean));
  if (!groupSet.size) {
    columnsIssues.push("Define at least one swimlane group.");
  }
  if (!state.boardColumns.length) {
    columnsIssues.push("Add at least one board column.");
  }
  state.boardColumns.forEach(column => {
    if (!column.name.trim()) {
      columnsIssues.push("All board columns need a name.");
    }
    if (!groupSet.has(column.group)) {
      columnsIssues.push(`Column ${column.name || column.id} must map to a valid group.`);
    }
    if (typeof column.wipLimit === "number" && column.wipLimit <= 0) {
      columnsIssues.push(`Column ${column.name || column.id} must have a positive WIP limit.`);
    }
  });

  const workflowIssues: string[] = [];
  const statuses = state.workflowStatuses.map(status => status.trim()).filter(Boolean);
  if (!statuses.length) {
    workflowIssues.push("Provide at least one workflow status.");
  }
  if (new Set(statuses).size !== statuses.length) {
    workflowIssues.push("Statuses must be unique.");
  }
  if (!state.workflowTransitions.length) {
    workflowIssues.push("Configure status transitions.");
  }
  state.workflowTransitions.forEach(transition => {
    if (!statuses.includes(transition.from) || !statuses.includes(transition.to)) {
      workflowIssues.push(`Transition ${transition.from} → ${transition.to} must use valid statuses.`);
    }
    if (!transition.rule.trim()) {
      workflowIssues.push(`Transition ${transition.from} → ${transition.to} needs a guard rule.`);
    }
  });

  const boardsIssues: string[] = [];
  if (!state.boardConfiguration.methodology) {
    boardsIssues.push("Choose Scrum or Kanban methodology.");
  }
  if (!state.boardConfiguration.backlogMapping.trim()) {
    boardsIssues.push("Map which backlog feeds the board.");
  }
  if (!state.boardConfiguration.estimationField.trim()) {
    boardsIssues.push("Provide an estimation field.");
  }
  if (!state.boardConfiguration.defaultBoard.trim()) {
    boardsIssues.push("Name the default working board.");
  }

  const sprintsIssues: string[] = [];
  if (!state.sprintConfiguration.cadence.trim()) {
    sprintsIssues.push("Set a sprint cadence.");
  }
  if (!Number.isFinite(state.sprintConfiguration.capacity) || state.sprintConfiguration.capacity <= 0) {
    sprintsIssues.push("Team capacity must be a positive number.");
  }
  if (!state.sprintConfiguration.releaseCadence.trim()) {
    sprintsIssues.push("Define a release cadence.");
  }
  if (!state.reviewCadence) {
    sprintsIssues.push("Define a review cadence.");
  }
  if (!state.calendarId) {
    sprintsIssues.push("Select a project calendar.");
  }

  const componentsIssues: string[] = [];
  if (!state.componentCatalog.length) {
    componentsIssues.push("Seed the component catalog with at least one entry.");
  }
  state.componentCatalog.forEach(component => {
    if (!component.name.trim()) {
      componentsIssues.push("Component names cannot be empty.");
    }
    if (!component.owner.trim()) {
      componentsIssues.push(`Assign an owner for ${component.name || component.id}.`);
    }
    if (!component.routingQueue.trim()) {
      componentsIssues.push(`Provide a routing rule for ${component.name || component.id}.`);
    }
  });

  const formsIssues: string[] = [];
  if (!state.intakeForms.length) {
    formsIssues.push("Create at least one intake form.");
  }
  state.intakeForms.forEach(form => {
    if (!form.name.trim()) {
      formsIssues.push("Form names are required.");
    }
    if (!form.routing.trim()) {
      formsIssues.push(`Define routing for ${form.name || form.id}.`);
    }
  });

  const automationsIssues: string[] = [];
  if (!state.automationSelections.some(selection => selection.enabled)) {
    automationsIssues.push("Enable at least one automation recipe.");
  }

  const integrationsIssues: string[] = [];
  if (!state.integrationMappings.length) {
    integrationsIssues.push("Select integrations to configure.");
  }
  const enabledIntegrations = state.integrationMappings.filter(mapping => mapping.enabled);
  if (!enabledIntegrations.length) {
    integrationsIssues.push("Enable at least one integration.");
  }
  enabledIntegrations.forEach(mapping => {
    if (!mapping.projectKey.trim()) {
      integrationsIssues.push(`Provide a project or workspace mapping for ${mapping.id}.`);
    }
  });

  const membersIssues: string[] = [];
  if (!state.invitees.length) {
    membersIssues.push("Invite at least one teammate.");
  }
  state.invitees.forEach(invite => {
    if (!invite.name.trim()) {
      membersIssues.push("Each invitee must include a name.");
    }
    if (!invite.role.trim()) {
      membersIssues.push(`Assign a role to ${invite.name || invite.id}.`);
    }
  });

  const permissionsIssues: string[] = [];
  if (!state.permissionScheme) {
    permissionsIssues.push("Assign a permission scheme.");
  }
  if (!state.notificationScheme) {
    permissionsIssues.push("Assign a notification scheme.");
  }
  if (!state.privacyDefault.trim()) {
    permissionsIssues.push("Choose a privacy default.");
  }
  if (!state.notificationDefaults.trim()) {
    permissionsIssues.push("Set default notification behavior.");
  }
  if (!state.permissionOverrides.length) {
    permissionsIssues.push("Add at least one permission override.");
  }

  const dataIssues: string[] = [];
  if (!state.importStrategy) {
    dataIssues.push("Choose an import or seeding strategy.");
  }
  if (!state.importMappings.length) {
    dataIssues.push("Provide field mappings for import.");
  }
  state.importMappings.forEach(mapping => {
    if (!mapping.source.trim() || !mapping.target.trim()) {
      dataIssues.push("Each mapping requires both a source and target field.");
    }
  });
  if (!state.archivalWorkflow) {
    dataIssues.push("Choose an archival workflow.");
  }

  const reviewIssues: string[] = [];
  if (
    basicsIssues.length ||
    templateIssues.length ||
    columnsIssues.length ||
    workflowIssues.length ||
    boardsIssues.length ||
    sprintsIssues.length ||
    componentsIssues.length ||
    formsIssues.length ||
    automationsIssues.length ||
    integrationsIssues.length ||
    membersIssues.length ||
    permissionsIssues.length ||
    dataIssues.length
  ) {
    reviewIssues.push("Resolve issues in previous steps before creating the project.");
  }

  return {
    basics: { valid: basicsIssues.length === 0, issues: basicsIssues },
    template: { valid: templateIssues.length === 0, issues: templateIssues },
    columns: { valid: columnsIssues.length === 0, issues: columnsIssues },
    workflow: { valid: workflowIssues.length === 0, issues: workflowIssues },
    boards: { valid: boardsIssues.length === 0, issues: boardsIssues },
    sprints: { valid: sprintsIssues.length === 0, issues: sprintsIssues },
    components: { valid: componentsIssues.length === 0, issues: componentsIssues },
    forms: { valid: formsIssues.length === 0, issues: formsIssues },
    automations: { valid: automationsIssues.length === 0, issues: automationsIssues },
    integrations: { valid: integrationsIssues.length === 0, issues: integrationsIssues },
    members: { valid: membersIssues.length === 0, issues: membersIssues },
    permissions: { valid: permissionsIssues.length === 0, issues: permissionsIssues },
    data: { valid: dataIssues.length === 0, issues: dataIssues },
    review: { valid: reviewIssues.length === 0, issues: reviewIssues },
  } satisfies Record<StepId, StepValidationResult>;
};

const createInitialState = (initialTemplateId?: string): CreationState => ({
  name: "",
  description: "",
  code: "",
  status: "planning",
  visibility: PROJECT_VISIBILITY_OPTIONS[0]?.id ?? "private",
  icon: PROJECT_ICON_OPTIONS[0] ?? "🚀",
  color: PROJECT_COLOR_OPTIONS[0] ?? "#2563eb",
  workingDays: WORKING_DAY_OPTIONS.slice(0, 5).map(option => option.id),
  language: LANGUAGE_OPTIONS[0]?.id ?? "en-US",
  workspacePath: "",
  codeManuallyEdited: false,
  startDate: undefined,
  endDate: undefined,
  templateKey: initialTemplateId ?? "",
  modules: [],
  permissionScheme: "",
  notificationScheme: "",
  slaScheme: "",
  fieldPreset: PROJECT_FIELD_PRESETS[0]?.id ?? "",
  workflowBlueprint: PROJECT_WORKFLOW_BLUEPRINTS[0]?.id ?? "",
  screenPack: PROJECT_SCREEN_PACKS[0]?.id ?? "",
  componentPack: PROJECT_COMPONENT_PACKS[0]?.id ?? "",
  versionStrategy: PROJECT_VERSION_STRATEGIES[0]?.id ?? "",
  automationRecipe: PROJECT_AUTOMATION_RECIPES[0]?.id ?? "",
  integrationOptions: [PROJECT_INTEGRATION_OPTIONS[0]?.id ?? ""].filter(Boolean),
  viewCollection: PROJECT_VIEW_COLLECTIONS[0]?.id ?? "",
  dashboardStarter: PROJECT_DASHBOARD_STARTERS[0]?.id ?? "",
  importStrategy: PROJECT_IMPORT_OPTIONS[0]?.id ?? "",
  lifecyclePreset: PROJECT_LIFECYCLE_PRESETS[0]?.id ?? "",
  lifecycleNotes: "",
  lifecycleMission: "",
  lifecycleSuccessMetrics: "",
  lifecycleStakeholders: "",
  lifecycleChannels: "",
  kickoffDate: undefined,
  discoveryComplete: undefined,
  launchTarget: undefined,
  reviewCadence: reviewCadenceOptions[1] ?? "Bi-weekly sprint reviews",
  maintenanceWindow: maintenanceWindowOptions[0] ?? "Fridays 16:00-18:00 UTC",
  calendarId: calendarOptions[0]?.id ?? "delivery-calendar",
  timezone: DEFAULT_TIMEZONES[0] ?? "UTC",
  archivalWorkflow: PROJECT_ARCHIVAL_WORKFLOWS[0]?.id ?? "",
  boardGroups: [...DEFAULT_BOARD_GROUPS],
  boardColumns: createDefaultBoardColumns(),
  workflowStatuses: createDefaultWorkflowStatuses(),
  workflowTransitions: createDefaultWorkflowTransitions(),
  boardConfiguration: {
    methodology: "scrum",
    backlogMapping: "Product Backlog",
    estimationField: "Story Points",
    defaultBoard: "Delivery Board",
  },
  sprintConfiguration: {
    cadence: "2 weeks",
    capacity: 25,
    releaseCadence: PROJECT_VERSION_STRATEGIES[0]?.cadence ?? "Quarterly cadence",
  },
  componentCatalog: createDefaultComponentCatalog(),
  intakeForms: createDefaultIntakeForms(),
  automationSelections: createDefaultAutomationSelections(),
  integrationMappings: createDefaultIntegrationMappings(),
  invitees: createDefaultInvitees(),
  permissionOverrides: createDefaultPermissionOverrides(),
  privacyDefault: "Team-visible",
  notificationDefaults: "Digest updates",
  importMappings: createDefaultImportMappings(),
});

type PersistedCreationState = Omit<CreationState, "startDate" | "endDate" | "kickoffDate" | "discoveryComplete" | "launchTarget"> &
  Partial<Record<"startDate" | "endDate" | "kickoffDate" | "discoveryComplete" | "launchTarget", string | null>> & {
    updatedAt: string;
  };

const serializeCreationState = (state: CreationState): PersistedCreationState => ({
  ...state,
  startDate: state.startDate?.toISOString() ?? null,
  endDate: state.endDate?.toISOString() ?? null,
  kickoffDate: state.kickoffDate?.toISOString() ?? null,
  discoveryComplete: state.discoveryComplete?.toISOString() ?? null,
  launchTarget: state.launchTarget?.toISOString() ?? null,
  updatedAt: new Date().toISOString(),
});

const hydrateCreationState = (persisted: Partial<PersistedCreationState>, initialTemplateId?: string): CreationState => {
  const base = createInitialState(initialTemplateId);
  const parseDate = (value?: string | null) => (value ? new Date(value) : undefined);
  return {
    ...base,
    ...persisted,
    templateKey: persisted.templateKey ?? base.templateKey,
    modules: Array.isArray(persisted.modules) ? persisted.modules : base.modules,
    integrationOptions: Array.isArray(persisted.integrationOptions)
      ? persisted.integrationOptions
      : base.integrationOptions,
    workingDays: Array.isArray((persisted as any).workingDays) && (persisted as any).workingDays.length
      ? ((persisted as any).workingDays as string[])
      : base.workingDays,
    boardGroups:
      Array.isArray((persisted as any).boardGroups) && (persisted as any).boardGroups.length
        ? ((persisted as any).boardGroups as string[])
        : base.boardGroups,
    boardColumns:
      Array.isArray((persisted as any).boardColumns) && (persisted as any).boardColumns.length
        ? ((persisted as any).boardColumns as BoardColumnConfig[])
        : base.boardColumns,
    workflowStatuses:
      Array.isArray((persisted as any).workflowStatuses) && (persisted as any).workflowStatuses.length
        ? ((persisted as any).workflowStatuses as string[])
        : base.workflowStatuses,
    workflowTransitions:
      Array.isArray((persisted as any).workflowTransitions) && (persisted as any).workflowTransitions.length
        ? ((persisted as any).workflowTransitions as WorkflowTransitionConfig[])
        : base.workflowTransitions,
    boardConfiguration:
      typeof (persisted as any).boardConfiguration === "object" && (persisted as any).boardConfiguration
        ? {
            ...base.boardConfiguration,
            ...(persisted as any).boardConfiguration,
          }
        : base.boardConfiguration,
    sprintConfiguration:
      typeof (persisted as any).sprintConfiguration === "object" && (persisted as any).sprintConfiguration
        ? {
            ...base.sprintConfiguration,
            ...(persisted as any).sprintConfiguration,
          }
        : base.sprintConfiguration,
    componentCatalog:
      Array.isArray((persisted as any).componentCatalog) && (persisted as any).componentCatalog.length
        ? ((persisted as any).componentCatalog as ComponentRoutingConfig[])
        : base.componentCatalog,
    intakeForms:
      Array.isArray((persisted as any).intakeForms) && (persisted as any).intakeForms.length
        ? ((persisted as any).intakeForms as IntakeFormDefinition[])
        : base.intakeForms,
    automationSelections:
      Array.isArray((persisted as any).automationSelections) && (persisted as any).automationSelections.length
        ? ((persisted as any).automationSelections as AutomationSelection[])
        : base.automationSelections,
    integrationMappings:
      Array.isArray((persisted as any).integrationMappings) && (persisted as any).integrationMappings.length
        ? ((persisted as any).integrationMappings as IntegrationMapping[])
        : base.integrationMappings,
    invitees:
      Array.isArray((persisted as any).invitees) && (persisted as any).invitees.length
        ? ((persisted as any).invitees as MemberInvite[])
        : base.invitees,
    permissionOverrides:
      Array.isArray((persisted as any).permissionOverrides) && (persisted as any).permissionOverrides.length
        ? ((persisted as any).permissionOverrides as PermissionOverride[])
        : base.permissionOverrides,
    importMappings:
      Array.isArray((persisted as any).importMappings) && (persisted as any).importMappings.length
        ? ((persisted as any).importMappings as ImportMapping[])
        : base.importMappings,
    privacyDefault:
      typeof (persisted as any).privacyDefault === "string" && (persisted as any).privacyDefault.length
        ? ((persisted as any).privacyDefault as string)
        : base.privacyDefault,
    notificationDefaults:
      typeof (persisted as any).notificationDefaults === "string" && (persisted as any).notificationDefaults.length
        ? ((persisted as any).notificationDefaults as string)
        : base.notificationDefaults,
    codeManuallyEdited:
      typeof (persisted as any).codeManuallyEdited === "boolean"
        ? (persisted as any).codeManuallyEdited
        : base.codeManuallyEdited,
    startDate: parseDate(persisted.startDate),
    endDate: parseDate(persisted.endDate),
    kickoffDate: parseDate(persisted.kickoffDate),
    discoveryComplete: parseDate(persisted.discoveryComplete),
    launchTarget: parseDate(persisted.launchTarget),
  };
};

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: any) => void;
  initialTemplateId?: string;
}

export function ProjectDialog({ open, onOpenChange, onSuccess, initialTemplateId }: ProjectDialogProps) {
  const { toast } = useToast();
  const telemetry = useTelemetry();
  const tenant = useTenant();
  const createProject = useCreateProject();
  const applyTemplate = useApplyProjectTemplate();
  const { data: templates = [], isLoading: loadingTemplates } = useProjectTemplates();

  const templateMap = useMemo(() => {
    const map = new Map<string, (typeof templates)[number]>();
    templates.forEach(template => map.set(template.id, template));
    return map;
  }, [templates]);

  const [activeStep, setActiveStep] = useState<StepId>(STEP_DEFINITIONS[0].id);
  const [formData, setFormData] = useState<CreationState>(() => createInitialState(initialTemplateId));
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());
  const [attemptedSteps, setAttemptedSteps] = useState<StepId[]>([]);
  const latestFormData = useRef(formData);

  useEffect(() => {
    latestFormData.current = formData;
  }, [formData]);

  useEffect(() => {
    if (formData.codeManuallyEdited) {
      return;
    }
    const nextCode = toProjectKey(formData.name);
    if (nextCode && nextCode !== formData.code) {
      setFormData(prev => ({ ...prev, code: nextCode }));
    }
  }, [formData.name, formData.code, formData.codeManuallyEdited]);

  const clearPersistedState = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const persistedRaw = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!persistedRaw) {
        return;
      }
      const parsed = JSON.parse(persistedRaw) as PersistedCreationState;
      if (!parsed || typeof parsed !== "object") {
        return;
      }
      setFormData(hydrateCreationState(parsed, initialTemplateId));
    } catch (error) {
      console.warn("Failed to hydrate project creation state", error);
    }
  }, [initialTemplateId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const intervalId = window.setInterval(() => {
      try {
        const payload = serializeCreationState(latestFormData.current);
        window.localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn("Failed to persist project creation state", error);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      const template = templateMap.get(templateId);
      if (!template) return;
      const manifest = template.templateData ?? {};
      const modules = manifest.modules ?? template.recommendedModules ?? [];
      const schemes = manifest.schemes ?? {};

      setFormData(prev => ({
        ...prev,
        templateKey: templateId,
        modules: Array.from(new Set(modules)),
        permissionScheme: schemes.permission ?? prev.permissionScheme,
        notificationScheme: schemes.notification ?? prev.notificationScheme,
        slaScheme: schemes.sla ?? prev.slaScheme,
      }));
    },
    [templateMap],
  );

  useEffect(() => {
    if (!templates.length) {
      return;
    }
    if (initialTemplateId && templateMap.has(initialTemplateId)) {
      handleTemplateChange(initialTemplateId);
    } else if (!formData.templateKey) {
      handleTemplateChange(templates[0].id);
    }
  }, [initialTemplateId, templates, templateMap, formData.templateKey, handleTemplateChange]);

  const permissionSchemes = useMemo(
    () => PROJECT_SCHEMES.filter(scheme => scheme.type === "permission"),
    [],
  );
  const notificationSchemes = useMemo(
    () => PROJECT_SCHEMES.filter(scheme => scheme.type === "notification"),
    [],
  );
  const slaSchemes = useMemo(
    () => PROJECT_SCHEMES.filter(scheme => scheme.type === "sla"),
    [],
  );

  const currentStepIndex = STEP_DEFINITIONS.findIndex(step => step.id === activeStep);
  const isFinalStep = currentStepIndex === STEP_DEFINITIONS.length - 1;
  const progress = ((currentStepIndex + 1) / STEP_DEFINITIONS.length) * 100;

  const resetForm = useCallback(() => {
    setActiveStep(STEP_DEFINITIONS[0].id);
    setFormData(createInitialState(initialTemplateId));
    setIdempotencyKey(generateIdempotencyKey());
    setAttemptedSteps([]);
    clearPersistedState();
  }, [clearPersistedState, initialTemplateId]);

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const goToStep = (stepId: StepId) => setActiveStep(stepId);

  const goNext = () => {
    const nextStep = STEP_DEFINITIONS[Math.min(currentStepIndex + 1, STEP_DEFINITIONS.length - 1)];
    setActiveStep(nextStep.id);
  };

  const goPrevious = () => {
    const prevStep = STEP_DEFINITIONS[Math.max(currentStepIndex - 1, 0)];
    setActiveStep(prevStep.id);
  };

  const markStepAttempted = useCallback((stepId: StepId) => {
    setAttemptedSteps(prev => (prev.includes(stepId) ? prev : [...prev, stepId]));
  }, []);

  const toggleModule = (moduleId: string) => {
    setFormData(prev => {
      const isEnabled = prev.modules.includes(moduleId);
      return {
        ...prev,
        modules: isEnabled
          ? prev.modules.filter(item => item !== moduleId)
          : [...prev.modules, moduleId],
      };
    });
  };

  const toggleIntegration = (integrationId: string) => {
    setFormData(prev => {
      const exists = prev.integrationOptions.includes(integrationId);
      return {
        ...prev,
        integrationOptions: exists
          ? prev.integrationOptions.filter(item => item !== integrationId)
          : [...prev.integrationOptions, integrationId],
      };
    });
  };

  const selectedTemplate = useMemo(
    () => templates.find(template => template.id === formData.templateKey) ?? null,
    [templates, formData.templateKey],
  );
  const selectedFieldPreset = useMemo(
    () => PROJECT_FIELD_PRESETS.find(preset => preset.id === formData.fieldPreset),
    [formData.fieldPreset],
  );
  const selectedWorkflow = useMemo(
    () => PROJECT_WORKFLOW_BLUEPRINTS.find(option => option.id === formData.workflowBlueprint),
    [formData.workflowBlueprint],
  );
  const selectedScreenPack = useMemo(
    () => PROJECT_SCREEN_PACKS.find(option => option.id === formData.screenPack),
    [formData.screenPack],
  );
  const selectedComponentPack = useMemo(
    () => PROJECT_COMPONENT_PACKS.find(option => option.id === formData.componentPack),
    [formData.componentPack],
  );
  const selectedVersionStrategy = useMemo(
    () => PROJECT_VERSION_STRATEGIES.find(option => option.id === formData.versionStrategy),
    [formData.versionStrategy],
  );
  const selectedAutomation = useMemo(
    () => PROJECT_AUTOMATION_RECIPES.find(option => option.id === formData.automationRecipe),
    [formData.automationRecipe],
  );
  const selectedViewCollection = useMemo(
    () => PROJECT_VIEW_COLLECTIONS.find(option => option.id === formData.viewCollection),
    [formData.viewCollection],
  );
  const selectedDashboard = useMemo(
    () => PROJECT_DASHBOARD_STARTERS.find(option => option.id === formData.dashboardStarter),
    [formData.dashboardStarter],
  );
  const selectedLifecyclePreset = useMemo(
    () => PROJECT_LIFECYCLE_PRESETS.find(option => option.id === formData.lifecyclePreset),
    [formData.lifecyclePreset],
  );
  const selectedArchival = useMemo(
    () => PROJECT_ARCHIVAL_WORKFLOWS.find(option => option.id === formData.archivalWorkflow),
    [formData.archivalWorkflow],
  );
  const selectedImportOption = useMemo(
    () => PROJECT_IMPORT_OPTIONS.find(option => option.id === formData.importStrategy),
    [formData.importStrategy],
  );

  const selectedModules = useMemo(
    () => PROJECT_MODULES.filter(module => formData.modules.includes(module.id)),
    [formData.modules],
  );
  const selectedIntegrations = useMemo(
    () => PROJECT_INTEGRATION_OPTIONS.filter(integration => formData.integrationOptions.includes(integration.id)),
    [formData.integrationOptions],
  );

  const stepProps: ProjectCreationStepContext = {
    formData,
    setFormData,
    templates,
    loadingTemplates,
    handleTemplateChange,
    selectedTemplate,
    selectedFieldPreset,
    selectedWorkflow,
    selectedScreenPack,
    selectedComponentPack,
    selectedVersionStrategy,
    selectedAutomation,
    selectedViewCollection,
    selectedDashboard,
    selectedLifecyclePreset,
    selectedArchival,
    selectedImportOption,
    selectedModules,
    selectedIntegrations,
    permissionSchemes,
    notificationSchemes,
    slaSchemes,
    toggleModule,
    toggleIntegration,
  };

  const stepValidation = useMemo<Record<StepId, StepValidationResult>>(
    () =>
      computeStepValidation(formData, {
        selectedTemplate,
        selectedFieldPreset,
        selectedWorkflow,
        selectedScreenPack,
        selectedComponentPack,
        selectedVersionStrategy,
      }),
    [
      formData,
      selectedTemplate,
      selectedFieldPreset,
      selectedWorkflow,
      selectedScreenPack,
      selectedComponentPack,
      selectedVersionStrategy,
    ],
  );

  const ActiveStepComponent = STEP_DEFINITIONS[currentStepIndex]?.Component ?? PRJCreateStepABasics;

  const buildPayload = () => {
    const successMetrics = splitList(formData.lifecycleSuccessMetrics);
    const stakeholders = splitList(formData.lifecycleStakeholders);
    const channels = splitList(formData.lifecycleChannels);

    const lifecycle = {
      preset: formData.lifecyclePreset,
      kickoff_date: toISODate(formData.kickoffDate),
      discovery_complete: toISODate(formData.discoveryComplete),
      launch_target: toISODate(formData.launchTarget),
      review_cadence: formData.reviewCadence,
      maintenance_window: formData.maintenanceWindow,
      notes: formData.lifecycleNotes || undefined,
      mission: formData.lifecycleMission || undefined,
      success_metrics: successMetrics.length ? successMetrics : undefined,
      stakeholders: stakeholders.length ? stakeholders : undefined,
      communication_channels: channels.length ? channels : undefined,
      visibility: formData.visibility,
      default_language: formData.language,
      working_days: formData.workingDays.length
        ? Array.from(new Set(formData.workingDays))
        : undefined,
      icon: formData.icon,
      color: formData.color,
      workspace_path: formData.workspacePath || undefined,
      idempotency_key: idempotencyKey,
      phases: selectedLifecyclePreset?.phases.map(phase => ({
        key: phase.key,
        label: phase.label,
        description: phase.description,
      })),
    };

    const archivalRetention = selectedArchival?.retention
      ? parseInt(selectedArchival.retention, 10)
      : undefined;

    return {
      name: formData.name,
      description: formData.description || undefined,
      code: formData.code || undefined,
      status: formData.status,
      start_date: toISODate(formData.startDate),
      end_date: toISODate(formData.endDate),
      template_key: formData.templateKey,
      modules: formData.modules,
      permission_scheme_id: formData.permissionScheme,
      notification_scheme_id: formData.notificationScheme,
      sla_scheme_id: formData.slaScheme,
      field_configuration: selectedFieldPreset?.fields,
      workflow_blueprint: selectedWorkflow?.states,
      screen_ids: selectedScreenPack?.screens,
      component_pack: selectedComponentPack?.components,
      version_streams: selectedVersionStrategy
        ? [`${selectedVersionStrategy.name} (${selectedVersionStrategy.cadence})`]
        : undefined,
      board_setup: {
        groups: formData.boardGroups,
        columns: formData.boardColumns.map(column => ({
          id: column.id,
          name: column.name,
          group: column.group,
          wip_limit: column.wipLimit ?? undefined,
        })),
        configuration: formData.boardConfiguration,
      },
      workflow_config: {
        statuses: formData.workflowStatuses,
        transitions: formData.workflowTransitions.map(transition => ({
          id: transition.id,
          from: transition.from,
          to: transition.to,
          rule: transition.rule,
        })),
      },
      sprint_settings: {
        cadence: formData.sprintConfiguration.cadence,
        capacity: formData.sprintConfiguration.capacity,
        release_cadence: formData.sprintConfiguration.releaseCadence,
        review_cadence: formData.reviewCadence,
        maintenance_window: formData.maintenanceWindow,
      },
      component_catalog: formData.componentCatalog,
      intake_forms: formData.intakeForms,
      automation_plan: {
        primary_recipe: formData.automationRecipe,
        additional: formData.automationSelections.filter(selection => selection.enabled).map(selection => selection.id),
      },
      integration_configs: formData.integrationMappings,
      members: formData.invitees,
      permissions: {
        scheme_id: formData.permissionScheme,
        notification_scheme_id: formData.notificationScheme,
        sla_scheme_id: formData.slaScheme,
        overrides: formData.permissionOverrides,
        privacy_default: formData.privacyDefault,
        notification_default: formData.notificationDefaults,
      },
      default_views: selectedViewCollection?.views,
      dashboard_ids: selectedDashboard ? [selectedDashboard.id] : undefined,
      import_strategy: formData.importStrategy,
      import_mappings: formData.importMappings,
      import_sources: selectedImportOption?.sources,
      lifecycle,
      calendar_id: formData.calendarId || undefined,
      timezone: formData.timezone,
      archival_policy: selectedArchival
        ? {
            retention_period_days: Number.isFinite(archivalRetention) ? archivalRetention : undefined,
            export_destinations:
              formData.importStrategy === "external_sync"
                ? ["data_lake", "connected_system"]
                : ["workspace_archive"],
            notify_groups: ["project-owners", "governance"],
            workflow_id: selectedArchival.id,
            name: selectedArchival.name,
          }
        : undefined,
      idempotency_key: idempotencyKey,
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = stepValidation[activeStep];
    if (!validation?.valid) {
      markStepAttempted(activeStep);
      const [firstIssue] = validation.issues;
      toast({
        title: "Complete the current step",
        description: firstIssue ?? "Please resolve the highlighted fields before continuing.",
        variant: "destructive",
      });
      return;
    }

    if (!isFinalStep) {
      markStepAttempted(activeStep);
      goNext();
      return;
    }

    const blockingStep = STEP_DEFINITIONS.find(step => !stepValidation[step.id]?.valid);
    if (blockingStep && blockingStep.id !== activeStep) {
      markStepAttempted(blockingStep.id);
      setActiveStep(blockingStep.id);
      const [firstIssue] = stepValidation[blockingStep.id]?.issues ?? [];
      toast({
        title: "Review configuration",
        description: firstIssue ?? "Resolve issues in the highlighted step before creating the project.",
        variant: "destructive",
      });
      return;
    }

    markStepAttempted(activeStep);

    try {
      const payload = buildPayload();
      const project = await createProject.mutateAsync(payload);

      const artifacts = await orchestrateProjectArtifacts({
        projectId: project.id,
        workspaceId: tenant.workspaceId ?? undefined,
        timezone: formData.timezone,
        visibility: formData.visibility,
        modules: formData.modules,
        templateKey: formData.templateKey || null,
        workflowBlueprint: selectedWorkflow
          ? { id: selectedWorkflow.id, name: selectedWorkflow.name, states: selectedWorkflow.states }
          : null,
        importStrategy: formData.importStrategy,
        importSources: selectedImportOption?.sources ?? [],
      });

      if (artifacts.board) {
        telemetry.track("project.create_board", {
          projectId: project.id,
          boardId: artifacts.board.id,
          moduleCount: artifacts.board.modules.length,
          templateKey: artifacts.board.templateKey ?? undefined,
        });
      }

      if (artifacts.workflow) {
        telemetry.track("project.create_workflow", {
          projectId: project.id,
          workflowId: artifacts.workflow.id,
          blueprintId: artifacts.workflow.blueprintId,
          stateCount: artifacts.workflow.states.length,
        });
      }

      if (artifacts.importJob) {
        telemetry.track("project.create_import", {
          projectId: project.id,
          importJobId: artifacts.importJob.id,
          strategy: artifacts.importJob.strategy,
          sourceCount: artifacts.importJob.sources.length,
        });
      }

      if (formData.templateKey) {
        try {
          await applyTemplate.mutateAsync({ projectId: project.id, templateId: formData.templateKey });
        } catch (templateError: any) {
          console.error("Error applying template:", templateError);
          toast({
            title: "Template apply failed",
            description:
              templateError?.message ??
              "The project was created but the template manifest could not be applied automatically.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Project Created",
        description: `${formData.name} has been created successfully.`,
      });

      onSuccess?.(project);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Guide your team through templates, modules, lifecycle, and launch readiness in minutes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Step {currentStepIndex + 1} of {STEP_DEFINITIONS.length}
                </p>
                <h3 className="text-xl font-semibold text-foreground">
                  {STEP_DEFINITIONS[currentStepIndex].title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {STEP_DEFINITIONS[currentStepIndex].description}
                </p>
              </div>
              <div className="w-40">
                <Progress value={progress} className="h-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-5">
              {STEP_DEFINITIONS.map((step, index) => {
                const reached = index <= currentStepIndex;
                const validation = stepValidation[step.id];
                const attempted = attemptedSteps.includes(step.id) || reached;
                const badge = (() => {
                  if (!attempted || !validation) return null;
                  if (validation.valid) {
                    return (
                      <Badge variant="outline" className="ml-auto hidden sm:flex">
                        Complete
                      </Badge>
                    );
                  }
                  if (validation.issues.length) {
                    return (
                      <Badge variant="destructive" className="ml-auto hidden sm:flex">
                        Needs review
                      </Badge>
                    );
                  }
                  return null;
                })();
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2",
                      reached
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                        reached
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {reached ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="hidden text-xs font-medium sm:block">{step.title}</span>
                    {badge}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <ActiveStepComponent {...stepProps} />

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activeStep !== "basics" && (
                <Button type="button" variant="ghost" size="sm" onClick={goPrevious}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.name.trim() || createProject.isPending}
              >
                {isFinalStep ? (createProject.isPending ? "Creating..." : "Create Project") : "Next"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const __testing__ = {
  createInitialState,
  computeStepValidation,
};

function PRJCreateStepABasics({ formData, setFormData }: ProjectCreationStepContext) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">Project Name *</Label>
          <Input
            id="project-name"
            value={formData.name}
            onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))}
            placeholder="Atlas Product Launch"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            value={formData.description}
            onChange={event => setFormData(prev => ({ ...prev, description: event.target.value }))}
            placeholder="Objectives, scope, and success criteria for the initiative"
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-code">Project Code</Label>
          <Input
            id="project-code"
            value={formData.code}
            onChange={event => {
              const normalized = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
              setFormData(prev => ({
                ...prev,
                code: normalized.slice(0, 10),
                codeManuallyEdited: true,
              }));
            }}
            placeholder="ATLAS"
            maxLength={10}
          />
          <p className="text-xs text-muted-foreground">
            Used for issue keys, URLs, and referencing the project externally.
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            onClick={() =>
              setFormData(prev => ({
                ...prev,
                codeManuallyEdited: false,
              }))
            }
            disabled={!formData.name.trim()}
          >
            Use suggested key
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select
            value={formData.visibility}
            onValueChange={value => setFormData(prev => ({ ...prev, visibility: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose who can access the project" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_VISIBILITY_OPTIONS.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-workspace">Workspace Folder</Label>
          <Input
            id="project-workspace"
            value={formData.workspacePath}
            onChange={event => setFormData(prev => ({ ...prev, workspacePath: event.target.value }))}
            placeholder="/Delivery/Programs/Q4 Launch"
          />
          <p className="text-xs text-muted-foreground">
            Optional: reference where this project should appear in workspace navigation.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Project Icon</Label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_ICON_OPTIONS.map(icon => (
              <Button
                key={icon}
                type="button"
                variant={formData.icon === icon ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, icon }))}
              >
                <span className="text-lg leading-none">{icon}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Project Color</Label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLOR_OPTIONS.map(color => (
              <button
                key={color}
                type="button"
                className={cn(
                  "h-8 w-8 rounded-full border-2",
                  formData.color === color ? "border-primary" : "border-transparent",
                )}
                style={{ backgroundColor: color }}
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                aria-label={`Select ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select value={formData.timezone} onValueChange={value => setFormData(prev => ({ ...prev, timezone: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {DEFAULT_TIMEZONES.map(timezone => (
                <SelectItem key={timezone} value={timezone}>
                  {timezone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Working Days</Label>
          <div className="flex flex-wrap gap-2">
            {WORKING_DAY_OPTIONS.map(option => {
              const active = formData.workingDays.includes(option.id);
              return (
                <Button
                  key={option.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      workingDays: active
                        ? prev.workingDays.filter(day => day !== option.id)
                        : [...prev.workingDays, option.id],
                    }))
                  }
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Default Language</Label>
          <Select value={formData.language} onValueChange={value => setFormData(prev => ({ ...prev, language: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Project Status</Label>
          <Select
            value={formData.status}
            onValueChange={value =>
              setFormData(prev => ({ ...prev, status: value as CreationState["status"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUS_FILTER_OPTIONS.filter(option => option.value !== "archived").map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startDate ? format(formData.startDate, "PPP") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.startDate}
                  onSelect={date => setFormData(prev => ({ ...prev, startDate: date ?? undefined }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Target Completion</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.endDate ? format(formData.endDate, "PPP") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.endDate}
                  onSelect={date => setFormData(prev => ({ ...prev, endDate: date ?? undefined }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Baseline Alignment</CardTitle>
            <CardDescription>
              Ensure the project charter, scope, and sponsors are aligned before moving forward.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Tip:</strong> capture a short mission statement and expected outcomes so that the lifecycle metadata
              remains actionable through delivery.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepBTemplate({
  formData,
  setFormData,
  templates,
  loadingTemplates,
  handleTemplateChange,
  selectedTemplate,
  selectedFieldPreset,
  selectedWorkflow,
  selectedScreenPack,
  selectedComponentPack,
  selectedVersionStrategy,
}: ProjectCreationStepContext) {
  return (
    <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
      <div className="space-y-4">
        <Label className="text-sm font-medium">Project Templates</Label>
        <RadioGroup value={formData.templateKey} onValueChange={handleTemplateChange}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {loadingTemplates ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base text-muted-foreground">Loading templates…</CardTitle>
                </CardHeader>
              </Card>
            ) : templates.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">No templates available</CardTitle>
                  <CardDescription>
                    Create a custom template from an existing project to jumpstart your workspace configuration.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              templates.map(template => {
                const isSelected = formData.templateKey === template.id;
                return (
                  <Card
                    key={template.id}
                    className={cn(
                      "cursor-pointer border transition",
                      isSelected ? "border-primary shadow-sm" : "border-border hover:border-primary/40",
                    )}
                    onClick={() => handleTemplateChange(template.id)}
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <p className="text-xs uppercase text-muted-foreground">{template.category}</p>
                        </div>
                        <RadioGroupItem value={template.id} className="mt-1" />
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Recommended Modules</p>
                      <div className="flex flex-wrap gap-2">
                        {template.recommendedModules.map(moduleId => {
                          const module = PROJECT_MODULES.find(item => item.id === moduleId);
                          return (
                            <Badge key={moduleId} variant="outline">
                              {module?.name ?? moduleId}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Field Preset</Label>
          <Select value={formData.fieldPreset} onValueChange={value => setFormData(prev => ({ ...prev, fieldPreset: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_FIELD_PRESETS.map(preset => (
                <SelectItem key={preset.id} value={preset.id}>
                  <div className="flex flex-col">
                    <span>{preset.name}</span>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFieldPreset && (
            <p className="text-xs text-muted-foreground">Fields: {selectedFieldPreset.fields.join(", ")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Workflow Blueprint</Label>
          <Select
            value={formData.workflowBlueprint}
            onValueChange={value => setFormData(prev => ({ ...prev, workflowBlueprint: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_WORKFLOW_BLUEPRINTS.map(blueprint => (
                <SelectItem key={blueprint.id} value={blueprint.id}>
                  <div className="flex flex-col">
                    <span>{blueprint.name}</span>
                    <span className="text-xs text-muted-foreground">{blueprint.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedWorkflow && (
            <p className="text-xs text-muted-foreground">States: {selectedWorkflow.states.join(" → ")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Screen Pack</Label>
          <Select value={formData.screenPack} onValueChange={value => setFormData(prev => ({ ...prev, screenPack: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_SCREEN_PACKS.map(pack => (
                <SelectItem key={pack.id} value={pack.id}>
                  <div className="flex flex-col">
                    <span>{pack.name}</span>
                    <span className="text-xs text-muted-foreground">{pack.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Component Catalog</Label>
          <Select
            value={formData.componentPack}
            onValueChange={value => setFormData(prev => ({ ...prev, componentPack: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_COMPONENT_PACKS.map(pack => (
                <SelectItem key={pack.id} value={pack.id}>
                  <div className="flex flex-col">
                    <span>{pack.name}</span>
                    <span className="text-xs text-muted-foreground">{pack.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Version Strategy</Label>
          <Select
            value={formData.versionStrategy}
            onValueChange={value => setFormData(prev => ({ ...prev, versionStrategy: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_VERSION_STRATEGIES.map(strategy => (
                <SelectItem key={strategy.id} value={strategy.id}>
                  <div className="flex flex-col">
                    <span>{strategy.name}</span>
                    <span className="text-xs text-muted-foreground">{strategy.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVersionStrategy && (
            <p className="text-xs text-muted-foreground">Cadence: {selectedVersionStrategy.cadence}</p>
          )}
        </div>
      </div>
    </div>
  );
}



function PRJCreateStepCColumnsGroups({
  formData,
  setFormData,
  selectedViewCollection,
}: ProjectCreationStepContext) {
  const groupsText = formData.boardGroups.join("\n");
  const normalizedGroups = formData.boardGroups.map(group => group.trim()).filter(Boolean);

  const updateGroups = (value: string) => {
    const groups = value
      .split("\n")
      .map(entry => entry.trim())
      .filter(Boolean);
    setFormData(prev => ({
      ...prev,
      boardGroups: groups.length ? groups : ["Planned"],
      boardColumns: prev.boardColumns.map(column => ({
        ...column,
        group: groups.includes(column.group) ? column.group : groups[0] ?? column.group,
      })),
    }));
  };

  const updateColumn = (index: number, updates: Partial<BoardColumnConfig>) => {
    setFormData(prev => ({
      ...prev,
      boardColumns: prev.boardColumns.map((column, idx) =>
        idx === index
          ? {
              ...column,
              ...updates,
              wipLimit:
                typeof updates.wipLimit === "number"
                  ? updates.wipLimit
                  : updates.wipLimit === null
                  ? null
                  : column.wipLimit,
            }
          : column,
      ),
    }));
  };

  const addColumn = () => {
    setFormData(prev => ({
      ...prev,
      boardColumns: [
        ...prev.boardColumns,
        {
          id: `column-${prev.boardColumns.length + 1}`,
          name: `Column ${prev.boardColumns.length + 1}`,
          group: prev.boardGroups[0] ?? "Planned",
          wipLimit: null,
        },
      ],
    }));
  };

  const removeColumn = (index: number) => {
    setFormData(prev => ({
      ...prev,
      boardColumns: prev.boardColumns.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Swimlane Groups</Label>
          <Textarea
            value={groupsText}
            onChange={event => updateGroups(event.target.value)}
            rows={normalizedGroups.length ? normalizedGroups.length + 1 : 3}
            placeholder={"Planned\nActive\nDone"}
          />
          <p className="text-xs text-muted-foreground">
            One group per line. Columns inherit visibility and WIP caps from the group.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Board Columns</Label>
            <Button type="button" variant="outline" size="sm" onClick={addColumn}>
              <Plus className="mr-1 h-4 w-4" /> Add column
            </Button>
          </div>
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="divide-y">
              {formData.boardColumns.map((column, index) => (
                <div key={column.id ?? index} className="grid gap-3 p-4 sm:grid-cols-[2fr,2fr,1fr,auto]">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Column</Label>
                    <Input
                      value={column.name}
                      onChange={event => updateColumn(index, { name: event.target.value })}
                      placeholder="In Progress"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Group</Label>
                    <Select value={column.group} onValueChange={value => updateColumn(index, { group: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {normalizedGroups.length ? (
                          normalizedGroups.map(group => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="Planned">Planned</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">WIP limit</Label>
                    <Input
                      type="number"
                      min={1}
                      value={column.wipLimit ?? ""}
                      onChange={event => {
                        const value = event.target.value;
                        updateColumn(index, {
                          wipLimit: value ? Number.parseInt(value, 10) || 0 : null,
                        });
                      }}
                      placeholder="5"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeColumn(index)}
                      disabled={formData.boardColumns.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default Views</CardTitle>
            <CardDescription>
              Ensure columns align with saved boards your team relies on for delivery and governance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedViewCollection ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {selectedViewCollection.views.map(view => (
                  <li key={view}>• {view}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Select a view collection to preview associated boards.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guidance</CardTitle>
            <CardDescription>
              Establish at least three groups (planned, active, done) to visualise flow and make status checks effortless.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepDWorkflowStatus({
  formData,
  setFormData,
  selectedWorkflow,
}: ProjectCreationStepContext) {
  const statusesText = formData.workflowStatuses.join("\n");

  const updateStatuses = (value: string) => {
    const statuses = value
      .split("\n")
      .map(status => status.trim())
      .filter(Boolean);
    setFormData(prev => ({
      ...prev,
      workflowStatuses: statuses,
      workflowTransitions: prev.workflowTransitions.filter(
        transition => statuses.includes(transition.from) && statuses.includes(transition.to),
      ),
    }));
  };

  const updateTransition = (index: number, updates: Partial<WorkflowTransitionConfig>) => {
    setFormData(prev => ({
      ...prev,
      workflowTransitions: prev.workflowTransitions.map((transition, idx) =>
        idx === index
          ? {
              ...transition,
              ...updates,
              rule: updates.rule ?? transition.rule,
            }
          : transition,
      ),
    }));
  };

  const addTransition = () => {
    const [first, second] = formData.workflowStatuses;
    setFormData(prev => ({
      ...prev,
      workflowTransitions: [
        ...prev.workflowTransitions,
        {
          id: `transition-${prev.workflowTransitions.length + 1}`,
          from: first ?? "Backlog",
          to: second ?? first ?? "In Progress",
          rule: "Standard flow",
        },
      ],
    }));
  };

  const removeTransition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workflowTransitions: prev.workflowTransitions.filter((_, idx) => idx !== index),
    }));
  };

  const statusOptions = formData.workflowStatuses.map(status => status.trim()).filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Status Set</Label>
          <Textarea
            value={statusesText}
            onChange={event => updateStatuses(event.target.value)}
            rows={statusOptions.length ? statusOptions.length + 1 : 4}
            placeholder={selectedWorkflow?.states.join("\n") ?? "Backlog\nReady\nIn Progress\nDone"}
          />
          <p className="text-xs text-muted-foreground">List each status on a new line in the order work should progress.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Transitions</Label>
            <Button type="button" variant="outline" size="sm" onClick={addTransition}>
              <Plus className="mr-1 h-4 w-4" /> Add transition
            </Button>
          </div>
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="divide-y">
              {formData.workflowTransitions.map((transition, index) => (
                <div key={transition.id ?? index} className="grid gap-3 p-4 sm:grid-cols-[1fr,1fr,2fr,auto]">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Select value={transition.from} onValueChange={value => updateTransition(index, { from: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.length ? (
                          statusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="Backlog">Backlog</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Select value={transition.to} onValueChange={value => updateTransition(index, { to: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.length ? (
                          statusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="Done">Done</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Transition guard</Label>
                    <Input
                      value={transition.rule}
                      onChange={event => updateTransition(index, { rule: event.target.value })}
                      placeholder="Requires QA approval"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTransition(index)}
                      disabled={formData.workflowTransitions.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blueprint reference</CardTitle>
            <CardDescription>
              Use the selected workflow blueprint as inspiration, then tailor statuses to your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedWorkflow ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{selectedWorkflow.name}</p>
                <p>{selectedWorkflow.description}</p>
                <p>Default states: {selectedWorkflow.states.join(" → ")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a workflow blueprint in the previous step to preview states.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operational tip</CardTitle>
            <CardDescription>
              Document exit criteria in transition guards to make service transitions auditable and predictable.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepEBoards({
  formData,
  setFormData,
  selectedTemplate,
  toggleModule,
}: ProjectCreationStepContext) {
  const updateBoardConfiguration = <K extends keyof BoardConfiguration>(
    key: K,
    value: BoardConfiguration[K],
  ) => {
    setFormData(prev => ({
      ...prev,
      boardConfiguration: {
        ...prev.boardConfiguration,
        [key]: value,
      },
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Methodology</Label>
            <Select
              value={formData.boardConfiguration.methodology}
              onValueChange={value =>
                updateBoardConfiguration("methodology", value as BoardConfiguration["methodology"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scrum">Scrum</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Board Name</Label>
            <Input
              value={formData.boardConfiguration.defaultBoard}
              onChange={event => updateBoardConfiguration("defaultBoard", event.target.value)}
              placeholder="Delivery Board"
            />
          </div>
          <div className="space-y-2">
            <Label>Backlog Mapping</Label>
            <Input
              value={formData.boardConfiguration.backlogMapping}
              onChange={event => updateBoardConfiguration("backlogMapping", event.target.value)}
              placeholder="Product Backlog"
            />
          </div>
          <div className="space-y-2">
            <Label>Estimation Field</Label>
            <Input
              value={formData.boardConfiguration.estimationField}
              onChange={event => updateBoardConfiguration("estimationField", event.target.value)}
              placeholder="Story Points"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Modules enabled</Label>
          <ScrollArea className="h-[280px] rounded-md border">
            <div className="space-y-3 p-4">
              {PROJECT_MODULES.map(module => {
                const enabled = formData.modules.includes(module.id);
                const recommended = selectedTemplate?.recommendedModules.includes(module.id);
                return (
                  <div
                    key={module.id}
                    className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {module.name}
                        {recommended && (
                          <Badge variant="outline" className="ml-2 text-xs uppercase">
                            Recommended
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    <Switch checked={enabled} onCheckedChange={() => toggleModule(module.id)} />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground">
            Modules control which board features (backlog, release hub, request queues) are provisioned on day one.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Methodology guidance</CardTitle>
            <CardDescription>
              Scrum adds sprint planning, commitment, and review ceremonies. Kanban keeps work continuously flowing.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backlog routing</CardTitle>
            <CardDescription>
              Align backlog mapping with intake forms to guarantee new work lands in the right queue and board column.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepFSprintsReleases({ formData, setFormData }: ProjectCreationStepContext) {
  const updateSprintConfiguration = <K extends keyof SprintConfiguration>(
    key: K,
    value: SprintConfiguration[K],
  ) => {
    setFormData(prev => ({
      ...prev,
      sprintConfiguration: {
        ...prev.sprintConfiguration,
        [key]: value,
      },
    }));
  };

  const cadenceOptions = ["1 week", "2 weeks", "3 weeks", "4 weeks"];
  const releaseCadenceOptions = Array.from(new Set(PROJECT_VERSION_STRATEGIES.map(strategy => strategy.cadence)));

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Sprint cadence</Label>
            <Select
              value={formData.sprintConfiguration.cadence}
              onValueChange={value => updateSprintConfiguration("cadence", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cadenceOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Team capacity</Label>
            <Input
              type="number"
              min={1}
              value={formData.sprintConfiguration.capacity}
              onChange={event => updateSprintConfiguration("capacity", Number(event.target.value) || 0)}
              placeholder="25"
            />
          </div>
          <div className="space-y-2">
            <Label>Release cadence</Label>
            <Select
              value={formData.sprintConfiguration.releaseCadence}
              onValueChange={value => updateSprintConfiguration("releaseCadence", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {releaseCadenceOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Review cadence</Label>
          <Select value={formData.reviewCadence} onValueChange={value => setFormData(prev => ({ ...prev, reviewCadence: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reviewCadenceOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Maintenance window</Label>
          <Select
            value={formData.maintenanceWindow}
            onValueChange={value => setFormData(prev => ({ ...prev, maintenanceWindow: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {maintenanceWindowOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Kickoff",
              value: formData.kickoffDate,
              onSelect: (date?: Date) => setFormData(prev => ({ ...prev, kickoffDate: date ?? undefined })),
            },
            {
              label: "Discovery complete",
              value: formData.discoveryComplete,
              onSelect: (date?: Date) => setFormData(prev => ({ ...prev, discoveryComplete: date ?? undefined })),
            },
            {
              label: "Launch target",
              value: formData.launchTarget,
              onSelect: (date?: Date) => setFormData(prev => ({ ...prev, launchTarget: date ?? undefined })),
            },
          ].map(item => (
            <div key={item.label} className="space-y-2">
              <Label>{item.label}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !item.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {item.value ? format(item.value, "PPP") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={item.value} onSelect={item.onSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calendar alignment</CardTitle>
            <CardDescription>
              Sync sprint boundaries and release trains with the change calendar to avoid blackout conflicts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label className="text-xs text-muted-foreground">Delivery calendar</Label>
            <Select value={formData.calendarId} onValueChange={value => setFormData(prev => ({ ...prev, calendarId: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendarOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cadence insight</CardTitle>
            <CardDescription>
              Use shorter sprints when experimenting, then expand cadence as delivery predictability increases.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepGComponentsRouting({
  formData,
  setFormData,
  selectedComponentPack,
}: ProjectCreationStepContext) {
  const updateComponent = (index: number, updates: Partial<ComponentRoutingConfig>) => {
    setFormData(prev => ({
      ...prev,
      componentCatalog: prev.componentCatalog.map((component, idx) =>
        idx === index
          ? {
              ...component,
              ...updates,
            }
          : component,
      ),
    }));
  };

  const addComponent = () => {
    setFormData(prev => ({
      ...prev,
      componentCatalog: [
        ...prev.componentCatalog,
        {
          id: `component-${prev.componentCatalog.length + 1}`,
          name: `Component ${prev.componentCatalog.length + 1}`,
          owner: "Unassigned",
          routingQueue: "Default",
        },
      ],
    }));
  };

  const removeComponent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      componentCatalog: prev.componentCatalog.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Component catalog</Label>
          <Button type="button" variant="outline" size="sm" onClick={addComponent}>
            <Plus className="mr-1 h-4 w-4" /> Add component
          </Button>
        </div>
        <ScrollArea className="h-[320px] rounded-md border">
          <div className="divide-y">
            {formData.componentCatalog.map((component, index) => (
              <div key={component.id ?? index} className="grid gap-3 p-4 sm:grid-cols-[1.2fr,1fr,1fr,auto]">
                <Input
                  value={component.name}
                  onChange={event => updateComponent(index, { name: event.target.value })}
                  placeholder="Web"
                />
                <Input
                  value={component.owner}
                  onChange={event => updateComponent(index, { owner: event.target.value })}
                  placeholder="Owner"
                />
                <Input
                  value={component.routingQueue}
                  onChange={event => updateComponent(index, { routingQueue: event.target.value })}
                  placeholder="Routing queue"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeComponent(index)}
                  disabled={formData.componentCatalog.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Component pack</CardTitle>
            <CardDescription>
              Selected catalogs provide a starting list of services and subsystems to accelerate routing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedComponentPack ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{selectedComponentPack.name}</p>
                <p>{selectedComponentPack.description}</p>
                <p>Includes: {selectedComponentPack.components.join(", ")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a component pack in the template step.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routing tip</CardTitle>
            <CardDescription>
              Assign owners to each component so triage rules and on-call automations know who to notify.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepHFormsIntake({ formData, setFormData }: ProjectCreationStepContext) {
  const updateForm = (index: number, updates: Partial<IntakeFormDefinition>) => {
    setFormData(prev => ({
      ...prev,
      intakeForms: prev.intakeForms.map((form, idx) =>
        idx === index
          ? {
              ...form,
              ...updates,
            }
          : form,
      ),
    }));
  };

  const addForm = () => {
    setFormData(prev => ({
      ...prev,
      intakeForms: [
        ...prev.intakeForms,
        { id: `form-${prev.intakeForms.length + 1}`, name: "New form", audience: "internal", routing: "Core Team" },
      ],
    }));
  };

  const removeForm = (index: number) => {
    setFormData(prev => ({
      ...prev,
      intakeForms: prev.intakeForms.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Forms</Label>
          <Button type="button" variant="outline" size="sm" onClick={addForm}>
            <Plus className="mr-1 h-4 w-4" /> Add form
          </Button>
        </div>
        <ScrollArea className="h-[320px] rounded-md border">
          <div className="divide-y">
            {formData.intakeForms.map((form, index) => (
              <div key={form.id ?? index} className="grid gap-3 p-4 sm:grid-cols-[1.2fr,1fr,1fr,auto]">
                <Input
                  value={form.name}
                  onChange={event => updateForm(index, { name: event.target.value })}
                  placeholder="Customer Intake"
                />
                <Select
                  value={form.audience}
                  onValueChange={value => updateForm(index, { audience: value as IntakeFormDefinition["audience"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={form.routing}
                  onChange={event => updateForm(index, { routing: event.target.value })}
                  placeholder="Routes to core triage"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeForm(index)}
                  disabled={formData.intakeForms.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routing guidance</CardTitle>
            <CardDescription>
              Match forms to board columns so new work arrives pre-triaged with the right component owners.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audience note</CardTitle>
            <CardDescription>
              Public forms surface in customer portals, internal forms support partner teams and cross-functional requests.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepIAutomations({ formData, setFormData }: ProjectCreationStepContext) {
  const toggleSelection = (id: string) => {
    setFormData(prev => ({
      ...prev,
      automationSelections: prev.automationSelections.map(selection =>
        selection.id === id ? { ...selection, enabled: !selection.enabled } : selection,
      ),
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Primary automation recipe</Label>
          <RadioGroup
            value={formData.automationRecipe}
            onValueChange={value => setFormData(prev => ({ ...prev, automationRecipe: value }))}
            className="space-y-3"
          >
            {PROJECT_AUTOMATION_RECIPES.map(recipe => (
              <Card
                key={recipe.id}
                className={cn("border", formData.automationRecipe === recipe.id && "border-primary bg-primary/5")}
              >
                <CardHeader className="flex flex-row items-start gap-4">
                  <RadioGroupItem value={recipe.id} className="mt-1" />
                  <div>
                    <CardTitle className="text-base">{recipe.name}</CardTitle>
                    <CardDescription>{recipe.description}</CardDescription>
                    <p className="text-xs text-muted-foreground">Triggers: {recipe.triggers.join(", ")}</p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Starter flows</Label>
          <div className="space-y-3">
            {PROJECT_AUTOMATION_RECIPES.map(recipe => {
              const selection = formData.automationSelections.find(item => item.id === recipe.id);
              const enabled = selection?.enabled ?? false;
              return (
                <div
                  key={recipe.id}
                  className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{recipe.name}</p>
                    <p className="text-xs text-muted-foreground">{recipe.description}</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={() => toggleSelection(recipe.id)} />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Enable additional flows for no-code automation that notify owners, re-open items, or escalate risks.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Automation best practice</CardTitle>
            <CardDescription>
              Start with one core recipe, then incrementally enable supporting flows for guardrails and escalations.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggested next steps</CardTitle>
            <CardDescription>
              Pair automation rules with integrations so incidents, deployments, and approvals stay in sync.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepJIntegrations({
  formData,
  setFormData,
  selectedIntegrations,
  toggleIntegration,
}: ProjectCreationStepContext) {
  const setMappingEnabled = (id: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      integrationMappings: prev.integrationMappings.map(mapping =>
        mapping.id === id ? { ...mapping, enabled } : mapping,
      ),
    }));
  };

  const updateProjectKey = (id: string, projectKey: string) => {
    setFormData(prev => ({
      ...prev,
      integrationMappings: prev.integrationMappings.map(mapping =>
        mapping.id === id ? { ...mapping, projectKey } : mapping,
      ),
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Integrations</Label>
        <ScrollArea className="h-[320px] rounded-md border">
          <div className="divide-y">
            {PROJECT_INTEGRATION_OPTIONS.map(option => {
              const mapping = formData.integrationMappings.find(item => item.id === option.id);
              const enabled = mapping?.enabled ?? false;
              const optionCurrentlySelected = formData.integrationOptions.includes(option.id);
              return (
                <div key={option.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{option.name}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={value => {
                        setMappingEnabled(option.id, value);
                        if (value !== optionCurrentlySelected) {
                          toggleIntegration(option.id);
                        }
                      }}
                    />
                  </div>
                  {enabled && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Project mapping</Label>
                      <Input
                        value={mapping?.projectKey ?? ""}
                        onChange={event => updateProjectKey(option.id, event.target.value)}
                        placeholder="workspace/project-key"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {selectedIntegrations.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Enabled: {selectedIntegrations.map(item => item.name).join(", ")}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integration mapping</CardTitle>
            <CardDescription>
              Define workspace or project identifiers so updates flow in both directions without manual sync.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security note</CardTitle>
            <CardDescription>
              Limit access keys to production systems and audit enabled integrations each quarter.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepKMembersRoles({ formData, setFormData }: ProjectCreationStepContext) {
  const updateInvitee = (index: number, updates: Partial<MemberInvite>) => {
    setFormData(prev => ({
      ...prev,
      invitees: prev.invitees.map((invite, idx) =>
        idx === index
          ? {
              ...invite,
              ...updates,
            }
          : invite,
      ),
    }));
  };

  const addInvitee = () => {
    setFormData(prev => ({
      ...prev,
      invitees: [
        ...prev.invitees,
        { id: `invite-${prev.invitees.length + 1}`, name: "New teammate", role: "Contributor", email: "" },
      ],
    }));
  };

  const removeInvitee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      invitees: prev.invitees.filter((_, idx) => idx !== index),
    }));
  };

  const defaultRoles = ["Project Admin", "Manager", "Contributor", "Stakeholder"];

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Team roster</Label>
          <Button type="button" variant="outline" size="sm" onClick={addInvitee}>
            <Plus className="mr-1 h-4 w-4" /> Add invite
          </Button>
        </div>
        <ScrollArea className="h-[320px] rounded-md border">
          <div className="divide-y">
            {formData.invitees.map((invite, index) => (
              <div key={invite.id ?? index} className="grid gap-3 p-4 sm:grid-cols-[1.2fr,1.2fr,1fr,auto]">
                <Input
                  value={invite.name}
                  onChange={event => updateInvitee(index, { name: event.target.value })}
                  placeholder="Teammate name"
                />
                <Input
                  value={invite.email}
                  onChange={event => updateInvitee(index, { email: event.target.value })}
                  placeholder="name@example.com"
                />
                <Select value={invite.role} onValueChange={value => updateInvitee(index, { role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInvitee(index)}
                  disabled={formData.invitees.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role guidance</CardTitle>
            <CardDescription>
              Invite at least one admin, a delivery lead, and stakeholders for read-only updates.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team defaults</CardTitle>
            <CardDescription>
              Default roles can be customised after creation to map to your organisation’s permission scheme.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepLPermissions({
  formData,
  setFormData,
  permissionSchemes,
  notificationSchemes,
  slaSchemes,
}: ProjectCreationStepContext) {
  const updateOverride = (index: number, updates: Partial<PermissionOverride>) => {
    setFormData(prev => ({
      ...prev,
      permissionOverrides: prev.permissionOverrides.map((override, idx) =>
        idx === index
          ? {
              ...override,
              ...updates,
            }
          : override,
      ),
    }));
  };

  const addOverride = () => {
    setFormData(prev => ({
      ...prev,
      permissionOverrides: [
        ...prev.permissionOverrides,
        { scope: "Board", role: "Contributors", access: "Edit" },
      ],
    }));
  };

  const removeOverride = (index: number) => {
    setFormData(prev => ({
      ...prev,
      permissionOverrides: prev.permissionOverrides.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Permission scheme</Label>
            <Select value={formData.permissionScheme} onValueChange={value => setFormData(prev => ({ ...prev, permissionScheme: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {permissionSchemes.map(scheme => (
                  <SelectItem key={scheme.id} value={scheme.id}>
                    <div className="flex flex-col">
                      <span>{scheme.name}</span>
                      <span className="text-xs text-muted-foreground">{scheme.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notification scheme</Label>
            <Select
              value={formData.notificationScheme}
              onValueChange={value => setFormData(prev => ({ ...prev, notificationScheme: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {notificationSchemes.map(scheme => (
                  <SelectItem key={scheme.id} value={scheme.id}>
                    <div className="flex flex-col">
                      <span>{scheme.name}</span>
                      <span className="text-xs text-muted-foreground">{scheme.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SLA scheme</Label>
            <Select value={formData.slaScheme} onValueChange={value => setFormData(prev => ({ ...prev, slaScheme: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slaSchemes.map(scheme => (
                  <SelectItem key={scheme.id} value={scheme.id}>
                    <div className="flex flex-col">
                      <span>{scheme.name}</span>
                      <span className="text-xs text-muted-foreground">{scheme.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Privacy default</Label>
            <Input
              value={formData.privacyDefault}
              onChange={event => setFormData(prev => ({ ...prev, privacyDefault: event.target.value }))}
              placeholder="Team-visible"
            />
          </div>
          <div className="space-y-2">
            <Label>Notification default</Label>
            <Input
              value={formData.notificationDefaults}
              onChange={event => setFormData(prev => ({ ...prev, notificationDefaults: event.target.value }))}
              placeholder="Digest updates"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Overrides</Label>
            <Button type="button" variant="outline" size="sm" onClick={addOverride}>
              <Plus className="mr-1 h-4 w-4" /> Add override
            </Button>
          </div>
          <ScrollArea className="h-[220px] rounded-md border">
            <div className="divide-y">
              {formData.permissionOverrides.map((override, index) => (
                <div key={`${override.scope}-${index}`} className="grid gap-3 p-3 sm:grid-cols-[1fr,1fr,1fr,auto]">
                  <Input
                    value={override.scope}
                    onChange={event => updateOverride(index, { scope: event.target.value })}
                    placeholder="Scope"
                  />
                  <Input
                    value={override.role}
                    onChange={event => updateOverride(index, { role: event.target.value })}
                    placeholder="Role"
                  />
                  <Input
                    value={override.access}
                    onChange={event => updateOverride(index, { access: event.target.value })}
                    placeholder="Access level"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOverride(index)}
                    disabled={formData.permissionOverrides.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Governance insight</CardTitle>
            <CardDescription>
              Permission schemes enforce who can move work, while overrides tailor access to specific boards or forms.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification hygiene</CardTitle>
            <CardDescription>
              Start with digest notifications, then enable real-time alerts for critical transitions or escalations.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepMDataImport({
  formData,
  setFormData,
  selectedLifecyclePreset,
  selectedImportOption,
  selectedViewCollection,
  selectedDashboard,
  selectedArchival,
}: ProjectCreationStepContext) {
  const updateMapping = (index: number, updates: Partial<ImportMapping>) => {
    setFormData(prev => ({
      ...prev,
      importMappings: prev.importMappings.map((mapping, idx) =>
        idx === index
          ? {
              ...mapping,
              ...updates,
            }
          : mapping,
      ),
    }));
  };

  const addMapping = () => {
    setFormData(prev => ({
      ...prev,
      importMappings: [
        ...prev.importMappings,
        { source: "", target: "", sample: "" },
      ],
    }));
  };

  const removeMapping = (index: number) => {
    setFormData(prev => ({
      ...prev,
      importMappings: prev.importMappings.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Lifecycle preset</Label>
          <Select value={formData.lifecyclePreset} onValueChange={value => setFormData(prev => ({ ...prev, lifecyclePreset: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_LIFECYCLE_PRESETS.map(preset => (
                <SelectItem key={preset.id} value={preset.id}>
                  <div className="flex flex-col">
                    <span>{preset.name}</span>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLifecyclePreset && (
            <p className="text-xs text-muted-foreground">
              Phases: {selectedLifecyclePreset.phases.map(phase => phase.label).join(" → ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Mission statement</Label>
            <Textarea
              value={formData.lifecycleMission}
              onChange={event => setFormData(prev => ({ ...prev, lifecycleMission: event.target.value }))}
              placeholder="Deliver an integrated onboarding experience"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Success metrics</Label>
            <Textarea
              value={formData.lifecycleSuccessMetrics}
              onChange={event => setFormData(prev => ({ ...prev, lifecycleSuccessMetrics: event.target.value }))}
              placeholder="Activation, retention, time-to-value"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Stakeholders</Label>
            <Textarea
              value={formData.lifecycleStakeholders}
              onChange={event => setFormData(prev => ({ ...prev, lifecycleStakeholders: event.target.value }))}
              placeholder="Comma or newline separated"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Communication channels</Label>
            <Textarea
              value={formData.lifecycleChannels}
              onChange={event => setFormData(prev => ({ ...prev, lifecycleChannels: event.target.value }))}
              placeholder="Slack #launch, email distro, statuspage"
              rows={2}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Lifecycle notes</Label>
            <Textarea
              value={formData.lifecycleNotes}
              onChange={event => setFormData(prev => ({ ...prev, lifecycleNotes: event.target.value }))}
              placeholder="Risks, dependencies, and gating factors"
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Import strategy</Label>
          <RadioGroup
            value={formData.importStrategy}
            onValueChange={value => setFormData(prev => ({ ...prev, importStrategy: value }))}
            className="space-y-3"
          >
            {PROJECT_IMPORT_OPTIONS.map(option => (
              <Card
                key={option.id}
                className={cn("border", formData.importStrategy === option.id && "border-primary bg-primary/5")}
              >
                <CardHeader className="flex flex-row items-start gap-4">
                  <RadioGroupItem value={option.id} className="mt-1" />
                  <div>
                    <CardTitle className="text-base">{option.name}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                    {option.sources && option.sources.length > 0 && (
                      <p className="text-xs text-muted-foreground">Sources: {option.sources.join(", ")}</p>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Field mappings</Label>
            <Button type="button" variant="outline" size="sm" onClick={addMapping}>
              <Plus className="mr-1 h-4 w-4" /> Add mapping
            </Button>
          </div>
          <ScrollArea className="h-[220px] rounded-md border">
            <div className="divide-y">
              {formData.importMappings.map((mapping, index) => (
                <div key={`${mapping.source}-${index}`} className="grid gap-3 p-3 sm:grid-cols-[1fr,1fr,1fr,auto]">
                  <Input
                    value={mapping.source}
                    onChange={event => updateMapping(index, { source: event.target.value })}
                    placeholder="Source field"
                  />
                  <Input
                    value={mapping.target}
                    onChange={event => updateMapping(index, { target: event.target.value })}
                    placeholder="Workspace field"
                  />
                  <Input
                    value={mapping.sample ?? ""}
                    onChange={event => updateMapping(index, { sample: event.target.value })}
                    placeholder="Sample value"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMapping(index)}
                    disabled={formData.importMappings.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default views</CardTitle>
            <CardDescription>
              Connect import data to the dashboards and boards your team expects on day one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Views</Label>
              <Select value={formData.viewCollection} onValueChange={value => setFormData(prev => ({ ...prev, viewCollection: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_VIEW_COLLECTIONS.map(collection => (
                    <SelectItem key={collection.id} value={collection.id}>
                      <div className="flex flex-col">
                        <span>{collection.name}</span>
                        <span className="text-xs text-muted-foreground">{collection.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedViewCollection && (
                <p className="text-xs text-muted-foreground">Views: {selectedViewCollection.views.join(", ")}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Dashboard</Label>
              <Select
                value={formData.dashboardStarter}
                onValueChange={value => setFormData(prev => ({ ...prev, dashboardStarter: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_DASHBOARD_STARTERS.map(dashboard => (
                    <SelectItem key={dashboard.id} value={dashboard.id}>
                      <div className="flex flex-col">
                        <span>{dashboard.name}</span>
                        <span className="text-xs text-muted-foreground">{dashboard.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDashboard && (
                <p className="text-xs text-muted-foreground">Widgets: {selectedDashboard.widgets.join(", ")}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Archival workflow</CardTitle>
            <CardDescription>
              Configure retention and export handling once the project completes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select
              value={formData.archivalWorkflow}
              onValueChange={value => setFormData(prev => ({ ...prev, archivalWorkflow: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_ARCHIVAL_WORKFLOWS.map(workflow => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    <div className="flex flex-col">
                      <span>{workflow.name}</span>
                      <span className="text-xs text-muted-foreground">{workflow.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedArchival?.retention && (
              <p className="text-xs text-muted-foreground">Retention: {selectedArchival.retention}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import sources</CardTitle>
            <CardDescription>
              Confirm data connections prior to orchestrating seeding jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              {selectedImportOption?.sources?.length ? (
                <span>{selectedImportOption.sources.join(", ")}</span>
              ) : (
                <span>No external sources required.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PRJCreateStepOReview({
  formData,
  selectedTemplate,
  selectedFieldPreset,
  selectedWorkflow,
  selectedScreenPack,
  selectedComponentPack,
  selectedVersionStrategy,
  selectedModules,
  selectedLifecyclePreset,
  selectedImportOption,
  selectedViewCollection,
  selectedDashboard,
  selectedIntegrations,
  selectedArchival,
}: ProjectCreationStepContext) {
  const enabledAutomations = formData.automationSelections.filter(selection => selection.enabled);
  const enabledIntegrations = formData.integrationMappings.filter(mapping => mapping.enabled);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription>Confirm the configuration before provisioning your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Basics</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Name:</strong> {formData.name || "—"}
                <br />
                <strong>Code:</strong> {formData.code || "—"}
                <br />
                <strong>Status:</strong> {formData.status}
                <br />
                <strong>Visibility:</strong> {formData.visibility}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Timeline</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>
                  <strong>Start:</strong> {formData.startDate ? format(formData.startDate, "PPP") : "—"}
                </span>
                <br />
                <span>
                  <strong>Discovery complete:</strong>{" "}
                  {formData.discoveryComplete ? format(formData.discoveryComplete, "PPP") : "—"}
                </span>
                <br />
                <span>
                  <strong>Launch:</strong> {formData.launchTarget ? format(formData.launchTarget, "PPP") : "—"}
                </span>
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Template & structure</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>{selectedTemplate?.name || "—"}</span>
                <br />
                <span>Field preset: {selectedFieldPreset?.name || "—"}</span>
                <br />
                <span>Workflow blueprint: {selectedWorkflow?.name || "—"}</span>
                <br />
                <span>Screen pack: {selectedScreenPack?.name || "—"}</span>
                <br />
                <span>Component pack: {selectedComponentPack?.name || "—"}</span>
                <br />
                <span>Version strategy: {selectedVersionStrategy?.name || "—"}</span>
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Columns & workflow</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>Groups: {formData.boardGroups.join(", ") || "—"}</span>
                <br />
                <span>
                  Columns: {formData.boardColumns.map(column => `${column.name} (${column.group})`).join(", ") || "—"}
                </span>
                <br />
                <span>Statuses: {formData.workflowStatuses.join(" → ") || "—"}</span>
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Boards & cadence</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>Methodology: {formData.boardConfiguration.methodology}</span>
                <br />
                <span>Backlog: {formData.boardConfiguration.backlogMapping}</span>
                <br />
                <span>Estimation: {formData.boardConfiguration.estimationField}</span>
                <br />
                <span>Default board: {formData.boardConfiguration.defaultBoard}</span>
                <br />
                <span>Modules: {selectedModules.map(module => module.name).join(", ") || "—"}</span>
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Sprints & logistics</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>Sprint cadence: {formData.sprintConfiguration.cadence}</span>
                <br />
                <span>Capacity: {formData.sprintConfiguration.capacity}</span>
                <br />
                <span>Release cadence: {formData.sprintConfiguration.releaseCadence}</span>
                <br />
                <span>Review cadence: {formData.reviewCadence}</span>
                <br />
                <span>Maintenance window: {formData.maintenanceWindow}</span>
                <br />
                <span>
                  Calendar: {calendarOptions.find(option => option.id === formData.calendarId)?.name || "—"}
                </span>
                <br />
                <span>Timezone: {formData.timezone}</span>
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Components & forms</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>
                  Components: {formData.componentCatalog.map(component => `${component.name} → ${component.owner}`).join("; ") || "—"}
                </span>
                <br />
                <span>
                  Forms: {formData.intakeForms.map(form => `${form.name} (${form.audience})`).join("; ") || "—"}
                </span>
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Automations & integrations</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>Primary recipe: {formData.automationRecipe}</span>
                <br />
                <span>
                  Enabled flows: {enabledAutomations.map(selection => selection.id).join(", ") || "None"}
                </span>
                <br />
                <span>
                  Integrations:
                  {enabledIntegrations.length
                    ? ` ${enabledIntegrations
                        .map(mapping => `${mapping.id}${mapping.projectKey ? ` → ${mapping.projectKey}` : ""}`)
                        .join(", ")}`
                    : " None"}
                </span>
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Members & permissions</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>
                  Invitees: {formData.invitees.map(invite => `${invite.name} (${invite.role})`).join("; ") || "—"}
                </span>
                <br />
                <span>Permission scheme: {formData.permissionScheme || "—"}</span>
                <br />
                <span>Notification scheme: {formData.notificationScheme || "—"}</span>
                <br />
                <span>SLA scheme: {formData.slaScheme || "—"}</span>
                <br />
                <span>Privacy default: {formData.privacyDefault}</span>
                <br />
                <span>Notification default: {formData.notificationDefaults}</span>
                <br />
                <span>
                  Overrides: {formData.permissionOverrides.map(override => `${override.scope} ${override.role} → ${override.access}`).join("; ") || "—"}
                </span>
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Lifecycle & import</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>Preset: {selectedLifecyclePreset?.name || "—"}</span>
                <br />
                <span>Mission: {formData.lifecycleMission || "—"}</span>
                <br />
                <span>Import strategy: {selectedImportOption?.name || "—"}</span>
                <br />
                <span>
                  Field mappings: {formData.importMappings.map(mapping => `${mapping.source} → ${mapping.target}`).join("; ") || "—"}
                </span>
                <br />
                <span>Archival workflow: {selectedArchival?.name || "—"}</span>
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Views & dashboards</h4>
              <p className="text-sm text-muted-foreground space-y-1">
                <span>Views: {selectedViewCollection?.views.join(", ") || "—"}</span>
                <br />
                <span>Dashboard: {selectedDashboard?.name || "—"}</span>
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Integrations enabled</h4>
              <p className="text-sm text-muted-foreground">
                {selectedIntegrations.length > 0
                  ? selectedIntegrations.map(integration => integration.name).join(", ")
                  : "No integrations selected"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
