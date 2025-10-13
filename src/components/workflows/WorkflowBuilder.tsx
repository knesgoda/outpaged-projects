import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import { useWorkflows, type WorkflowState, type WorkflowTransition } from "@/hooks/useWorkflows";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface WorkflowBuilderProps {
  projectId?: string;
}

export function WorkflowBuilder({ projectId }: WorkflowBuilderProps) {
  const { templates, createWorkflowTemplate, createWorkflowState, createWorkflowTransition } = useWorkflows(projectId);
  
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState<'design' | 'software' | 'marketing' | 'operations' | 'custom'>('custom');
  const [currentTemplateId, setCurrentTemplateId] = useState<string>("");
  
  const [states, setStates] = useState<Array<Omit<WorkflowState, 'id' | 'created_at'>>>([]);
  const [newStateName, setNewStateName] = useState("");
  const [newStateCategory, setNewStateCategory] = useState<'draft' | 'todo' | 'in_progress' | 'in_review' | 'on_hold' | 'done'>('todo');

  const handleCreateTemplate = async () => {
    if (!templateName) return;
    
    const template = await createWorkflowTemplate({
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      is_default: false,
      is_active: true,
    });

    if (template) {
      setCurrentTemplateId(template.id);
      setTemplateName("");
      setTemplateDescription("");
    }
  };

  const handleAddState = () => {
    if (!newStateName || !currentTemplateId) return;

    const newState: Omit<WorkflowState, 'id' | 'created_at'> = {
      workflow_template_id: currentTemplateId,
      name: newStateName,
      state_category: newStateCategory,
      position: states.length,
      color: '#6b7280',
      required_fields: [],
      requires_approval: false,
      approval_roles: [],
    };

    setStates([...states, newState]);
    setNewStateName("");
  };

  const handleSaveWorkflow = async () => {
    if (!currentTemplateId || states.length === 0) return;

    // Save all states
    for (const state of states) {
      await createWorkflowState(state);
    }

    // Create default transitions (linear flow)
    for (let i = 0; i < states.length - 1; i++) {
      const fromState = states[i];
      const toState = states[i + 1];
      
      await createWorkflowTransition({
        workflow_template_id: currentTemplateId,
        from_state_id: fromState.workflow_template_id, // This will be updated with actual IDs
        to_state_id: toState.workflow_template_id,
        conditions: {},
        validators: [],
        transition_screen: null,
        post_actions: [],
        approvals: [],
      });
    }

    setStates([]);
    setCurrentTemplateId("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Builder</CardTitle>
        <CardDescription>Create custom workflows for your projects</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., Custom Design Flow"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Describe this workflow..."
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="template-category">Category</Label>
            <Select value={templateCategory} onValueChange={(value: any) => setTemplateCategory(value)}>
              <SelectTrigger id="template-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreateTemplate} disabled={!templateName}>
            Create Template
          </Button>
        </div>

        {currentTemplateId && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Add Workflow States</h3>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="State name (e.g., In Review)"
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                />
              </div>
              <Select value={newStateCategory} onValueChange={(value: any) => setNewStateCategory(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddState} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {states.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Workflow States:</h4>
                <div className="flex flex-wrap gap-2">
                  {states.map((state, index) => (
                    <Badge key={index} variant="outline" className="gap-1">
                      {state.name}
                      <button
                        onClick={() => setStates(states.filter((_, i) => i !== index))}
                        className="ml-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSaveWorkflow} disabled={states.length === 0} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Workflow
            </Button>
          </div>
        )}

        {templates.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-semibold">Available Templates</h3>
            <div className="grid gap-2">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="text-sm">{template.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={template.is_default ? "default" : "secondary"}>
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
