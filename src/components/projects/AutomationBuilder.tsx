import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Connection,
  Controls,
  Edge as FlowEdge,
  EdgeChange,
  MiniMap,
  Node as FlowNode,
  NodeChange,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Branch,
  GitBranchPlus,
  ListChecks,
  Play,
  Save,
  TestTube,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAutomationCanvas } from "@/hooks/useAutomationCanvas";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAutomationEditorData,
  fetchAutomationRunHistory,
  saveAutomationGraph,
  toggleAutomationVersion,
  triggerAutomationDryRun,
} from "@/services/automationBuilder";
import type {
  AutomationConflict,
  AutomationDryRunResult,
  AutomationGovernance,
  AutomationGraphEdge,
  AutomationGraphNode,
  AutomationGraphNodeType,
  AutomationRunDetails,
  AutomationVersionSummary,
} from "@/types";

interface AutomationBuilderProps {
  projectId: string;
  automationId?: string;
  onSave?: (automationId: string) => void;
}

interface CatalogOption {
  value: string;
  label: string;
  description?: string;
}

type BranchNodeType = Extract<AutomationGraphNodeType, "if" | "switch" | "parallel">;

const TRIGGER_OPTIONS: CatalogOption[] = [
  { value: "item_created", label: "Item Created" },
  { value: "item_updated", label: "Item Updated" },
  { value: "status_changed", label: "Status Changed" },
  { value: "opql_query", label: "OPQL Query", description: "Run query results as automation input." },
  { value: "scheduled", label: "Scheduled (CRON)" },
  { value: "webhook", label: "Incoming Webhook" },
  { value: "manual", label: "Manual Trigger" },
];

const CONDITION_OPTIONS: CatalogOption[] = [
  { value: "field_equals", label: "Field equals" },
  { value: "field_contains", label: "Field contains" },
  { value: "field_changed", label: "Field changed" },
  { value: "opql_filter", label: "OPQL Filter" },
  { value: "custom_expression", label: "Custom expression" },
];

const ACTION_OPTIONS: CatalogOption[] = [
  { value: "set_field", label: "Set field" },
  { value: "assign_user", label: "Assign owner" },
  { value: "send_notification", label: "Send notification" },
  { value: "webhook_post", label: "Call webhook" },
  { value: "run_script", label: "Run script" },
  { value: "wait", label: "Wait / delay" },
  { value: "governance_review", label: "Request reviewer" },
];

const BRANCH_OPTIONS: Array<{ type: BranchNodeType; label: string; description?: string }> = [
  { type: "if", label: "If / Else", description: "Two-way conditional branching." },
  { type: "switch", label: "Switch", description: "Multi-path matching." },
  { type: "parallel", label: "Parallel", description: "Run branches at the same time." },
];

const DEFAULT_GOVERNANCE: AutomationGovernance = {
  ownerId: null,
  reviewers: [],
  requiresReview: false,
};

const NODE_HEIGHT = 120;

export function AutomationBuilder(props: AutomationBuilderProps) {
  return (
    <ReactFlowProvider>
      <AutomationBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

function AutomationBuilderInner({ projectId, automationId, onSave }: AutomationBuilderProps) {
  const { toast } = useToast();
  const [automationName, setAutomationName] = useState("New Automation");
  const [automationDescription, setAutomationDescription] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [governance, setGovernance] = useState<AutomationGovernance>(DEFAULT_GOVERNANCE);
  const [versions, setVersions] = useState<AutomationVersionSummary[]>([]);
  const [conflicts, setConflicts] = useState<AutomationConflict[]>([]);
  const [runHistory, setRunHistory] = useState<AutomationRunDetails[]>([]);
  const [dryRunResult, setDryRunResult] = useState<AutomationDryRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [currentAutomationId, setCurrentAutomationId] = useState<string | undefined>(automationId);

  const {
    nodes: graphNodes,
    edges: graphEdges,
    addNode,
    updateNode,
    updateEdge,
    removeNode,
    linkNodes,
    removeEdge,
    setGraph,
    serialize,
  } = useAutomationCanvas();

  const flowNodes = useMemo(
    () =>
      graphNodes.map<FlowNode<CanvasNodeData>>((node) => ({
        id: node.id,
        type: "automation",
        position: node.position,
        data: {
          id: node.id,
          label: node.label,
          description: node.description ?? undefined,
          kind: node.type,
          metadata: node.metadata,
          selected: node.id === selectedNodeId,
        },
      })),
    [graphNodes, selectedNodeId]
  );

  const flowEdges = useMemo(
    () =>
      graphEdges.map<FlowEdge>((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? edge.branchKey ?? undefined,
        data: { branchKey: edge.branchKey },
        animated: edge.branchKey != null,
      })),
    [graphEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetchAutomationEditorData(projectId, automationId);
        if (cancelled) return;
        if (response.automation) {
          setAutomationName(response.automation.name ?? "Untitled automation");
          setAutomationDescription(response.automation.description ?? "");
          setIsEnabled(response.automation.is_active);
          setGovernance(response.automation.governance ?? DEFAULT_GOVERNANCE);
          setCurrentAutomationId(response.automation.id);
          setGraph(response.automation.graph_definition ?? { nodes: [], edges: [] });
        } else {
          setAutomationName("New Automation");
          setAutomationDescription("");
          setIsEnabled(true);
          setGovernance(DEFAULT_GOVERNANCE);
          setGraph({ nodes: [], edges: [] });
        }
        setVersions(response.versions ?? []);
        setRunHistory(response.runHistory ?? []);
        setConflicts(response.conflicts ?? []);
      } catch (error: any) {
        toast({
          title: "Unable to load automation",
          description: error?.message ?? "Something went wrong while loading automation details.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [automationId, projectId, setGraph, toast]);

  useEffect(() => {
    if (!selectedNodeId && graphNodes.length > 0) {
      setSelectedNodeId(graphNodes[0].id);
    }
  }, [graphNodes, selectedNodeId]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          updateNode(change.id, { position: change.position });
        }
        if (change.type === "remove") {
          removeNode(change.id);
          if (selectedNodeId === change.id) {
            setSelectedNodeId(null);
          }
        }
      });
    },
    [onNodesChange, updateNode, removeNode, selectedNodeId]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      changes.forEach((change) => {
        if (change.type === "remove") {
          removeEdge(change.id);
        }
      });
    },
    [onEdgesChange, removeEdge]
  );

  const handleConnect = useCallback(
    (connection: Connection | FlowEdge) => {
      if (!connection.source || !connection.target) return;
      linkNodes(connection.source, connection.target, {
        label: "label" in connection ? connection.label ?? null : null,
      });
    },
    [linkNodes]
  );

  const selectedNode = useMemo(
    () => graphNodes.find((node) => node.id === selectedNodeId) ?? null,
    [graphNodes, selectedNodeId]
  );

  const outgoingEdges = useMemo(
    () => graphEdges.filter((edge) => edge.source === selectedNodeId),
    [graphEdges, selectedNodeId]
  );

  const handleAddNode = useCallback(
    (type: AutomationGraphNodeType, option?: CatalogOption) => {
      const parentId = determineParentId(type, selectedNodeId, graphNodes);
      const parentNode = parentId ? graphNodes.find((node) => node.id === parentId) : undefined;
      const branchKey = parentNode && isBranchNode(parentNode.type)
        ? nextBranchKey(parentNode, graphEdges)
        : null;

      const node = addNode(type, {
        parentId,
        branchKey,
        label: option?.label ?? deriveDefaultLabel(type),
        config: option ? { type: option.value } : undefined,
        metadata:
          type === "if"
            ? { branchKeys: ["If", "Else"] }
            : type === "switch"
              ? { branchKeys: ["Case A", "Case B", "Default"] }
              : type === "parallel"
                ? { branchKeys: ["Branch A", "Branch B"] }
                : undefined,
      });

      setSelectedNodeId(node.id);
    },
    [addNode, graphEdges, graphNodes, selectedNodeId]
  );

  const handleSave = useCallback(async () => {
    if (!automationName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for this automation before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const graph = serialize();
      const response = await saveAutomationGraph({
        projectId,
        automationId: currentAutomationId,
        name: automationName.trim(),
        description: automationDescription.trim() || null,
        isActive: isEnabled,
        governance,
        canvas: graph,
        versionNotes: `Saved via automation builder at ${new Date().toISOString()}`,
        makeCurrent: true,
      });

      setCurrentAutomationId(response.automationId);
      setVersions((prev) => [response.version, ...prev.filter((version) => version.id !== response.version.id)]);
      toast({
        title: "Automation saved",
        description: "Your automation canvas and version have been saved.",
      });
      onSave?.(response.automationId);
    } catch (error: any) {
      toast({
        title: "Unable to save automation",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [automationName, automationDescription, currentAutomationId, governance, isEnabled, onSave, projectId, serialize, toast]);

  const handleTest = useCallback(async () => {
    if (!currentAutomationId) {
      toast({
        title: "Save automation first",
        description: "You need to save the automation before running a dry test.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await triggerAutomationDryRun(currentAutomationId, {});
      setDryRunResult(result);
      toast({
        title: "Dry run complete",
        description: "Review the logs below.",
      });
      const history = await fetchAutomationRunHistory(currentAutomationId);
      setRunHistory(history);
    } catch (error: any) {
      toast({
        title: "Dry run failed",
        description: error?.message ?? "We were unable to execute the dry run.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  }, [currentAutomationId, toast]);

  const handleToggleVersion = useCallback(
    async (versionId: string, enabled: boolean) => {
      try {
        const updated = await toggleAutomationVersion(versionId, enabled);
        setVersions((prev) => prev.map((version) => (version.id === versionId ? updated : version)));
        toast({
          title: "Version updated",
          description: `Version ${updated.version_number} has been ${updated.is_enabled ? "enabled" : "disabled"}.`,
        });
      } catch (error: any) {
        toast({
          title: "Unable to update version",
          description: error?.message ?? "Try again later.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleRefreshRuns = useCallback(async () => {
    if (!currentAutomationId) return;
    try {
      const history = await fetchAutomationRunHistory(currentAutomationId);
      setRunHistory(history);
      toast({ title: "Run history refreshed" });
    } catch (error: any) {
      toast({
        title: "Unable to load run history",
        description: error?.message ?? "Please try again later.",
        variant: "destructive",
      });
    }
  }, [currentAutomationId, toast]);

  const handleGovernanceOwnerChange = useCallback(
    (value: string) => {
      setGovernance((previous) => ({ ...previous, ownerId: value || null }));
    },
    []
  );

  const handleReviewerChange = useCallback((value: string) => {
    setGovernance((previous) => ({
      ...previous,
      reviewers: value ? value.split(",").map((entry) => entry.trim()).filter(Boolean) : [],
    }));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    removeNode(selectedNodeId);
    setSelectedNodeId(null);
  }, [removeNode, selectedNodeId]);

  return (
    <div className="flex gap-4 h-[720px]">
      <Card className="w-64 flex flex-col">
        <CardHeader>
          <CardTitle className="text-base">Catalog</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <Tabs defaultValue="triggers" className="h-full flex flex-col">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="triggers">Triggers</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="branches">Branches</TabsTrigger>
            </TabsList>
            <TabsContent value="triggers" className="flex-1 min-h-0">
              <ScrollArea className="h-56 pr-2">
                <div className="space-y-2">
                  {TRIGGER_OPTIONS.map((option) => (
                    <CatalogButton key={option.value} option={option} onClick={() => handleAddNode("trigger", option)} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="conditions" className="flex-1 min-h-0">
              <ScrollArea className="h-56 pr-2">
                <div className="space-y-2">
                  {CONDITION_OPTIONS.map((option) => (
                    <CatalogButton key={option.value} option={option} onClick={() => handleAddNode("condition", option)} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="actions" className="flex-1 min-h-0">
              <ScrollArea className="h-56 pr-2">
                <div className="space-y-2">
                  {ACTION_OPTIONS.map((option) => (
                    <CatalogButton key={option.value} option={option} onClick={() => handleAddNode("action", option)} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="branches" className="flex-1 min-h-0">
              <ScrollArea className="h-56 pr-2">
                <div className="space-y-2">
                  {BRANCH_OPTIONS.map((option) => (
                    <Button
                      key={option.type}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => handleAddNode(option.type)}
                    >
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex-1 relative border rounded-lg bg-muted/20">
        <ReactFlow
          fitView
          nodes={nodes}
          edges={edges}
          nodeTypes={{ automation: AutomationNode }}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          className="rounded-lg"
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>

      <div className="w-96 flex flex-col gap-4 overflow-y-auto pr-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Automation details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="automation-name">Name</Label>
              <Input
                id="automation-name"
                value={automationName}
                onChange={(event) => setAutomationName(event.target.value)}
                placeholder="Name your automation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-description">Description</Label>
              <Textarea
                id="automation-description"
                value={automationDescription}
                onChange={(event) => setAutomationDescription(event.target.value)}
                placeholder="Describe what this automation does"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="automation-enabled">Enabled</Label>
              <Switch
                id="automation-enabled"
                checked={isEnabled}
                onCheckedChange={(checked) => setIsEnabled(checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-owner">Owner (user id)</Label>
              <Input
                id="automation-owner"
                value={governance.ownerId ?? ""}
                onChange={(event) => handleGovernanceOwnerChange(event.target.value)}
                placeholder="user-123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-reviewers">Reviewers (comma separated)</Label>
              <Input
                id="automation-reviewers"
                value={governance.reviewers?.join(", ") ?? ""}
                onChange={(event) => handleReviewerChange(event.target.value)}
                placeholder="user-123, user-456"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSave} disabled={isSaving || loading}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
              <Button
                className="flex-1"
                variant="secondary"
                onClick={handleTest}
                disabled={isTesting || loading}
              >
                <TestTube className="mr-2 h-4 w-4" /> Test on sample item
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedNode ? (
              <NodeInspector
                key={selectedNode.id}
                node={selectedNode}
                edges={outgoingEdges}
                updateNode={updateNode}
                updateEdge={updateEdge}
                onDelete={handleDeleteSelected}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a node to configure it.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Save the automation to create version history.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div key={version.id} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="text-sm font-medium">Version {version.version_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Switch
                      checked={version.is_enabled}
                      onCheckedChange={(checked) => handleToggleVersion(version.id, checked)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">Run history</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleRefreshRuns}>
              <Workflow className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {runHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {runHistory.map((run) => (
                  <RunLog key={run.id} run={run} />
                ))}
              </div>
            )}
            {dryRunResult && (
              <div className="rounded border p-3">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Play className="h-4 w-4" /> Latest dry run
                </h4>
                <p className="text-xs text-muted-foreground">Execution: {dryRunResult.executionId}</p>
                <div className="space-y-2 mt-2">
                  {dryRunResult.logs.map((log) => (
                    <div key={`${dryRunResult.executionId}-${log.nodeId}`} className="rounded bg-muted/40 p-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span>{log.nodeId}</span>
                        <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                          {log.status}
                        </Badge>
                      </div>
                      {log.durationMs != null && (
                        <p className="text-xs text-muted-foreground">{log.durationMs} ms</p>
                      )}
                      {renderJsonPreview(log.output ?? log.input)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {conflicts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" /> Conflicts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conflicts.map((conflict) => (
                <div key={`${conflict.automationId}-${conflict.conflictingAutomationId}`} className="rounded border border-destructive/40 bg-destructive/10 p-2 text-sm">
                  <p className="font-medium text-destructive">{conflict.reason}</p>
                  <p className="text-xs text-muted-foreground">Severity: {conflict.severity}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

type CanvasNodeData = {
  id: string;
  label: string;
  description?: string;
  kind: AutomationGraphNodeType;
  metadata?: AutomationGraphNode["metadata"];
  selected?: boolean;
};

function AutomationNode({ data }: { data: CanvasNodeData }) {
  const icon = useMemo(() => {
    switch (data.kind) {
      case "trigger":
        return <Play className="h-4 w-4" />;
      case "condition":
        return <ListChecks className="h-4 w-4" />;
      case "action":
        return <GitBranchPlus className="h-4 w-4" />;
      default:
        return <Branch className="h-4 w-4" />;
    }
  }, [data.kind]);

  return (
    <div
      className={cn(
        "rounded-lg border bg-background shadow-sm px-3 py-2 w-56",
        data.selected && "ring-2 ring-primary"
      )}
      style={{ minHeight: NODE_HEIGHT }}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/10 p-1 text-primary">{icon}</span>
        <div>
          <p className="text-sm font-medium leading-tight">{data.label}</p>
          <p className="text-xs text-muted-foreground capitalize">{data.kind}</p>
        </div>
      </div>
      {data.description && <p className="mt-2 text-xs text-muted-foreground">{data.description}</p>}
    </div>
  );
}

function CatalogButton({ option, onClick }: { option: CatalogOption; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="w-full justify-start text-left" onClick={onClick}>
      <div className="flex flex-col">
        <span>{option.label}</span>
        {option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
      </div>
    </Button>
  );
}

function NodeInspector({
  node,
  edges,
  updateNode,
  updateEdge,
  onDelete,
}: {
  node: AutomationGraphNode;
  edges: AutomationGraphEdge[];
  updateNode: (id: string, updates: Partial<AutomationGraphNode>) => void;
  updateEdge: (id: string, updates: Partial<AutomationGraphEdge>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="node-label">Label</Label>
        <Input
          id="node-label"
          value={node.label}
          onChange={(event) => updateNode(node.id, { label: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="node-description">Description</Label>
        <Textarea
          id="node-description"
          value={node.description ?? ""}
          onChange={(event) => updateNode(node.id, { description: event.target.value })}
        />
      </div>
      {node.type === "trigger" && <TriggerConfig node={node} updateNode={updateNode} />}
      {node.type === "condition" && <ConditionConfig node={node} updateNode={updateNode} />}
      {node.type === "action" && <ActionConfig node={node} updateNode={updateNode} />}
      {isBranchNode(node.type) && (
        <BranchConfig node={node} edges={edges} updateNode={updateNode} updateEdge={updateEdge} />
      )}
      <Button variant="destructive" onClick={onDelete} className="w-full">
        Delete node
      </Button>
    </div>
  );
}

function TriggerConfig({
  node,
  updateNode,
}: {
  node: AutomationGraphNode;
  updateNode: (id: string, updates: Partial<AutomationGraphNode>) => void;
}) {
  const triggerType = (node.config?.type as string) ?? "";
  return (
    <div className="space-y-2">
      <Label>Trigger type</Label>
      <Select
        value={triggerType}
        onValueChange={(value) => updateNode(node.id, { config: { ...node.config, type: value } })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select trigger" />
        </SelectTrigger>
        <SelectContent>
          {TRIGGER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {triggerType === "opql_query" && (
        <div className="space-y-1">
          <Label>OPQL query</Label>
          <Textarea
            value={(node.config?.query as string) ?? ""}
            onChange={(event) => updateNode(node.id, { config: { ...node.config, query: event.target.value } })}
            placeholder="SELECT * FROM tasks WHERE ..."
          />
        </div>
      )}
      {triggerType === "scheduled" && (
        <div className="space-y-1">
          <Label>CRON schedule</Label>
          <Input
            value={(node.config?.cron as string) ?? ""}
            onChange={(event) => updateNode(node.id, { config: { ...node.config, cron: event.target.value } })}
            placeholder="0 * * * *"
          />
        </div>
      )}
      {triggerType === "webhook" && (
        <div className="space-y-1">
          <Label>Webhook secret</Label>
          <Input
            value={(node.config?.secret as string) ?? ""}
            onChange={(event) => updateNode(node.id, { config: { ...node.config, secret: event.target.value } })}
            placeholder="Optional secret"
          />
        </div>
      )}
    </div>
  );
}

function ConditionConfig({
  node,
  updateNode,
}: {
  node: AutomationGraphNode;
  updateNode: (id: string, updates: Partial<AutomationGraphNode>) => void;
}) {
  const operator = (node.config?.operator as string) ?? "field_equals";
  return (
    <div className="space-y-2">
      <Label>Condition</Label>
      <Select
        value={operator}
        onValueChange={(value) => updateNode(node.id, { config: { ...node.config, operator: value } })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select operator" />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="space-y-1">
        <Label>Expression / field</Label>
        <Input
          value={(node.config?.expression as string) ?? ""}
          onChange={(event) => updateNode(node.id, { config: { ...node.config, expression: event.target.value } })}
          placeholder="status = 'In progress'"
        />
      </div>
    </div>
  );
}

function ActionConfig({
  node,
  updateNode,
}: {
  node: AutomationGraphNode;
  updateNode: (id: string, updates: Partial<AutomationGraphNode>) => void;
}) {
  const actionType = (node.config?.type as string) ?? "";
  return (
    <div className="space-y-2">
      <Label>Action</Label>
      <Select value={actionType} onValueChange={(value) => updateNode(node.id, { config: { ...node.config, type: value } })}>
        <SelectTrigger>
          <SelectValue placeholder="Select action" />
        </SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {actionType === "webhook_post" && (
        <div className="space-y-1">
          <Label>Webhook URL</Label>
          <Input
            value={(node.config?.url as string) ?? ""}
            onChange={(event) => updateNode(node.id, { config: { ...node.config, url: event.target.value } })}
            placeholder="https://example.com/webhook"
          />
        </div>
      )}
      {actionType === "run_script" && (
        <div className="space-y-1">
          <Label>Script</Label>
          <Textarea
            value={(node.config?.script as string) ?? ""}
            onChange={(event) => updateNode(node.id, { config: { ...node.config, script: event.target.value } })}
            placeholder="console.log('Hello from automation');"
            rows={4}
          />
        </div>
      )}
      {actionType === "wait" && (
        <div className="space-y-1">
          <Label>Delay (minutes)</Label>
          <Input
            type="number"
            value={String(node.config?.delay ?? "")}
            onChange={(event) => updateNode(node.id, { config: { ...node.config, delay: Number(event.target.value) } })}
            placeholder="15"
          />
        </div>
      )}
      {actionType === "governance_review" && (
        <div className="space-y-1">
          <Label>Reviewer group</Label>
          <Input
            value={(node.config?.reviewGroup as string) ?? ""}
            onChange={(event) => updateNode(node.id, { config: { ...node.config, reviewGroup: event.target.value } })}
            placeholder="security-team"
          />
        </div>
      )}
    </div>
  );
}

function BranchConfig({
  node,
  edges,
  updateNode,
  updateEdge,
}: {
  node: AutomationGraphNode;
  edges: AutomationGraphEdge[];
  updateNode: (id: string, updates: Partial<AutomationGraphNode>) => void;
  updateEdge: (id: string, updates: Partial<AutomationGraphEdge>) => void;
}) {
  const branchType = node.type as BranchNodeType;
  return (
    <div className="space-y-2">
      <Label>Branch mode</Label>
      <Select value={branchType} onValueChange={(value) => updateNode(node.id, { type: value as BranchNodeType })}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BRANCH_OPTIONS.map((option) => (
            <SelectItem key={option.type} value={option.type}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="space-y-1">
        <Label>Paths</Label>
        <div className="space-y-2">
          {edges.map((edge) => (
            <Input
              key={edge.id}
              value={edge.label ?? edge.branchKey ?? ""}
              onChange={(event) => updateEdge(edge.id, { label: event.target.value })}
              placeholder="Path label"
            />
          ))}
          {edges.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Connect this branch to nodes to define paths.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RunLog({ run }: { run: AutomationRunDetails }) {
  return (
    <div className="rounded border p-2 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">{formatDistanceToNow(new Date(run.executed_at), { addSuffix: true })}</span>
        <Badge variant={run.success ? "default" : "destructive"}>{run.success ? "Success" : "Failed"}</Badge>
      </div>
      {run.duration_ms != null && <p className="text-xs text-muted-foreground">Duration: {run.duration_ms} ms</p>}
      {renderJsonPreview(run.input)}
      {renderJsonPreview(run.output)}
      {run.logs && run.logs.length > 0 && (
        <div className="border-t pt-2 mt-2 space-y-1 text-xs">
          {run.logs.map((log) => (
            <div key={log.id} className="flex justify-between">
              <span>{log.node_id ?? log.step_id ?? "Node"}</span>
              {log.duration_ms != null && <span>{log.duration_ms} ms</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderJsonPreview(payload: unknown) {
  if (!payload) {
    return null;
  }

  return (
    <pre className="mt-1 rounded bg-muted/50 p-2 text-[10px] leading-tight overflow-x-auto">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

function determineParentId(
  type: AutomationGraphNodeType,
  selectedNodeId: string | null,
  nodes: AutomationGraphNode[]
): string | null {
  if (type === "trigger") {
    return null;
  }

  if (selectedNodeId) {
    return selectedNodeId;
  }

  const trigger = nodes.find((node) => node.type === "trigger");
  return trigger?.id ?? null;
}

function isBranchNode(type: AutomationGraphNodeType) {
  return type === "if" || type === "switch" || type === "parallel";
}

function nextBranchKey(node: AutomationGraphNode, edges: AutomationGraphEdge[]): string {
  const existing = edges.filter((edge) => edge.source === node.id && edge.branchKey).map((edge) => edge.branchKey as string);
  const candidates = node.metadata?.branchKeys ??
    (node.type === "if"
      ? ["If", "Else"]
      : node.type === "switch"
        ? ["Case A", "Case B", "Default"]
        : node.type === "parallel"
          ? ["Branch A", "Branch B"]
          : []);

  const available = candidates.find((candidate) => !existing.includes(candidate));
  if (available) {
    return available;
  }

  return `path_${existing.length + 1}`;
}

function deriveDefaultLabel(type: AutomationGraphNodeType): string {
  switch (type) {
    case "trigger":
      return "Trigger";
    case "condition":
      return "Condition";
    case "action":
      return "Action";
    case "if":
      return "If / Else";
    case "switch":
      return "Switch";
    case "parallel":
      return "Parallel";
    default:
      return type;
  }
}
