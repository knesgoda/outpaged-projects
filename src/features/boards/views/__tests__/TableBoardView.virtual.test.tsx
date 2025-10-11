import { fireEvent, render, screen } from "@testing-library/react";

import { BoardViewCanvas } from "../index";
import type { BoardViewConfiguration } from "@/types/boards";

const buildConfiguration = (): BoardViewConfiguration => ({
  mode: "table",
  filters: {},
  grouping: { primary: null, swimlaneField: null, swimlanes: [] },
  sort: [],
  columnPreferences: { order: ["title", "status"], hidden: [] },
  timeline: null,
  colorRules: [],
});

describe("TableBoardView virtualization", () => {
  const items = Array.from({ length: 500 }, (_, index) => ({
    id: `item-${index}`,
    title: `Task ${index}`,
    status: index % 3 === 0 ? "todo" : index % 3 === 1 ? "in_progress" : "done",
  }));

  it("renders only a window of rows for large datasets", () => {
    render(
      <BoardViewCanvas
        items={items}
        configuration={buildConfiguration()}
        hasMore={false}
      />
    );

    const renderedRows = document.querySelectorAll("[data-row-index]");
    expect(renderedRows.length).toBeLessThanOrEqual(120);
  });

  it("surfaces the load more affordance when more data is available", () => {
    render(
      <BoardViewCanvas
        items={items}
        configuration={buildConfiguration()}
        hasMore
      />
    );

    const scrollContainer = screen.getByTestId("board-table-scroll");
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 10_000 } });

    expect(
      screen.getByText(/scroll to load additional rows/i)
    ).toBeInTheDocument();
  });
});
