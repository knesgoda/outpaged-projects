import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AlertCircle, AlertTriangle, ArrowLeft, CalendarIcon, Save, Trash2 } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsSection } from "@/components/projects/settings/SettingsSection";
import { SettingsSidebar } from "@/components/projects/settings/SettingsSidebar";
import { ProjectGovernancePanel } from "@/components/projects/settings/ProjectGovernancePanel";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/hooks/useProjects";
import { useUpdateProject } from "@/hooks/useProjects";
import { useProjectId } from "@/hooks/useProjectId";
import { useProjectNavigation } from "@/hooks/useProjectNavigation";
import { supabase } from "@/integrations/supabase/client";
import { CustomFieldDefinitionManager } from "@/components/custom-fields/CustomFieldDefinitionManager";
import { useCustomFieldDefinitions } from "@/hooks/useCustomFields";
import { listCustomFieldUsageMetrics, type CustomFieldUsageMetric } from "@/services/customFields";
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
  PROJECT_TEMPLATES,
  PROJECT_VERSION_STRATEGIES,
  PROJECT_VIEW_COLLECTIONS,
  PROJECT_WORKFLOW_BLUEPRINTS,
} from "@/domain/projects/config";
import type { ProjectRecord } from "@/services/projects";
import { PROJECT_STATUS_FILTER_OPTIONS } from "@/utils/project-status";
import { ProjectGovernanceProvider } from "@/state/projectGovernance";

const sections = [
  { id: "general", label: "General" },
  { id: "governance", label: "Governance & Access" },
  { id: "modules", label: "Modules & Schemes" },
  { id: "structure", label: "Fields & Structure" },
  { id: "versions", label: "Versions & Automations" },
  { id: "integrations", label: "Integrations" },
  { id: "views", label: "Views & Dashboards" },
  { id: "lifecycle", label: "Lifecycle & Archival" },
];

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
const toDate = (value?: string | null) => (value ? new Date(value) : undefined);
const splitList = (value?: string | null) =>
  (value ?? "")
    .split(/[\n,]+/)
    .map(item => item.trim())
    .filter(Boolean);

const joinList = (values?: string[] | null) => (values && values.length ? values.join(", ") : "");

const matchPresetByFields = (fields?: string[] | null) => {
  if (!fields || fields.length === 0) {
    return PROJECT_FIELD_PRESETS[0]?.id ?? "";
  }
  const preset = PROJECT_FIELD_PRESETS.find(option => option.fields.every(field => fields.includes(field)));
  return preset?.id ?? PROJECT_FIELD_PRESETS[0]?.id ?? "";
};

const matchWorkflowBlueprint = (states?: string[] | null) => {
  if (!states || states.length === 0) {
    return PROJECT_WORKFLOW_BLUEPRINTS[0]?.id ?? "";
  }
  const blueprint = PROJECT_WORKFLOW_BLUEPRINTS.find(option =>
    option.states.length === states.length && option.states.every((state, index) => state === states[index]),
  );
  return blueprint?.id ?? PROJECT_WORKFLOW_BLUEPRINTS[0]?.id ?? "";
};

const matchScreenPack = (screens?: string[] | null) => {
  if (!screens || screens.length === 0) {
    return PROJECT_SCREEN_PACKS[0]?.id ?? "";
  }
  const pack = PROJECT_SCREEN_PACKS.find(option =>
    option.screens.length === screens.length && option.screens.every((screen, index) => screen === screens[index]),
  );
  return pack?.id ?? PROJECT_SCREEN_PACKS[0]?.id ?? "";
};

const matchComponentPack = (components?: string[] | null) => {
  if (!components || components.length === 0) {
    return PROJECT_COMPONENT_PACKS[0]?.id ?? "";
  }
  const pack = PROJECT_COMPONENT_PACKS.find(option =>
    option.components.every(component => components.includes(component)),
  );
  return pack?.id ?? PROJECT_COMPONENT_PACKS[0]?.id ?? "";
};

const matchVersionStrategy = (streams?: string[] | null) => {
  if (!streams || streams.length === 0) {
    return PROJECT_VERSION_STRATEGIES[0]?.id ?? "";
  }
  const strategy = PROJECT_VERSION_STRATEGIES.find(option =>
    streams.some(stream => stream.toLowerCase().includes(option.name.toLowerCase())),
  );
  return strategy?.id ?? PROJECT_VERSION_STRATEGIES[0]?.id ?? "";
};

const matchAutomationRecipe = (rules?: string[] | null) => {
  if (!rules || rules.length === 0) {
    return PROJECT_AUTOMATION_RECIPES[0]?.id ?? "";
  }
  const recipe = PROJECT_AUTOMATION_RECIPES.find(option => rules.includes(option.id));
  return recipe?.id ?? PROJECT_AUTOMATION_RECIPES[0]?.id ?? "";
};

const matchViewCollection = (views?: string[] | null) => {
  if (!views || views.length === 0) {
    return PROJECT_VIEW_COLLECTIONS[0]?.id ?? "";
  }
  const collection = PROJECT_VIEW_COLLECTIONS.find(option =>
    option.views.every(view => views.includes(view)),
  );
  return collection?.id ?? PROJECT_VIEW_COLLECTIONS[0]?.id ?? "";
};

const matchDashboardStarter = (dashboards?: string[] | null) => {
  if (!dashboards || dashboards.length === 0) {
    return PROJECT_DASHBOARD_STARTERS[0]?.id ?? "";
  }
  const starter = PROJECT_DASHBOARD_STARTERS.find(option => dashboards.includes(option.id));
  return starter?.id ?? PROJECT_DASHBOARD_STARTERS[0]?.id ?? "";
};

const matchArchivalWorkflow = (policy?: ProjectRecord["archival_policy"]) => {
  if (!policy) {
    return PROJECT_ARCHIVAL_WORKFLOWS[0]?.id ?? "";
  }
  if (policy.workflow_id) {
    const match = PROJECT_ARCHIVAL_WORKFLOWS.find(option => option.id === policy.workflow_id);
    if (match) {
      return match.id;
    }
  }
  if (policy.name) {
    const match = PROJECT_ARCHIVAL_WORKFLOWS.find(option => option.name === policy.name);
    if (match) {
      return match.id;
    }
  }
  return PROJECT_ARCHIVAL_WORKFLOWS[0]?.id ?? "";
};

interface GeneralState {
  name: string;
  description: string;
  code: string;
  status: string;
}

interface ModuleState {
  modules: string[];
  permissionScheme: string;
  notificationScheme: string;
  slaScheme: string;
}

interface StructureState {
  fieldPreset: string;
  workflowBlueprint: string;
  screenPack: string;
  componentPack: string;
}

interface VersionState {
  versionStrategy: string;
  automationRecipe: string;
}

interface ViewState {
  viewCollection: string;
  dashboardStarter: string;
}

interface LifecycleState {
  importStrategy: string;
  calendarId: string;
  timezone: string;
  reviewCadence: string;
  maintenanceWindow: string;
  lifecycleMission: string;
  lifecycleNotes: string;
  lifecycleSuccessMetrics: string;
  lifecycleStakeholders: string;
  lifecycleChannels: string;
  kickoffDate?: Date;
  discoveryComplete?: Date;
  launchTarget?: Date;
  archivalWorkflow: string;
}

export default function ProjectSettings({ overrideProjectId }: { overrideProjectId?: string }) {
  const paramsProjectId = useProjectId();
  const projectId = overrideProjectId || paramsProjectId;
  const navigate = useNavigate();
  const { navigateToProject } = useProjectNavigation();
  const { toast } = useToast();

  const { data: project, isLoading } = useProject(projectId);
  const updateProject = useUpdateProject();

  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const [generalState, setGeneralState] = useState<GeneralState>({
    name: "",
    description: "",
    code: "",
    status: "planning",
  });
  const [moduleState, setModuleState] = useState<ModuleState>({
    modules: [],
    permissionScheme: PROJECT_SCHEMES.find(scheme => scheme.type === "permission")?.id ?? "",
    notificationScheme: PROJECT_SCHEMES.find(scheme => scheme.type === "notification")?.id ?? "",
    slaScheme: PROJECT_SCHEMES.find(scheme => scheme.type === "sla")?.id ?? "",
  });
  const [structureState, setStructureState] = useState<StructureState>({
    fieldPreset: PROJECT_FIELD_PRESETS[0]?.id ?? "",
    workflowBlueprint: PROJECT_WORKFLOW_BLUEPRINTS[0]?.id ?? "",
    screenPack: PROJECT_SCREEN_PACKS[0]?.id ?? "",
    componentPack: PROJECT_COMPONENT_PACKS[0]?.id ?? "",
  });
  const [versionState, setVersionState] = useState<VersionState>({
    versionStrategy: PROJECT_VERSION_STRATEGIES[0]?.id ?? "",
    automationRecipe: PROJECT_AUTOMATION_RECIPES[0]?.id ?? "",
  });
  const [integrationState, setIntegrationState] = useState<string[]>([]);
  const [viewState, setViewState] = useState<ViewState>({
    viewCollection: PROJECT_VIEW_COLLECTIONS[0]?.id ?? "",
    dashboardStarter: PROJECT_DASHBOARD_STARTERS[0]?.id ?? "",
  });
  const [lifecycleState, setLifecycleState] = useState<LifecycleState>({
    importStrategy: PROJECT_IMPORT_OPTIONS[0]?.id ?? "",
    calendarId: calendarOptions[0]?.id ?? "delivery-calendar",
    timezone: DEFAULT_TIMEZONES[0] ?? "UTC",
    reviewCadence: reviewCadenceOptions[0],
    maintenanceWindow: maintenanceWindowOptions[0],
    lifecycleMission: "",
    lifecycleNotes: "",
    lifecycleSuccessMetrics: "",
    lifecycleStakeholders: "",
    lifecycleChannels: "",
    kickoffDate: undefined,
    discoveryComplete: undefined,
    launchTarget: undefined,
    archivalWorkflow: PROJECT_ARCHIVAL_WORKFLOWS[0]?.id ?? "",
  });
  const [deleting, setDeleting] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const {
    definitions: customFieldDefinitions,
    isLoading: loadingCustomFieldDefinitions,
  } = useCustomFieldDefinitions({
    projectId: project?.id,
    contexts: ["tasks", "boards", "forms", "reports", "automations"],
  });
  const [customFieldUsage, setCustomFieldUsage] = useState<CustomFieldUsageMetric[]>([]);
  const [loadingCustomFieldUsage, setLoadingCustomFieldUsage] = useState(false);
  const [customFieldUsageNotice, setCustomFieldUsageNotice] = useState<string | null>(null);
  const [customFieldUsageError, setCustomFieldUsageError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      return;
    }

    setGeneralState({
      name: project.name,
      description: project.description ?? "",
      code: project.code ?? "",
      status: project.status,
    });

    setModuleState({
      modules: project.modules ?? [],
      permissionScheme: project.permission_scheme_id ?? PROJECT_SCHEMES.find(s => s.type === "permission")?.id ?? "",
      notificationScheme: project.notification_scheme_id ?? PROJECT_SCHEMES.find(s => s.type === "notification")?.id ?? "",
      slaScheme: project.sla_scheme_id ?? PROJECT_SCHEMES.find(s => s.type === "sla")?.id ?? "",
    });

    setStructureState({
      fieldPreset: matchPresetByFields(project.field_configuration),
      workflowBlueprint: matchWorkflowBlueprint(project.workflow_ids),
      screenPack: matchScreenPack(project.screen_ids),
      componentPack: matchComponentPack(project.component_catalog),
    });

    setVersionState({
      versionStrategy: matchVersionStrategy(project.version_streams),
      automationRecipe: matchAutomationRecipe(project.automation_rules),
    });

    setIntegrationState(project.integration_configs ?? []);

    setViewState({
      viewCollection: matchViewCollection(project.default_views),
      dashboardStarter: matchDashboardStarter(project.dashboard_ids),
    });

    setLifecycleState({
      importStrategy: project.import_strategy ?? PROJECT_IMPORT_OPTIONS[0]?.id ?? "",
      calendarId: project.calendar_id ?? calendarOptions[0]?.id ?? "delivery-calendar",
      timezone: project.timezone ?? DEFAULT_TIMEZONES[0] ?? "UTC",
      reviewCadence: project.lifecycle?.review_cadence || reviewCadenceOptions[0],
      maintenanceWindow: project.lifecycle?.maintenance_window || maintenanceWindowOptions[0],
      lifecycleMission: project.lifecycle?.mission ?? "",
      lifecycleNotes: project.lifecycle?.notes ?? "",
      lifecycleSuccessMetrics: joinList(project.lifecycle?.success_metrics),
      lifecycleStakeholders: joinList(project.lifecycle?.stakeholders),
      lifecycleChannels: joinList(project.lifecycle?.communication_channels),
      kickoffDate: toDate(project.lifecycle?.kickoff_date ?? undefined),
      discoveryComplete: toDate(project.lifecycle?.discovery_complete ?? undefined),
      launchTarget: toDate(project.lifecycle?.launch_target ?? undefined),
      archivalWorkflow: matchArchivalWorkflow(project.archival_policy),
    });
  }, [project]);

  useEffect(() => {
    let isMounted = true;
    if (!project?.id) {
      setCustomFieldUsage([]);
      setCustomFieldUsageNotice(null);
      setCustomFieldUsageError(null);
      return;
    }
    setLoadingCustomFieldUsage(true);
    setCustomFieldUsageError(null);
    setCustomFieldUsageNotice(null);
    listCustomFieldUsageMetrics({ projectId: project.id })
      .then(result => {
        if (isMounted) {
          setCustomFieldUsage(result.metrics);
          setCustomFieldUsageNotice(
            result.isFallback
              ? "Detailed usage analytics aren't enabled yet. We're showing available fields until analytics is configured."
              : null,
          );
        }
      })
      .catch(error => {
        console.warn("Failed to load custom field usage", error);
        if (isMounted) {
          setCustomFieldUsageError("Usage analytics are temporarily unavailable. Please try again later.");
          setCustomFieldUsage([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingCustomFieldUsage(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [project?.id]);

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
  const customFieldTypeSummary = useMemo(() => {
    const counts = new Map<string, number>();
    customFieldDefinitions.forEach(definition => {
      counts.set(definition.fieldType, (counts.get(definition.fieldType) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [customFieldDefinitions]);

  const selectedFieldPreset = useMemo(
    () => PROJECT_FIELD_PRESETS.find(preset => preset.id === structureState.fieldPreset),
    [structureState.fieldPreset],
  );
  const selectedWorkflow = useMemo(
    () => PROJECT_WORKFLOW_BLUEPRINTS.find(item => item.id === structureState.workflowBlueprint),
    [structureState.workflowBlueprint],
  );
  const selectedScreenPack = useMemo(
    () => PROJECT_SCREEN_PACKS.find(item => item.id === structureState.screenPack),
    [structureState.screenPack],
  );
  const selectedComponentPack = useMemo(
    () => PROJECT_COMPONENT_PACKS.find(item => item.id === structureState.componentPack),
    [structureState.componentPack],
  );
  const selectedVersionStrategy = useMemo(
    () => PROJECT_VERSION_STRATEGIES.find(item => item.id === versionState.versionStrategy),
    [versionState.versionStrategy],
  );
  const selectedAutomation = useMemo(
    () => PROJECT_AUTOMATION_RECIPES.find(item => item.id === versionState.automationRecipe),
    [versionState.automationRecipe],
  );
  const selectedViewCollection = useMemo(
    () => PROJECT_VIEW_COLLECTIONS.find(item => item.id === viewState.viewCollection),
    [viewState.viewCollection],
  );
  const selectedDashboard = useMemo(
    () => PROJECT_DASHBOARD_STARTERS.find(item => item.id === viewState.dashboardStarter),
    [viewState.dashboardStarter],
  );
  const selectedLifecyclePreset = useMemo(
    () => PROJECT_LIFECYCLE_PRESETS.find(item => item.id === project?.lifecycle?.preset) ?? PROJECT_LIFECYCLE_PRESETS[0],
    [project?.lifecycle?.preset],
  );
  const selectedImportOption = useMemo(
    () => PROJECT_IMPORT_OPTIONS.find(item => item.id === lifecycleState.importStrategy),
    [lifecycleState.importStrategy],
  );
  const selectedArchival = useMemo(
    () => PROJECT_ARCHIVAL_WORKFLOWS.find(item => item.id === lifecycleState.archivalWorkflow),
    [lifecycleState.archivalWorkflow],
  );
  const selectedTemplate = useMemo(
    () => PROJECT_TEMPLATES.find(template => template.id === project?.template_key),
    [project?.template_key],
  );

  const toggleModule = (moduleId: string) => {
    setModuleState(prev => {
      const enabled = prev.modules.includes(moduleId);
      return {
        ...prev,
        modules: enabled ? prev.modules.filter(id => id !== moduleId) : [...prev.modules, moduleId],
      };
    });
  };

  const toggleIntegration = (integrationId: string) => {
    setIntegrationState(prev => {
      const enabled = prev.includes(integrationId);
      return enabled ? prev.filter(id => id !== integrationId) : [...prev, integrationId];
    });
  };

  const handleSaveGeneral = async () => {
    if (!projectId) return;
    setSavingSection("general");
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          name: generalState.name,
          description: generalState.description,
          code: generalState.code,
          status: generalState.status as any,
        },
      });
      toast({ title: "General settings saved" });
    } catch (error: any) {
      console.error("Error saving general settings", error);
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save general settings",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveModules = async () => {
    if (!projectId) return;
    setSavingSection("modules");
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          modules: moduleState.modules,
          permission_scheme_id: moduleState.permissionScheme,
          notification_scheme_id: moduleState.notificationScheme,
          sla_scheme_id: moduleState.slaScheme,
        },
      });
      toast({ title: "Modules updated" });
    } catch (error: any) {
      console.error("Error saving modules", error);
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save module settings",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveStructure = async () => {
    if (!projectId) return;
    setSavingSection("structure");
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          field_configuration: selectedFieldPreset?.fields,
          workflow_ids: selectedWorkflow?.states,
          screen_ids: selectedScreenPack?.screens,
          component_catalog: selectedComponentPack?.components,
        },
      });
      toast({ title: "Structure updated" });
    } catch (error: any) {
      console.error("Error saving structure", error);
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save structure settings",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveVersions = async () => {
    if (!projectId) return;
    setSavingSection("versions");
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          version_streams: selectedVersionStrategy
            ? [`${selectedVersionStrategy.name} (${selectedVersionStrategy.cadence})`]
            : undefined,
          automation_rules: selectedAutomation
            ? [selectedAutomation.id, ...selectedAutomation.triggers]
            : undefined,
        },
      });
      toast({ title: "Version strategy updated" });
    } catch (error: any) {
      console.error("Error saving versions", error);
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save version and automation settings",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveIntegrations = async () => {
    if (!projectId) return;
    setSavingSection("integrations");
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          integration_configs: integrationState,
        },
      });
      toast({ title: "Integrations updated" });
    } catch (error: any) {
      console.error("Error saving integrations", error);
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save integration settings",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveViews = async () => {
    if (!projectId) return;
    setSavingSection("views");
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          default_views: selectedViewCollection?.views,
          dashboard_ids: selectedDashboard ? [selectedDashboard.id] : undefined,
        },
      });
      toast({ title: "Views updated" });
    } catch (error: any) {
      console.error("Error saving views", error);
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save view settings",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveLifecycle = async () => {
    if (!projectId) return;
    setSavingSection("lifecycle");
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          import_strategy: lifecycleState.importStrategy,
          import_sources: selectedImportOption?.sources,
          calendar_id: lifecycleState.calendarId,
          timezone: lifecycleState.timezone,
          lifecycle: {
            preset: project?.lifecycle?.preset ?? selectedLifecyclePreset?.id,
            review_cadence: lifecycleState.reviewCadence,
            maintenance_window: lifecycleState.maintenanceWindow,
            mission: lifecycleState.lifecycleMission || undefined,
            notes: lifecycleState.lifecycleNotes || undefined,
            success_metrics: splitList(lifecycleState.lifecycleSuccessMetrics),
            stakeholders: splitList(lifecycleState.lifecycleStakeholders),
            communication_channels: splitList(lifecycleState.lifecycleChannels),
            kickoff_date: toISODate(lifecycleState.kickoffDate),
            discovery_complete: toISODate(lifecycleState.discoveryComplete),
            launch_target: toISODate(lifecycleState.launchTarget),
          },
          archival_policy: selectedArchival
            ? {
                workflow_id: selectedArchival.id,
                name: selectedArchival.name,
                retention_period_days: project?.archival_policy?.retention_period_days ?? undefined,
                export_destinations:
                  lifecycleState.importStrategy === "external_sync"
                    ? ["data_lake", "connected_system"]
                    : ["workspace_archive"],
                notify_groups: project?.archival_policy?.notify_groups ?? ["project-owners", "governance"],
              }
            : undefined,
        },
      });
      toast({ title: "Lifecycle updated" });
    } catch (error: any) {
      console.error("Error saving lifecycle", error);
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save lifecycle settings",
        variant: "destructive",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);
      if (error) throw error;
      toast({ title: "Project deleted" });
      navigate("/dashboard/projects");
    } catch (error: any) {
      console.error("Error deleting project", error);
      toast({
        title: "Delete failed",
        description: error?.message || "Unable to delete project",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Project Settings</h1>
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard/projects")}>Return to projects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateToProject(project)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Settings</h1>
          <p className="text-muted-foreground">
            Configure templates, workflows, automations, integrations, and lifecycle controls for {project.name}.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px,1fr]">
        <SettingsSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionSelect={setActiveSection}
        />

        <div className="space-y-8">
          <SettingsSection
            id="general"
            title="General"
            description="Update the project's core identity, status, and summary."
            actionSlot={
              <Button
                onClick={handleSaveGeneral}
                disabled={savingSection === "general"}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingSection === "general" ? "Saving..." : "Save"}
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={generalState.name}
                  onChange={event => setGeneralState(prev => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Project Code</Label>
                <Input
                  value={generalState.code}
                  onChange={event => setGeneralState(prev => ({ ...prev, code: event.target.value.toUpperCase() }))}
                />
                <p className="text-xs text-muted-foreground">
                  Appears in issue keys and shared URLs. Keep it concise and memorable.
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={generalState.description}
                  onChange={event => setGeneralState(prev => ({ ...prev, description: event.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={generalState.status}
                  onValueChange={value => setGeneralState(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS_FILTER_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingsSection>

          <ProjectGovernanceProvider projectId={project.id}>
            <SettingsSection
              id="governance"
              title="Governance & access"
              description="Manage membership, roles, privacy controls, and audit history for this project."
            >
              <ProjectGovernancePanel />
            </SettingsSection>
          </ProjectGovernanceProvider>

          <SettingsSection
            id="modules"
            title="Modules & Schemes"
            description="Toggle delivery capabilities and align governance schemes with your operating model."
            actionSlot={
              <Button
                onClick={handleSaveModules}
                disabled={savingSection === "modules"}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingSection === "modules" ? "Saving..." : "Save"}
              </Button>
            }
          >
            <div className="space-y-4">
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  Based on the {selectedTemplate.name} template. Recommended modules are tagged below.
                </p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {PROJECT_MODULES.map(module => {
                  const enabled = moduleState.modules.includes(module.id);
                  const recommended = selectedTemplate?.recommendedModules.includes(module.id);
                  return (
                    <div
                      key={module.id}
                      className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
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
              <Separator />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Permission Scheme</Label>
                  <Select
                    value={moduleState.permissionScheme}
                    onValueChange={value => setModuleState(prev => ({ ...prev, permissionScheme: value }))}
                  >
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
                    value={moduleState.notificationScheme}
                    onValueChange={value => setModuleState(prev => ({ ...prev, notificationScheme: value }))}
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
                  <Select
                    value={moduleState.slaScheme}
                    onValueChange={value => setModuleState(prev => ({ ...prev, slaScheme: value }))}
                  >
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
            </div>
          </SettingsSection>

          <SettingsSection
            id="structure"
            title="Fields & Structure"
            description="Choose the field definitions, workflow blueprint, and screen experiences applied to work items."
            actionSlot={
              <Button
                onClick={handleSaveStructure}
                disabled={savingSection === "structure"}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingSection === "structure" ? "Saving..." : "Save"}
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Field Preset</Label>
                <Select
                  value={structureState.fieldPreset}
                  onValueChange={value => setStructureState(prev => ({ ...prev, fieldPreset: value }))}
                >
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
                  <p className="text-xs text-muted-foreground">
                    Fields: {selectedFieldPreset.fields.join(", ")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Workflow Blueprint</Label>
                <Select
                  value={structureState.workflowBlueprint}
                  onValueChange={value => setStructureState(prev => ({ ...prev, workflowBlueprint: value }))}
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
                  <p className="text-xs text-muted-foreground">
                    States: {selectedWorkflow.states.join(" → ")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Screen Pack</Label>
                <Select
                  value={structureState.screenPack}
                  onValueChange={value => setStructureState(prev => ({ ...prev, screenPack: value }))}
                >
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
                  value={structureState.componentPack}
                  onValueChange={value => setStructureState(prev => ({ ...prev, componentPack: value }))}
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
            </div>
            <Separator className="my-6" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Field gallery</h3>
                  <p className="text-xs text-muted-foreground">
                    Manage the custom fields powering forms, boards, automations, and reports for this project.
                  </p>
                </div>
                <CustomFieldDefinitionManager projectId={project?.id ?? undefined} />
              </div>
              <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Governance & usage</h3>
                    <p className="text-xs text-muted-foreground">
                      Track adoption across screens, automations, and reporting packages.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {loadingCustomFieldDefinitions ? "…" : `${customFieldDefinitions.length} fields`}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {customFieldTypeSummary.length ? (
                    customFieldTypeSummary.slice(0, 4).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{type.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No custom fields configured yet.</p>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h4>
                  {customFieldUsageError ? (
                    <Alert variant="destructive" className="bg-destructive/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Unable to load analytics</AlertTitle>
                      <AlertDescription>{customFieldUsageError}</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {customFieldUsageNotice ? (
                        <Alert className="bg-muted">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Limited analytics</AlertTitle>
                          <AlertDescription>{customFieldUsageNotice}</AlertDescription>
                        </Alert>
                      ) : null}
                      {loadingCustomFieldUsage ? (
                        <div className="space-y-2">
                          {[0, 1].map(index => (
                            <Skeleton key={index} className="h-6 w-full" />
                          ))}
                        </div>
                      ) : customFieldUsage.length ? (
                        <ul className="space-y-1 text-sm">
                          {customFieldUsage.slice(0, 5).map(metric => (
                            <li key={metric.fieldId} className="flex items-center justify-between">
                              <span className="truncate pr-3" title={metric.fieldName}>
                                {metric.fieldName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {metric.usageCount} uses
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">No usage captured yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="versions"
            title="Versions & Automations"
            description="Configure release cadence and automation guardrails that keep work flowing."
            actionSlot={
              <Button
                onClick={handleSaveVersions}
                disabled={savingSection === "versions"}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingSection === "versions" ? "Saving..." : "Save"}
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Version Strategy</Label>
                <Select
                  value={versionState.versionStrategy}
                  onValueChange={value => setVersionState(prev => ({ ...prev, versionStrategy: value }))}
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
              <div className="space-y-2">
                <Label>Automation Recipe</Label>
                <Select
                  value={versionState.automationRecipe}
                  onValueChange={value => setVersionState(prev => ({ ...prev, automationRecipe: value }))}
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
                  <p className="text-xs text-muted-foreground">
                    Triggers: {selectedAutomation.triggers.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="integrations"
            title="Integrations"
            description="Enable the systems that publish signals into your project and receive updates."
            actionSlot={
              <Button
                onClick={handleSaveIntegrations}
                disabled={savingSection === "integrations"}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingSection === "integrations" ? "Saving..." : "Save"}
              </Button>
            }
          >
            <div className="flex flex-wrap gap-2">
              {PROJECT_INTEGRATION_OPTIONS.map(option => {
                const active = integrationState.includes(option.id);
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
            {integrationState.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Enabled: {integrationState.map(id => PROJECT_INTEGRATION_OPTIONS.find(opt => opt.id === id)?.name || id).join(", ")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No integrations selected yet.</p>
            )}
          </SettingsSection>

          <SettingsSection
            id="views"
            title="Views & Dashboards"
            description="Curate the default experience teams see when they land in this project."
            actionSlot={
              <Button
                onClick={handleSaveViews}
                disabled={savingSection === "views"}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingSection === "views" ? "Saving..." : "Save"}
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Default View Collection</Label>
                <Select
                  value={viewState.viewCollection}
                  onValueChange={value => setViewState(prev => ({ ...prev, viewCollection: value }))}
                >
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
                  value={viewState.dashboardStarter}
                  onValueChange={value => setViewState(prev => ({ ...prev, dashboardStarter: value }))}
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
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="lifecycle"
            title="Lifecycle & Archival"
            description="Define cadence, import strategy, and long-term archival policies for this project."
            actionSlot={
              <Button
                onClick={handleSaveLifecycle}
                disabled={savingSection === "lifecycle"}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingSection === "lifecycle" ? "Saving..." : "Save"}
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Import Strategy</Label>
                <Select
                  value={lifecycleState.importStrategy}
                  onValueChange={value => setLifecycleState(prev => ({ ...prev, importStrategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_IMPORT_OPTIONS.map(option => (
                      <SelectItem key={option.id} value={option.id}>
                        <div className="flex flex-col">
                          <span>{option.name}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedImportOption?.sources && (
                  <p className="text-xs text-muted-foreground">
                    Sources: {selectedImportOption.sources.join(", ")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Calendar</Label>
                <Select
                  value={lifecycleState.calendarId}
                  onValueChange={value => setLifecycleState(prev => ({ ...prev, calendarId: value }))}
                >
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
                <Select
                  value={lifecycleState.timezone}
                  onValueChange={value => setLifecycleState(prev => ({ ...prev, timezone: value }))}
                >
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
              <div className="space-y-2">
                <Label>Review Cadence</Label>
                <Select
                  value={lifecycleState.reviewCadence}
                  onValueChange={value => setLifecycleState(prev => ({ ...prev, reviewCadence: value }))}
                >
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
                  value={lifecycleState.maintenanceWindow}
                  onValueChange={value => setLifecycleState(prev => ({ ...prev, maintenanceWindow: value }))}
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
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Kickoff</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !lifecycleState.kickoffDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lifecycleState.kickoffDate ? format(lifecycleState.kickoffDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={lifecycleState.kickoffDate}
                      onSelect={date => setLifecycleState(prev => ({ ...prev, kickoffDate: date ?? undefined }))}
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
                        !lifecycleState.discoveryComplete && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lifecycleState.discoveryComplete ? format(lifecycleState.discoveryComplete, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={lifecycleState.discoveryComplete}
                      onSelect={date =>
                        setLifecycleState(prev => ({ ...prev, discoveryComplete: date ?? undefined }))
                      }
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
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !lifecycleState.launchTarget && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lifecycleState.launchTarget ? format(lifecycleState.launchTarget, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={lifecycleState.launchTarget}
                      onSelect={date => setLifecycleState(prev => ({ ...prev, launchTarget: date ?? undefined }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mission Statement</Label>
                <Textarea
                  value={lifecycleState.lifecycleMission}
                  onChange={event => setLifecycleState(prev => ({ ...prev, lifecycleMission: event.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Lifecycle Notes</Label>
                <Textarea
                  value={lifecycleState.lifecycleNotes}
                  onChange={event => setLifecycleState(prev => ({ ...prev, lifecycleNotes: event.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Success Metrics</Label>
                <Textarea
                  value={lifecycleState.lifecycleSuccessMetrics}
                  onChange={event =>
                    setLifecycleState(prev => ({ ...prev, lifecycleSuccessMetrics: event.target.value }))
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Stakeholders</Label>
                <Textarea
                  value={lifecycleState.lifecycleStakeholders}
                  onChange={event =>
                    setLifecycleState(prev => ({ ...prev, lifecycleStakeholders: event.target.value }))
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Communication Channels</Label>
                <Textarea
                  value={lifecycleState.lifecycleChannels}
                  onChange={event =>
                    setLifecycleState(prev => ({ ...prev, lifecycleChannels: event.target.value }))
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Archival Workflow</Label>
                <Select
                  value={lifecycleState.archivalWorkflow}
                  onValueChange={value => setLifecycleState(prev => ({ ...prev, archivalWorkflow: value }))}
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
              </div>
            </div>
          </SettingsSection>

          <section className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
              <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">
                Deleting this project permanently removes all associated issues, automations, and history.
              </p>
              <div className="mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2" disabled={deleting}>
                      <Trash2 className="h-4 w-4" />
                      {deleting ? "Deleting..." : "Delete Project"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone and will remove {project.name} and all of its data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive">
                        {deleting ? "Deleting..." : "Confirm"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
