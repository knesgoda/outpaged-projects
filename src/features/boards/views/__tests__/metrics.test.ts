import { describe, expect, it } from "@jest/globals";
import type { BoardViewConfiguration, BoardViewRecord } from "../context";
import {
  applyBoardFilters,
  buildBoardMetricDisplays,
  calculateBoardMetrics,
} from "../metrics";

const baseConfiguration: BoardViewConfiguration = {
  mode: "table",
  filters: {},
  grouping: { primary: null, swimlaneField: null, swimlanes: [] },
  sort: [],
  columnPreferences: { order: [], hidden: [] },
  timeline: null,
  colorRules: [],
};

describe("board metrics", () => {
  const items: BoardViewRecord[] = [
    {
      id: "1",
      title: "Design onboarding flow",
      status: "in_progress",
      story_points: 5,
      estimated_hours: 12,
      actual_hours: 10,
      start_date: "2024-03-01",
      due_date: "2024-03-15",
      sla_due_at: "2024-03-12T12:00:00.000Z",
      blocked: false,
    },
    {
      id: "2",
      title: "Ship authentication",
      status: "done",
      story_points: 8,
      estimated_hours: 16,
      actual_hours: 18,
      start_date: "2024-03-01",
      due_date: "2024-03-10",
      completed: true,
      sla_status: "met",
    },
    {
      id: "3",
      title: "QA regression",
      status: "blocked",
      story_points: 3,
      estimated_hours: 6,
      actual_hours: 2,
      start_date: "2024-03-05",
      due_date: "2024-03-20",
      sla_status: "breached",
      blocked: true,
    },
  ];

  it("applies basic equality filters", () => {
    const filtered = applyBoardFilters(items, { status: ["done"] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("2");
  });

  it("calculates aggregate metrics", () => {
    const summary = calculateBoardMetrics(items, baseConfiguration, new Date("2024-03-11T00:00:00Z"));

    expect(summary.totalItems).toBe(3);
    expect(summary.completedItems).toBe(1);
    expect(summary.blockedItems).toBe(1);
    expect(summary.storyPoints.total).toBeCloseTo(16);
    expect(summary.storyPoints.remaining).toBeCloseTo(8);
    expect(summary.time.actualHours).toBeCloseTo(30);
    expect(summary.time.varianceHours).toBeCloseTo(-4);
    expect(summary.burndown.totalPoints).toBeCloseTo(16);
    expect(summary.sla.totalTracked).toBe(3);
    expect(summary.sla.breached).toBe(1);
  });

  it("builds display metrics with tones and tooltips", () => {
    const summary = calculateBoardMetrics(items, baseConfiguration, new Date("2024-03-11T00:00:00Z"));
    const displays = buildBoardMetricDisplays(summary);

    const ids = displays.map((metric) => metric.id);
    expect(ids).toContain("work-total");
    expect(ids).toContain("points-remaining");
    expect(ids).toContain("time-logged");
    expect(ids).toContain("burndown");
    expect(ids).toContain("sla");

    const slaMetric = displays.find((metric) => metric.id === "sla");
    expect(slaMetric?.tone).toBe("critical");
    expect(slaMetric?.value).toMatch(/%/);
    expect(slaMetric?.tooltip).toContain("tracked tasks");
  });
});
