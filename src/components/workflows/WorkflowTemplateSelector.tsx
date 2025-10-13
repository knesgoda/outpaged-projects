import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useToast } from '@/hooks/use-toast';
import { WORKFLOW_TEMPLATES, type WorkflowTemplateDefinition } from '@/data/workflowTemplates';
import { Check, Palette, Code, Megaphone, Settings } from 'lucide-react';

interface WorkflowTemplateSelectorProps {
  projectId?: string;
  onTemplateApplied?: () => void;
}

const categoryIcons = {
  design: Palette,
  software: Code,
  marketing: Megaphone,
  operations: Settings,
};

export function WorkflowTemplateSelector({ projectId, onTemplateApplied }: WorkflowTemplateSelectorProps) {
  const [applying, setApplying] = useState<string | null>(null);
  const { createWorkflowTemplate, createWorkflowState, createWorkflowTransition, assignWorkflowToProject } = useWorkflows();
  const { toast } = useToast();

  const applyTemplate = async (template: WorkflowTemplateDefinition) => {
    try {
      setApplying(template.name);

      // Create the workflow template
      const workflowTemplate = await createWorkflowTemplate({
        name: template.name,
        description: template.description,
        category: template.category,
        is_default: true,
        is_active: true,
      });

      if (!workflowTemplate) {
        throw new Error('Failed to create workflow template');
      }

      // Create all states
      const stateMap = new Map<string, string>();
      for (let i = 0; i < template.states.length; i++) {
        const state = template.states[i];
        const createdState = await createWorkflowState({
          workflow_template_id: workflowTemplate.id,
          name: state.name,
          description: state.description,
          state_category: state.category,
          position: i,
          color: state.color,
          required_fields: state.requiredFields || [],
          requires_approval: state.requiresApproval || false,
          approval_roles: state.approvalRoles || [],
        });

        if (createdState) {
          stateMap.set(state.name, createdState.id);
        }
      }

      // Create all transitions
      for (const transition of template.transitions) {
        const fromStateId = stateMap.get(transition.from);
        const toStateId = stateMap.get(transition.to);

        if (fromStateId && toStateId) {
          await createWorkflowTransition({
            workflow_template_id: workflowTemplate.id,
            from_state_id: fromStateId,
            to_state_id: toStateId,
            conditions: transition.conditions || {},
            validators: transition.validators || [],
            transition_screen: transition.screen || null,
            post_actions: transition.postActions || [],
            approvals: transition.approvals || [],
          });
        }
      }

      // Assign to project if projectId is provided
      if (projectId) {
        await assignWorkflowToProject(projectId, workflowTemplate.id, 'task');
      }

      toast({
        title: "Success",
        description: `${template.name} has been applied successfully`,
      });

      if (onTemplateApplied) {
        onTemplateApplied();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply workflow template",
        variant: "destructive",
      });
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pre-built Workflow Templates</h2>
        <p className="text-muted-foreground">
          Choose a template that matches your team's workflow and customize it to your needs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {WORKFLOW_TEMPLATES.map((template) => {
          const Icon = categoryIcons[template.category];
          
          return (
            <Card key={template.name} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {template.name}
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">States ({template.states.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {template.states.map((state) => (
                      <Badge 
                        key={state.name} 
                        variant="secondary"
                        style={{
                          backgroundColor: `${state.color}20`,
                          borderColor: state.color,
                        }}
                      >
                        {state.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Features:</p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {template.transitions.length} transitions
                    </li>
                    {template.states.some(s => s.requiresApproval) && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Approval gates
                      </li>
                    )}
                    {template.states.some(s => s.requiredFields && s.requiredFields.length > 0) && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Required field validation
                      </li>
                    )}
                  </ul>
                </div>

                <Button
                  onClick={() => applyTemplate(template)}
                  disabled={applying === template.name}
                  className="w-full"
                >
                  {applying === template.name ? 'Applying...' : 'Apply Template'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
