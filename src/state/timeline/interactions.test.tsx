import { useEffect, useRef } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { addDays, formatISO, startOfDay } from "date-fns";

import {
  TimelineProvider,
  useTimelineInteractions,
  useTimelineSelector,
  useTimelineState,
  type KeyboardEventLike,
  type TimelineRowModel,
  type TimelineSnapshot,
} from "@/state/timeline";

function createSnapshot(): TimelineSnapshot {
  const base = startOfDay(new Date("2024-01-01T00:00:00.000Z"));
  const itemOneStart = formatISO(base);
  const itemOneEnd = formatISO(addDays(base, 3));
  const itemTwoStart = formatISO(addDays(base, 5));
  const itemTwoEnd = formatISO(addDays(base, 8));

  return {
    items: [
      {
        id: "item-1",
        name: "Design",
        kind: "task",
        groupId: "group-1",
        start: itemOneStart,
        end: itemOneEnd,
        durationMinutes: 3 * 24 * 60,
        percentComplete: 0.5,
      },
      {
        id: "item-2",
        name: "Build",
        kind: "task",
        groupId: "group-1",
        start: itemTwoStart,
        end: itemTwoEnd,
        durationMinutes: 3 * 24 * 60,
        percentComplete: 0.1,
      },
    ],
    groups: [
      { id: "group-1", name: "Implementation", parentId: null, orderIndex: 0 },
    ],
    milestones: [],
    dependencies: [],
    baselines: [],
    constraints: [],
    calendars: [],
    overlays: [],
    workload: [],
    riskScores: [],
    comments: [],
    permissions: [],
    presence: [],
    preferences: {
      scale: "day",
      zoomLevel: 1,
      showWeekends: true,
      showBaselines: true,
      showDependencies: true,
      showOverlays: false,
      showLegend: false,
      snapMode: "day",
      rowDensity: "comfortable",
      grouping: "none",
      colorBy: "status",
      swimlanes: false,
      calendarId: null,
      savedViewId: null,
    },
    metadata: {},
    lastUpdated: formatISO(base),
  };
}

jest.mock("@/services/timeline", () => {
  const actual = jest.requireActual("@/services/timeline");
  return {
    ...actual,
    fetchTimelineSnapshot: jest.fn(async () => createSnapshot()),
  };
});

interface HarnessApi {
  interactions: ReturnType<typeof useTimelineInteractions>;
  getSnapshot: () => TimelineSnapshot;
  rows: TimelineRowModel[];
}

function Harness({ onReady }: { onReady: (api: HarnessApi) => void }) {
  const rows = useTimelineSelector((context) => context.derived?.rows ?? []);
  const interactions = useTimelineInteractions({ rows, pixelsPerDay: 120 });
  const state = useTimelineState();
  const apiRef = useRef<HarnessApi | null>(null);

  if (!apiRef.current) {
    apiRef.current = {
      interactions,
      getSnapshot: () => state.snapshot!,
      rows,
    };
  } else {
    apiRef.current.interactions = interactions;
    apiRef.current.getSnapshot = () => state.snapshot!;
    apiRef.current.rows = rows;
  }

  useEffect(() => {
    if (!state.snapshot || !apiRef.current) return;
    onReady(apiRef.current);
  }, [interactions, onReady, rows, state.snapshot]);

  return null;
}

describe("useTimelineInteractions", () => {
  function setupHarness() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
      },
    });
    const snapshot = createSnapshot();
    let api: HarnessApi | null = null;

    const utils = render(
      <QueryClientProvider client={queryClient}>
        <TimelineProvider projectId="test" initialSnapshot={snapshot}>
          <Harness onReady={(value) => (api = value)} />
        </TimelineProvider>
      </QueryClientProvider>,
    );

    return {
      queryClient,
      utils,
      getApi: async () => {
        await waitFor(() => {
          if (!api) {
            throw new Error("harness not ready");
          }
        });
        return api!;
      },
    };
  }

  it("updates start and end dates when dragging and resizing", async () => {
    const { utils, queryClient, getApi } = setupHarness();
    const api = await getApi();

    const initial = api
      .getSnapshot()
      .items.find((item) => item.id === "item-1");
    expect(initial).toBeDefined();
    expect(api.rows.some((row) => row.itemId === "item-1")).toBe(true);
    const startDate = initial?.start ?? "";
    const endDate = initial?.end ?? "";

    await act(async () => {
      api.interactions.selectItem("item-1", "replace");
      await Promise.resolve();
    });

    await act(async () => {
      api.interactions.beginDrag("item-1");
      await Promise.resolve();
    });

    await act(async () => {
      api.interactions.updateDrag(120);
      await Promise.resolve();
    });

    await act(async () => {
      api.interactions.completeGesture();
      await Promise.resolve();
    });

    const afterDrag = api
      .getSnapshot()
      .items.find((item) => item.id === "item-1");
    expect(afterDrag).toBeDefined();
    const expectedDragStart = addDays(new Date(startDate), 1).toISOString();
    const expectedDragEnd = addDays(new Date(endDate), 1).toISOString();
    expect(new Date(afterDrag!.start!).toISOString()).toBe(expectedDragStart);
    expect(new Date(afterDrag!.end!).toISOString()).toBe(expectedDragEnd);

    await act(async () => {
      api.interactions.beginResize("item-1", "end");
      await Promise.resolve();
    });

    await act(async () => {
      api.interactions.updateResize(120);
      await Promise.resolve();
    });

    await act(async () => {
      api.interactions.completeGesture();
      await Promise.resolve();
    });

    const afterResize = api
      .getSnapshot()
      .items.find((item) => item.id === "item-1");
    expect(afterResize).toBeDefined();
    const expectedResizeEnd = addDays(new Date(endDate), 2).toISOString();
    expect(new Date(afterResize!.end!).toISOString()).toBe(expectedResizeEnd);

    utils.unmount();
    queryClient.clear();
  });

  it("creates dependencies between items", async () => {
    const { utils, queryClient, getApi } = setupHarness();
    const api = await getApi();

    await act(async () => {
      api.interactions.beginDependency("item-1");
      await Promise.resolve();
    });

    await act(async () => {
      api.interactions.completeDependency("item-2");
      await Promise.resolve();
    });

    const dependency = api
      .getSnapshot()
      .dependencies.find(
        (dep) => dep.fromId === "item-1" && dep.toId === "item-2",
      );

    expect(dependency).toBeDefined();

    utils.unmount();
    queryClient.clear();
  });

  it("nudges selected items with keyboard", async () => {
    const { utils, queryClient, getApi } = setupHarness();
    const api = await getApi();

    const before = api.getSnapshot().items.find((item) => item.id === "item-2");
    expect(before).toBeDefined();

    const event: KeyboardEventLike = {
      key: "ArrowRight",
      preventDefault: jest.fn(),
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    };

    await act(async () => {
      api.interactions.selectItem("item-2", "replace");
      await Promise.resolve();
    });

    await act(async () => {
      api.interactions.handleKeyDown(event);
      await Promise.resolve();
    });

    const after = api.getSnapshot().items.find((item) => item.id === "item-2");
    expect(after).toBeDefined();
    expect(event.preventDefault).toHaveBeenCalled();
    const expectedNudgeStart = addDays(
      new Date(before?.start ?? ""),
      1,
    ).toISOString();
    expect(new Date(after!.start!).toISOString()).toBe(expectedNudgeStart);

    utils.unmount();
    queryClient.clear();
  });
});
