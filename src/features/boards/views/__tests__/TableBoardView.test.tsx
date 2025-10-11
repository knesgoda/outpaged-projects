import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardViewCanvas } from "../index";
import type { BoardViewConfiguration } from "@/types/boards";
import { updateTaskFields, replaceTaskAssignees } from "@/services/tasksService";

jest.mock("@/services/tasksService", () => ({
  updateTaskFields: jest.fn().mockResolvedValue(undefined),
  replaceTaskAssignees: jest.fn().mockResolvedValue(undefined),
}));

const buildConfiguration = (): BoardViewConfiguration => ({
  mode: "table",
  filters: {},
  grouping: { primary: null, swimlaneField: null, swimlanes: [] },
  sort: [],
  columnPreferences: { order: ["title"], hidden: [] },
  timeline: null,
  colorRules: [],
});

describe("TableBoardView", () => {
  it("supports inline editing with keyboard interactions", async () => {
    const user = userEvent.setup();
    const handleItemsChange = jest.fn();

    render(
      <BoardViewCanvas
        items={[{ id: "1", title: "Initial", status: "todo" }]}
        configuration={buildConfiguration()}
        onItemsChange={handleItemsChange}
      />
    );

    const cell = screen.getByText("Initial");
    await user.click(cell);

    const input = await screen.findByRole("textbox", { name: /edit title/i });
    await user.clear(input);
    await user.type(input, "Updated");
    const saveButton = await screen.findByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(handleItemsChange).toHaveBeenCalled();
    const lastCall = handleItemsChange.mock.calls.at(-1);
    expect(lastCall?.[0][0].title).toContain("Updated");
    expect(updateTaskFields).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ title: expect.stringContaining("Updated") })
    );
  });

  it("updates assignees using replaceTaskAssignees", async () => {
    const user = userEvent.setup();

    render(
      <BoardViewCanvas
        items={[{ id: "1", title: "Initial", status: "todo", assignees: ["user-1"] }]}
        configuration={{
          ...buildConfiguration(),
          columnPreferences: { order: ["title", "assignees"], hidden: [] },
        }}
      />
    );

    const assigneeCell = screen.getByText("user-1");
    await user.click(assigneeCell);
    const input = await screen.findByRole("textbox", { name: /edit assignees/i });
    fireEvent.change(input, { target: { value: "user-2 user-3" } });
    const saveButton = await screen.findByRole("button", { name: /save/i });
    await user.click(saveButton);

    const assigneeCall = (replaceTaskAssignees as jest.Mock).mock.calls.at(-1);
    expect(assigneeCall?.[0]).toBe("1");
    expect(Array.isArray(assigneeCall?.[1])).toBe(true);
    expect((assigneeCall?.[1] as string[]).join(" ")).toEqual(expect.stringContaining("user-2"));
  });
});

