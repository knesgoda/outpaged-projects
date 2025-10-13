jest.mock("@/services/utils", () => {
  const actual = jest.requireActual("@/services/utils");
  return {
    ...actual,
    requireUserId: jest.fn().mockResolvedValue("user-123"),
  };
});

import {
  createReport,
  deleteReport,
  executeReport,
  getReport,
  listReports,
  runReport,
  updateReport,
  previewReportQuery,
} from "@/services/reports";
import { opqlQueryStore } from "@/server/search/queryStore";

const SAMPLE_DATASET = {
  opql: "FIND * FROM ITEMS WHERE project = 'proj-operations' ORDER BY updated DESC LIMIT 5",
  entityTypes: ["task"],
  parameters: [],
  defaultLimit: 5,
};

const SAMPLE_VISUALIZATION = {
  type: "table" as const,
  groupBy: ["title"],
  metrics: ["updated_at"],
};

describe("reports service", () => {
  it("lists seeded reports", async () => {
    const reports = await listReports();
    expect(reports.length).toBeGreaterThan(0);
    const seeded = reports.find((report) => report.name === "At-risk work by assignee");
    expect(seeded).toBeDefined();
    expect(seeded?.config.dataset.opql).toContain("AGGREGATE COUNT()");
  });

  it("creates, updates, and deletes a report", async () => {
    const report = await createReport({
      name: "Velocity",
      description: "Team velocity by week",
      projectId: "proj-operations",
      config: {
        dataset: SAMPLE_DATASET,
        visualization: SAMPLE_VISUALIZATION,
        lineage: { fields: ["title"], sourceQueries: [SAMPLE_DATASET.opql] },
      },
    });

    expect(report.name).toBe("Velocity");
    expect(report.config.dataset.opql).toBe(SAMPLE_DATASET.opql);

    const updated = await updateReport(report.id, {
      name: "Velocity (updated)",
      description: "Updated description",
      config: {
        dataset: {
          ...SAMPLE_DATASET,
          opql: "FIND * FROM ITEMS WHERE status != 'Done' ORDER BY updated DESC LIMIT 3",
        },
        visualization: SAMPLE_VISUALIZATION,
        lineage: { fields: ["status"], sourceQueries: ["status != 'Done'"] },
      },
    });

    expect(updated.name).toBe("Velocity (updated)");
    expect(updated.description).toBe("Updated description");
    expect(updated.config.dataset.opql).toContain("status != 'Done'");

    await deleteReport(report.id);
    const removed = await getReport(report.id);
    expect(removed).toBeNull();
  });

  it("executes a report and returns table data", async () => {
    const seeded = opqlQueryStore.listReports("workspace-demo")[0]!;
    const result = await executeReport(seeded.id);
    expect(result.columns.length).toBeGreaterThan(0);
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.meta.renderedOpql).toContain("AGGREGATE");
  });

  it("runs a report with merged parameters", async () => {
    const created = await createReport({
      name: "Assigned work",
      config: {
        dataset: {
          opql: "FIND * FROM ITEMS WHERE assignee = '{{owner}}'",
          entityTypes: ["task"],
          parameters: [{ token: "owner", label: "Owner", defaultValue: "owner-1" }],
          defaultLimit: 10,
        },
        visualization: { type: "table", metrics: ["updated_at"] },
      },
    });

    const result = await runReport({ reportId: created.id, params: { owner: "owner-1" } });
    expect(result.meta.renderedOpql).toContain("owner-1");
    await deleteReport(created.id);
  });

  it("previews arbitrary OPQL queries", async () => {
    const results = await previewReportQuery("FIND * FROM ITEMS LIMIT 2", { types: ["task"] });
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
