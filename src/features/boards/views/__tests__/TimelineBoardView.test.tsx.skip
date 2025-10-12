import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardViewCanvas } from "../index";
import type { BoardViewConfiguration } from "@/types/boards";
import { mergeDependencyDraft } from "../TimelineBoardView";

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

jest.mock("@/components/ui/switch", () => {
  const React = require("react");
  const Switch = ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      role="switch"
      checked={checked ?? false}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  );
  return { Switch };
});

describe("TimelineBoardView", () => {
  const configuration: BoardViewConfiguration = {
    mode: "timeline",
    filters: {},
    grouping: { primary: null, swimlaneField: null, swimlanes: [] },
    sort: [],
    columnPreferences: { order: [], hidden: [] },
    timeline: {
      startField: "startDate",
      endField: "endDate",
    },
    colorRules: [],
  };

  const buildItems = () => [
    {
      id: "1",
      title: "Milestone",
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-03T00:00:00.000Z",
      links: [],
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

  it("normalizes dependency drafts with lead and lag handling", () => {
    const initial = mergeDependencyDraft([], { target: "task-99", offset: 2 }, false);
    expect(initial).toEqual([
      { id: "task-99", offsetDays: 2, type: "lag" },
    ]);

    const duplicate = mergeDependencyDraft(initial, { target: "task-99", offset: 2 }, false);
    expect(duplicate).toBeNull();

    const clamped = mergeDependencyDraft([], { target: "task-100", offset: -3 }, false);
    expect(clamped).toEqual([
      { id: "task-100", offsetDays: 0, type: "lag" },
    ]);

    const leadAllowed = mergeDependencyDraft([], { target: "task-200", offset: -2 }, true);
    expect(leadAllowed).toEqual([
      { id: "task-200", offsetDays: -2, type: "lead" },
    ]);
  });

  it("updates configuration when baseline selection changes", async () => {
    const user = userEvent.setup();
    const handleConfigurationChange = jest.fn();

    render(
      <BoardViewCanvas
        items={buildItems()}
        configuration={configuration}
        onConfigurationChange={handleConfigurationChange}
      />
    );

    const comboBoxes = screen.getAllByRole("combobox");
    const baselineStartSelect = comboBoxes[3];
    const baselineEndSelect = comboBoxes[4];

    await user.selectOptions(baselineStartSelect, "startDate");
    await user.selectOptions(baselineEndSelect, "endDate");

    expect(handleConfigurationChange).toHaveBeenCalled();
  });

  describe("export payloads", () => {
    const exportItems = [
      {
        id: "1",
        title: "Milestone",
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-03T00:00:00.000Z",
        baselineStart: "2023-12-30T00:00:00.000Z",
        baselineEnd: "2024-01-02T00:00:00.000Z",
        links: ["task-2@-1"],
      },
    ];

    const exportConfiguration: BoardViewConfiguration = {
      ...configuration,
      timeline: {
        startField: "startDate",
        endField: "endDate",
        dependencyField: "links",
        baseline: { startField: "baselineStart", endField: "baselineEnd" },
        exportFormat: "csv",
      },
    };

    const setupSpies = () => {
      const originalBlob = global.Blob;
      const originalCreate = (URL as unknown as Record<string, any>).createObjectURL;
      const originalRevoke = (URL as unknown as Record<string, any>).revokeObjectURL;
      let lastBlobText = "";
      let lastBlobType: string | undefined;

      const blobSpy = jest
        .spyOn(global as unknown as { Blob: typeof Blob }, "Blob")
        .mockImplementation(function (parts: any[], options?: BlobPropertyBag) {
          lastBlobText = parts
            .map((part) => (typeof part === "string" ? part : String(part)))
            .join("");
          lastBlobType = options?.type;
          return new originalBlob(parts, options);
        } as unknown as typeof Blob);

      const createMock = jest.fn(() => "blob:mock-url");
      const revokeMock = jest.fn(() => undefined);

      const hasCreate = typeof originalCreate === "function";
      const hasRevoke = typeof originalRevoke === "function";

      const createObjectURLSpy = hasCreate
        ? jest.spyOn(URL as unknown as Record<string, any>, "createObjectURL").mockImplementation(createMock)
        : null;
      if (!hasCreate) {
        (URL as unknown as Record<string, any>).createObjectURL = createMock;
      }

      const revokeObjectURLSpy = hasRevoke
        ? jest.spyOn(URL as unknown as Record<string, any>, "revokeObjectURL").mockImplementation(revokeMock)
        : null;
      if (!hasRevoke) {
        (URL as unknown as Record<string, any>).revokeObjectURL = revokeMock;
      }

      const clickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => undefined);

      return {
        getPayload: () => lastBlobText,
        getType: () => lastBlobType,
        restore: () => {
          blobSpy.mockRestore();
          if (createObjectURLSpy) {
            createObjectURLSpy.mockRestore();
          } else if (typeof originalCreate === "function") {
            (URL as unknown as Record<string, any>).createObjectURL = originalCreate;
          } else {
            delete (URL as unknown as Record<string, any>).createObjectURL;
          }

          if (revokeObjectURLSpy) {
            revokeObjectURLSpy.mockRestore();
          } else if (typeof originalRevoke === "function") {
            (URL as unknown as Record<string, any>).revokeObjectURL = originalRevoke;
          } else {
            delete (URL as unknown as Record<string, any>).revokeObjectURL;
          }

          clickSpy.mockRestore();
        },
      };
    };

    it("generates a CSV export", async () => {
      const user = userEvent.setup();
      const spies = setupSpies();

      render(
        <BoardViewCanvas
          items={exportItems}
          configuration={exportConfiguration}
          onItemsChange={jest.fn()}
          onConfigurationChange={jest.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /export/i }));

      expect(spies.getType()).toBe("text/csv");
      expect(spies.getPayload()).toContain(
        "Title,Start,End,DurationDays,BaselineStart,BaselineEnd,Dependencies"
      );
      expect(spies.getPayload()).toContain(
        "Milestone,2024-01-01T00:00:00.000Z,2024-01-03T00:00:00.000Z,2"
      );

      spies.restore();
    });

    it("generates a JSON export", async () => {
      const user = userEvent.setup();
      const spies = setupSpies();

      render(
        <BoardViewCanvas
          items={exportItems}
          configuration={{
            ...exportConfiguration,
            timeline: { ...exportConfiguration.timeline!, exportFormat: "json" },
          }}
          onItemsChange={jest.fn()}
          onConfigurationChange={jest.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /export/i }));

      expect(spies.getType()).toBe("application/json");
      const payload = JSON.parse(spies.getPayload());
      expect(payload[0]).toMatchObject({
        title: "Milestone",
        durationDays: 2,
        baselineStart: "2023-12-30T00:00:00.000Z",
      });

      spies.restore();
    });

    it("generates an ICS export", async () => {
      const user = userEvent.setup();
      const spies = setupSpies();

      render(
        <BoardViewCanvas
          items={exportItems}
          configuration={{
            ...exportConfiguration,
            timeline: { ...exportConfiguration.timeline!, exportFormat: "ics" },
          }}
          onItemsChange={jest.fn()}
          onConfigurationChange={jest.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /export/i }));

      expect(spies.getType()).toBe("text/calendar");
      const payload = spies.getPayload();
      expect(payload).toContain("BEGIN:VCALENDAR");
      expect(payload).toContain("SUMMARY:Milestone");
      expect(payload).toContain("DTSTART:20240101T000000Z");

      spies.restore();
    });
  });
});

