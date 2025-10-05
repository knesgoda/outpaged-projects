import { createReport, getReport } from "../reports";

jest.mock("@/integrations/supabase/client", () => {
  const from = jest.fn();
  const auth = { getUser: jest.fn() };
  const storage = { from: jest.fn() };
  return { supabase: { from, auth, storage } };
});

const { supabase } = jest.requireMock("@/integrations/supabase/client") as {
  supabase: {
    from: jest.Mock;
    auth: { getUser: jest.Mock };
  };
};

describe("reports service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("includes the owner when creating reports", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });

    const single = jest.fn().mockResolvedValue({
      data: { id: "r1", owner: "user-123", name: "Revenue", config: {} },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });

    supabase.from.mockImplementation(() => ({
      insert,
      select: jest.fn(),
      order: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }));

    await createReport({ name: "Revenue" });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "user-123", name: "Revenue" })
    );
    expect(single).toHaveBeenCalled();
  });

  it("filters getReport queries by id", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: "r1" }, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });

    supabase.from.mockImplementation(() => ({
      select,
    }));

    await getReport("report-9");

    expect(select).toHaveBeenCalledWith("*");
    expect(eq).toHaveBeenCalledWith("id", "report-9");
    expect(maybeSingle).toHaveBeenCalled();
  });
});
