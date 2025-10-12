import {
  SearchAbuseError,
  deleteSavedSearch,
  getSearchDiagnostics,
  listSavedSearches,
  searchAll,
  upsertSavedSearch,
  validateOpql,
} from "../search";

describe("search service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("executes a query across multiple entity types", async () => {
    const result = await searchAll({ q: "search", types: ["task", "project", "doc"] });
    expect(result.items.length).toBeGreaterThan(0);
    const types = new Set(result.items.map((item) => item.type));
    expect(types).toEqual(new Set(["project", "task", "doc"]));
    expect(result.partial).toBe(false);
  });

  it("honours includeComments flag", async () => {
    const withComments = await searchAll({ q: "audit", includeComments: true });
    const withoutComments = await searchAll({ q: "audit", includeComments: false });
    expect(withComments.items.some((item) => item.type === "comment")).toBe(true);
    expect(withoutComments.items.some((item) => item.type === "comment")).toBe(false);
  });

  it("marks partial results when a next cursor is provided", async () => {
    const result = await searchAll({ q: "search", limit: 1 });
    expect(result.partial).toBe(true);
  });

  it("validates OPQL and returns caret for errors", () => {
    const valid = validateOpql("search type:task");
    expect(valid.valid).toBe(true);

    const invalid = validateOpql("search (type:task");
    expect(invalid.valid).toBe(false);
    if (!invalid.valid) {
      expect(invalid.caret.includes("^")).toBe(true);
      expect(invalid.error).toMatch(/Unmatched/);
    }
  });

  it("manages saved searches through the API", () => {
    const before = listSavedSearches();
    const created = upsertSavedSearch({ name: "Throttled queries", opql: "search rate", filters: { types: ["task"] } });
    const afterCreate = listSavedSearches();
    expect(afterCreate.length).toBe(before.length + 1);
    expect(afterCreate.some((entry) => entry.id === created.id)).toBe(true);

    deleteSavedSearch(created.id);
    const afterDelete = listSavedSearches();
    expect(afterDelete.length).toBe(before.length);
  });

  it("exposes diagnostics snapshot", () => {
    const diagnostics = getSearchDiagnostics();
    expect(diagnostics.indexFreshnessMinutes).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(diagnostics.hottestQueries)).toBe(true);
  });

  it("throws abuse error when rate limit exceeded", async () => {
    const promises = Array.from({ length: 12 }, () => searchAll({ q: "rate", timeoutMs: 1000 }));
    const results = await Promise.allSettled(promises);
    const rejection = results.find((entry) => entry.status === "rejected");
    expect(rejection).toBeDefined();
    if (rejection && rejection.status === "rejected") {
      expect(rejection.reason).toBeInstanceOf(SearchAbuseError);
    }
  });
});
