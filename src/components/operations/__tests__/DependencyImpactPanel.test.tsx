import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";

const nodes = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Demo node" },
  },
];

const edges = [];

describe("@xyflow/react integration", () => {
  it("exposes the ReactFlow component", () => {
    expect(ReactFlow).toBeDefined();
  });

  it("mounts a minimal graph without crashing", () => {
    render(
      <ReactFlowProvider>
        <div style={{ width: 320, height: 240 }}>
          <ReactFlow nodes={nodes} edges={edges} fitView />
        </div>
      </ReactFlowProvider>
    );

    expect(screen.getByText("Demo node")).toBeInTheDocument();
  });
});
