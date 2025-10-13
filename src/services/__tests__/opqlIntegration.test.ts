import { searchAll } from "../search";
import { previewBoardQuery } from "@/services/boards/filterService";
import { previewReportQuery } from "@/services/reports";
import { previewDashboardQuery } from "@/server/analytics/engine";

describe("OPQL integration", () => {
  it("returns consistent results across search, board, and analytics services", async () => {
    const opql = "FIND * FROM task WHERE project_id = 'proj-operations' ORDER BY updated_at DESC LIMIT 3";

    const searchResult = await searchAll({ q: opql, types: ["task"] });
    const boardResult = await previewBoardQuery(opql, { types: ["task"] });
    const reportResult = await previewReportQuery(opql, { types: ["task"] });
    const dashboardResult = await previewDashboardQuery(opql, { types: ["task"] });

    const expectedIds = searchResult.items.map((item) => item.id);
    expect(boardResult.map((item) => item.id)).toEqual(expectedIds);
    expect(reportResult.map((item) => item.id)).toEqual(expectedIds);
    expect(dashboardResult.map((item) => item.id)).toEqual(expectedIds);
  });

  it("orders multi-entity results consistently", async () => {
    const opql = "FIND * FROM documents WHERE project_id = 'proj-operations' ORDER BY updated_at DESC LIMIT 5";

    const searchResult = await searchAll({ q: opql, types: ["task", "doc", "project"] });
    const boardResult = await previewBoardQuery(opql, { types: ["task", "doc", "project"] });
    const reportResult = await previewReportQuery(opql, { types: ["task", "doc", "project"] });
    const dashboardResult = await previewDashboardQuery(opql, { types: ["task", "doc", "project"] });

    const ordered = searchResult.items.map((item) => item.updated_at ?? "");
    const sorted = [...ordered].sort((a, b) => (b ?? "").localeCompare(a ?? ""));
    expect(ordered).toEqual(sorted);
    const boardIds = boardResult.map((item) => item.id);
    const reportIds = reportResult.map((item) => item.id);
    const dashboardIds = dashboardResult.map((item) => item.id);
    expect(boardIds).toEqual(searchResult.items.map((item) => item.id));
    expect(reportIds).toEqual(searchResult.items.map((item) => item.id));
    expect(dashboardIds).toEqual(searchResult.items.map((item) => item.id));
  });
});
