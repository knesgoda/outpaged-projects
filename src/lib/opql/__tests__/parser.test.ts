import {
  parseOPQL,
  FindStatement,
  BinaryExpression,
  HistoryPredicateExpression,
  TemporalPredicateExpression,
  IdentifierExpression,
  FunctionExpression,
  DateMathExpression,
  LiteralExpression,
} from "../parser";

describe("OPQL parser", () => {
  const parseWhere = (query: string) => {
    const statement = parseOPQL(query) as FindStatement;
    expect(statement.type).toBe("FIND");
    expect(statement.where).toBeDefined();
    return statement.where!;
  };

  it("parses text match operators", () => {
    const where = parseWhere(
      "FIND ITEMS FROM work_items WHERE title ~ 'roadmap'"
    ) as BinaryExpression;
    expect(where.kind).toBe("binary");
    expect(where.operator).toBe("~");
    expect((where.left as IdentifierExpression).name).toBe("title");
    expect((where.right as LiteralExpression).value).toBe("roadmap");
  });

  it("parses negated text match operators", () => {
    const where = parseWhere(
      "FIND ITEMS FROM work_items WHERE summary !~ 'spike'"
    ) as BinaryExpression;
    expect(where.operator).toBe("!~");
    expect((where.left as IdentifierExpression).name).toBe("summary");
  });

  it("parses null checks with EMPTY aliases", () => {
    const where = parseWhere(
      "FIND ITEMS FROM work_items WHERE resolved IS NOT EMPTY"
    ) as BinaryExpression;
    expect(where.operator).toBe("IS NOT EMPTY");
    expect((where.left as IdentifierExpression).name).toBe("completed");
  });

  it("parses history WAS predicates with qualifiers", () => {
    const where = parseWhere(
      "FIND ITEMS FROM work_items WHERE status WAS NOT IN ('Done', 'Closed') BY currentUser() BEFORE NOW() - 7d"
    ) as HistoryPredicateExpression;

    expect(where.kind).toBe("history");
    expect(where.verb).toBe("WAS");
    expect(where.negated).toBe(true);
    expect(where.comparison?.operator).toBe("NOT IN");
    expect(where.comparison?.values).toHaveLength(2);

    const byQualifier = where.qualifiers.find((qual) => qual.type === "BY");
    expect(byQualifier).toBeDefined();
    const byValue = (byQualifier as Extract<
      HistoryPredicateExpression["qualifiers"][number],
      { type: "BY" }
    >).value as FunctionExpression;
    expect(byValue.name).toBe("ME");

    const beforeQualifier = where.qualifiers.find(
      (qual) => qual.type === "BEFORE"
    );
    expect(beforeQualifier).toBeDefined();
    const beforeValue = (beforeQualifier as Extract<
      HistoryPredicateExpression["qualifiers"][number],
      { type: "BEFORE" }
    >).value as DateMathExpression;
    expect(beforeValue.kind).toBe("date_math");
    expect(beforeValue.operator).toBe("-");
  });

  it("parses history CHANGED predicates with change qualifiers", () => {
    const where = parseWhere(
      "FIND ITEMS FROM work_items WHERE status CHANGED TO \"Done\" FROM NOT IN ('Backlog', 'Todo') DURING (NOW() - 7d, NOW())"
    ) as HistoryPredicateExpression;

    expect(where.kind).toBe("history");
    expect(where.verb).toBe("CHANGED");

    const toQualifier = where.qualifiers.find((qual) => qual.type === "TO");
    expect(toQualifier).toBeDefined();
    const toValue = (toQualifier as Extract<
      HistoryPredicateExpression["qualifiers"][number],
      { type: "TO" }
    >).value as LiteralExpression;
    expect(toValue.value).toBe("Done");

    const fromQualifier = where.qualifiers.find(
      (qual) => qual.type === "FROM"
    );
    expect(fromQualifier).toBeDefined();
    const fromValues = (fromQualifier as Extract<
      HistoryPredicateExpression["qualifiers"][number],
      { type: "FROM" }
    >).values;
    expect(fromValues).toHaveLength(2);

    const duringQualifier = where.qualifiers.find(
      (qual) => qual.type === "DURING"
    );
    expect(duringQualifier).toBeDefined();
    const range = (duringQualifier as Extract<
      HistoryPredicateExpression["qualifiers"][number],
      { type: "DURING" }
    >);
    expect(range.start.kind).toBe("date_math");
    expect(range.end.kind).toBe("function");
  });

  it("parses temporal DURING predicates", () => {
    const where = parseWhere(
      "FIND ITEMS FROM work_items WHERE created DURING '2024-01-01' AND '2024-02-01'"
    ) as TemporalPredicateExpression;

    expect(where.kind).toBe("temporal");
    expect(where.operator).toBe("DURING");
    expect(where.range.start.kind).toBe("literal");
    expect(where.range.end.kind).toBe("literal");
  });

  it("parses BEFORE and AFTER comparisons", () => {
    const where = parseWhere(
      "FIND ITEMS FROM work_items WHERE due_date BEFORE NOW()"
    ) as BinaryExpression;

    expect(where.operator).toBe("BEFORE");
    expect((where.right as FunctionExpression).name).toBe("NOW");

    const afterWhere = parseWhere(
      "FIND ITEMS FROM work_items WHERE due_date AFTER '2024-01-01'"
    ) as BinaryExpression;
    expect(afterWhere.operator).toBe("AFTER");
  });

  it("parses ON comparisons", () => {
    const where = parseWhere(
      "FIND ITEMS FROM work_items WHERE due_date ON '2024-01-15'"
    ) as BinaryExpression;

    expect(where.operator).toBe("ON");
    expect((where.right as LiteralExpression).value).toBe("2024-01-15");
  });
});
