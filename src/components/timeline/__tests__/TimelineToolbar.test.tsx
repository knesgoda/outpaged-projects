import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TimelineToolbar } from "../TimelineView";
import { TimelineProvider, useTimelinePreferences, type TimelineSnapshot } from "@/state/timeline";

function createSnapshot(): TimelineSnapshot {
  return {
    items: [],
    groups: [],
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
    lastUpdated: new Date().toISOString(),
  };
}

function PreferencesProbe() {
  const { preferences } = useTimelinePreferences();
  return <span data-testid="dependencies-state">{String(preferences.showDependencies)}</span>;
}

describe("TimelineToolbar", () => {
  it("allows dependencies to be toggled back on", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const user = userEvent.setup();

    try {
      render(
        <QueryClientProvider client={queryClient}>
          <TimelineProvider initialSnapshot={createSnapshot()}>
            <TimelineToolbar />
            <PreferencesProbe />
          </TimelineProvider>
        </QueryClientProvider>
      );

      const dependenciesToggle = screen.getByLabelText(/toggle dependencies/i);

      await user.click(dependenciesToggle);
      await waitFor(() => expect(screen.getByTestId("dependencies-state")).toHaveTextContent("false"));

      await user.click(dependenciesToggle);
      await waitFor(() => expect(screen.getByTestId("dependencies-state")).toHaveTextContent("true"));
    } finally {
      queryClient.clear();
    }
  });
});
