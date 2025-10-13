import { parseOPQL, type FindStatement } from "@/lib/opql/parser";
import { QueryEngine } from "@/server/search/queryEngine";
import { MockSearchRepository, type RepositoryRow } from "@/server/search/repository";

const principal = {
  principalId: "user-test",
  workspaceId: "workspace-demo",
  roles: ["member"],
  permissions: ["search.execute"],
  allowAll: true,
};

const historyRow: RepositoryRow = {
  entityId: "task-history",
  entityType: "task",
  workspaceId: "workspace-demo",
  score: 1,
  values: {
    title: "Historical state validation",
    snippet: "Synthetic task with a full change log",
    url: "/tasks/task-history",
    project_id: "proj-history",
    updated_at: "2024-01-20T00:00:00Z",
    searchable: "historical state validation synthetic task",
    status: "Done",
    assignee: "user:ben",
  },
  history: {
    initial: {
      at: "2024-01-01T08:00:00Z",
      actor: "system",
      values: {
        status: "New",
        assignee: "user:ava",
      },
    },
    events: [
      {
        at: "2024-01-05T09:15:00Z",
        actor: "user:ava",
        changes: [{ field: "status", from: "New", to: "In Progress" }],
      },
      {
        at: "2024-01-10T14:30:00Z",
        actor: "user:ben",
        changes: [{ field: "status", from: "In Progress", to: "Review" }],
      },
      {
        at: "2024-01-12T11:00:00Z",
        actor: "user:ava",
        changes: [{ field: "assignee", from: "user:ava", to: "user:ben" }],
      },
      {
        at: "2024-01-15T18:45:00Z",
        actor: "user:ava",
        changes: [{ field: "status", from: "Review", to: "Done" }],
      },
    ],
  },
};

const repository = new MockSearchRepository({ rows: [historyRow] });
const engine = new QueryEngine({ repository });

const execute = async (opql: string) => {
  const statement = parseOPQL(opql) as FindStatement;
  return engine.execute({
    workspaceId: "workspace-demo",
    principal,
    statement,
    explain: true,
  });
};

describe("QueryEngine history evaluation", () => {
  it("matches WAS predicates within DURING windows", async () => {
    const execution = await execute(
      "FIND * FROM task WHERE status WAS \"In Progress\" DURING ('2024-01-01T00:00:00Z', '2024-01-11T00:00:00Z')"
    );

    expect(execution.total).toBe(1);
    expect(execution.rows[0]?.values.status).toBe("Done");
    const scan = execution.historyScans?.find((entry) => entry.field.toLowerCase() === "status");
    expect(scan?.matched).toBe(true);
    expect(scan?.segments.some((segment) => segment.value === "In Progress")).toBe(true);
  });

  it("supports WAS NOT predicates over historical segments", async () => {
    const execution = await execute(
      "FIND * FROM task WHERE status WAS NOT \"Done\" DURING ('2024-01-01T00:00:00Z', '2024-01-04T23:59:59Z')"
    );

    expect(execution.total).toBe(1);
    const scan = execution.historyScans?.find((entry) => entry.field.toLowerCase() === "status");
    expect(scan?.matched).toBe(true);
    expect(scan?.segments.every((segment) => segment.value !== "Done")).toBe(true);
  });

  it("evaluates CHANGED qualifiers with FROM, TO, and BY filters", async () => {
    const execution = await execute(
      "FIND * FROM task WHERE status CHANGED FROM \"In Progress\" TO \"Review\" BY 'user:ben'"
    );

    expect(execution.total).toBe(1);
    const scan = execution.historyScans?.find((entry) => entry.verb === "CHANGED");
    expect(scan?.matched).toBe(true);
    const change = scan?.segments[0];
    expect(change?.from).toBe("In Progress");
    expect(change?.to).toBe("Review");
    expect(change?.actor).toBe("user:ben");
  });

  it("filters CHANGED predicates by DURING windows", async () => {
    const execution = await execute(
      "FIND * FROM task WHERE assignee CHANGED DURING ('2024-01-11T00:00:00Z', '2024-01-13T00:00:00Z')"
    );

    expect(execution.total).toBe(1);
    const scan = execution.historyScans?.find((entry) => entry.field.toLowerCase() === "assignee");
    expect(scan?.matched).toBe(true);
    expect(scan?.segments[0]?.from).toBe("user:ava");
    expect(scan?.segments[0]?.to).toBe("user:ben");
  });

  it("excludes records when history predicates do not match", async () => {
    const execution = await execute(
      "FIND * FROM task WHERE status WAS \"Cancelled\""
    );

    expect(execution.total).toBe(0);
    expect(execution.historyScans?.some((entry) => entry.matched)).toBe(false);
  });
});
