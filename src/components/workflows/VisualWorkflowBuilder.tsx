import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkflows, type WorkflowState } from '@/hooks/useWorkflows';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Trash2 } from 'lucide-react';

const stateCategories = [
  { value: 'draft', label: 'Draft', color: '#6b7280' },
  { value: 'todo', label: 'To Do', color: '#3b82f6' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'in_review', label: 'In Review', color: '#8b5cf6' },
  { value: 'on_hold', label: 'On Hold', color: '#ef4444' },
  { value: 'done', label: 'Done', color: '#10b981' },
];

interface VisualWorkflowBuilderProps {
  templateId?: string;
  onSave?: () => void;
}

export function VisualWorkflowBuilder({ templateId, onSave }: VisualWorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [newStateName, setNewStateName] = useState('');
  const [newStateCategory, setNewStateCategory] = useState<WorkflowState['state_category']>('todo');
  const [selectedTemplate, setSelectedTemplate] = useState(templateId || '');
  
  const { templates, states, createWorkflowState, createWorkflowTransition, fetchWorkflowStates } = useWorkflows();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedTemplate) {
      loadWorkflowStates(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadWorkflowStates = async (tmplId: string) => {
    const statesList = await fetchWorkflowStates(tmplId);
    
    const flowNodes: Node[] = statesList.map((state, index) => ({
      id: state.id,
      type: 'default',
      position: { x: (index % 4) * 250, y: Math.floor(index / 4) * 150 },
      data: { 
        label: state.name,
      },
      style: {
        background: state.color,
        color: '#fff',
        border: '1px solid #555',
        borderRadius: '8px',
        padding: '10px',
      },
    }));

    setNodes(flowNodes);
    setEdges([]);
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const addState = async () => {
    if (!newStateName.trim() || !selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template and enter a state name",
        variant: "destructive",
      });
      return;
    }

    const categoryColor = stateCategories.find(c => c.value === newStateCategory)?.color || '#6b7280';

    const newState = await createWorkflowState({
      workflow_template_id: selectedTemplate,
      name: newStateName,
      state_category: newStateCategory,
      position: states.length,
      color: categoryColor,
      required_fields: [],
      requires_approval: false,
      approval_roles: [],
    });

    if (newState) {
      const newNode: Node = {
        id: newState.id,
        type: 'default',
        position: { x: (states.length % 4) * 250, y: Math.floor(states.length / 4) * 150 },
        data: { label: newStateName },
        style: {
          background: categoryColor,
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '8px',
          padding: '10px',
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setNewStateName('');
      
      toast({
        title: "Success",
        description: "State added successfully",
      });
    }
  };

  const saveWorkflow = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template first",
        variant: "destructive",
      });
      return;
    }

    // Save all transitions based on edges
    for (const edge of edges) {
      await createWorkflowTransition({
        workflow_template_id: selectedTemplate,
        from_state_id: edge.source,
        to_state_id: edge.target,
        conditions: {},
        post_actions: [],
      });
    }

    toast({
      title: "Success",
      description: "Workflow saved successfully",
    });

    if (onSave) {
      onSave();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Visual Workflow Builder</CardTitle>
        <CardDescription>
          Drag states to position them and connect them to define transitions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="template">Workflow Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state-name">New State Name</Label>
            <Input
              id="state-name"
              placeholder="e.g., In Review"
              value={newStateName}
              onChange={(e) => setNewStateName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={newStateCategory} onValueChange={(value: any) => setNewStateCategory(value)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stateCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={addState} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />
              Add State
            </Button>
            <Button onClick={saveWorkflow} variant="secondary">
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="h-[500px] border rounded-lg bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        <div className="flex gap-2">
          {stateCategories.map((category) => (
            <div key={category.value} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ background: category.color }}
              />
              <span className="text-sm">{category.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
