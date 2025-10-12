import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkOperations } from "../BulkOperations";

const toastMock = jest.fn();

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

jest.mock("@/components/ui/select", () => {
  const React = require("react");

  const getTextContent = (node: any): string => {
    if (node === null || node === undefined) return "";
    if (typeof node === "string" || typeof node === "number") {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(getTextContent).join(" ");
    }
    if (React.isValidElement(node)) {
      return getTextContent(node.props.children);
    }
    return "";
  };

  const SelectItem = ({ value, children, ...props }: any) => {
    return null;
  };

  const SelectTrigger = ({ options = [], onValueChange, ...props }: any) => (
    <select
      {...props}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value="" disabled hidden />
      {options.map((option: React.ReactElement) => (
        <option
          key={option.props.value}
          value={option.props.value}
          data-testid={option.props["data-testid"]}
        >
          {getTextContent(option.props.children) || option.props.value}
        </option>
      ))}
    </select>
  );

  const SelectContent = ({ children }: any) => children;

  const Select = ({ children, onValueChange }: any) => {
    const options: React.ReactElement[] = [];
    let trigger: React.ReactElement | null = null;

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === SelectTrigger) {
        trigger = child;
      } else if (child.type === SelectContent) {
        React.Children.forEach(child.props.children, (option) => {
          if (React.isValidElement(option) && option.type === SelectItem) {
            options.push(option);
          }
        });
      }
    });

    if (!trigger) {
      return null;
    }

    return React.cloneElement(trigger, { options, onValueChange });
  };

  const SelectValue = () => null;

  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
});

const unparseMock = jest.fn(() => "id,title\n1,Task");

jest.mock("papaparse", () => ({
  __esModule: true,
  default: {
    unparse: () => unparseMock(),
  },
}));

jest.mock("@/services/bulkTaskOperations", () => ({
  bulkUpdateStatus: jest.fn().mockResolvedValue(undefined),
  bulkUpdatePriority: jest.fn().mockResolvedValue(undefined),
  bulkAssignAssignee: jest.fn().mockResolvedValue(undefined),
  bulkMoveTasksToGroup: jest.fn().mockResolvedValue(undefined),
  bulkAddTasksToSprint: jest.fn().mockResolvedValue(undefined),
  bulkAssignLabels: jest.fn().mockResolvedValue(undefined),
  bulkUpdateWatchers: jest.fn().mockResolvedValue(undefined),
  bulkLinkDependency: jest.fn().mockResolvedValue(undefined),
  bulkDeleteTasks: jest.fn().mockResolvedValue(undefined),
}));

const bulkOpsMock = jest.requireMock("@/services/bulkTaskOperations") as Record<string, jest.Mock>;

describe("BulkOperations component", () => {
  beforeAll(() => {
    Object.defineProperty(Element.prototype, "hasPointerCapture", { value: () => false });
    Object.defineProperty(Element.prototype, "releasePointerCapture", { value: () => {} });
    Object.defineProperty(Element.prototype, "setPointerCapture", { value: () => {} });
  });

  const baseProps = {
    selectedTasks: ["task-1", "task-2"],
    onSelectionChange: jest.fn(),
    onOperationComplete: jest.fn(),
    tasks: [
      {
        id: "task-1",
        title: "Task One",
        status: "todo",
        priority: "low",
        hierarchy_level: "task",
        task_type: "task",
        tags: [],
        assignees: [],
        tagDetails: [],
        swimlane_id: "swim-1",
      },
      {
        id: "task-2",
        title: "Task Two",
        status: "in_progress",
        priority: "medium",
        hierarchy_level: "task",
        task_type: "task",
        tags: [],
        assignees: [],
        tagDetails: [],
        swimlane_id: "swim-2",
      },
      {
        id: "task-3",
        title: "Other Task",
        status: "todo",
        priority: "low",
        hierarchy_level: "task",
        task_type: "task",
        tags: [],
        assignees: [],
        tagDetails: [],
        swimlane_id: "swim-1",
      },
    ],
    availableAssignees: [
      { id: "assignee-1", name: "Alex Reviewer", avatar: "" },
      { id: "assignee-2", name: "Riley Owner", avatar: "" },
    ],
    availableColumns: [],
    availableSwimlanes: [
      { id: "swim-1", name: "Design" },
      { id: "swim-2", name: "Delivery" },
    ],
    availableSprints: [
      { id: "sprint-1", name: "Sprint Alpha" },
    ],
    availableLabels: [
      { id: "label-1", label: "High Impact", color: "#ff0000" },
    ],
    availableWatchers: [
      { id: "watcher-1", name: "Jordan Watcher", avatar: "" },
    ],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(bulkOpsMock).forEach((fn) => fn.mockClear?.());
    toastMock.mockClear();
    unparseMock.mockClear();
  });

  it("triggers status updates via bulk service", async () => {
    render(<BulkOperations {...baseProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /→ Done/i }));

    await waitFor(() => {
      expect(bulkOpsMock.bulkUpdateStatus).toHaveBeenCalledWith(["task-1", "task-2"], "done");
    });
    expect(baseProps.onSelectionChange).toHaveBeenCalledWith([]);
    expect(baseProps.onOperationComplete).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining("Moved 2 tasks") })
    );
  });

  it("moves tasks to a swimlane group", async () => {
    render(<BulkOperations {...baseProps} />);
    const trigger = screen.getByRole("combobox", { name: /Move to group/i });
    fireEvent.change(trigger, { target: { value: "swim-2" } });

    await waitFor(() => {
      expect(bulkOpsMock.bulkMoveTasksToGroup).toHaveBeenCalledWith(["task-1", "task-2"], "swim-2");
    });
  });

  it("adds tasks to a sprint", async () => {
    render(<BulkOperations {...baseProps} />);
    const trigger = screen.getByRole("combobox", { name: /Add to sprint/i });
    fireEvent.change(trigger, { target: { value: "sprint-1" } });

    await waitFor(() => {
      expect(bulkOpsMock.bulkAddTasksToSprint).toHaveBeenCalledWith(["task-1", "task-2"], "sprint-1");
    });
  });

  it("assigns labels to selected tasks", async () => {
    render(<BulkOperations {...baseProps} />);
    const trigger = screen.getByRole("combobox", { name: /Assign label/i });
    fireEvent.change(trigger, { target: { value: "label-1" } });

    await waitFor(() => {
      expect(bulkOpsMock.bulkAssignLabels).toHaveBeenCalledWith(["task-1", "task-2"], "label-1");
    });
  });

  it("updates watchers for selected tasks", async () => {
    render(<BulkOperations {...baseProps} />);
    const trigger = screen.getByRole("combobox", { name: /Add watcher/i });
    fireEvent.change(trigger, { target: { value: "watcher-1" } });

    await waitFor(() => {
      expect(bulkOpsMock.bulkUpdateWatchers).toHaveBeenCalledWith(["task-1", "task-2"], ["watcher-1"]);
    });
  });

  it("links dependencies via dialog", async () => {
    render(<BulkOperations {...baseProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Link dependency/i }));

    const dialog = await screen.findByRole("dialog");

    const targetTrigger = within(dialog).getByRole("combobox", { name: /Dependency target/i });
    fireEvent.change(targetTrigger, { target: { value: "task-3" } });

    const typeTrigger = within(dialog).getByRole("combobox", { name: /Dependency type/i });
    fireEvent.change(typeTrigger, { target: { value: "blocked_by" } });

    await user.click(within(dialog).getByRole("button", { name: /^Link dependency$/i }));

    await waitFor(() => {
      expect(bulkOpsMock.bulkLinkDependency).toHaveBeenCalledWith(["task-1", "task-2"], "task-3", "blocked_by");
    });
  });

  it("exports the selected tasks as CSV", async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const createObjectURL = jest.fn(() => "blob:mock");
    const revokeObjectURL = jest.fn();
    const originalAppendChild = document.body.appendChild.bind(document.body);
    const appendChildSpy = jest.spyOn(document.body, "appendChild");
    const clickMock = jest.fn();

    appendChildSpy.mockImplementation((node: Node) => {
      if (node instanceof HTMLAnchorElement) {
        Object.defineProperty(node, "click", { value: clickMock });
      }
      return originalAppendChild(node);
    });

    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    render(<BulkOperations {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /CSV/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(unparseMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining("CSV") })
    );

    appendChildSpy.mockRestore();
    global.URL.createObjectURL = originalCreate;
    global.URL.revokeObjectURL = originalRevoke;
  });

  it("confirms before deleting tasks", async () => {
    render(<BulkOperations {...baseProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /Delete tasks/i }));

    await waitFor(() => {
      expect(bulkOpsMock.bulkDeleteTasks).toHaveBeenCalledWith(["task-1", "task-2"]);
    });
  });
});
