import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { BoardMetricsHeader } from "../BoardMetricsHeader";
import type { BoardViewConfiguration } from "@/types/boards";

const configuration: BoardViewConfiguration = {
  mode: "table",
  filters: {},
  grouping: { primary: null, swimlaneField: null, swimlanes: [] },
  sort: [],
  columnPreferences: { order: [], hidden: [] },
  timeline: null,
  colorRules: [],
};

describe("BoardMetricsHeader", () => {
  it("renders the metrics snapshot layout", () => {
    const { asFragment } = render(
      <BoardMetricsHeader
        items={[
          {
            id: "1",
            status: "in_progress",
            story_points: 5,
            estimated_hours: 8,
            actual_hours: 6,
            start_date: "2024-03-01",
            due_date: "2024-03-10",
            sla_status: "healthy",
          },
          {
            id: "2",
            status: "done",
            story_points: 3,
            estimated_hours: 5,
            actual_hours: 6,
            start_date: "2024-03-02",
            due_date: "2024-03-08",
            completed: true,
          },
        ]}
        configuration={configuration}
      />
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
