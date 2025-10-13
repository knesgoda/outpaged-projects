// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Save, Play, Undo, Redo, ZoomIn, ZoomOut, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WorkflowState {
  id: string;
  name: string;
  category: 'todo' | 'in_progress' | 'done';
  color: string;
  position: { x: number; y: number };
  entryActions: any[];
  exitActions: any[];
  slaPause: boolean;
}

interface WorkflowTransition {
  id: string;
  fromStateId: string | null;
  toStateId: string;
  name: string;
  conditions: any[];
  validators: any[];
  postFunctions: any[];
  requiredApprovals: number;
  screens: string[];
  isReversible: boolean;
}

interface WorkflowBuilderProps {
  projectId: string;
  workflowId?: string;
  onSave?: (workflowId: string) => void;
}

export function WorkflowBuilder({ projectId, workflowId, onSave }: WorkflowBuilderProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
  }, [workflowId]);

  const loadWorkflow = async () => {
    try {
      const { data: workflow, error } = await supabase
        .from('workflow_definitions')
        .select(`
          *,
          workflow_states(*),
          workflow_transitions(*)
        `)
        .eq('id', workflowId)
        .single();

      if (error) throw error;

      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || "");
      setStates(workflow.workflow_states?.map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        color: s.color,
        position: s.position || { x: 0, y: 0 },
        entryActions: s.entry_actions || [],
        exitActions: s.exit_actions || [],
        slaPause: s.sla_pause || false,
      })) || []);
      setTransitions(workflow.workflow_transitions?.map((t: any) => ({
        id: t.id,
        fromStateId: t.from_state_id,
        toStateId: t.to_state_id,
        name: t.name,
        conditions: t.conditions || [],
        validators: t.validators || [],
        postFunctions: t.post_functions || [],
        requiredApprovals: t.required_approvals || 0,
        screens: t.screens || [],
        isReversible: t.is_reversible || false,
      })) || []);
    } catch (error) {
      console.error("Failed to load workflow:", error);
      toast({ title: "Error", description: "Failed to load workflow", variant: "destructive" });
    }
  };

  const addState = useCallback(() => {
    const newState: WorkflowState = {
      id: `temp-${Date.now()}`,
      name: `State ${states.length + 1}`,
      category: 'todo',
      color: '#6b7280',
      position: { x: 100 + states.length * 200, y: 100 },
      entryActions: [],
      exitActions: [],
      slaPause: false,
    };
    setStates([...states, newState]);
    setSelectedState(newState.id);
  }, [states]);

  const connectStates = useCallback((fromId: string, toId: string) => {
    const newTransition: WorkflowTransition = {
      id: `temp-${Date.now()}`,
      fromStateId: fromId,
      toStateId: toId,
      name: "Transition",
      conditions: [],
      validators: [],
      postFunctions: [],
      requiredApprovals: 0,
      screens: [],
      isReversible: false,
    };
    setTransitions([...transitions, newTransition]);
    setIsConnecting(false);
    setConnectFrom(null);
  }, [transitions]);

  const handleStateMouseDown = (e: React.MouseEvent, stateId: string) => {
    if (isConnecting) {
      if (connectFrom && connectFrom !== stateId) {
        connectStates(connectFrom, stateId);
      }
      return;
    }
    e.stopPropagation();
    setSelectedState(stateId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedState) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      setStates(states.map(s => s.id === selectedState
        ? { ...s, position: { x: s.position.x + dx, y: s.position.y + dy } }
        : s
      ));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const saveWorkflow = async () => {
    try {
      const canvasData = { states, transitions, zoom, offset };
      
      if (workflowId) {
        // Update existing
        const { error } = await supabase
          .from('workflow_definitions')
          .update({
            name: workflowName,
            description: workflowDescription,
            canvas_data: canvasData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workflowId);

        if (error) throw error;
      } else {
        // Create new
        const { data: newWorkflow, error: workflowError } = await supabase
          .from('workflow_definitions')
          .insert({
            project_id: projectId,
            name: workflowName,
            description: workflowDescription,
            canvas_data: canvasData,
          })
          .select()
          .single();

        if (workflowError) throw workflowError;

        // Save states and transitions
        for (const state of states) {
          await supabase.from('workflow_states').insert({
            workflow_id: newWorkflow.id,
            name: state.name,
            category: state.category,
            color: state.color,
            position: state.position,
            entry_actions: state.entryActions,
            exit_actions: state.exitActions,
            sla_pause: state.slaPause,
          });
        }

        for (const transition of transitions) {
          await supabase.from('workflow_transitions').insert({
            workflow_id: newWorkflow.id,
            from_state_id: transition.fromStateId,
            to_state_id: transition.toStateId,
            name: transition.name,
            conditions: transition.conditions,
            validators: transition.validators,
            post_functions: transition.postFunctions,
            required_approvals: transition.requiredApprovals,
            screens: transition.screens,
            is_reversible: transition.isReversible,
          });
        }

        onSave?.(newWorkflow.id);
      }

      toast({ title: "Success", description: "Workflow saved successfully" });
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast({ title: "Error", description: "Failed to save workflow", variant: "destructive" });
    }
  };

  const selectedStateObj = states.find(s => s.id === selectedState);

  return (
    <div className="flex h-screen flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border bg-background p-4">
        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="max-w-xs"
          placeholder="Workflow name"
        />
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={addState}>
          <Plus className="mr-2 h-4 w-4" />
          Add State
        </Button>
        <Button
          variant={isConnecting ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setIsConnecting(!isConnecting);
            if (!isConnecting && selectedState) {
              setConnectFrom(selectedState);
            } else {
              setConnectFrom(null);
            }
          }}
        >
          Connect
        </Button>
        <Button variant="default" size="sm" onClick={saveWorkflow}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden bg-muted/30"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: isConnecting ? "crosshair" : "default" }}
        >
          <div
            className="relative h-full w-full"
            style={{
              transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
              transformOrigin: "0 0",
            }}
          >
            {/* Transitions (lines) */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {transitions.map((t) => {
                const fromState = states.find(s => s.id === t.fromStateId);
                const toState = states.find(s => s.id === t.toStateId);
                if (!fromState || !toState) return null;

                const x1 = fromState.position.x + 75;
                const y1 = fromState.position.y + 30;
                const x2 = toState.position.x + 75;
                const y2 = toState.position.y + 30;

                return (
                  <g key={t.id}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={selectedTransition === t.id ? "hsl(var(--primary))" : "#6b7280"}
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              })}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
            </svg>

            {/* States (nodes) */}
            {states.map((state) => (
              <div
                key={state.id}
                className={cn(
                  "absolute cursor-move rounded-lg border-2 bg-background p-3 shadow-md transition-all",
                  selectedState === state.id ? "border-primary ring-2 ring-primary/20" : "border-border"
                )}
                style={{
                  left: state.position.x,
                  top: state.position.y,
                  width: 150,
                  borderColor: state.color,
                }}
                onMouseDown={(e) => handleStateMouseDown(e, state.id)}
              >
                <div className="text-sm font-medium">{state.name}</div>
                <div className="mt-1 text-xs text-muted-foreground capitalize">{state.category.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="w-80 border-l border-border bg-background">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {selectedStateObj ? (
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">State Properties</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={selectedStateObj.name}
                        onChange={(e) =>
                          setStates(states.map(s => s.id === selectedState ? { ...s, name: e.target.value } : s))
                        }
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={selectedStateObj.category}
                        onValueChange={(value: any) =>
                          setStates(states.map(s => s.id === selectedState ? { ...s, category: value } : s))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Input
                        type="color"
                        value={selectedStateObj.color}
                        onChange={(e) =>
                          setStates(states.map(s => s.id === selectedState ? { ...s, color: e.target.value } : s))
                        }
                      />
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Select a state to edit its properties</p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
