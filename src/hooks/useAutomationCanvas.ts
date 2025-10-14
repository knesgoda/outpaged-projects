import { useCallback, useMemo, useState } from "react";

import type {
  AutomationGraphEdge,
  AutomationGraphNode,
  AutomationGraphNodeType,
} from "@/types";

type AddNodeOptions = {
  id?: string;
  label?: string;
  description?: string | null;
  config?: Record<string, unknown>;
  metadata?: AutomationGraphNode["metadata"];
  parentId?: string | null;
  branchKey?: string | null;
  position?: { x: number; y: number };
};

export type AutomationCanvasState = {
  nodes: AutomationGraphNode[];
  edges: AutomationGraphEdge[];
};

export interface UseAutomationCanvasOptions {
  initialNodes?: AutomationGraphNode[];
  initialEdges?: AutomationGraphEdge[];
}

const BASE_HORIZONTAL_SPACING = 280;
const BASE_VERTICAL_SPACING = 140;

const DEFAULT_TRIGGER_NODE: AutomationGraphNode = {
  id: "trigger-0",
  type: "trigger",
  label: "Trigger",
  description: "Choose when this automation should run.",
  config: {},
  position: { x: 0, y: 0 },
  metadata: { icon: "zap" },
};

function normaliseNodes(nodes: AutomationGraphNode[] | undefined): AutomationGraphNode[] {
  if (!nodes?.length) {
    return [DEFAULT_TRIGGER_NODE];
  }

  return nodes.map((node, index) => ({
    ...node,
    position: node.position ?? {
      x: Math.floor(index / 5) * BASE_HORIZONTAL_SPACING,
      y: (index % 5) * BASE_VERTICAL_SPACING,
    },
  }));
}

function computeChildOffset(childIndex: number): number {
  return childIndex * BASE_VERTICAL_SPACING;
}

function nextPosition(
  nodes: AutomationGraphNode[],
  parentId: string | null | undefined,
  branchKey: string | null | undefined
): { x: number; y: number } {
  if (!parentId) {
    const maxX = nodes.reduce((max, node) => Math.max(max, node.position.x), 0);
    const offset = nodes.length * 12;
    return { x: maxX + BASE_HORIZONTAL_SPACING + offset, y: offset };
  }

  const parent = nodes.find((node) => node.id === parentId);
  if (!parent) {
    return nextPosition(nodes, null, null);
  }

  const siblings = nodes.filter((node) => node.id !== parentId);
  const outgoingCount = siblings.filter((node) => node.position.x > parent.position.x).length;
  const branchIndex = branchKey ? outgoingCount + Math.abs(branchKey.charCodeAt(0)) % 3 : outgoingCount;

  return {
    x: parent.position.x + BASE_HORIZONTAL_SPACING,
    y: parent.position.y + computeChildOffset(branchIndex),
  };
}

function createEdgeId(source: string, target: string, branchKey?: string | null): string {
  const key = branchKey ? `-${branchKey}` : "";
  return `edge-${source}-${target}${key}`;
}

export function useAutomationCanvas(
  options: UseAutomationCanvasOptions = {}
): {
  nodes: AutomationGraphNode[];
  edges: AutomationGraphEdge[];
  addNode: (type: AutomationGraphNodeType, opts?: AddNodeOptions) => AutomationGraphNode;
  updateNode: (id: string, updates: Partial<AutomationGraphNode>) => void;
  linkNodes: (
    source: string,
    target: string,
    edge?: Partial<Omit<AutomationGraphEdge, "id" | "source" | "target">>
  ) => AutomationGraphEdge | null;
  removeNode: (id: string) => void;
  updateEdge: (id: string, updates: Partial<AutomationGraphEdge>) => void;
  removeEdge: (id: string) => void;
  setGraph: (graph: AutomationCanvasState) => void;
  serialize: () => AutomationCanvasState;
} {
  const [nodes, setNodes] = useState<AutomationGraphNode[]>(() => normaliseNodes(options.initialNodes));
  const [edges, setEdges] = useState<AutomationGraphEdge[]>(options.initialEdges ?? []);

  const addNode = useCallback(
    (type: AutomationGraphNodeType, opts: AddNodeOptions = {}): AutomationGraphNode => {
      let createdNode: AutomationGraphNode = DEFAULT_TRIGGER_NODE;
      setNodes((current) => {
        const position = opts.position ?? nextPosition(current, opts.parentId ?? null, opts.branchKey ?? null);
        createdNode = {
          id: opts.id ?? `${type}-${Date.now()}`,
          type,
          label: opts.label ?? titleCaseFromType(type),
          description: opts.description ?? null,
          config: opts.config ?? {},
          position,
          metadata: opts.metadata ?? (type === "if" ? { branchKeys: ["if", "else"] } : undefined),
        } satisfies AutomationGraphNode;
        return [...current, createdNode];
      });

      if (opts.parentId) {
        setEdges((current) => {
          const edgeId = createEdgeId(opts.parentId!, createdNode.id, opts.branchKey ?? null);
          const label = opts.branchKey ?? (type === "condition" ? "Then" : null);
          const newEdge: AutomationGraphEdge = {
            id: edgeId,
            source: opts.parentId!,
            target: createdNode.id,
            label,
            branchKey: opts.branchKey ?? null,
          };
          const filtered = current.filter((edge) => edge.id !== edgeId);
          return [...filtered, newEdge];
        });
      }

      return createdNode;
    },
    []
  );

  const updateNode = useCallback((id: string, updates: Partial<AutomationGraphNode>) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== id) {
          return node;
        }
        return {
          ...node,
          ...updates,
          config: updates.config ? { ...node.config, ...updates.config } : node.config,
          metadata: updates.metadata ? { ...node.metadata, ...updates.metadata } : node.metadata,
        };
      })
    );
  }, []);

  const linkNodes = useCallback(
    (
      source: string,
      target: string,
      edge: Partial<Omit<AutomationGraphEdge, "id" | "source" | "target">> = {}
    ): AutomationGraphEdge | null => {
      if (source === target) {
        return null;
      }

      const sourceExists = nodes.some((node) => node.id === source);
      const targetExists = nodes.some((node) => node.id === target);
      if (!sourceExists || !targetExists) {
        return null;
      }

      const branchKey = edge.branchKey ?? null;
      const newEdge: AutomationGraphEdge = {
        id: createEdgeId(source, target, branchKey ?? undefined),
        source,
        target,
        label: edge.label ?? null,
        branchKey,
      };

      setEdges((current) => {
        const filtered = current.filter((existing) => existing.id !== newEdge.id);
        return [...filtered, newEdge];
      });

      return newEdge;
    },
    [nodes]
  );

  const removeNode = useCallback((id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
  }, []);

  const updateEdge = useCallback((id: string, updates: Partial<AutomationGraphEdge>) => {
    setEdges((current) =>
      current.map((edge) => {
        if (edge.id !== id) {
          return edge;
        }
        return {
          ...edge,
          ...updates,
          branchKey: updates.branchKey ?? edge.branchKey,
          label: updates.label ?? edge.label,
        };
      })
    );
  }, []);

  const removeEdge = useCallback((id: string) => {
    setEdges((current) => current.filter((edge) => edge.id !== id));
  }, []);

  const setGraph = useCallback((graph: AutomationCanvasState) => {
    setNodes(normaliseNodes(graph.nodes));
    setEdges(graph.edges ?? []);
  }, []);

  const serialize = useCallback((): AutomationCanvasState => ({
    nodes: nodes.map((node) => ({
      ...node,
      position: node.position ?? { x: 0, y: 0 },
    })),
    edges: [...edges],
  }), [nodes, edges]);

  return useMemo(
    () => ({ nodes, edges, addNode, updateNode, linkNodes, removeNode, updateEdge, removeEdge, setGraph, serialize }),
    [nodes, edges, addNode, updateNode, linkNodes, removeNode, updateEdge, removeEdge, setGraph, serialize]
  );
}

function titleCaseFromType(type: AutomationGraphNodeType): string {
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
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
