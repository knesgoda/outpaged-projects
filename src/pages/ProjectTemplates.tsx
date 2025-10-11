import { useMemo, useState } from "react";
import { ArrowRight, Briefcase, Code, Layout, Palette, Plus, Star, Target, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useProjectTemplates, useCreateProjectTemplate } from "@/hooks/useProjectTemplates";
import { useProjects } from "@/hooks/useProjects";
import { exportProjectBundle, type ExportProjectOptions } from "@/services/projects";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import type { ProjectTemplateSummary } from "@/services/projectTemplates";

const CATEGORY_ICONS: Record<string, any> = {
  software: Code,
  service: Users,
  marketing: Target,
  business: Briefcase,
  design: Palette,
  ops: Layout,
};

const COMPLEXITY_LABELS: Record<string, string> = {
  starter: "Beginner",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Advanced",
};

const DEFAULT_EXPORT_OPTIONS: ExportProjectOptions = {
  includeAutomations: true,
  includeBoards: true,
  includeFields: true,
  includeTasks: true,
  includeHistory: false,
};

type TemplateCreationState = {
  name: string;
  description: string;
  category: string;
  projectId: string;
  tags: string;
  complexity: string;
  estimatedDuration: string;
  successMetrics: string;
};

const DEFAULT_CREATION_STATE: TemplateCreationState = {
  name: "",
  description: "",
  category: "software",
  projectId: "",
  tags: "",
  complexity: "intermediate",
  estimatedDuration: "6-8 weeks",
  successMetrics: "Velocity trending\nPredictability\nEscaped defects",
};

const parseList = (value: string) =>
  value
    .split(/[\n,]+/)
    .map(item => item.trim())
    .filter(Boolean);

const buildManifestFromBundle = (bundle: any) => {
  const modules = (bundle.project?.modules ?? []) as string[];
  const fields = (bundle.fields ?? []).map((field: any) => ({
    name: field.name,
    field_type: field.field_type,
    options: field.options ?? [],
    applies_to: field.applies_to ?? ["task"],
    is_required: field.is_required ?? false,
    is_private: field.is_private ?? false,
    position: field.position ?? 0,
  }));

  const workflows = (bundle.workflows ?? []).map((workflow: any) => ({
    workflow_template_id: workflow.workflow_template_id,
    item_type: workflow.item_type,
  }));

  const boards = (bundle.boards ?? []).map((scope: any) => {
    const board = scope.boards ?? scope.board ?? {};
    const views = scope.board_views ?? scope.views ?? [];
    return {
      name: board.name,
      type: board.type,
      description: board.description,
      metadata: scope.metadata ?? {},
      filters: scope.filters ?? {},
      views: views.map((view: any) => ({
        name: view.name,
        slug: view.slug,
        description: view.description,
        is_default: view.is_default,
        position: view.position,
        configuration: view.configuration ?? {},
      })),
    };
  });

  const automations = (bundle.automations ?? []).map((automation: any) => ({
    name: automation.name,
    trigger_type: automation.trigger_type,
    trigger_config: automation.trigger_config ?? {},
    action_type: automation.action_type,
    action_config: automation.action_config ?? {},
    enabled: automation.enabled ?? true,
  }));

  const starterItems = (bundle.tasks ?? []).slice(0, 10).map((task: any) => ({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    story_points: task.story_points,
  }));

  const schemes = {
    permission: bundle.project?.permission_scheme_id ?? undefined,
    notification: bundle.project?.notification_scheme_id ?? undefined,
    sla: bundle.project?.sla_scheme_id ?? undefined,
  };

  return {
    modules,
    schemes,
    fields,
    workflows,
    boards,
    automations,
    starter_items: starterItems,
  };
};

export default function ProjectTemplates() {
  const { toast } = useToast();
  const { data: templates = [], isLoading, error } = useProjectTemplates();
  const { data: projectList } = useProjects({ q: "", status: "all", page: 1, pageSize: 100, sort: "name", dir: "asc" });
  const createTemplate = useCreateProjectTemplate();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [creationState, setCreationState] = useState<TemplateCreationState>(DEFAULT_CREATION_STATE);
  const [isCreating, setIsCreating] = useState(false);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    templates.forEach(template => {
      if (template.category) {
        unique.add(template.category);
      }
    });
    return Array.from(unique);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
      const haystack = [
        template.name,
        template.description,
        ...(template.tags ?? []),
        ...(template.successMetrics ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, categoryFilter, searchQuery]);

  const handleUseTemplate = (templateId?: string) => {
    if (!templateId) {
      toast({
        title: "Template unavailable",
        description: "Select a template from the gallery to continue.",
        variant: "destructive",
      });
      return;
    }
    setActiveTemplateId(templateId);
    setProjectDialogOpen(true);
  };

  const handleCreateTemplate = async () => {
    if (!creationState.projectId) {
      toast({
        title: "Select a source project",
        description: "Choose a project to build the template from.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const bundle = await exportProjectBundle(creationState.projectId, DEFAULT_EXPORT_OPTIONS);
      const manifest = buildManifestFromBundle(bundle.bundle ?? bundle);

      await createTemplate.mutateAsync({
        name: creationState.name || bundle.project?.name || "Untitled Template",
        description: creationState.description || bundle.project?.description || "",
        category: creationState.category,
        icon: undefined,
        tags: parseList(creationState.tags),
        complexity: creationState.complexity,
        estimated_duration: creationState.estimatedDuration,
        recommended_modules: manifest.modules ?? [],
        success_metrics: parseList(creationState.successMetrics),
        template_data: manifest,
      });

      toast({
        title: "Template created",
        description: `${creationState.name || bundle.project?.name} added to the gallery.`,
      });
      setCreateDialogOpen(false);
      setCreationState(DEFAULT_CREATION_STATE);
    } catch (creationError: any) {
      console.error("Error creating template", creationError);
      toast({
        title: "Unable to create template",
        description: creationError?.message ?? "Check the project selection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleExplore = (template: ProjectTemplateSummary) => {
    setActiveTemplateId(template.id);
    setProjectDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Templates</h1>
          <p className="text-muted-foreground">
            Jumpstart work with curated Jira × Monday style configurations, ready-to-run boards, automations, and starter data.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create from project
          </Button>
          <Button
            className="bg-gradient-primary"
            onClick={() => handleUseTemplate(templates[0]?.id)}
            disabled={!templates.length}
          >
            Launch project
          </Button>
        </div>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="marketplace">Template marketplace</TabsTrigger>
          <TabsTrigger value="custom">My templates</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              placeholder="Search templates"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="flex-1"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Unable to load templates</CardTitle>
                <CardDescription>{(error as any)?.message ?? "Try again later."}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {(isLoading ? Array.from({ length: 3 }) : filteredTemplates).map((template, index) => {
                if (isLoading) {
                  return (
                    <Card key={`skeleton-${index}`} className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-muted-foreground">Loading…</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        Preparing curated configuration
                      </CardContent>
                    </Card>
                  );
                }

                const Icon = CATEGORY_ICONS[template.category] ?? Layout;
                const fieldCount = template.templateData.fields?.length ?? 0;
                const automationCount = template.templateData.automations?.length ?? 0;
                const boardCount = template.templateData.boards?.length ?? 0;

                return (
                  <Card key={template.id} className="flex flex-col justify-between">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                          <p className="text-xs uppercase text-muted-foreground">{template.category}</p>
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Icon className="h-4 w-4" />
                          {COMPLEXITY_LABELS[template.complexity] ?? template.complexity}
                        </Badge>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {template.score ?? 0} adoptions</span>
                        <span className="inline-flex items-center gap-1"><Layout className="h-3 w-3" /> {boardCount} boards</span>
                        <span className="inline-flex items-center gap-1"><Code className="h-3 w-3" /> {automationCount} automations</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {fieldCount} fields</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Recommended modules</p>
                        <div className="flex flex-wrap gap-2">
                          {template.recommendedModules.map(moduleId => {
                            return (
                              <Badge key={moduleId} variant="outline">
                                {moduleId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      {template.successMetrics.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Success metrics</p>
                          <ul className="grid gap-1 text-xs text-muted-foreground">
                            {template.successMetrics.slice(0, 3).map(metric => (
                              <li key={metric} className="flex items-center gap-2">
                                <ArrowRight className="h-3 w-3" />
                                {metric}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                    <CardContent className="mt-auto flex items-center justify-between gap-2 border-t pt-4">
                      <Button variant="outline" size="sm" onClick={() => handleExplore(template)}>
                        Explore
                      </Button>
                      <Button size="sm" onClick={() => handleUseTemplate(template.id)}>
                        Use template
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create a reusable template</CardTitle>
              <CardDescription>
                Promote a proven project configuration so teams can launch with ready-made boards, workflows, and automations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template name</Label>
                  <Input
                    id="template-name"
                    value={creationState.name}
                    onChange={event => setCreationState(prev => ({ ...prev, name: event.target.value }))}
                    placeholder="Scale sprint delivery"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={creationState.category}
                    onValueChange={value => setCreationState(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="template-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="service">Service desk</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="business">Business operations</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="ops">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  rows={3}
                  value={creationState.description}
                  onChange={event => setCreationState(prev => ({ ...prev, description: event.target.value }))}
                  placeholder="What scenario does this template solve?"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-project">Source project</Label>
                  <Select
                    value={creationState.projectId}
                    onValueChange={value => setCreationState(prev => ({ ...prev, projectId: value }))}
                  >
                    <SelectTrigger id="template-project">
                      <SelectValue placeholder="Choose project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projectList?.data ?? []).map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-complexity">Complexity</Label>
                  <Select
                    value={creationState.complexity}
                    onValueChange={value => setCreationState(prev => ({ ...prev, complexity: value }))}
                  >
                    <SelectTrigger id="template-complexity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-tags">Tags</Label>
                  <Input
                    id="template-tags"
                    value={creationState.tags}
                    onChange={event => setCreationState(prev => ({ ...prev, tags: event.target.value }))}
                    placeholder="engineering, qa, release"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-duration">Estimated duration</Label>
                  <Input
                    id="template-duration"
                    value={creationState.estimatedDuration}
                    onChange={event => setCreationState(prev => ({ ...prev, estimatedDuration: event.target.value }))}
                    placeholder="6-8 weeks"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-metrics">Success metrics</Label>
                <Textarea
                  id="template-metrics"
                  rows={3}
                  value={creationState.successMetrics}
                  onChange={event => setCreationState(prev => ({ ...prev, successMetrics: event.target.value }))}
                  placeholder="One per line"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreateTemplate} disabled={isCreating}>
                  {isCreating ? "Creating…" : "Create template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSuccess={() => setProjectDialogOpen(false)}
        initialTemplateId={activeTemplateId}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Promote template</DialogTitle>
            <DialogDescription>
              Use an existing project configuration to seed a reusable template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Template name</Label>
                <Input
                  value={creationState.name}
                  onChange={event => setCreationState(prev => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Source project</Label>
                <Select
                  value={creationState.projectId}
                  onValueChange={value => setCreationState(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projectList?.data ?? []).map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={creationState.description}
                onChange={event => setCreationState(prev => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={creationState.tags}
                  onChange={event => setCreationState(prev => ({ ...prev, tags: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated duration</Label>
                <Input
                  value={creationState.estimatedDuration}
                  onChange={event => setCreationState(prev => ({ ...prev, estimatedDuration: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Success metrics (one per line)</Label>
              <Textarea
                rows={3}
                value={creationState.successMetrics}
                onChange={event => setCreationState(prev => ({ ...prev, successMetrics: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} disabled={isCreating}>
                {isCreating ? "Creating…" : "Create template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
