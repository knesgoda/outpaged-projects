import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardViewCanvas } from "../index";
import type { BoardViewConfiguration } from "@/types/boards";

jest.mock("@/components/ui/select", () => {
  const React = require("react");

  const Select = ({ value, onValueChange, children }: any) => (
    <select value={value ?? ""} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  );

  const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectValue = () => null;
  const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  );

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

describe("TimelineBoardView", () => {
  const configuration: BoardViewConfiguration = {
    mode: "timeline",
    filters: {},
    grouping: null,
    sort: null,
    columnPreferences: { order: [], hidden: [] },
    timeline: {
      startField: "startDate",
      endField: "endDate",
    },
  };

  const buildItems = () => [
    {
      id: "1",
      title: "Milestone",
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-03T00:00:00.000Z",
    },
  ];

  it("allows quick adjustments via timeline controls", async () => {
    const user = userEvent.setup();
    const handleItemsChange = jest.fn();

    render(
      <BoardViewCanvas
        items={buildItems()}
        configuration={configuration}
        onItemsChange={handleItemsChange}
      />
    );

    const incrementButton = screen.getByRole("button", { name: "+1d" });
    await user.click(incrementButton);

    expect(handleItemsChange).toHaveBeenCalled();
    const [items] = handleItemsChange.mock.calls[0];
    expect(items[0].startDate).toBe("2024-01-02T00:00:00.000Z");
  });

  it("persists manual date edits", async () => {
    const user = userEvent.setup();
    const handleItemsChange = jest.fn();

    render(
      <BoardViewCanvas
        items={buildItems()}
        configuration={configuration}
        onItemsChange={handleItemsChange}
      />
    );

    const endInput = screen.getByLabelText(/end/i);
    fireEvent.change(endInput, { target: { value: "2024-01-05" } });

    expect(handleItemsChange).toHaveBeenCalled();
    const [items] = handleItemsChange.mock.calls[0];
    expect(items[0].endDate).toBe("2024-01-05T00:00:00.000Z");
  });
});

