import { supabase } from "@/integrations/supabase/client";
import { replaceTaskAssignees, updateTaskFields } from "@/services/tasksService";

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

const mockFrom = supabase.from as jest.Mock;

describe("task mutation helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates task fields with sanitized dates", async () => {
    const updateMock = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockFrom.mockReturnValue(updateMock);

    await updateTaskFields("task-1", { due_date: "2024-01-01" });

    expect(mockFrom).toHaveBeenCalledWith("tasks");
    expect(updateMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        due_date: expect.stringContaining("2024-01-01"),
      })
    );
    expect(updateMock.eq).toHaveBeenCalledWith("id", "task-1");
  });

  it("replaces task assignees", async () => {
    const deleteMock = {
      delete: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockFrom.mockReturnValueOnce(deleteMock);
    mockFrom.mockReturnValueOnce(deleteMock);

    await replaceTaskAssignees("task-2", ["user-1", "user-2"]);

    expect(mockFrom).toHaveBeenNthCalledWith(1, "task_assignees");
    expect(deleteMock.delete).toHaveBeenCalled();
    expect(deleteMock.eq).toHaveBeenCalledWith("task_id", "task-2");

    expect(mockFrom).toHaveBeenNthCalledWith(2, "task_assignees");
    expect(deleteMock.insert).toHaveBeenCalledWith([
      { task_id: "task-2", user_id: "user-1" },
      { task_id: "task-2", user_id: "user-2" },
    ]);
  });
});

