import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import type { BacklogItemWithRelations } from "@/services/backlog";
import { mapBacklogRow } from "@/services/backlog";
import { mapSprintRow } from "@/services/sprints";

const backlogFixture = (): BacklogItemWithRelations => ({
  id: "00000000-0000-4000-a000-000000000101",
  title: "Revamp onboarding checklist",
  description: "Create contextual guidance for new teams onboarding to the platform.",
  status: "ready",
  priority: "high",
  story_points: 8,
  time_estimate_hours: 16,
  acceptance_criteria: [
    "Checklist covers setup",
    "Guidance adapts by role",
  ],
  business_value: 9,
  effort: 5,
  sprint_id: "00000000-0000-4000-a000-000000000010",
  rank: 1,
  created_at: "2024-04-01T00:00:00.000Z",
  updated_at: "2024-04-02T00:00:00.000Z",
  archived_at: null,
  backlog_history: [
    {
      id: "00000000-0000-4000-a000-000000000304",
      occurred_at: "2024-04-03T00:00:00.000Z",
      event_type: "rank_change",
      detail: "Rank adjusted to 3",
    },
    {
      id: "00000000-0000-4000-a000-000000000302",
      occurred_at: "2024-04-05T00:00:00.000Z",
      event_type: "moved_to_sprint",
      detail: "Committed to Sprint Alpha",
    },
  ],
  backlog_item_tags: [
    {
      backlog_tags: { name: "Platform" },
    },
    {
      backlog_tags: { name: "Customer" },
    },
  ],
  backlog_item_assignees: [
    {
      user_id: "user-1",
      profiles: {
        full_name: "Ada Lovelace",
        avatar_url: "https://example.com/avatar.png",
      },
    },
  ],
});

describe("backlog service mapping", () => {
  it("maps supabase rows into backlog items with history and tags", () => {
    const item = mapBacklogRow(backlogFixture());

    expect(item.id).toBe("00000000-0000-4000-a000-000000000101");
    expect(item.tags).toEqual(["Platform", "Customer"]);
    expect(item.history?.[0].type).toBe("moved_to_sprint");
    expect(item.assignee?.name).toBe("Ada Lovelace");
    expect(item.assignee?.initials).toBe("AL");
    expect(item.storyPoints).toBe(8);
    expect(item.rank).toBe(1);
  });
});

describe("sprint service mapping", () => {
  it("orders sprint backlog items by position", () => {
    const sprintRow = {
      id: "00000000-0000-4000-a000-000000000010",
      name: "Sprint Alpha",
      goal: "Stabilize onboarding flow",
      status: "active",
      start_date: "2024-04-01",
      end_date: "2024-04-14",
      capacity: 45,
      velocity_history: [30, 34, 36],
      member_capacity: { "Ada Lovelace": 15 },
      created_at: "2024-04-01T00:00:00.000Z",
      updated_at: "2024-04-04T00:00:00.000Z",
      sprint_items: [
        {
          id: "item-2",
          position: 2,
          committed_points: 13,
          backlog_items: {
            ...backlogFixture(),
            id: "00000000-0000-4000-a000-000000000103",
            title: "Improve billing proration",
            story_points: 13,
            rank: 3,
          },
        },
        {
          id: "item-1",
          position: 1,
          committed_points: 8,
          backlog_items: backlogFixture(),
        },
      ],
    } as any;

    const sprint = mapSprintRow(sprintRow);
    expect(sprint.items.map((item) => item.id)).toEqual([
      "00000000-0000-4000-a000-000000000101",
      "00000000-0000-4000-a000-000000000103",
    ]);
  });
});
