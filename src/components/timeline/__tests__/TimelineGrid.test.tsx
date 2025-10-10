import { describe, expect, it } from "@jest/globals";

import { computeMilestoneLayout, getPixelsPerDay } from "../TimelineView";
import type { TimelineScale } from "@/state/timeline";

describe("computeMilestoneLayout", () => {
  const startDate = new Date("2024-01-01T00:00:00.000Z");

  it("positions milestones consistently across supported scales", () => {
    const milestoneDate = new Date("2024-01-06T00:00:00.000Z");
    const offsetDays = 5;
    const scales: TimelineScale[] = ["hour", "day", "week", "month", "quarter", "year"];

    for (const scale of scales) {
      const pixelsPerDay = getPixelsPerDay(scale, 1);
      const gridWidth = pixelsPerDay * 60;
      const { x } = computeMilestoneLayout({
        milestoneDate,
        startDate,
        pixelsPerDay,
        gridWidth,
      });
      expect(x).toBeCloseTo(offsetDays * pixelsPerDay, 5);
    }
  });

  it("anchors zero-duration milestones at the exact date", () => {
    const milestoneDate = new Date("2024-01-01T00:00:00.000Z");
    const pixelsPerDay = getPixelsPerDay("week", 1);
    const gridWidth = pixelsPerDay * 30;

    const { x } = computeMilestoneLayout({
      milestoneDate,
      startDate,
      pixelsPerDay,
      gridWidth,
    });

    expect(x).toBeCloseTo(0, 5);
  });

  it("auto-positions milestone labels based on horizontal space", () => {
    const pixelsPerDay = getPixelsPerDay("day", 1);
    const gridWidth = pixelsPerDay * 14;
    const nearStart = new Date("2024-01-02T00:00:00.000Z");
    const nearEnd = new Date("2024-01-14T00:00:00.000Z");

    const leftResult = computeMilestoneLayout({
      milestoneDate: nearStart,
      startDate,
      pixelsPerDay,
      gridWidth,
    });
    const rightResult = computeMilestoneLayout({
      milestoneDate: nearEnd,
      startDate,
      pixelsPerDay,
      gridWidth,
    });

    expect(leftResult.labelSide).toBe("right");
    expect(rightResult.labelSide).toBe("left");
  });
});
