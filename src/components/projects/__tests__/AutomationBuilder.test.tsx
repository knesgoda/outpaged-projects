import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { AutomationBuilder } from "@/components/projects/AutomationBuilder";
import type { AutomationCanvasState, AutomationRunDetails, AutomationVersionSummary } from "@/types";

jest.mock("@xyflow/react", () => {
  const React = require("react");
  return {
    __esModule: true,
    ReactFlowProvider: ({ children }: { children: ReactNode }) => <div data-testid="reactflow-provider">{children}</div>,
    ReactFlow: ({ nodes, onNodeClick, children }: any) => (
      <div data-testid="reactflow">
        {nodes?.map((node: any) => (
          <button
            key={node.id}
            data-testid={`node-${node.id}`}
            onClick={() => onNodeClick?.({}, node)}
          >
            {node.data?.label ?? node.id}
          </button>
        ))}
        {children}
      </div>
    ),
    Background: () => <div data-testid="background" />,
    MiniMap: () => <div data-testid="minimap" />,
    Controls: () => <div data-testid="controls" />,
    addEdge: jest.fn(),
    useNodesState: (initial: any) => [initial, jest.fn(), jest.fn()],
    useEdgesState: (initial: any) => [initial, jest.fn(), jest.fn()],
  };
});

const fetchAutomationEditorData = jest.fn();
const saveAutomationGraph = jest.fn();
const triggerAutomationDryRun = jest.fn();
const toggleAutomationVersion = jest.fn();
const fetchAutomationRunHistory = jest.fn();

jest.mock("@/services/automationBuilder", () => ({
  fetchAutomationEditorData: (...args: unknown[]) => fetchAutomationEditorData(...args),
  saveAutomationGraph: (...args: unknown[]) => saveAutomationGraph(...args),
  triggerAutomationDryRun: (...args: unknown[]) => triggerAutomationDryRun(...args),
  toggleAutomationVersion: (...args: unknown[]) => toggleAutomationVersion(...args),
  fetchAutomationRunHistory: (...args: unknown[]) => fetchAutomationRunHistory(...args),
}));

const defaultGraph: AutomationCanvasState = {
  nodes: [
    {
      id: "trigger-0",
      type: "trigger",
      label: "Trigger",
      description: "",
      config: { type: "item_created" },
      position: { x: 0, y: 0 },
    },
    {
      id: "condition-1",
      type: "condition",
      label: "Check status",
      description: "",
      config: { operator: "field_equals" },
      position: { x: 240, y: 0 },
    },
  ],
  edges: [
    { id: "edge-trigger-0-condition-1", source: "trigger-0", target: "condition-1", label: "Then", branchKey: null },
  ],
};

describe("AutomationBuilder", () => {
  beforeAll(() => {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (global as any).ResizeObserver = ResizeObserver;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    fetchAutomationEditorData.mockResolvedValue({
      automation: {
        id: "auto-1",
        project_id: "proj-1",
        name: "My automation",
        description: "Demo automation",
        is_active: true,
        governance: { ownerId: "user-1", reviewers: ["user-2"], requiresReview: false },
        graph_definition: defaultGraph,
      },
      versions: [],
      runHistory: [],
      conflicts: [
        {
          automationId: "auto-1",
          conflictingAutomationId: "auto-2",
          reason: "Shares trigger \"Item Created\" with another automation.",
          severity: "warning",
        },
      ],
    });
    fetchAutomationRunHistory.mockResolvedValue([]);
  });

  it("loads automation details and renders conflicts", async () => {
    render(<AutomationBuilder projectId="proj-1" automationId="auto-1" />);

    expect(await screen.findByDisplayValue("My automation")).toBeInTheDocument();
    expect(screen.getByText(/conflicts/i)).toBeInTheDocument();
    expect(screen.getByText(/Shares trigger/)).toBeInTheDocument();
  });

  it("allows editing a node label via inspector", async () => {
    render(<AutomationBuilder projectId="proj-1" automationId="auto-1" />);

    const nodeButton = await screen.findByTestId("node-trigger-0");
    fireEvent.click(nodeButton);

    const labelInput = await screen.findByLabelText(/Label/);
    fireEvent.change(labelInput, { target: { value: "Updated trigger" } });

    await waitFor(() => {
      expect((labelInput as HTMLInputElement).value).toBe("Updated trigger");
    });
  });

  it("saves automation and updates version list", async () => {
    const version: AutomationVersionSummary = {
      id: "ver-1",
      version_number: 1,
      created_at: new Date().toISOString(),
      created_by: "user-1",
      notes: null,
      is_enabled: true,
      name: "v1",
    };
    saveAutomationGraph.mockResolvedValue({ automationId: "auto-1", version });

    render(<AutomationBuilder projectId="proj-1" automationId="auto-1" />);

    const saveButton = await screen.findByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveAutomationGraph).toHaveBeenCalled();
    });

    expect(await screen.findByText(/Version 1/)).toBeInTheDocument();
  });

  it("runs a dry-run test and refreshes history", async () => {
    const runHistory: AutomationRunDetails[] = [
      {
        id: "run-1",
        rule_id: "auto-1",
        version_id: "ver-1",
        executed_at: new Date().toISOString(),
        success: true,
        duration_ms: 1200,
        trigger_data: { id: "item-1" },
        input: { id: "item-1" },
        output: { status: "ok" },
        logs: [],
      },
    ];
    triggerAutomationDryRun.mockResolvedValue({ executionId: "dry-1", logs: [] });
    fetchAutomationRunHistory.mockResolvedValue(runHistory);

    render(<AutomationBuilder projectId="proj-1" automationId="auto-1" />);

    const testButton = await screen.findByRole("button", { name: /Test on sample item/i });
    await act(async () => {
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(triggerAutomationDryRun).toHaveBeenCalledWith("auto-1", {});
    });

    expect(await screen.findByText(/Success/)).toBeInTheDocument();
  });
});
