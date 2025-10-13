import { compileJql } from "../jqlCompiler";
import { formatExpression, type FindStatement } from "../parser";

describe("JQL compiler", () => {
  it("compiles simple field predicates", () => {
    const input = 'project = "OPS" AND status != Done ORDER BY created DESC';
    const result = compileJql(input);

    expect(result.original).toBe(input.trim());
    expect(result.opql).toBe(
      'FIND ITEMS FROM work_items WHERE project_key = "OPS" AND status != "Done" ORDER BY created_at DESC'
    );
    const statement = result.statement as FindStatement;
    expect(formatExpression(statement.where!)).toBe("project_key = 'OPS' AND status != 'Done'");
    expect(statement.orderBy?.[0]).toEqual({
      expression: { kind: "identifier", name: "created_at" },
      direction: "DESC",
    });
  });

  it("compiles history predicates with qualifiers", () => {
    const result = compileJql('status WAS "In Progress" BY currentUser()');

    expect(result.opql).toBe(
      'FIND ITEMS FROM work_items WHERE history(status) = "In Progress" AND changed_by(status, current_user())'
    );
    const where = (result.statement as FindStatement).where!;
    expect(formatExpression(where)).toBe(
      "history(status) = 'In Progress' AND changed_by(status, current_user())"
    );
  });

  it("translates date math functions", () => {
    const result = compileJql('updated >= startOfDay(-5d)');

    expect(result.opql).toBe('FIND ITEMS FROM work_items WHERE updated_at >= start_of_day(-5d)');
    const statement = result.statement as FindStatement;
    expect(formatExpression(statement.where!)).toBe('updated_at >= start_of_day(- 5d)');
  });

  it("normalises custom field aliases", () => {
    const result = compileJql('cf[12345] ~ "expansion"');

    expect(result.opql).toBe('FIND ITEMS FROM work_items WHERE contains(custom.cf_12345, "expansion")');
    const statement = result.statement as FindStatement;
    expect(formatExpression(statement.where!)).toBe("contains(custom.cf_12345, 'expansion')");
  });
});

