import { enqueueFrom, resetSupabaseMocks, utilsMocks } from "@/testing/supabaseHarness";
import { createReport, getReport } from "../reports";

describe("reports service", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    utilsMocks.requireUserIdMock.mockResolvedValue("user-123");
  });

  it("creates reports with the current user as owner", async () => {
    const insertMock = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: {
            id: "report-1",
            owner: "user-123",
            name: "Quarterly",
            description: "Planning",
            config: { foo: "bar" },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      })),
    }));

    enqueueFrom("reports", {
      insert: insertMock,
    });

    const report = await createReport({ name: "Quarterly", description: "Planning", config: { foo: "bar" } });

    expect(insertMock).toHaveBeenCalledWith({
      owner: "user-123",
      name: "Quarterly",
      description: "Planning",
      config: { foo: "bar" },
    });
    expect(report.owner).toBe("user-123");
  });

  it("queries reports by id when fetching details", async () => {
    const eqMock = jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "report-9",
          owner: "user-123",
          name: "KPI",
          description: null,
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    });

    enqueueFrom("reports", {
      select: jest.fn().mockReturnValue({
        eq: eqMock,
      }),
    });

    await getReport("report-9");

    expect(eqMock).toHaveBeenCalledWith("id", "report-9");
  });
});
