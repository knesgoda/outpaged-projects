import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardViewCanvas } from "../index";
import type { BoardViewConfiguration } from "@/types/boards";

const buildConfiguration = (): BoardViewConfiguration => ({
  mode: "table",
  filters: {},
  grouping: null,
  sort: null,
  columnPreferences: { order: ["title"], hidden: [] },
  timeline: null,
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
    await user.dblClick(cell);

    const input = await screen.findByRole("textbox", { name: /edit title/i });
    await user.clear(input);
    await user.type(input, "Updated");
    await user.tab();

    expect(handleItemsChange).toHaveBeenCalled();
    const lastCall = handleItemsChange.mock.calls.at(-1);
    expect(lastCall?.[0][0].title).toBe("Updated");
  });
});

