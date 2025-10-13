import {
  collectQueryParameters,
  opqlToQuery,
  queryToOpql,
} from "../builder";

describe("opql query builder", () => {
  it("round trips complex aggregate statements", () => {
    const opql =
      "AGGREGATE COUNT(*) AS total, SUM(duration) AS total_duration FROM ITEMS WHERE status = 'open' AND project = :project GROUP BY assignee HAVING COUNT(*) > 3 ORDER BY total DESC NULLS LAST LIMIT 25 OFFSET 5";
    const parsed = opqlToQuery(opql);
    expect(queryToOpql(parsed)).toBe(opql);
  });

  it("collects parameters across query clauses", () => {
    const query = opqlToQuery(
      "FIND * FROM ITEMS WHERE status = :status AND updated_at >= :start ORDER BY updated_at DESC LIMIT :limit"
    );
    const parameters = collectQueryParameters(query);
    expect(parameters).toEqual(expect.arrayContaining([":status", ":start", ":limit"]));
  });

  it("ignores literal colons when extracting parameters", () => {
    const query = opqlToQuery(
      "FIND * FROM ITEMS WHERE description = 'literal :value' AND priority = :priority"
    );
    const parameters = collectQueryParameters(query);
    expect(parameters).toContain(":priority");
    expect(parameters).not.toContain(":value");
    expect(parameters).toHaveLength(1);
  });

  it("handles parameters embedded inside function arguments", () => {
    const opql = "FIND * FROM ITEMS WHERE concat('prefix-', :identifier) = slug";
    const query = opqlToQuery(opql);
    expect(collectQueryParameters(query)).toEqual([":identifier"]);
    expect(queryToOpql(query)).toContain(":identifier");
  });
});
