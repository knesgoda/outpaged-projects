import { render, screen, fireEvent } from "@testing-library/react";
import { BuilderShell } from "../BuilderShell";
import type { ReportQuery } from "@/server/analytics/types";

describe("BuilderShell", () => {
  const baseQuery: ReportQuery = {
    source: "analytics.mv_event_daily",
    dimensions: ["date_key"],
    metrics: [
      {
        id: "events",
        label: "Events",
        column: "events",
        aggregation: "sum",
      },
    ],
  };

  it("renders shelves and allows running", () => {
    const handleRun = jest.fn();

    render(<BuilderShell initialQuery={baseQuery} onRun={handleRun} />);

    expect(screen.getByText(/Report Builder/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Run/));

    expect(handleRun).toHaveBeenCalledTimes(1);
  });

  it("opens calculated field modal", () => {
    render(<BuilderShell initialQuery={baseQuery} />);

    fireEvent.click(screen.getByText(/Add calculation/));

    expect(screen.getByText(/Calculated Field/)).toBeInTheDocument();
  });
});
