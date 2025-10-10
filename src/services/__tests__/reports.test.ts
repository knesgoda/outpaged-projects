import {
  enqueueFrom,
  enqueueRpc,
  resetSupabaseMocks,
  supabaseMock,
  utilsMocks,
} from "@/testing/supabaseHarness";
import {
  createReport,
  deleteReport,
  executeReport,
  getReport,
  listReports,
  runReport,
  updateReport,
} from "../reports";

describe("reports service", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    utilsMocks.requireUserIdMock.mockResolvedValue("user-123");
    utilsMocks.handleSupabaseErrorMock.mockImplementation((error: any, fallback: string) => {
      if (!error) {
        throw new Error(fallback);
      }
      if (error.code === "42501" || error.code === "PGRST301") {
        throw new Error("You do not have access");
      }
      throw new Error(error.message ?? fallback);
    });
  });

  const createListBuilder = (response: any) => {
    const order = jest.fn().mockResolvedValue(response);
    const afterSelect: any = {};
    afterSelect.order = order;
    afterSelect.eq = jest.fn().mockReturnValue(afterSelect);
    return { builder: { select: jest.fn().mockReturnValue(afterSelect) }, order, eq: afterSelect.eq };
  };

  it("lists reports with optional project filter", async () => {
    const rows = [
      {
        id: "r-1",
        owner: "user-123",
        name: "Velocity",
        description: "Team velocity",
        config: { source: "tasks" },
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
        project_id: null,
      },
    ];

    const { builder, order, eq } = createListBuilder({ data: rows, error: null });
    enqueueFrom("reports", builder);

    const result = await listReports();

    expect(result).toEqual(rows);
    expect(order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(eq).not.toHaveBeenCalled();

    const second = createListBuilder({ data: rows, error: null });
    enqueueFrom("reports", second.builder);

    await listReports("project-42");
    expect(second.eq).toHaveBeenCalledWith("project_id", "project-42");
  });

  it("returns a single report", async () => {
    const row = {
      id: "report-1",
      owner: "user-123",
      name: "Tasks",
      description: null,
      config: { source: "tasks" },
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-02T00:00:00.000Z",
      project_id: "project-1",
    };

    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const afterEq: any = { maybeSingle };
    const eq = jest.fn().mockReturnValue(afterEq);
    const select = jest.fn().mockReturnValue({ eq });
    enqueueFrom("reports", { select });

    const result = await getReport("report-1");
    expect(result).toEqual(row);
    expect(eq).toHaveBeenCalledWith("id", "report-1");
    expect(maybeSingle).toHaveBeenCalled();
  });

  it("creates a report for the current user", async () => {
    const inserted = {
      id: "report-1",
      owner: "user-123",
      name: "Cycle Time",
      description: "Recent cycle time",
      config: { source: "tasks" },
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      project_id: null,
    };

    const single = jest.fn().mockResolvedValue({ data: inserted, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    enqueueFrom("reports", { insert });

    const result = await createReport({ name: "Cycle Time", description: "Recent cycle time" });

    expect(insert).toHaveBeenCalledWith({
      owner: "user-123",
      name: "Cycle Time",
      description: "Recent cycle time",
      project_id: null,
      config: {},
    });
    expect(result).toEqual(inserted);
  });

  it("updates a report", async () => {
    const updated = {
      id: "report-1",
      owner: "user-123",
      name: "Refined",
      description: "Trimmed",
      config: { source: "tasks" },
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-02-01T00:00:00.000Z",
      project_id: null,
    };

    const single = jest.fn().mockResolvedValue({ data: updated, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    enqueueFrom("reports", { update });

    const result = await updateReport("report-1", { name: " Refined  ", description: " Trimmed " });

    expect(update).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "report-1");
    expect(select).toHaveBeenCalledWith(
      "id, owner, project_id, name, description, config, created_at, updated_at"
    );
    expect(result).toEqual(updated);
  });

  it("deletes a report", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const remove = jest.fn().mockReturnValue({ eq });
    enqueueFrom("reports", { delete: remove });

    await deleteReport("report-9");

    expect(remove).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "report-9");
  });

  it("executes a report via rpc", async () => {
    enqueueRpc(
      "execute_report",
      Promise.resolve({
        data: {
          columns: [
            { key: "status", label: "Status" },
            { key: "count", label: "Count", type: "number" },
          ],
          rows: [
            { status: "todo", count: 5 },
            { status: "in_progress", count: 3 },
          ],
          meta: { total: 8 },
        },
        error: null,
      })
    );

    const result = await executeReport("report-1", { projectId: "project-1" });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("execute_report", {
      report_id: "report-1",
      run_params: { projectId: "project-1" },
    });
    expect(result.rows).toHaveLength(2);
    expect(result.columns).toEqual([
      { key: "status", label: "Status", type: null, format: null },
      { key: "count", label: "Count", type: "number", format: null },
    ]);
    expect(result.meta.total).toBe(8);
  });

  it("falls back to cached results when rpc returns empty data", async () => {
    enqueueRpc(
      "execute_report",
      Promise.resolve({ data: { columns: [], rows: [], meta: { total: 0 } }, error: null })
    );

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        columns: [
          { key: "title", label: "Title" },
          { key: "status", label: "Status" },
        ],
        rows: [
          { title: "Task A", status: "todo" },
          { title: "Task B", status: "done" },
        ],
        meta: { total: 2 },
      },
      error: null,
    });

    const afterLimit: any = { maybeSingle };
    const limit = jest.fn().mockReturnValue(afterLimit);
    const order = jest.fn().mockReturnValue({ limit, maybeSingle });
    const eq = jest.fn().mockReturnValue({ order, limit, maybeSingle });
    const select = jest.fn().mockReturnValue({ eq, order, limit, maybeSingle });
    enqueueFrom("report_runs", { select });

    const result = await executeReport("report-1");
    expect(result.rows).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(select).toHaveBeenCalledWith("columns, rows, meta");
  });

  it("runs a report from shorthand input", async () => {
    enqueueRpc(
      "execute_report",
      Promise.resolve({
        data: { columns: [], rows: [{ id: 1 }], meta: { total: 1 } },
        error: null,
      })
    );

    await runReport("report-7", { limit: 5 });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("execute_report", {
      report_id: "report-7",
      run_params: { limit: 5 },
    });
  });

  it("runs a report from object input and merges params", async () => {
    enqueueRpc(
      "execute_report",
      Promise.resolve({
        data: { columns: [], rows: [{ id: 1 }], meta: { total: 1 } },
        error: null,
      })
    );

    await runReport({ reportId: "report-42", params: { limit: 10 } }, { projectId: "project-5" });

    expect(supabaseMock.rpc).toHaveBeenLastCalledWith("execute_report", {
      report_id: "report-42",
      run_params: { projectId: "project-5", limit: 10 },
    });
  });
});
