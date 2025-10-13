import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check } from "lucide-react";

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

interface StepDefinition {
  id: "basics" | "template" | "capabilities" | "lifecycle" | "review";
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
    description: "Select templates, fields, workflows, and component catalogs.",
    Component: PRJCreateStepBTemplate,
  },
  {
    id: "capabilities",
    title: "Modules & Schemes",
    description: "Enable product modules, schemes, automations, and integrations.",
    Component: PRJCreateStepCPlatformCapabilities,
  },
  {
    id: "lifecycle",
    title: "Lifecycle & Launch",
    description: "Lifecycle metadata, import strategy, calendars, and archival.",
    Component: PRJCreateStepDLifecycle,
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

  const capabilitiesIssues: string[] = [];
  if (!state.permissionScheme) {
    capabilitiesIssues.push("Assign a permission scheme.");
  }
  if (!state.notificationScheme) {
    capabilitiesIssues.push("Assign a notification scheme.");
  }

  const lifecycleIssues: string[] = [];
  if (!state.reviewCadence) {
    lifecycleIssues.push("Define a review cadence.");
  }
  if (!state.calendarId) {
    lifecycleIssues.push("Select a project calendar.");
  }
  if (!state.archivalWorkflow) {
    lifecycleIssues.push("Choose an archival workflow.");
  }
  if (!state.importStrategy) {
    lifecycleIssues.push("Choose an import or seeding strategy.");
  }

  const reviewIssues: string[] = [];
  if (basicsIssues.length || templateIssues.length || capabilitiesIssues.length || lifecycleIssues.length) {
    reviewIssues.push("Resolve issues in previous steps before creating the project.");
  }

  return {
    basics: { valid: basicsIssues.length === 0, issues: basicsIssues },
    template: { valid: templateIssues.length === 0, issues: templateIssues },
    capabilities: { valid: capabilitiesIssues.length === 0, issues: capabilitiesIssues },
    lifecycle: { valid: lifecycleIssues.length === 0, issues: lifecycleIssues },
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
      workflow_ids: selectedWorkflow?.states,
      screen_ids: selectedScreenPack?.screens,
      component_catalog: selectedComponentPack?.components,
      version_streams: selectedVersionStrategy
        ? [`${selectedVersionStrategy.name} (${selectedVersionStrategy.cadence})`]
        : undefined,
      automation_rules: selectedAutomation
        ? [selectedAutomation.id, ...selectedAutomation.triggers]
        : undefined,
      integration_configs: formData.integrationOptions,
      default_views: selectedViewCollection?.views,
      dashboard_ids: selectedDashboard ? [selectedDashboard.id] : undefined,
      import_strategy: formData.importStrategy,
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

function PRJCreateStepCPlatformCapabilities({
  formData,
  setFormData,
  selectedTemplate,
  selectedAutomation,
  selectedIntegrations,
  permissionSchemes,
  notificationSchemes,
  slaSchemes,
  toggleModule,
  toggleIntegration,
}: ProjectCreationStepContext) {
  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <Label className="text-sm font-medium">Modules</Label>
        <ScrollArea className="h-[300px] rounded-md border">
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
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Permission Scheme</Label>
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
          <Label>Notification Scheme</Label>
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
          <Label>SLA Scheme</Label>
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

        <div className="space-y-2">
          <Label>Automation Recipe</Label>
          <Select
            value={formData.automationRecipe}
            onValueChange={value => setFormData(prev => ({ ...prev, automationRecipe: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_AUTOMATION_RECIPES.map(recipe => (
                <SelectItem key={recipe.id} value={recipe.id}>
                  <div className="flex flex-col">
                    <span>{recipe.name}</span>
                    <span className="text-xs text-muted-foreground">{recipe.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAutomation && (
            <p className="text-xs text-muted-foreground">Triggers: {selectedAutomation.triggers.join(", ")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Integrations</Label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_INTEGRATION_OPTIONS.map(option => {
              const active = formData.integrationOptions.includes(option.id);
              return (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => toggleIntegration(option.id)}
                >
                  {option.name}
                </Button>
              );
            })}
          </div>
          {selectedIntegrations.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Enabled: {selectedIntegrations.map(item => item.name).join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PRJCreateStepDLifecycle({
  formData,
  setFormData,
  selectedLifecyclePreset,
  selectedImportOption,
  selectedViewCollection,
  selectedDashboard,
  selectedArchival,
}: ProjectCreationStepContext) {
  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Lifecycle Preset</Label>
          <Select
            value={formData.lifecyclePreset}
            onValueChange={value => setFormData(prev => ({ ...prev, lifecyclePreset: value }))}
          >
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Kickoff</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !formData.kickoffDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.kickoffDate ? format(formData.kickoffDate, "PPP") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.kickoffDate}
                  onSelect={date => setFormData(prev => ({ ...prev, kickoffDate: date ?? undefined }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Discovery Complete</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.discoveryComplete && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.discoveryComplete ? format(formData.discoveryComplete, "PPP") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.discoveryComplete}
                  onSelect={date => setFormData(prev => ({ ...prev, discoveryComplete: date ?? undefined }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Target Launch</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !formData.launchTarget && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.launchTarget ? format(formData.launchTarget, "PPP") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.launchTarget}
                  onSelect={date => setFormData(prev => ({ ...prev, launchTarget: date ?? undefined }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Review Cadence</Label>
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
          <Label>Maintenance Window</Label>
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

        <div className="space-y-2">
          <Label>Archival Workflow</Label>
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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Mission Statement</Label>
            <Textarea
              value={formData.lifecycleMission}
              onChange={event => setFormData(prev => ({ ...prev, lifecycleMission: event.target.value }))}
              placeholder="Deliver an integrated customer onboarding experience."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Success Metrics</Label>
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
            <Label>Communication Channels</Label>
            <Textarea
              value={formData.lifecycleChannels}
              onChange={event => setFormData(prev => ({ ...prev, lifecycleChannels: event.target.value }))}
              placeholder="Slack #launch, email distro, statuspage"
              rows={2}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Lifecycle Notes</Label>
            <Textarea
              value={formData.lifecycleNotes}
              onChange={event => setFormData(prev => ({ ...prev, lifecycleNotes: event.target.value }))}
              placeholder="Risks, dependencies, and gating factors to highlight for leadership."
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Calendar</Label>
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
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={formData.timezone} onValueChange={value => setFormData(prev => ({ ...prev, timezone: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TIMEZONES.map(zone => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Import Strategy</Label>
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

        <div className="space-y-2">
          <Label>Default Views</Label>
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
            <p className="text-xs text-muted-foreground">
              Views: {selectedViewCollection.views.join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Dashboard Starter</Label>
          <Select
            value={formData.dashboardStarter}
            onValueChange={value => setFormData(prev => ({ ...prev, dashboardStarter: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_DASHBOARD_STARTERS.map(starter => (
                <SelectItem key={starter.id} value={starter.id}>
                  <div className="flex flex-col">
                    <span>{starter.name}</span>
                    <span className="text-xs text-muted-foreground">{starter.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDashboard && (
            <p className="text-xs text-muted-foreground">{selectedDashboard.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PRJCreateStepOReview({
  formData,
  selectedTemplate,
  selectedFieldPreset,
  selectedWorkflow,
  selectedModules,
  selectedLifecyclePreset,
  selectedImportOption,
  selectedViewCollection,
  selectedDashboard,
  selectedIntegrations,
}: ProjectCreationStepContext) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription>Confirm the configuration before provisioning your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Basics</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Name:</strong> {formData.name || "—"}
                <br />
                <strong>Code:</strong> {formData.code || "—"}
                <br />
                <strong>Status:</strong> {formData.status}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Timeline</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Start:</strong> {formData.startDate ? format(formData.startDate, "PPP") : "—"}
                <br />
                <strong>End:</strong> {formData.endDate ? format(formData.endDate, "PPP") : "—"}
                <br />
                <strong>Launch:</strong> {formData.launchTarget ? format(formData.launchTarget, "PPP") : "—"}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Template</h4>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate?.name || "—"}
                <br />
                Field preset: {selectedFieldPreset?.name || "—"}
                <br />
                Workflow: {selectedWorkflow?.name || "—"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Modules & Schemes</h4>
              <p className="text-sm text-muted-foreground">
                Modules: {selectedModules.map(module => module.name).join(", ") || "—"}
                <br />
                Permission: {formData.permissionScheme || "—"}
                <br />
                Notification: {formData.notificationScheme || "—"}
                <br />
                SLA: {formData.slaScheme || "—"}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Lifecycle</h4>
              <p className="text-sm text-muted-foreground">
                Preset: {selectedLifecyclePreset?.name || "—"}
                <br />
                Review Cadence: {formData.reviewCadence}
                <br />
                Maintenance: {formData.maintenanceWindow}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Launch Logistics</h4>
              <p className="text-sm text-muted-foreground">
                Calendar: {calendarOptions.find(option => option.id === formData.calendarId)?.name || "—"}
                <br />
                Timezone: {formData.timezone}
                <br />
                Import: {selectedImportOption?.name || "—"}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Views & Dashboards</h4>
              <p className="text-sm text-muted-foreground">
                Views: {selectedViewCollection?.views.join(", ") || "—"}
                <br />
                Dashboard: {selectedDashboard?.name || "—"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Integrations</h4>
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
