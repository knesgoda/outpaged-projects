// @ts-nocheck
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CreateProjectFlowProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

const STEPS = [
  { id: 'basics', label: 'Basics', description: 'Name and description' },
  { id: 'template', label: 'Template', description: 'Start from template' },
  { id: 'modules', label: 'Modules', description: 'Enable features' },
  { id: 'fields', label: 'Fields', description: 'Custom fields' },
  { id: 'workflow', label: 'Workflow', description: 'Define workflow' },
  { id: 'automation', label: 'Automation', description: 'Add automations' },
  { id: 'permissions', label: 'Permissions', description: 'Access control' },
  { id: 'review', label: 'Review', description: 'Review and create' },
];

export function CreateProjectFlow({ open, onClose, onCreated }: CreateProjectFlowProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>(['boards', 'tasks', 'timeline']);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    if (!projectName.trim()) {
      toast({ title: "Error", description: "Project name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          description: projectDescription,
          code: projectCode || null,
          owner: user.user?.id,
          status: 'active',
          modules: selectedModules,
          template_key: selectedTemplate,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Success", description: `Project ${project.name} created` });
      onCreated?.(project.id);
      onClose();
    } catch (error) {
      console.error("Failed to create project:", error);
      toast({ title: "Error", description: "Failed to create project", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:w-full md:max-w-4xl md:-translate-x-1/2 bg-background rounded-lg shadow-lg flex flex-col">
        {/* Header with Stepper */}
        <div className="border-b border-border p-4">
          <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
          <div className="flex items-center gap-2 overflow-x-auto">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium",
                      index === currentStep
                        ? "border-primary bg-primary text-primary-foreground"
                        : index < currentStep
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground hidden sm:block">{s.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn("h-0.5 w-8 mx-2", index < currentStep ? "bg-primary" : "bg-border")} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {step.id === 'basics' && (
              <div className="space-y-4">
                <div>
                  <Label>Project Name *</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                  />
                </div>
                <div>
                  <Label>Project Code</Label>
                  <Input
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                    placeholder="PROJ"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Short code for task IDs (e.g., PROJ-123)
                  </p>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="What is this project about?"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {step.id === 'template' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose a template to get started quickly, or start from scratch
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card
                    className={cn(
                      "cursor-pointer border-2 p-4 transition-all hover:border-primary",
                      !selectedTemplate && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <h4 className="font-medium">Blank Project</h4>
                    <p className="text-sm text-muted-foreground mt-1">Start from scratch</p>
                  </Card>
                  <Card
                    className={cn(
                      "cursor-pointer border-2 p-4 transition-all hover:border-primary",
                      selectedTemplate === 'scrum' && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedTemplate('scrum')}
                  >
                    <h4 className="font-medium">Scrum Project</h4>
                    <p className="text-sm text-muted-foreground mt-1">Sprints, backlogs, velocity</p>
                  </Card>
                  <Card
                    className={cn(
                      "cursor-pointer border-2 p-4 transition-all hover:border-primary",
                      selectedTemplate === 'kanban' && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedTemplate('kanban')}
                  >
                    <h4 className="font-medium">Kanban Project</h4>
                    <p className="text-sm text-muted-foreground mt-1">Continuous flow, WIP limits</p>
                  </Card>
                  <Card
                    className={cn(
                      "cursor-pointer border-2 p-4 transition-all hover:border-primary",
                      selectedTemplate === 'support' && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedTemplate('support')}
                  >
                    <h4 className="font-medium">Support Project</h4>
                    <p className="text-sm text-muted-foreground mt-1">Tickets, SLA, customer portal</p>
                  </Card>
                </div>
              </div>
            )}

            {step.id === 'modules' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enable modules for your project</p>
                <div className="space-y-2">
                  {[
                    { id: 'boards', label: 'Boards', description: 'Kanban, Table, Timeline views' },
                    { id: 'tasks', label: 'Tasks & Stories', description: 'Issue tracking' },
                    { id: 'timeline', label: 'Timeline & Gantt', description: 'Project planning' },
                    { id: 'docs', label: 'Docs & Wiki', description: 'Documentation' },
                    { id: 'files', label: 'Files', description: 'File management' },
                    { id: 'reports', label: 'Reports', description: 'Analytics & insights' },
                    { id: 'calendar', label: 'Calendar', description: 'Events & milestones' },
                    { id: 'automations', label: 'Automations', description: 'Workflow automation' },
                  ].map((module) => (
                    <Card
                      key={module.id}
                      className={cn(
                        "cursor-pointer border-2 p-4 transition-all",
                        selectedModules.includes(module.id) ? "border-primary bg-primary/5" : "border-border"
                      )}
                      onClick={() => {
                        setSelectedModules(
                          selectedModules.includes(module.id)
                            ? selectedModules.filter(m => m !== module.id)
                            : [...selectedModules, module.id]
                        );
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{module.label}</h4>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>
                        {selectedModules.includes(module.id) && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {step.id === 'review' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Project Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{projectName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Code:</span>
                      <span className="font-medium">{projectCode || 'Auto-generated'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Template:</span>
                      <span className="font-medium capitalize">{selectedTemplate || 'Blank'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modules:</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {selectedModules.map(m => (
                          <Badge key={m} variant="secondary">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Placeholder steps */}
            {['fields', 'workflow', 'automation', 'permissions'].includes(step.id) && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">{step.description} configuration will appear here</p>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button
            variant="outline"
            onClick={currentStep === 0 ? onClose : handleBack}
            disabled={saving}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          {currentStep === STEPS.length - 1 ? (
            <Button onClick={handleCreate} disabled={saving || !projectName.trim()}>
              {saving ? "Creating..." : "Create Project"}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
