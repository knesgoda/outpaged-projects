// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus,
  Save,
  Play,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  LayoutDashboard,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WorkflowState {
  id: string;
  name: string;
  category: "todo" | "in_progress" | "done";
  color: string;
  position: { x: number; y: number };
  entryActions: string[];
  exitActions: string[];
  slaPause: boolean;
  slaResume: boolean;
  wipLimit: number | null;
  wipPolicy: string;
}

interface WorkflowTransition {
  id: string;
  fromStateId: string | null;
  toStateId: string;
  name: string;
  guard: string;
  validators: string[];
  postFunctions: string[];
  requiredApprovals: number;
  requiredScreens: string[];
  isReversible: boolean;
  resumeSla: boolean;
}

interface WorkflowVersionRecord {
  id: string;
  version_number: number;
  created_at: string;
  notes?: string | null;
  published?: boolean;
  definition?: {
    states?: WorkflowState[];
    transitions?: WorkflowTransition[];
    metadata?: Record<string, unknown>;
  };
}

interface WorkflowHistorySnapshot {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  workflowName: string;
  workflowDescription: string;
}

interface SimulationResult {
  pathCount: number;
  cyclicalStates: string[];
  warnings: string[];
  estimatedLeadTime: number;
}

interface WorkflowBuilderProps {
  projectId: string;
  workflowId?: string;
  onSave?: (workflowId: string) => void;
}

const DEFAULT_POSITION = { x: 0, y: 0 };

const normalizeState = (state: Partial<WorkflowState>): WorkflowState => ({
  id: state.id ?? `state-${crypto.randomUUID?.() ?? Date.now()}`,
  name: state.name ?? "State",
  category: state.category ?? "todo",
  color: state.color ?? "#6b7280",
  position: state.position ?? { ...DEFAULT_POSITION },
  entryActions: state.entryActions ?? [],
  exitActions: state.exitActions ?? [],
  slaPause: state.slaPause ?? false,
  slaResume: state.slaResume ?? false,
  wipLimit: state.wipLimit ?? null,
  wipPolicy: state.wipPolicy ?? "",
});

const normalizeTransition = (transition: Partial<WorkflowTransition>): WorkflowTransition => ({
  id: transition.id ?? `transition-${crypto.randomUUID?.() ?? Date.now()}`,
  fromStateId: transition.fromStateId ?? null,
  toStateId: transition.toStateId ?? "",
  name: transition.name ?? "Transition",
  guard: transition.guard ?? "",
  validators: transition.validators ?? [],
  postFunctions: transition.postFunctions ?? [],
  requiredApprovals: transition.requiredApprovals ?? 0,
  requiredScreens: transition.requiredScreens ?? [],
  isReversible: transition.isReversible ?? false,
  resumeSla: transition.resumeSla ?? true,
});

export function WorkflowBuilder({ projectId, workflowId, onSave }: WorkflowBuilderProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [history, setHistory] = useState<{ past: WorkflowHistorySnapshot[]; future: WorkflowHistorySnapshot[] }>({
    past: [],
    future: [],
  });
  const [versions, setVersions] = useState<WorkflowVersionRecord[]>([]);
  const [currentStatus, setCurrentStatus] = useState<"draft" | "published">("draft");
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");
  const [boardMappingStatus, setBoardMappingStatus] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"state" | "transition" | "lifecycle">("state");

  const [entryActionInput, setEntryActionInput] = useState("");
  const [exitActionInput, setExitActionInput] = useState("");
  const [validatorInput, setValidatorInput] = useState("");
  const [screenInput, setScreenInput] = useState("");
  const [postFunctionInput, setPostFunctionInput] = useState("");

  const statesRef = useRef(states);
  const transitionsRef = useRef(transitions);
  const nameRef = useRef(workflowName);
  const descriptionRef = useRef(workflowDescription);

  useEffect(() => {
    statesRef.current = states;
  }, [states]);

  useEffect(() => {
    transitionsRef.current = transitions;
  }, [transitions]);

  useEffect(() => {
    nameRef.current = workflowName;
  }, [workflowName]);

  useEffect(() => {
    descriptionRef.current = workflowDescription;
  }, [workflowDescription]);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
      loadVersions();
    } else {
      setHistory({ past: [], future: [] });
    }
  }, [workflowId]);

  useEffect(() => {
    if (selectedState) {
      setActivePanel("state");
    } else if (selectedTransition) {
      setActivePanel("transition");
    }
  }, [selectedState, selectedTransition]);

  useEffect(() => {
    setEntryActionInput("");
    setExitActionInput("");
    setValidatorInput("");
    setScreenInput("");
    setPostFunctionInput("");
  }, [selectedState, selectedTransition]);

  const pushHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [
        ...prev.past,
        {
          states: structuredClone(statesRef.current),
          transitions: structuredClone(transitionsRef.current),
          workflowName: nameRef.current,
          workflowDescription: descriptionRef.current,
        },
      ],
      future: [],
    }));
  }, []);

  const undo = () => {
    setHistory((prev) => {
      if (!prev.past.length) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      const current: WorkflowHistorySnapshot = {
        states: structuredClone(statesRef.current),
        transitions: structuredClone(transitionsRef.current),
        workflowName: nameRef.current,
        workflowDescription: descriptionRef.current,
      };

      setStates(previous.states);
      setTransitions(previous.transitions);
      setWorkflowName(previous.workflowName);
      setWorkflowDescription(previous.workflowDescription);
      setSelectedState(null);
      setSelectedTransition(null);

      return {
        past: newPast,
        future: [current, ...prev.future],
      };
    });
  };

  const redo = () => {
    setHistory((prev) => {
      if (!prev.future.length) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      const current: WorkflowHistorySnapshot = {
        states: structuredClone(statesRef.current),
        transitions: structuredClone(transitionsRef.current),
        workflowName: nameRef.current,
        workflowDescription: descriptionRef.current,
      };

      setStates(next.states);
      setTransitions(next.transitions);
      setWorkflowName(next.workflowName);
      setWorkflowDescription(next.workflowDescription);
      setSelectedState(null);
      setSelectedTransition(null);

      return {
        past: [...prev.past, current],
        future: newFuture,
      };
    });
  };

  const loadWorkflow = async () => {
    try {
      const { data: workflow, error } = await supabase
        .from("workflow_definitions")
        .select(`
          *,
          workflow_states(*),
          workflow_transitions(*)
        `)
        .eq("id", workflowId)
        .single();

      if (error) throw error;

      const loadedStates = (workflow?.workflow_states ?? []).map((s: any) =>
        normalizeState({
          id: s.id,
          name: s.name,
          category: s.category,
          color: s.color,
          position: s.position || { ...DEFAULT_POSITION },
          entryActions: s.entry_actions || [],
          exitActions: s.exit_actions || [],
          slaPause: s.sla_pause || false,
          slaResume: s.sla_resume || false,
          wipLimit: s.wip_limit ?? null,
          wipPolicy: s.wip_policy ?? "",
        })
      );

      const loadedTransitions = (workflow?.workflow_transitions ?? []).map((t: any) =>
        normalizeTransition({
          id: t.id,
          fromStateId: t.from_state_id,
          toStateId: t.to_state_id,
          name: t.name,
          guard: t.guard ?? (Array.isArray(t.conditions) ? t.conditions.join(" && ") : ""),
          validators: t.validators || [],
          postFunctions: t.post_functions || [],
          requiredApprovals: t.required_approvals || 0,
          requiredScreens: t.required_screens || t.screens || [],
          isReversible: t.is_reversible || false,
          resumeSla: t.resume_sla ?? true,
        })
      );

      setWorkflowName(workflow?.name ?? "Workflow");
      setWorkflowDescription(workflow?.description ?? "");
      setStates(loadedStates);
      setTransitions(loadedTransitions);
      setZoom(workflow?.canvas_data?.zoom ?? 1);
      setOffset(workflow?.canvas_data?.offset ?? { x: 0, y: 0 });
      setHistory({ past: [], future: [] });
      setCurrentStatus(workflow?.status === "published" ? "published" : "draft");
    } catch (error) {
      console.error("Failed to load workflow:", error);
      toast({ title: "Error", description: "Failed to load workflow", variant: "destructive" });
    }
  };

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from("workflow_versions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      const parsed = (data ?? []).map((version: any) => ({
        ...version,
        definition: version.definition ?? version.config ?? {},
      }));
      setVersions(parsed);
    } catch (error) {
      console.error("Failed to load workflow versions", error);
      toast({ title: "Error", description: "Unable to load version history", variant: "destructive" });
    }
  };

  const addState = useCallback(() => {
    pushHistory();
    const newState = normalizeState({
      id: `state-${Date.now()}`,
      name: `State ${statesRef.current.length + 1}`,
      category: "todo",
      color: "#6b7280",
      position: { x: 100 + statesRef.current.length * 220, y: 100 },
    });
    setStates([...statesRef.current, newState]);
    setSelectedState(newState.id);
    setSelectedTransition(null);
  }, [pushHistory]);

  const connectStates = useCallback((fromId: string, toId: string) => {
    pushHistory();
    const newTransition = normalizeTransition({
      id: `transition-${Date.now()}`,
      fromStateId: fromId,
      toStateId: toId,
      name: `${statesRef.current.find((s) => s.id === fromId)?.name ?? "State"} → ${
        statesRef.current.find((s) => s.id === toId)?.name ?? "State"
      }`,
    });
    setTransitions([...transitionsRef.current, newTransition]);
    setIsConnecting(false);
    setConnectFrom(null);
    setSelectedTransition(newTransition.id);
    setSelectedState(null);
  }, [pushHistory]);

  const handleStateMouseDown = (e: React.MouseEvent, stateId: string) => {
    if (isConnecting) {
      if (connectFrom && connectFrom !== stateId) {
        connectStates(connectFrom, stateId);
      } else {
        setConnectFrom(stateId);
      }
      return;
    }
    e.stopPropagation();
    setSelectedState(stateId);
    setSelectedTransition(null);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedState) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      pushHistory();
      setStates(
        statesRef.current.map((s) =>
          s.id === selectedState
            ? { ...s, position: { x: s.position.x + dx, y: s.position.y + dy } }
            : s
        )
      );
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
        const { error } = await supabase
          .from("workflow_definitions")
          .update({
            name: workflowName,
            description: workflowDescription,
            canvas_data: canvasData,
            status: currentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workflowId);

        if (error) throw error;
      } else {
        const { data: newWorkflow, error: workflowError } = await supabase
          .from("workflow_definitions")
          .insert({
            project_id: projectId,
            name: workflowName,
            description: workflowDescription,
            canvas_data: canvasData,
            status: "draft",
          })
          .select()
          .single();

        if (workflowError) throw workflowError;

        for (const state of states) {
          await supabase.from("workflow_states").insert({
            workflow_id: newWorkflow.id,
            name: state.name,
            category: state.category,
            color: state.color,
            position: state.position,
            entry_actions: state.entryActions,
            exit_actions: state.exitActions,
            sla_pause: state.slaPause,
            sla_resume: state.slaResume,
            wip_limit: state.wipLimit,
            wip_policy: state.wipPolicy,
          });
        }

        for (const transition of transitions) {
          await supabase.from("workflow_transitions").insert({
            workflow_id: newWorkflow.id,
            from_state_id: transition.fromStateId,
            to_state_id: transition.toStateId,
            name: transition.name,
            guard: transition.guard,
            conditions: transition.guard ? [transition.guard] : [],
            validators: transition.validators,
            post_functions: transition.postFunctions,
            required_approvals: transition.requiredApprovals,
            required_screens: transition.requiredScreens,
            screens: transition.requiredScreens,
            is_reversible: transition.isReversible,
            resume_sla: transition.resumeSla,
          });
        }

        onSave?.(newWorkflow.id);
      }

      toast({ title: "Draft saved", description: "Workflow draft saved successfully" });
      setCurrentStatus("draft");
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast({ title: "Error", description: "Failed to save workflow", variant: "destructive" });
    }
  };

  const autoLayout = () => {
    if (!statesRef.current.length) return;
    pushHistory();
    const columns = Math.ceil(Math.sqrt(statesRef.current.length));
    const spacingX = 220;
    const spacingY = 160;
    const updated = statesRef.current.map((state, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      return {
        ...state,
        position: {
          x: 100 + col * spacingX,
          y: 100 + row * spacingY,
        },
      };
    });
    setStates(updated);
  };

  const handleExport = () => {
    const payload = {
      name: workflowName,
      description: workflowDescription,
      states,
      transitions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workflowName.replace(/\s+/g, "-").toLowerCase()}-workflow.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const result = JSON.parse(String(loadEvent.target?.result ?? "{}"));
        pushHistory();
        const importedStates = (result.states ?? []).map((s: Partial<WorkflowState>) =>
          normalizeState(s)
        );
        const importedTransitions = (result.transitions ?? []).map((t: Partial<WorkflowTransition>) =>
          normalizeTransition(t)
        );
        setWorkflowName(result.name ?? workflowName);
        setWorkflowDescription(result.description ?? workflowDescription);
        setStates(importedStates);
        setTransitions(importedTransitions);
        toast({ title: "Imported", description: "Workflow imported successfully" });
      } catch (error) {
        console.error("Failed to import workflow", error);
        toast({ title: "Error", description: "Invalid workflow file", variant: "destructive" });
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const simulateWorkflow = async () => {
    setIsSimulating(true);
    try {
      const payload = { projectId, states, transitions };
      const { data, error } = await supabase.functions.invoke("workflow-simulate", { body: payload });
      if (error) throw error;

      const fallback: SimulationResult = {
        pathCount: transitions.length,
        cyclicalStates: transitions
          .filter((t) => t.fromStateId === t.toStateId)
          .map((t) => t.name),
        warnings: transitions.length === 0 ? ["No transitions configured"] : [],
        estimatedLeadTime: Math.max(1, transitions.length) * 2,
      };

      setSimulationResult({ ...(fallback as SimulationResult), ...(data ?? {}) });
      toast({ title: "Simulation complete", description: "Review results before publishing" });
    } catch (error) {
      console.error("Simulation failed", error);
      toast({ title: "Error", description: "Simulation failed", variant: "destructive" });
    } finally {
      setIsSimulating(false);
    }
  };

  const publishWorkflow = async () => {
    if (!workflowId) {
      toast({ title: "Draft required", description: "Save the workflow before publishing" });
      return;
    }
    setIsPublishing(true);
    try {
      const nextVersion = (versions[0]?.version_number ?? 0) + 1;
      const versionPayload = {
        workflow_id: workflowId,
        version_number: nextVersion,
        notes: versionNotes,
        definition: {
          states,
          transitions,
          metadata: { name: workflowName, description: workflowDescription },
        },
        published: true,
      };

      const { data: versionRecord, error: versionError } = await supabase
        .from("workflow_versions")
        .insert(versionPayload)
        .select()
        .single();

      if (versionError) throw versionError;

      setVersions((prev) => [
        {
          ...(versionRecord ?? versionPayload),
          id: versionRecord?.id ?? `version-${Date.now()}`,
        },
        ...prev,
      ]);
      setCurrentStatus("published");
      setBoardMappingStatus(null);

      const { data: mappingData, error: mappingError } = await supabase.functions.invoke(
        "projects-service",
        {
          body: {
            action: "update-workflow-mappings",
            projectId,
            workflowId,
            version: nextVersion,
            states,
            transitions,
            metrics: ["cfd", "burn"],
          },
        }
      );

      if (mappingError) throw mappingError;

      const mappingMessage =
        mappingData?.message ?? "Board column mappings and metrics updated";
      setBoardMappingStatus(mappingMessage);
      toast({ title: "Workflow published", description: mappingMessage });
    } catch (error) {
      console.error("Failed to publish workflow", error);
      toast({ title: "Error", description: "Failed to publish workflow", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const rollbackVersion = async (version: WorkflowVersionRecord) => {
    if (!version?.definition) return;
    const mappingNotes = window.prompt(
      "Provide any board mapping adjustments needed for this rollback",
      ""
    );
    if (mappingNotes === null) return;

    pushHistory();
    const restoredStates = (version.definition.states ?? []).map((s: Partial<WorkflowState>) =>
      normalizeState(s)
    );
    const restoredTransitions = (version.definition.transitions ?? []).map(
      (t: Partial<WorkflowTransition>) => normalizeTransition(t)
    );

    setStates(restoredStates);
    setTransitions(restoredTransitions);
    setWorkflowName(version.definition.metadata?.name ?? workflowName);
    setWorkflowDescription(version.definition.metadata?.description ?? workflowDescription);
    setSelectedState(null);
    setSelectedTransition(null);
    setCurrentStatus("draft");

    try {
      const { data: mappingData, error } = await supabase.functions.invoke("projects-service", {
        body: {
          action: "update-workflow-mappings",
          projectId,
          workflowId,
          version: version.version_number,
          states: restoredStates,
          transitions: restoredTransitions,
          metrics: ["cfd", "burn"],
          mappingNotes,
          type: "rollback",
        },
      });
      if (error) throw error;
      const message = mappingData?.message ?? "Rollback applied and board mappings refreshed";
      setBoardMappingStatus(message);
      toast({ title: "Rollback complete", description: message });
    } catch (error) {
      console.error("Failed to rollback workflow", error);
      toast({ title: "Error", description: "Rollback failed", variant: "destructive" });
    }
  };

  const selectedStateObj = states.find((s) => s.id === selectedState);
  const selectedTransitionObj = transitions.find((t) => t.id === selectedTransition);

  const handleTransitionSelect = (transitionId: string) => {
    setSelectedTransition(transitionId);
    setSelectedState(null);
  };

  const removeEntryAction = (action: string) => {
    if (!selectedStateObj) return;
    pushHistory();
    setStates(
      statesRef.current.map((state) =>
        state.id === selectedStateObj.id
          ? { ...state, entryActions: state.entryActions.filter((item) => item !== action) }
          : state
      )
    );
  };

  const removeExitAction = (action: string) => {
    if (!selectedStateObj) return;
    pushHistory();
    setStates(
      statesRef.current.map((state) =>
        state.id === selectedStateObj.id
          ? { ...state, exitActions: state.exitActions.filter((item) => item !== action) }
          : state
      )
    );
  };

  const removeValidator = (validator: string) => {
    if (!selectedTransitionObj) return;
    pushHistory();
    setTransitions(
      transitionsRef.current.map((transition) =>
        transition.id === selectedTransitionObj.id
          ? {
              ...transition,
              validators: transition.validators.filter((item) => item !== validator),
            }
          : transition
      )
    );
  };

  const removeScreen = (screen: string) => {
    if (!selectedTransitionObj) return;
    pushHistory();
    setTransitions(
      transitionsRef.current.map((transition) =>
        transition.id === selectedTransitionObj.id
          ? {
              ...transition,
              requiredScreens: transition.requiredScreens.filter((item) => item !== screen),
            }
          : transition
      )
    );
  };

  const removePostFunction = (fn: string) => {
    if (!selectedTransitionObj) return;
    pushHistory();
    setTransitions(
      transitionsRef.current.map((transition) =>
        transition.id === selectedTransitionObj.id
          ? {
              ...transition,
              postFunctions: transition.postFunctions.filter((item) => item !== fn),
            }
          : transition
      )
    );
  };

  return (
    <div className="flex h-screen flex-col">
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
      <div className="flex items-center gap-2 border-b border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <Input
            value={workflowName}
            onChange={(e) => {
              pushHistory();
              setWorkflowName(e.target.value);
            }}
            className="max-w-xs"
            placeholder="Workflow name"
          />
          <Textarea
            value={workflowDescription}
            onChange={(e) => {
              pushHistory();
              setWorkflowDescription(e.target.value);
            }}
            className="max-w-md"
            placeholder="Describe the workflow"
            rows={1}
          />
          <Badge variant={currentStatus === "published" ? "default" : "secondary"} data-testid="workflow-status">
            {currentStatus === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!history.past.length}
            aria-label="Undo change"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!history.future.length}
            aria-label="Redo change"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={autoLayout} aria-label="Auto layout">
            <LayoutDashboard className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={addState}>
            <Plus className="mr-2 h-4 w-4" />
            Add State
          </Button>
          <Button
            variant={isConnecting ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsConnecting((prev) => !prev);
              setConnectFrom(selectedState ?? null);
            }}
            aria-pressed={isConnecting}
          >
            Connect
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import workflow"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} aria-label="Export workflow">
            <Download className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="default" size="sm" onClick={saveWorkflow}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
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
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {transitions.map((t) => {
                const fromState = states.find((s) => s.id === t.fromStateId);
                const toState = states.find((s) => s.id === t.toStateId);
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
                      strokeWidth={selectedTransition === t.id ? 3 : 2}
                      markerEnd="url(#arrowhead)"
                      className="pointer-events-auto"
                      onClick={() => handleTransitionSelect(t.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </g>
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
            </svg>

            {states.map((state) => (
              <div
                key={state.id}
                className={cn(
                  "absolute cursor-move rounded-lg border-2 bg-background p-3 shadow-md transition-all",
                  selectedState === state.id ? "border-primary ring-2 ring-primary/20" : "border-border"
                )}
                style={{ left: state.position.x, top: state.position.y, width: 150, borderColor: state.color }}
                onMouseDown={(e) => handleStateMouseDown(e, state.id)}
              >
                <div className="text-sm font-medium">{state.name}</div>
                <div className="mt-1 text-xs text-muted-foreground capitalize">
                  {state.category.replace("_", " ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-96 border-l border-border bg-background">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              <Card className="p-4">
                <h3 className="font-semibold">Workflow Elements</h3>
                <div className="mt-3 space-y-4">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">States</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {states.map((state) => (
                        <Button
                          key={state.id}
                          size="sm"
                          variant={selectedState === state.id ? "default" : "outline"}
                          onClick={() => {
                            setSelectedState(state.id);
                            setSelectedTransition(null);
                          }}
                        >
                          {state.name}
                        </Button>
                      ))}
                      {!states.length && <p className="text-xs text-muted-foreground">No states configured</p>}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Transitions</Label>
                    <div className="mt-2 flex flex-col gap-2">
                      {transitions.map((transition) => {
                        const fromName =
                          states.find((state) => state.id === transition.fromStateId)?.name ?? "Start";
                        const toName = states.find((state) => state.id === transition.toStateId)?.name ?? "End";
                        return (
                          <Button
                            key={transition.id}
                            size="sm"
                            variant={selectedTransition === transition.id ? "default" : "outline"}
                            onClick={() => handleTransitionSelect(transition.id)}
                          >
                            {fromName} → {toName}
                          </Button>
                        );
                      })}
                      {!transitions.length && (
                        <p className="text-xs text-muted-foreground">No transitions configured</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <Tabs value={activePanel} onValueChange={(value) => setActivePanel(value as typeof activePanel)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="state">State</TabsTrigger>
                  <TabsTrigger value="transition">Transition</TabsTrigger>
                  <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
                </TabsList>
                <TabsContent value="state">
                  {selectedStateObj ? (
                    <Card className="space-y-4 p-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={selectedStateObj.name}
                          onChange={(e) => {
                            pushHistory();
                            setStates(
                              statesRef.current.map((state) =>
                                state.id === selectedStateObj.id
                                  ? { ...state, name: e.target.value }
                                  : state
                              )
                            );
                          }}
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={selectedStateObj.category}
                          onValueChange={(value: any) => {
                            pushHistory();
                            setStates(
                              statesRef.current.map((state) =>
                                state.id === selectedStateObj.id
                                  ? { ...state, category: value }
                                  : state
                              )
                            );
                          }}
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
                          onChange={(e) => {
                            pushHistory();
                            setStates(
                              statesRef.current.map((state) =>
                                state.id === selectedStateObj.id
                                  ? { ...state, color: e.target.value }
                                  : state
                              )
                            );
                          }}
                        />
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Entry Actions</Label>
                        <div className="flex gap-2">
                          <Input
                            value={entryActionInput}
                            onChange={(e) => setEntryActionInput(e.target.value)}
                            placeholder="Add entry action"
                          />
                          <Button
                            variant="outline"
                            aria-label="Add entry action"
                            onClick={() => {
                              if (!entryActionInput.trim()) return;
                              pushHistory();
                              setStates(
                                statesRef.current.map((state) =>
                                  state.id === selectedStateObj.id
                                    ? {
                                        ...state,
                                        entryActions: [...state.entryActions, entryActionInput.trim()],
                                      }
                                    : state
                                )
                              );
                              setEntryActionInput("");
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {selectedStateObj.entryActions.map((action) => (
                            <div
                              key={action}
                              className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                            >
                              <span>{action}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove entry action ${action}`}
                                onClick={() => removeEntryAction(action)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          {!selectedStateObj.entryActions.length && (
                            <p className="text-xs text-muted-foreground">No entry actions</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Exit Actions</Label>
                        <div className="flex gap-2">
                          <Input
                            value={exitActionInput}
                            onChange={(e) => setExitActionInput(e.target.value)}
                            placeholder="Add exit action"
                          />
                          <Button
                            variant="outline"
                            aria-label="Add exit action"
                            onClick={() => {
                              if (!exitActionInput.trim()) return;
                              pushHistory();
                              setStates(
                                statesRef.current.map((state) =>
                                  state.id === selectedStateObj.id
                                    ? {
                                        ...state,
                                        exitActions: [...state.exitActions, exitActionInput.trim()],
                                      }
                                    : state
                                )
                              );
                              setExitActionInput("");
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {selectedStateObj.exitActions.map((action) => (
                            <div
                              key={action}
                              className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                            >
                              <span>{action}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove exit action ${action}`}
                                onClick={() => removeExitAction(action)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          {!selectedStateObj.exitActions.length && (
                            <p className="text-xs text-muted-foreground">No exit actions</p>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>SLA Pause</Label>
                          <Switch
                            checked={selectedStateObj.slaPause}
                            onCheckedChange={(checked) => {
                              pushHistory();
                              setStates(
                                statesRef.current.map((state) =>
                                  state.id === selectedStateObj.id
                                    ? { ...state, slaPause: checked }
                                    : state
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>SLA Resume</Label>
                          <Switch
                            checked={selectedStateObj.slaResume}
                            onCheckedChange={(checked) => {
                              pushHistory();
                              setStates(
                                statesRef.current.map((state) =>
                                  state.id === selectedStateObj.id
                                    ? { ...state, slaResume: checked }
                                    : state
                                )
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>WIP Limit</Label>
                        <Input
                          type="number"
                          value={selectedStateObj.wipLimit ?? ""}
                          min={0}
                          onChange={(e) => {
                            const value = e.target.value;
                            pushHistory();
                            setStates(
                              statesRef.current.map((state) =>
                                state.id === selectedStateObj.id
                                  ? { ...state, wipLimit: value === "" ? null : Number(value) }
                                  : state
                              )
                            );
                          }}
                          placeholder="Unlimited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>WIP Policy</Label>
                        <Textarea
                          value={selectedStateObj.wipPolicy}
                          onChange={(e) => {
                            pushHistory();
                            setStates(
                              statesRef.current.map((state) =>
                                state.id === selectedStateObj.id
                                  ? { ...state, wipPolicy: e.target.value }
                                  : state
                              )
                            );
                          }}
                          placeholder="Document how WIP limits are enforced"
                        />
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Select a state to configure actions and policies</p>
                    </Card>
                  )}
                </TabsContent>
                <TabsContent value="transition">
                  {selectedTransitionObj ? (
                    <Card className="space-y-4 p-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={selectedTransitionObj.name}
                          onChange={(e) => {
                            pushHistory();
                            setTransitions(
                              transitionsRef.current.map((transition) =>
                                transition.id === selectedTransitionObj.id
                                  ? { ...transition, name: e.target.value }
                                  : transition
                              )
                            );
                          }}
                        />
                      </div>
                      <div>
                        <Label>Guard Expression</Label>
                        <Textarea
                          value={selectedTransitionObj.guard}
                          placeholder="Guard expression"
                          onChange={(e) => {
                            pushHistory();
                            setTransitions(
                              transitionsRef.current.map((transition) =>
                                transition.id === selectedTransitionObj.id
                                  ? { ...transition, guard: e.target.value }
                                  : transition
                              )
                            );
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Required Approvals</Label>
                          <Input
                            type="number"
                            min={0}
                            value={selectedTransitionObj.requiredApprovals}
                            onChange={(e) => {
                              pushHistory();
                              setTransitions(
                                transitionsRef.current.map((transition) =>
                                  transition.id === selectedTransitionObj.id
                                    ? { ...transition, requiredApprovals: Number(e.target.value) }
                                    : transition
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reversible</Label>
                          <Switch
                            checked={selectedTransitionObj.isReversible}
                            onCheckedChange={(checked) => {
                              pushHistory();
                              setTransitions(
                                transitionsRef.current.map((transition) =>
                                  transition.id === selectedTransitionObj.id
                                    ? { ...transition, isReversible: checked }
                                    : transition
                                )
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Validators</Label>
                        <div className="flex gap-2">
                          <Input
                            value={validatorInput}
                            onChange={(e) => setValidatorInput(e.target.value)}
                            placeholder="Add validator"
                          />
                          <Button
                            variant="outline"
                            aria-label="Add validator"
                            onClick={() => {
                              if (!validatorInput.trim()) return;
                              pushHistory();
                              setTransitions(
                                transitionsRef.current.map((transition) =>
                                  transition.id === selectedTransitionObj.id
                                    ? {
                                        ...transition,
                                        validators: [...transition.validators, validatorInput.trim()],
                                      }
                                    : transition
                                )
                              );
                              setValidatorInput("");
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {selectedTransitionObj.validators.map((validator) => (
                            <div
                              key={validator}
                              className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                            >
                              <span>{validator}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove validator ${validator}`}
                                onClick={() => removeValidator(validator)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          {!selectedTransitionObj.validators.length && (
                            <p className="text-xs text-muted-foreground">No validators</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Required Screens</Label>
                        <div className="flex gap-2">
                          <Input
                            value={screenInput}
                            onChange={(e) => setScreenInput(e.target.value)}
                            placeholder="Screen name"
                          />
                          <Button
                            variant="outline"
                            aria-label="Add required screen"
                            onClick={() => {
                              if (!screenInput.trim()) return;
                              pushHistory();
                              setTransitions(
                                transitionsRef.current.map((transition) =>
                                  transition.id === selectedTransitionObj.id
                                    ? {
                                        ...transition,
                                        requiredScreens: [...transition.requiredScreens, screenInput.trim()],
                                      }
                                    : transition
                                )
                              );
                              setScreenInput("");
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {selectedTransitionObj.requiredScreens.map((screen) => (
                            <div
                              key={screen}
                              className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                            >
                              <span>{screen}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove required screen ${screen}`}
                                onClick={() => removeScreen(screen)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          {!selectedTransitionObj.requiredScreens.length && (
                            <p className="text-xs text-muted-foreground">No required screens</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Post Functions</Label>
                        <div className="flex gap-2">
                          <Input
                            value={postFunctionInput}
                            onChange={(e) => setPostFunctionInput(e.target.value)}
                            placeholder="Add post-function"
                          />
                          <Button
                            variant="outline"
                            aria-label="Add post function"
                            onClick={() => {
                              if (!postFunctionInput.trim()) return;
                              pushHistory();
                              setTransitions(
                                transitionsRef.current.map((transition) =>
                                  transition.id === selectedTransitionObj.id
                                    ? {
                                        ...transition,
                                        postFunctions: [...transition.postFunctions, postFunctionInput.trim()],
                                      }
                                    : transition
                                )
                              );
                              setPostFunctionInput("");
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {selectedTransitionObj.postFunctions.map((fn) => (
                            <div
                              key={fn}
                              className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                            >
                              <span>{fn}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove post function ${fn}`}
                                onClick={() => removePostFunction(fn)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          {!selectedTransitionObj.postFunctions.length && (
                            <p className="text-xs text-muted-foreground">No post-functions</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>SLA Resume on Completion</Label>
                        <Switch
                          checked={selectedTransitionObj.resumeSla}
                          onCheckedChange={(checked) => {
                            pushHistory();
                            setTransitions(
                              transitionsRef.current.map((transition) =>
                                transition.id === selectedTransitionObj.id
                                  ? { ...transition, resumeSla: checked }
                                  : transition
                              )
                            );
                          }}
                        />
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">Select a transition to manage guards, validators, and post-functions</p>
                    </Card>
                  )}
                </TabsContent>
                <TabsContent value="lifecycle">
                  <Card className="space-y-4 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <History className="h-4 w-4" /> Lifecycle Management
                      </h3>
                      <Button variant="outline" size="sm" onClick={loadVersions}>
                        Refresh
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Version Notes</Label>
                      <Textarea
                        value={versionNotes}
                        onChange={(e) => setVersionNotes(e.target.value)}
                        placeholder="Summarize changes for publish/rollback context"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={simulateWorkflow} disabled={isSimulating}>
                        <Play className="mr-2 h-4 w-4" />
                        {isSimulating ? "Simulating..." : "Run Simulation"}
                      </Button>
                      <Button variant="default" onClick={publishWorkflow} disabled={isPublishing}>
                        {isPublishing ? "Publishing..." : "Publish Workflow"}
                      </Button>
                    </div>
                    {simulationResult && (
                      <Card className="space-y-2 border border-primary/40 bg-primary/5 p-4">
                        <h4 className="font-semibold">Simulation Preview</h4>
                        <p className="text-sm text-muted-foreground">Paths evaluated: {simulationResult.pathCount}</p>
                        <p className="text-sm text-muted-foreground">
                          Estimated lead time: {simulationResult.estimatedLeadTime}h
                        </p>
                        {simulationResult.cyclicalStates.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Cyclical states: {simulationResult.cyclicalStates.join(", ")}
                          </p>
                        )}
                        {simulationResult.warnings.length > 0 && (
                          <ul className="list-inside list-disc text-sm text-amber-600">
                            {simulationResult.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        )}
                      </Card>
                    )}
                    {boardMappingStatus && (
                      <Card className="border border-muted-foreground/20 bg-muted/30 p-3 text-sm">
                        {boardMappingStatus}
                      </Card>
                    )}
                    <div className="space-y-2">
                      <h4 className="font-semibold">Version History</h4>
                      <div className="space-y-3">
                        {versions.length ? (
                          versions.map((version) => (
                            <Card key={version.id} className="space-y-2 p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Version {version.version_number}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(version.created_at ?? Date.now()).toLocaleString()}
                                  </p>
                                </div>
                                <Badge variant={version.published ? "default" : "secondary"}>
                                  {version.published ? "Published" : "Draft"}
                                </Badge>
                              </div>
                              {version.notes && (
                                <p className="text-xs text-muted-foreground">{version.notes}</p>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rollbackVersion(version)}
                                >
                                  Rollback to v{version.version_number}
                                </Button>
                              </div>
                            </Card>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No versions published yet</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
