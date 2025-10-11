import { render, screen } from "@testing-library/react";
import { EnhancedKanbanColumn, type Column } from "../EnhancedKanbanColumn";

describe("EnhancedKanbanColumn", () => {
  const baseColumn: Column = {
    id: "col-1",
    title: "In Progress",
    tasks: [],
    metadata: {
      wip: {
        columnLimit: 3,
        laneLimits: {},
        policy: "allow_override",
        overrides: {
          column: null,
          lanes: {},
        },
      },
      checklists: { ready: [], done: [] },
      blockerPolicies: {
        enforceDependencyClearance: true,
        requireReasonForOverride: false,
      },
    },
  };

  it("shows an override badge when a column override is active", () => {
    const column: Column = {
      ...baseColumn,
      metadata: {
        ...baseColumn.metadata!,
        wip: {
          ...baseColumn.metadata!.wip,
          overrides: {
            column: {
              active: true,
              grantedBy: "manager",
              grantedAt: new Date().toISOString(),
              reason: "Critical delivery",
            },
            lanes: {},
          },
        },
      },
    };

    render(<EnhancedKanbanColumn column={column} />);

    expect(screen.getByTestId("active-wip-override")).toBeInTheDocument();
  });
});
