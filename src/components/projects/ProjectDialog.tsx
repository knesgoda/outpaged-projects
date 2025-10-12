import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { ProjectStatus } from "@/services/projects";
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

const steps = [
  {
    id: "basics",
    title: "Project Basics",
    description: "Name, description, timeline, and tracking status.",
  },
  {
    id: "template",
    title: "Template & Structure",
    description: "Select templates, fields, workflows, and component catalogs.",
  },
  {
    id: "capabilities",
    title: "Modules & Schemes",
    description: "Enable product modules, schemes, automations, and integrations.",
  },
  {
    id: "lifecycle",
    title: "Lifecycle & Launch",
    description: "Lifecycle metadata, import strategy, calendars, and archival.",
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm configuration before creating the project.",
  },
] as const;

type StepId = (typeof steps)[number]["id"];

type CreationState = {
  name: string;
  description: string;
  code: string;
  status: Exclude<ProjectStatus, "archived">;
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

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: any) => void;
  initialTemplateId?: string;
}

export function ProjectDialog({ open, onOpenChange, onSuccess, initialTemplateId }: ProjectDialogProps) {
  const { toast } = useToast();
  const createProject = useCreateProject();
  const applyTemplate = useApplyProjectTemplate();
  const { data: templates = [], isLoading: loadingTemplates } = useProjectTemplates();

  const templateMap = useMemo(() => {
    const map = new Map<string, (typeof templates)[number]>();
    templates.forEach(template => map.set(template.id, template));
    return map;
  }, [templates]);

  const [activeStep, setActiveStep] = useState<StepId>(steps[0].id);
  const [formData, setFormData] = useState<CreationState>(() => ({
    name: "",
    description: "",
    code: "",
    status: "planning",
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
  }));

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

  const currentStepIndex = steps.findIndex(step => step.id === activeStep);
  const isFinalStep = currentStepIndex === steps.length - 1;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const resetForm = () => {
    setActiveStep(steps[0].id);
    setFormData(prev => ({
      ...prev,
      name: "",
      description: "",
      code: "",
      status: "planning",
      startDate: undefined,
      endDate: undefined,
      templateKey: initialTemplateId ?? "",
      lifecycleNotes: "",
      lifecycleMission: "",
      lifecycleSuccessMetrics: "",
      lifecycleStakeholders: "",
      lifecycleChannels: "",
      kickoffDate: undefined,
      discoveryComplete: undefined,
      launchTarget: undefined,
    }));
  };

  const goToStep = (stepId: StepId) => setActiveStep(stepId);

  const goNext = () => {
    const nextStep = steps[Math.min(currentStepIndex + 1, steps.length - 1)];
    setActiveStep(nextStep.id);
  };

  const goPrevious = () => {
    const prevStep = steps[Math.max(currentStepIndex - 1, 0)];
    setActiveStep(prevStep.id);
  };

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
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFinalStep) {
      goNext();
      return;
    }

    try {
      const payload = buildPayload();
      const project = await createProject.mutateAsync(payload);

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
                  Step {currentStepIndex + 1} of {steps.length}
                </p>
                <h3 className="text-xl font-semibold text-foreground">{steps[currentStepIndex].title}</h3>
                <p className="text-sm text-muted-foreground">{steps[currentStepIndex].description}</p>
              </div>
              <div className="w-40">
                <Progress value={progress} className="h-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-5">
              {steps.map((step, index) => {
                const reached = index <= currentStepIndex;
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
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {activeStep === "basics" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    value={formData.name}
                    onChange={event =>
                      setFormData(prev => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Atlas Product Launch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={formData.description}
                    onChange={event =>
                      setFormData(prev => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Objectives, scope, and success criteria for the initiative"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-code">Project Code</Label>
                  <Input
                    id="project-code"
                    value={formData.code}
                    onChange={event =>
                      setFormData(prev => ({ ...prev, code: event.target.value.toUpperCase() }))
                    }
                    placeholder="ATLAS"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for issue keys, URLs, and referencing the project externally.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
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
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground",
                          )}
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
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground",
                          )}
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
                      <strong>Tip:</strong> capture a short mission statement and expected outcomes so that the
                      lifecycle metadata remains actionable through delivery.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeStep === "template" && (
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
                  <Select
                    value={formData.fieldPreset}
                    onValueChange={value => setFormData(prev => ({ ...prev, fieldPreset: value }))}
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
                    <p className="text-xs text-muted-foreground">
                      States: {selectedWorkflow.states.join(" → ")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Screen Pack</Label>
                  <Select
                    value={formData.screenPack}
                    onValueChange={value => setFormData(prev => ({ ...prev, screenPack: value }))}
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
                </div>
              </div>
            </div>
          )}

          {activeStep === "capabilities" && (
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
                  <Select
                    value={formData.permissionScheme}
                    onValueChange={value => setFormData(prev => ({ ...prev, permissionScheme: value }))}
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
                  <Select
                    value={formData.slaScheme}
                    onValueChange={value => setFormData(prev => ({ ...prev, slaScheme: value }))}
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
                    <p className="text-xs text-muted-foreground">
                      Triggers: {selectedAutomation.triggers.join(", ")}
                    </p>
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

                <div className="space-y-2">
                  <Label>Default Views</Label>
                  <Select
                    value={formData.viewCollection}
                    onValueChange={value => setFormData(prev => ({ ...prev, viewCollection: value }))}
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
                </div>
              </div>
            </div>
          )}

          {activeStep === "lifecycle" && (
            <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
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
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.kickoffDate && "text-muted-foreground",
                          )}
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
                          onSelect={date =>
                            setFormData(prev => ({ ...prev, discoveryComplete: date ?? undefined }))
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
                            !formData.launchTarget && "text-muted-foreground",
                          )}
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
                  <Select
                    value={formData.reviewCadence}
                    onValueChange={value => setFormData(prev => ({ ...prev, reviewCadence: value }))}
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
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Calendar</Label>
                    <Select
                      value={formData.calendarId}
                      onValueChange={value => setFormData(prev => ({ ...prev, calendarId: value }))}
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
                      value={formData.timezone}
                      onValueChange={value => setFormData(prev => ({ ...prev, timezone: value }))}
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
                        className={cn(
                          "border",
                          formData.importStrategy === option.id && "border-primary bg-primary/5",
                        )}
                      >
                        <CardHeader className="flex flex-row items-start gap-4">
                          <RadioGroupItem value={option.id} className="mt-1" />
                          <div>
                            <CardTitle className="text-base">{option.name}</CardTitle>
                            <CardDescription>{option.description}</CardDescription>
                            {option.sources && option.sources.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Sources: {option.sources.join(", ")}
                              </p>
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </RadioGroup>
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
                    <Label>Lifecycle Notes</Label>
                    <Textarea
                      value={formData.lifecycleNotes}
                      onChange={event => setFormData(prev => ({ ...prev, lifecycleNotes: event.target.value }))}
                      placeholder="Key decisions, governance checkpoints, and risk mitigations."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Success Metrics (comma or line separated)</Label>
                    <Textarea
                      value={formData.lifecycleSuccessMetrics}
                      onChange={event =>
                        setFormData(prev => ({ ...prev, lifecycleSuccessMetrics: event.target.value }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stakeholders</Label>
                    <Textarea
                      value={formData.lifecycleStakeholders}
                      onChange={event =>
                        setFormData(prev => ({ ...prev, lifecycleStakeholders: event.target.value }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Communication Channels</Label>
                    <Textarea
                      value={formData.lifecycleChannels}
                      onChange={event =>
                        setFormData(prev => ({ ...prev, lifecycleChannels: event.target.value }))
                      }
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === "review" && (
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
                        {selectedTemplate?.name}
                        <br />
                        Field preset: {selectedFieldPreset?.name}
                        <br />
                        Workflow: {selectedWorkflow?.name}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Modules & Schemes</h4>
                      <p className="text-sm text-muted-foreground">
                        Modules: {selectedModules.map(module => module.name).join(", ") || "—"}
                        <br />
                        Permission: {formData.permissionScheme}
                        <br />
                        Notification: {formData.notificationScheme}
                        <br />
                        SLA: {formData.slaScheme}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold">Lifecycle</h4>
                      <p className="text-sm text-muted-foreground">
                        Preset: {selectedLifecyclePreset?.name}
                        <br />
                        Review Cadence: {formData.reviewCadence}
                        <br />
                        Maintenance: {formData.maintenanceWindow}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Launch Logistics</h4>
                      <p className="text-sm text-muted-foreground">
                        Calendar: {calendarOptions.find(option => option.id === formData.calendarId)?.name}
                        <br />
                        Timezone: {formData.timezone}
                        <br />
                        Import: {selectedImportOption?.name}
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
                        Dashboard: {selectedDashboard?.name}
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
          )}

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
