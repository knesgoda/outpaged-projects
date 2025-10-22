import { supabase } from "@/integrations/supabase/client";
import { fetchBacklogItems, getBacklogStats } from "../backlogService";

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("backlogService", () => {
  const mockFrom = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("filters backlog items by sprint and status keys", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: "task-1" }],
      error: null,
    });

    const queryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order,
    };

    mockFrom.mockReturnValue(queryBuilder);

    const items = await fetchBacklogItems("project-1", ["backlog", "ready"]);

    expect(mockFrom).toHaveBeenCalledWith("tasks");
    expect(queryBuilder.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(queryBuilder.is).toHaveBeenCalledWith("sprint_id", null);
    expect(queryBuilder.in).toHaveBeenCalledWith("status", ["backlog", "ready"]);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(items).toEqual([{ id: "task-1" }]);
  });

  it("skips status filtering when no backlog statuses are configured", async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });

    const queryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order,
    };

    mockFrom.mockReturnValue(queryBuilder);

    const items = await fetchBacklogItems("project-2", []);

    expect(queryBuilder.in).not.toHaveBeenCalled();
    expect(order).toHaveBeenCalled();
    expect(items).toEqual([]);
  });

  it("aggregates stats for mixed backlog statuses", async () => {
    const dataset = [
      { id: "task-1", story_points: 3, estimate_hours: 5, priority: "high" },
      { id: "task-2", story_points: null, estimate_hours: 2, priority: "urgent" },
      { id: "task-3", story_points: 1, estimate_hours: null, priority: "medium" },
    ];

    const order = jest.fn().mockResolvedValue({ data: dataset, error: null });

    const queryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order,
    };

    mockFrom.mockReturnValue(queryBuilder);

    const stats = await getBacklogStats("project-3", ["backlog", "ready"]);

    expect(queryBuilder.in).toHaveBeenCalledWith("status", ["backlog", "ready"]);
    expect(stats).toEqual({
      totalItems: 3,
      totalPoints: 4,
      totalHours: 7,
      byPriority: {
        urgent: 1,
        high: 1,
        medium: 1,
        low: 0,
      },
    });
  });

  it("reuses provided backlog items when calculating stats", async () => {
    const dataset = [
      { id: "task-10", story_points: 2, estimate_hours: 4, priority: "low" },
      { id: "task-11", story_points: 5, estimate_hours: 3, priority: "high" },
    ];

    const stats = await getBacklogStats("project-4", ["backlog"], dataset);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(stats).toEqual({
      totalItems: 2,
      totalPoints: 7,
      totalHours: 7,
      byPriority: {
        urgent: 0,
        high: 1,
        medium: 0,
        low: 1,
      },
    });
  });
});
