// @ts-nocheck
/*
 * OPQL parser module supporting FIND/COUNT/AGGREGATE/UPDATE/EXPLAIN statements.
 * The parser is intentionally strict about keywords while retaining flexible
 * expression parsing so that new operators/functions can be introduced without
 * touching the core grammar.  The design favors producing a rich AST that can
 * be consumed by query planners, analyzers, and explain pipelines.
 */

import { OPQL_SYNONYM_CORPUS } from "@/data/opqlDictionaries";

export type StatementType = "FIND" | "COUNT" | "AGGREGATE" | "UPDATE" | "EXPLAIN";

export type LogicalOperator = "AND" | "OR";

export type ComparisonOperator =
  | "="
  | "!="
  | "<>"
  | "<"
  | "<="
  | ">"
  | ">="
  | "IN"
  | "NOT IN"
  | "MATCH"
  | "LIKE"
  | "CONTAINS"
  | "BETWEEN"
  | "~"
  | "!~"
  | "IS"
  | "IS NOT"
  | "IS EMPTY"
  | "IS NOT EMPTY"
  | "IS NULL"
  | "IS NOT NULL"
  | "BEFORE"
  | "AFTER"
  | "ON"
  | "DURING";

export type ArithmeticOperator = "+" | "-" | "*" | "/" | "%";

export type OrderDirection = "ASC" | "DESC";

export type NullsOrder = "FIRST" | "LAST";

export type DurationUnit = "s" | "m" | "h" | "d" | "w" | "mo" | "y";

export interface IdentifierExpression {
  kind: "identifier";
  name: string;
  path?: string[];
}

export interface LiteralExpression {
  kind: "literal";
  value: string | number | boolean | null;
  valueType: "string" | "number" | "boolean" | "null";
}

export interface DurationExpression {
  kind: "duration";
  value: number;
  unit: DurationUnit;
}

export interface DateMathExpression {
  kind: "date_math";
  base: Expression;
  operator: "+" | "-";
  offset: DurationExpression;
}

export interface UnaryExpression {
  kind: "unary";
  operator: "NOT" | "-";
  operand: Expression;
}

export interface BinaryExpression {
  kind: "binary";
  operator: ComparisonOperator | ArithmeticOperator | LogicalOperator;
  left: Expression;
  right: Expression;
}

export type HistoryVerb = "WAS" | "CHANGED";

export type HistoryQualifier =
  | { type: "BY" | "AFTER" | "BEFORE" | "ON"; value: Expression }
  | {
      type: "TO" | "FROM";
      operator: ComparisonOperator;
      value?: Expression;
      values?: Expression[];
    }
  | { type: "DURING"; start: Expression; end: Expression };

export interface HistoryPredicateExpression {
  kind: "history";
  field: Expression;
  verb: HistoryVerb;
  negated?: boolean;
  comparison?: {
    operator: ComparisonOperator;
    value?: Expression;
    values?: Expression[];
  };
  qualifiers: HistoryQualifier[];
}

export interface TemporalPredicateExpression {
  kind: "temporal";
  operator: "DURING";
  value: Expression;
  range: { start: Expression; end: Expression };
}

export interface BetweenExpression {
  kind: "between";
  value: Expression;
  lower: Expression;
  upper: Expression;
  negated?: boolean;
}

export interface InExpression {
  kind: "in";
  value: Expression;
  options: Expression[];
  negated?: boolean;
}

export interface FunctionExpression {
  kind: "function";
  name: string;
  args: Expression[];
}

export type Expression =
  | IdentifierExpression
  | LiteralExpression
  | DurationExpression
  | DateMathExpression
  | UnaryExpression
  | BinaryExpression
  | BetweenExpression
  | InExpression
  | FunctionExpression
  | HistoryPredicateExpression
  | TemporalPredicateExpression;

export interface ProjectionField {
  expression: Expression;
  alias?: string;
}

export interface RelationSpec {
  relation: string;
  direction?: "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";
  depth?: number;
}

export interface OrderByField {
  expression: Expression;
  direction: OrderDirection;
  nulls?: NullsOrder;
}

export interface SecurityDirective {
  policy?: string;
  sensitivity?: "public" | "internal" | "confidential" | "restricted";
  requireTenantBoundary?: boolean;
  denyList?: string[];
  allowList?: string[];
}

export interface JoinSpec {
  type: "INNER" | "LEFT" | "RIGHT" | "FULL";
  source: string;
  alias?: string;
  condition: Expression;
}

export interface BaseStatement {
  type: StatementType;
  source?: string;
  alias?: string;
  joins?: JoinSpec[];
  relations?: RelationSpec[];
  where?: Expression;
  orderBy?: OrderByField[];
  limit?: number;
  cursor?: string;
  offset?: number;
  security?: SecurityDirective;
  stableBy?: Expression[];
}

export interface FindStatement extends BaseStatement {
  type: "FIND";
  projections: ProjectionField[];
  distinct?: boolean;
}

export interface CountStatement extends BaseStatement {
  type: "COUNT";
  distinct?: boolean;
  projections?: ProjectionField[];
}

export interface AggregateExpression {
  function: string;
  expression: Expression;
  alias?: string;
}

export interface AggregateStatement extends BaseStatement {
  type: "AGGREGATE";
  aggregates: AggregateExpression[];
  groupBy?: Expression[];
  having?: Expression;
}

export interface UpdateAssignment {
  field: IdentifierExpression;
  value: Expression;
}

export interface UpdateStatement extends BaseStatement {
  type: "UPDATE";
  assignments: UpdateAssignment[];
  returning?: ProjectionField[];
}

export interface ExplainStatement {
  type: "EXPLAIN";
  target: Statement;
  verbose?: boolean;
}

export type Statement =
  | FindStatement
  | CountStatement
  | AggregateStatement
  | UpdateStatement
  | ExplainStatement;

interface TokenBase {
  type: TokenType;
  value: string;
  position: number;
}

type TokenType =
  | "identifier"
  | "string"
  | "number"
  | "operator"
  | "keyword"
  | "comma"
  | "dot"
  | "lparen"
  | "rparen"
  | "arrow"
  | "colon"
  | "asterisk";

const KEYWORDS = new Set(
  [
    "FIND",
    "COUNT",
    "AGGREGATE",
    "UPDATE",
    "EXPLAIN",
    "FROM",
    "AS",
    "JOIN",
    "LEFT",
    "RIGHT",
    "FULL",
    "INNER",
    "OUTER",
    "ON",
    "WHERE",
    "AND",
    "OR",
    "NOT",
    "IN",
    "BETWEEN",
    "RELATE",
    "ORDER",
    "BY",
    "ASC",
    "DESC",
    "NULLS",
    "FIRST",
    "LAST",
    "LIMIT",
    "OFFSET",
    "AFTER",
    "CURSOR",
    "GROUP",
    "HAVING",
    "SET",
    "RETURNING",
    "DISTINCT",
    "SECURE",
    "POLICY",
    "SENSITIVITY",
    "REQUIRE",
    "BOUNDARY",
    "ALLOW",
    "DENY",
    "STABLE",
    "GRAPH",
    "DEPTH",
    "CAP",
    "PAGINATE",
    "PAGE",
    "WITH",
    "VERBOSE",
    "PROJECT",
    "IS",
    "EMPTY",
    "NULL",
    "WAS",
    "CHANGED",
    "BY",
    "TO",
    "FROM",
    "BEFORE",
    "DURING",
  ] as const
);

const OPERATORS = new Set([
  "=",
  "!=",
  "<>",
  "<",
  "<=",
  ">",
  ">=",
  "~",
  "+",
  "-",
  "*",
  "/",
  "%",
  "::",
]);

const MULTI_CHAR_OPERATORS = ["!=", "<>", "<=", ">=", "::", "!~"];

const FIELD_ALIASES: Record<string, string> = {
  resolved: "completed",
};

const FUNCTION_ALIASES: Record<string, string> = {
  currentuser: "ME",
  "current_user": "ME",
};

class Lexer {
  private input: string;
  private position = 0;
  private tokens: TokenBase[] = [];

  constructor(input: string) {
    this.input = input;
    this.tokenize();
  }

  private tokenize() {
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (/\s/u.test(char)) {
        this.position += 1;
        continue;
      }

      if (char === ",") {
        this.tokens.push({ type: "comma", value: ",", position: this.position });
        this.position += 1;
        continue;
      }

      if (char === ".") {
        this.tokens.push({ type: "dot", value: ".", position: this.position });
        this.position += 1;
        continue;
      }

      if (char === "(") {
        this.tokens.push({ type: "lparen", value: "(", position: this.position });
        this.position += 1;
        continue;
      }

      if (char === ")") {
        this.tokens.push({ type: "rparen", value: ")", position: this.position });
        this.position += 1;
        continue;
      }

      if (char === "*") {
        this.tokens.push({ type: "asterisk", value: "*", position: this.position });
        this.position += 1;
        continue;
      }

      if (char === ":") {
        if (this.input[this.position + 1] === ":") {
          this.tokens.push({ type: "operator", value: "::", position: this.position });
          this.position += 2;
        } else {
          this.tokens.push({ type: "colon", value: ":", position: this.position });
          this.position += 1;
        }
        continue;
      }

      if (char === "'" || char === '"') {
        this.tokens.push(this.readString(char));
        continue;
      }

      if (/[0-9]/u.test(char)) {
        this.tokens.push(this.readNumberOrDuration());
        continue;
      }

      const multiOp = this.tryReadMultiOperator();
      if (multiOp) {
        this.tokens.push(multiOp);
        continue;
      }

      if (OPERATORS.has(char)) {
        this.tokens.push({ type: "operator", value: char, position: this.position });
        this.position += 1;
        continue;
      }

      if (/[A-Za-z_@]/u.test(char)) {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      throw new Error(`Unexpected character '${char}' at position ${this.position}`);
    }
  }

  private readString(quote: string): TokenBase {
    let value = "";
    this.position += 1;
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (char === quote) {
        this.position += 1;
        return { type: "string", value, position: this.position };
      }
      if (char === "\\") {
        const nextChar = this.input[this.position + 1];
        if (nextChar === quote || nextChar === "\\") {
          value += nextChar;
          this.position += 2;
          continue;
        }
      }
      value += char;
      this.position += 1;
    }
    throw new Error("Unterminated string literal");
  }

  private readNumberOrDuration(): TokenBase {
    const start = this.position;
    while (this.position < this.input.length && /[0-9.]/u.test(this.input[this.position])) {
      this.position += 1;
    }
    const numberLiteral = this.input.slice(start, this.position);
    let value = numberLiteral;
    let type: TokenType = "number";
    const unitMatch = this.input.slice(this.position).match(/^(s|m|h|d|w|mo|y)/u);
    if (unitMatch) {
      value += unitMatch[0];
      this.position += unitMatch[0].length;
      type = "identifier"; // will be interpreted as duration by parser
    }
    return { type, value, position: start };
  }

  private tryReadMultiOperator(): TokenBase | null {
    for (const op of MULTI_CHAR_OPERATORS) {
      if (this.input.startsWith(op, this.position)) {
        const token = { type: "operator", value: op, position: this.position } as const;
        this.position += op.length;
        return token;
      }
    }
    return null;
  }

  private readIdentifier(): TokenBase {
    const start = this.position;
    while (
      this.position < this.input.length &&
      /[A-Za-z0-9_@$\-]/u.test(this.input[this.position])
    ) {
      this.position += 1;
    }
    const raw = this.input.slice(start, this.position);
    const upper = raw.toUpperCase();
    if (KEYWORDS.has(upper as never)) {
      return { type: "keyword", value: upper, position: start };
    }
    return { type: "identifier", value: raw, position: start };
  }

  public getTokens() {
    return this.tokens;
  }
}

class Parser {
  private tokens: TokenBase[];
  private position = 0;

  constructor(tokens: TokenBase[]) {
    this.tokens = tokens;
  }

  parseStatement(): Statement {
    const token = this.peek();
    if (!token) throw new Error("Empty OPQL statement");
    if (token.type !== "keyword") {
      throw new Error(`Unexpected token '${token.value}', expected statement keyword`);
    }
    switch (token.value) {
      case "FIND":
        return this.parseFind();
      case "COUNT":
        return this.parseCount();
      case "AGGREGATE":
        return this.parseAggregate();
      case "UPDATE":
        return this.parseUpdate();
      case "EXPLAIN":
        return this.parseExplain();
      default:
        throw new Error(`Unsupported statement type '${token.value}'`);
    }
  }

  private parseFind(): FindStatement {
    this.expectKeyword("FIND");
    const distinct = this.consumeKeyword("DISTINCT");
    const projections = this.parseProjectionList();
    const base = this.parseBaseStatement();
    return {
      type: "FIND",
      projections,
      distinct,
      ...base,
    };
  }

  private parseCount(): CountStatement {
    this.expectKeyword("COUNT");
    const distinct = this.consumeKeyword("DISTINCT");
    let projections: ProjectionField[] | undefined;
    if (this.peekValue("(")) {
      projections = this.parseProjectionList();
    } else if (!this.peekKeyword("FROM")) {
      projections = [{ expression: this.parseExpression() }];
    }
    const base = this.parseBaseStatement();
    return {
      type: "COUNT",
      distinct,
      projections,
      ...base,
    };
  }

  private parseAggregate(): AggregateStatement {
    this.expectKeyword("AGGREGATE");
    const aggregates: AggregateExpression[] = [];
    do {
      const funcToken = this.expectIdentifierOrKeyword();
      const expression = this.parseFunctionCall(funcToken.value, true);
      let alias: string | undefined;
      if (this.consumeKeyword("AS")) {
        alias = this.expectIdentifier().value;
      }
      aggregates.push({ function: funcToken.value, expression, alias });
    } while (this.consumeToken("comma"));

    const base = this.parseBaseStatement();
    let groupBy: Expression[] | undefined;
    if (this.consumeKeyword("GROUP")) {
      this.expectKeyword("BY");
      groupBy = this.parseExpressionList();
    }

    let having: Expression | undefined;
    if (this.consumeKeyword("HAVING")) {
      having = this.parseExpression();
    }

    return {
      type: "AGGREGATE",
      aggregates,
      groupBy,
      having,
      ...base,
    };
  }

  private parseUpdate(): UpdateStatement {
    this.expectKeyword("UPDATE");
    const source = this.expectIdentifier().value;
    const alias = this.consumeKeyword("AS") ? this.expectIdentifier().value : undefined;
    this.expectKeyword("SET");
    const assignments: UpdateAssignment[] = [];
    do {
      const field = this.parseIdentifierExpression();
      this.expectOperator("=");
      const value = this.parseExpression();
      assignments.push({ field, value });
    } while (this.consumeToken("comma"));

    const base = this.parseBaseStatement({ source, alias, allowFrom: false });
    let returning: ProjectionField[] | undefined;
    if (this.consumeKeyword("RETURNING")) {
      returning = this.parseProjectionList();
    }

    return {
      type: "UPDATE",
      source,
      alias,
      assignments,
      returning,
      ...base,
    };
  }

  private parseExplain(): ExplainStatement {
    this.expectKeyword("EXPLAIN");
    const verbose = this.consumeKeyword("VERBOSE");
    const target = this.parseStatement();
    return { type: "EXPLAIN", target, verbose };
  }

  private parseProjectionList(): ProjectionField[] {
    const projections: ProjectionField[] = [];
    if (this.consumeToken("asterisk")) {
      projections.push({ expression: { kind: "identifier", name: "*" } });
      return projections;
    }
    do {
      const expression = this.parseExpression();
      let alias: string | undefined;
      if (this.consumeKeyword("AS")) {
        alias = this.expectIdentifier().value;
      } else if (this.peek()?.type === "identifier" && !this.previousWasComma()) {
        // support implicit alias `expr alias`
        alias = this.consumeIdentifier()?.value;
      }
      projections.push({ expression, alias });
    } while (this.consumeToken("comma"));
    return projections;
  }

  private previousWasComma(): boolean {
    const prev = this.tokens[this.position - 1];
    return prev?.type === "comma";
  }

  private parseBaseStatement(
    preset?: Partial<BaseStatement> & { allowFrom?: boolean }
  ): Omit<BaseStatement, "type"> {
    const allowFrom = preset?.allowFrom ?? true;
    let source = preset?.source;
    let alias = preset?.alias;
    if (allowFrom) {
      this.expectKeyword("FROM");
      const sourceToken = this.expectIdentifierOrKeyword();
      source = sourceToken.value;
      if (this.consumeKeyword("AS")) {
        alias = this.expectIdentifier().value;
      } else {
        alias = this.consumeIdentifier()?.value ?? alias;
      }
    }

    const joins: JoinSpec[] = [];
    while (this.peekKeyword("JOIN") || this.peekKeyword("LEFT") || this.peekKeyword("RIGHT") || this.peekKeyword("FULL") || this.peekKeyword("INNER")) {
      joins.push(this.parseJoin());
    }

    let relations: RelationSpec[] | undefined;
    if (this.consumeKeyword("RELATE")) {
      relations = [];
      do {
        const relation = this.expectIdentifierOrKeyword().value;
        let direction: RelationSpec["direction"];
        if (this.consumeKeyword("INBOUND")) direction = "INBOUND";
        else if (this.consumeKeyword("OUTBOUND")) direction = "OUTBOUND";
        else if (this.consumeKeyword("BIDIRECTIONAL")) direction = "BIDIRECTIONAL";
        let depth: number | undefined;
        if (this.consumeKeyword("DEPTH")) {
          depth = Number(this.expectNumber().value);
        }
        relations.push({ relation, direction, depth });
      } while (this.consumeToken("comma"));
    }

    let where: Expression | undefined;
    if (this.consumeKeyword("WHERE")) {
      where = this.parseExpression();
    }

    let orderBy: OrderByField[] | undefined;
    if (this.consumeKeyword("ORDER")) {
      this.expectKeyword("BY");
      orderBy = [];
      do {
        const expression = this.parseExpression();
        let direction: OrderDirection = "ASC";
        if (this.consumeKeyword("ASC")) direction = "ASC";
        else if (this.consumeKeyword("DESC")) direction = "DESC";
        let nulls: NullsOrder | undefined;
        if (this.consumeKeyword("NULLS")) {
          nulls = this.consumeKeyword("FIRST") ? "FIRST" : this.consumeKeyword("LAST") ? "LAST" : undefined;
        }
        orderBy.push({ expression, direction, nulls });
      } while (this.consumeToken("comma"));
    }

    let limit: number | undefined;
    let offset: number | undefined;
    let cursor: string | undefined;

    if (this.consumeKeyword("PAGINATE") || this.consumeKeyword("PAGE")) {
      if (this.consumeKeyword("AFTER") || this.consumeKeyword("CURSOR")) {
        cursor = this.expectStringOrIdentifier().value;
      }
      if (this.consumeKeyword("LIMIT")) {
        limit = Number(this.expectNumber().value);
      }
    }

    if (this.consumeKeyword("LIMIT")) {
      limit = Number(this.expectNumber().value);
    }

    if (this.consumeKeyword("OFFSET")) {
      offset = Number(this.expectNumber().value);
    }

    if (this.consumeKeyword("CURSOR")) {
      cursor = this.expectStringOrIdentifier().value;
    }

    let security: SecurityDirective | undefined;
    if (this.consumeKeyword("SECURE")) {
      security = {};
      if (this.consumeKeyword("POLICY")) {
        security.policy = this.expectIdentifierOrString();
      }
      if (this.consumeKeyword("SENSITIVITY")) {
        security.sensitivity = this.expectIdentifierOrString().toLowerCase() as SecurityDirective["sensitivity"];
      }
      if (this.consumeKeyword("REQUIRE")) {
        this.expectKeyword("BOUNDARY");
        security.requireTenantBoundary = true;
      }
      if (this.consumeKeyword("ALLOW")) {
        security.allowList = this.parseDelimitedIdentifiers();
      }
      if (this.consumeKeyword("DENY")) {
        security.denyList = this.parseDelimitedIdentifiers();
      }
    }

    let stableBy: Expression[] | undefined;
    if (this.consumeKeyword("STABLE")) {
      this.expectKeyword("BY");
      stableBy = this.parseExpressionList();
    }

    if (this.consumeKeyword("GRAPH")) {
      this.expectKeyword("DEPTH");
      const depth = Number(this.expectNumber().value);
      relations = relations?.map((rel) => ({ ...rel, depth: rel.depth ?? depth })) ?? [
        { relation: "*", depth },
      ];
      if (this.consumeKeyword("CAP")) {
        const capValue = Number(this.expectNumber().value);
        relations = relations.map((rel) => ({ ...rel, depth: Math.min(rel.depth ?? depth, capValue) }));
      }
    }

    return {
      source,
      alias,
      joins: joins.length ? joins : undefined,
      relations,
      where,
      orderBy,
      limit,
      offset,
      cursor,
      security,
      stableBy,
    };
  }

  private parseDelimitedIdentifiers(): string[] {
    if (this.peek()?.type === "lparen") {
      this.consumeToken("lparen");
      const identifiers: string[] = [];
      do {
        identifiers.push(this.expectIdentifierOrString());
      } while (this.consumeToken("comma"));
      this.expectToken("rparen");
      return identifiers;
    }
    return [this.expectIdentifierOrString()];
  }

  private parseJoin(): JoinSpec {
    let type: JoinSpec["type"] = "INNER";
    if (this.consumeKeyword("LEFT")) {
      type = "LEFT";
      this.consumeKeyword("OUTER");
    } else if (this.consumeKeyword("RIGHT")) {
      type = "RIGHT";
      this.consumeKeyword("OUTER");
    } else if (this.consumeKeyword("FULL")) {
      type = "FULL";
      this.consumeKeyword("OUTER");
    } else {
      this.consumeKeyword("INNER");
    }
    this.expectKeyword("JOIN");
    const source = this.expectIdentifierOrKeyword().value;
    const alias = this.consumeKeyword("AS") ? this.expectIdentifier().value : this.consumeIdentifier()?.value;
    this.expectKeyword("ON");
    const condition = this.parseExpression();
    return { type, source, alias, condition };
  }

  private parseExpressionList(): Expression[] {
    const list: Expression[] = [];
    do {
      list.push(this.parseExpression());
    } while (this.consumeToken("comma"));
    return list;
  }

  private parseExpression(precedence = 0): Expression {
    let left = this.parsePrimary();
    while (true) {
      const token = this.peek();
      if (!token) break;
      if (token.type === "keyword") {
        const upper = token.value.toUpperCase();
        if (upper === "AND" || upper === "OR") {
          const opPrecedence = upper === "AND" ? 2 : 1;
          if (opPrecedence < precedence) break;
          this.position += 1;
          const right = this.parseExpression(opPrecedence + 1);
          left = { kind: "binary", operator: upper as LogicalOperator, left, right };
          continue;
        }
        if (upper === "IS") {
          const opPrecedence = 5;
          if (opPrecedence < precedence) break;
          this.position += 1;
          const not = this.consumeKeyword("NOT");
          if (this.consumeKeyword("EMPTY")) {
            const operator = (not ? "IS NOT EMPTY" : "IS EMPTY") as ComparisonOperator;
            const right: LiteralExpression = { kind: "literal", value: null, valueType: "null" };
            left = { kind: "binary", operator, left, right };
            continue;
          }
          if (this.consumeKeyword("NULL")) {
            const operator = (not ? "IS NOT NULL" : "IS NULL") as ComparisonOperator;
            const right: LiteralExpression = { kind: "literal", value: null, valueType: "null" };
            left = { kind: "binary", operator, left, right };
            continue;
          }
          const operator = (not ? "IS NOT" : "IS") as ComparisonOperator;
          const right = this.parseExpression(opPrecedence + 1);
          left = { kind: "binary", operator, left, right };
          continue;
        }
        if (upper === "BETWEEN") {
          this.position += 1;
          const lower = this.parseExpression(4);
          this.expectKeyword("AND");
          const upperExpr = this.parseExpression(4);
          left = { kind: "between", value: left, lower, upper: upperExpr };
          continue;
        }
        if (upper === "NOT" && this.peekAheadValue(1, "BETWEEN")) {
          this.position += 2;
          const lower = this.parseExpression(4);
          this.expectKeyword("AND");
          const upperExpr = this.parseExpression(4);
          left = { kind: "between", value: left, lower, upper: upperExpr, negated: true };
          continue;
        }
        if (upper === "IN" || (upper === "NOT" && this.peekAheadKeyword(1, "IN"))) {
          const negated = upper === "NOT";
          if (negated) this.position += 1;
          this.expectKeyword("IN");
          const options = this.parseInList();
          left = { kind: "in", value: left, options, negated };
          continue;
        }
        if (upper === "WAS") {
          this.position += 1;
          left = this.parseHistoryPredicate(left, "WAS");
          continue;
        }
        if (upper === "CHANGED") {
          this.position += 1;
          left = this.parseHistoryPredicate(left, "CHANGED");
          continue;
        }
        if (upper === "BEFORE" || upper === "AFTER" || upper === "ON") {
          const opPrecedence = 5;
          if (opPrecedence < precedence) break;
          this.position += 1;
          const right = this.parseExpression(opPrecedence + 1);
          left = {
            kind: "binary",
            operator: upper as ComparisonOperator,
            left,
            right,
          };
          continue;
        }
        if (upper === "DURING") {
          const opPrecedence = 5;
          if (opPrecedence < precedence) break;
          this.position += 1;
          const range = this.parseTemporalRange();
          left = { kind: "temporal", operator: "DURING", value: left, range };
          continue;
        }
      }
      if (token.type === "operator") {
        const operator = token.value;
        const opPrecedence = this.getOperatorPrecedence(operator);
        if (opPrecedence < precedence) break;
        this.position += 1;
        const right = this.parseExpression(opPrecedence + 1);
        if ((operator === "+" || operator === "-") && right.kind === "duration") {
          left = { kind: "date_math", base: left, operator: operator as "+" | "-", offset: right };
          continue;
        }
        left = {
          kind: "binary",
          operator: operator as ComparisonOperator | ArithmeticOperator,
          left,
          right,
        };
        continue;
      }
      break;
    }
    return left;
  }

  private parseHistoryPredicate(field: Expression, verb: HistoryVerb): HistoryPredicateExpression {
    let negated = false;
    let comparison: HistoryPredicateExpression["comparison"];
    const qualifiers: HistoryQualifier[] = [];

    if (verb === "WAS") {
      negated = this.consumeKeyword("NOT") !== undefined;
      if (this.consumeKeyword("IN")) {
        const values = this.parseInList();
        comparison = { operator: (negated ? "NOT IN" : "IN") as ComparisonOperator, values };
      } else if (this.consumeKeyword("EMPTY")) {
        const literal: LiteralExpression = { kind: "literal", value: null, valueType: "null" };
        comparison = { operator: (negated ? "IS NOT EMPTY" : "IS EMPTY") as ComparisonOperator, value: literal };
      } else if (this.consumeKeyword("NULL")) {
        const literal: LiteralExpression = { kind: "literal", value: null, valueType: "null" };
        comparison = { operator: (negated ? "IS NOT NULL" : "IS NULL") as ComparisonOperator, value: literal };
      } else {
        const value = this.parseExpression(5);
        comparison = { operator: (negated ? "!=" : "=") as ComparisonOperator, value };
      }
    } else {
      while (true) {
        if (this.consumeKeyword("TO")) {
          qualifiers.push(this.parseHistoryChangeQualifier("TO"));
          continue;
        }
        if (this.consumeKeyword("FROM")) {
          qualifiers.push(this.parseHistoryChangeQualifier("FROM"));
          continue;
        }
        break;
      }
    }

    qualifiers.push(...this.parseHistoryQualifiers());

    const history: HistoryPredicateExpression = { kind: "history", field, verb, qualifiers };
    if (negated) {
      history.negated = true;
    }
    if (comparison) {
      history.comparison = comparison;
    }
    return history;
  }

  private parseHistoryChangeQualifier(type: "TO" | "FROM"): HistoryQualifier {
    const negated = this.consumeKeyword("NOT") !== undefined;
    if (this.consumeKeyword("IN")) {
      const values = this.parseInList();
      return {
        type,
        operator: (negated ? "NOT IN" : "IN") as ComparisonOperator,
        values,
      };
    }
    if (this.consumeKeyword("EMPTY")) {
      const literal: LiteralExpression = { kind: "literal", value: null, valueType: "null" };
      return {
        type,
        operator: (negated ? "!=" : "=") as ComparisonOperator,
        value: literal,
      };
    }
    if (this.consumeKeyword("NULL")) {
      const literal: LiteralExpression = { kind: "literal", value: null, valueType: "null" };
      return {
        type,
        operator: (negated ? "!=" : "=") as ComparisonOperator,
        value: literal,
      };
    }
    const value = this.parseExpression(5);
    return {
      type,
      operator: (negated ? "!=" : "=") as ComparisonOperator,
      value,
    };
  }

  private parseHistoryQualifiers(): HistoryQualifier[] {
    const qualifiers: HistoryQualifier[] = [];
    while (true) {
      if (this.consumeKeyword("BY")) {
        qualifiers.push({ type: "BY", value: this.parseExpression(6) });
        continue;
      }
      if (this.consumeKeyword("AFTER")) {
        qualifiers.push({ type: "AFTER", value: this.parseExpression(6) });
        continue;
      }
      if (this.consumeKeyword("BEFORE")) {
        qualifiers.push({ type: "BEFORE", value: this.parseExpression(6) });
        continue;
      }
      if (this.consumeKeyword("ON")) {
        qualifiers.push({ type: "ON", value: this.parseExpression(6) });
        continue;
      }
      if (this.consumeKeyword("DURING")) {
        const range = this.parseTemporalRange();
        qualifiers.push({ type: "DURING", start: range.start, end: range.end });
        continue;
      }
      break;
    }
    return qualifiers;
  }

  private parseTemporalRange(): { start: Expression; end: Expression } {
    if (this.consumeToken("lparen")) {
      const start = this.parseExpression(5);
      let end: Expression;
      if (this.consumeToken("comma")) {
        end = this.parseExpression(5);
      } else {
        if (!this.consumeKeyword("AND") && !this.consumeKeyword("TO")) {
          throw new Error("Expected ',' or AND in DURING range");
        }
        end = this.parseExpression(5);
      }
      this.expectToken("rparen");
      return { start, end };
    }
    const start = this.parseExpression(5);
    if (!this.consumeKeyword("AND") && !this.consumeKeyword("TO")) {
      throw new Error("Expected AND in DURING range");
    }
    const end = this.parseExpression(5);
    return { start, end };
  }

  private parsePrimary(): Expression {
    const token = this.peek();
    if (!token) throw new Error("Unexpected end of input while parsing expression");
    if (token.type === "keyword" && token.value === "NOT") {
      this.position += 1;
      const operand = this.parseExpression(5);
      return { kind: "unary", operator: "NOT", operand };
    }
    if (token.type === "operator" && token.value === "-") {
      this.position += 1;
      const operand = this.parseExpression(6);
      return { kind: "unary", operator: "-", operand };
    }
    if (token.type === "lparen") {
      this.position += 1;
      const expr = this.parseExpression();
      this.expectToken("rparen");
      return expr;
    }
    if (token.type === "string") {
      this.position += 1;
      return { kind: "literal", value: token.value, valueType: "string" };
    }
    if (token.type === "number") {
      this.position += 1;
      const num = Number(token.value);
      return { kind: "literal", value: num, valueType: "number" };
    }
    if (token.type === "identifier") {
      this.position += 1;
      if (/^[0-9]+(s|m|h|d|w|mo|y)$/u.test(token.value)) {
        const match = token.value.match(/^(?<value>[0-9]+)(?<unit>s|m|h|d|w|mo|y)$/u);
        const value = Number(match?.groups?.value ?? "0");
        const unit = (match?.groups?.unit ?? "d") as DurationUnit;
        return { kind: "duration", value, unit };
      }
      if (this.peekValue("(")) {
        return this.parseFunctionCall(token.value);
      }
      const path = [token.value];
      while (this.consumeToken("dot")) {
        path.push(this.expectIdentifierOrKeyword().value);
      }
      return { kind: "identifier", name: path[0], path: path.length > 1 ? path.slice(1) : undefined };
    }
    if (token.type === "asterisk") {
      this.position += 1;
      return { kind: "identifier", name: "*" };
    }
    if (token.type === "keyword") {
      if (token.value === "TRUE" || token.value === "FALSE") {
        this.position += 1;
        return { kind: "literal", value: token.value === "TRUE", valueType: "boolean" };
      }
      if (token.value === "NULL") {
        this.position += 1;
        return { kind: "literal", value: null, valueType: "null" };
      }
      this.position += 1;
      if (this.peekValue("(")) {
        return this.parseFunctionCall(token.value);
      }
      return { kind: "identifier", name: token.value.toLowerCase() };
    }
    throw new Error(`Unexpected token '${token.value}' in expression`);
  }

  private parseFunctionCall(name: string, includeNameAsIdentifier = false): Expression {
    if (!this.consumeToken("lparen")) {
      if (includeNameAsIdentifier) {
        return { kind: "identifier", name };
      }
      throw new Error(`Expected '(' after function '${name}'`);
    }
    const args: Expression[] = [];
    if (!this.peekValue(")")) {
      do {
        args.push(this.parseExpression());
      } while (this.consumeToken("comma"));
    }
    this.expectToken("rparen");

    if (args.length === 1 && args[0].kind === "duration") {
      return {
        kind: "date_math",
        base: { kind: "function", name, args: [] },
        operator: "+",
        offset: args[0],
      };
    }

    return { kind: "function", name, args };
  }

  private parseInList(): Expression[] {
    if (this.consumeToken("lparen")) {
      const list: Expression[] = [];
      if (!this.peekValue(")")) {
        do {
          list.push(this.parseExpression());
        } while (this.consumeToken("comma"));
      }
      this.expectToken("rparen");
      return list;
    }
    return [this.parseExpression()];
  }

  private expectKeyword(value: string) {
    const token = this.consumeKeyword(value);
    if (!token) {
      throw new Error(`Expected keyword '${value}' but found '${this.peek()?.value ?? "<eof>"}'`);
    }
  }

  private consumeKeyword(value: string): TokenBase | undefined {
    const token = this.peek();
    if (token?.type === "keyword" && token.value === value) {
      this.position += 1;
      return token;
    }
    return undefined;
  }

  private expectOperator(value: string) {
    const token = this.peek();
    if (token?.type === "operator" && token.value === value) {
      this.position += 1;
      return;
    }
    throw new Error(`Expected operator '${value}' but found '${token?.value ?? "<eof>"}'`);
  }

  private expectToken(type: TokenType) {
    const token = this.peek();
    if (token?.type === type) {
      this.position += 1;
      return token;
    }
    throw new Error(`Expected token '${type}' but found '${token?.type ?? "<eof>"}'`);
  }

  private consumeToken(type: TokenType): TokenBase | undefined {
    const token = this.peek();
    if (token?.type === type) {
      this.position += 1;
      return token;
    }
    return undefined;
  }

  private expectIdentifier(): TokenBase {
    const token = this.peek();
    if (token?.type === "identifier") {
      this.position += 1;
      return token;
    }
    throw new Error(`Expected identifier but found '${token?.value ?? "<eof>"}'`);
  }

  private expectNumber(): TokenBase {
    const token = this.peek();
    if (token?.type === "number") {
      this.position += 1;
      return token;
    }
    throw new Error(`Expected number but found '${token?.value ?? "<eof>"}'`);
  }

  private expectIdentifierOrKeyword(): TokenBase {
    const token = this.peek();
    if (!token) throw new Error("Unexpected end of input");
    if (token.type === "identifier" || token.type === "keyword") {
      this.position += 1;
      return token;
    }
    throw new Error(`Expected identifier but found '${token.value}'`);
  }

  private expectIdentifierOrString(): string {
    const token = this.peek();
    if (!token) throw new Error("Unexpected end of input");
    if (token.type === "identifier" || token.type === "keyword" || token.type === "string") {
      this.position += 1;
      return token.value;
    }
    throw new Error(`Expected identifier/string but found '${token.value}'`);
  }

  private expectStringOrIdentifier(): TokenBase {
    const token = this.peek();
    if (!token) throw new Error("Unexpected end of input");
    if (token.type === "string" || token.type === "identifier") {
      this.position += 1;
      return token;
    }
    throw new Error(`Expected string or identifier but found '${token.value}'`);
  }

  private consumeIdentifier(): TokenBase | undefined {
    const token = this.peek();
    if (token?.type === "identifier") {
      this.position += 1;
      return token;
    }
    return undefined;
  }

  private parseIdentifierExpression(): IdentifierExpression {
    const token = this.expectIdentifier();
    const path = [token.value];
    while (this.consumeToken("dot")) {
      path.push(this.expectIdentifierOrKeyword().value);
    }
    return { kind: "identifier", name: path[0], path: path.slice(1) };
  }

  private getOperatorPrecedence(operator: string): number {
    switch (operator) {
      case "*":
      case "/":
      case "%":
        return 7;
      case "+":
      case "-":
        return 6;
      case "=":
      case "!=":
      case "<>":
      case "<":
      case "<=":
      case ">":
      case ">=":
      case "~":
      case "!~":
      case "MATCH":
      case "LIKE":
      case "CONTAINS":
      case "::":
        return 5;
      default:
        return 0;
    }
  }

  private peek(): TokenBase | undefined {
    return this.tokens[this.position];
  }

  private peekValue(value: string): boolean {
    const token = this.peek();
    return token?.value === value;
  }

  private peekKeyword(keyword: string): boolean {
    const token = this.peek();
    return token?.type === "keyword" && token.value === keyword;
  }

  private peekAheadKeyword(offset: number, keyword: string): boolean {
    const token = this.tokens[this.position + offset];
    return token?.type === "keyword" && token.value === keyword;
  }

  private peekAheadValue(offset: number, value: string): boolean {
    const token = this.tokens[this.position + offset];
    return token?.value === value;
  }
}

export interface ParseOptions {
  defaultSource?: string;
}

function normalizeIdentifierName(name: string): string {
  const alias = FIELD_ALIASES[name.toLowerCase()];
  return alias ?? name;
}

function normalizeFunctionName(name: string): string {
  const alias = FUNCTION_ALIASES[name.toLowerCase()];
  return alias ?? name;
}

function normalizeHistoryQualifier(qualifier: HistoryQualifier): HistoryQualifier {
  switch (qualifier.type) {
    case "BY":
    case "AFTER":
    case "BEFORE":
    case "ON":
      return { ...qualifier, value: normalizeExpression(qualifier.value) };
    case "TO":
    case "FROM":
      return {
        ...qualifier,
        value: qualifier.value ? normalizeExpression(qualifier.value) : undefined,
        values: qualifier.values?.map((value) => normalizeExpression(value)),
      };
    case "DURING":
      return {
        ...qualifier,
        start: normalizeExpression(qualifier.start),
        end: normalizeExpression(qualifier.end),
      };
    default:
      return qualifier;
  }
}

function normalizeExpression(expression: Expression): Expression {
  switch (expression.kind) {
    case "identifier": {
      const name = normalizeIdentifierName(expression.name);
      const path = expression.path?.map((segment) => normalizeIdentifierName(segment));
      return path && path.length > 0
        ? { kind: "identifier", name, path }
        : { kind: "identifier", name };
    }
    case "literal":
      return expression;
    case "duration":
      return expression;
    case "date_math":
      return {
        kind: "date_math",
        base: normalizeExpression(expression.base),
        operator: expression.operator,
        offset: expression.offset,
      };
    case "unary":
      return { ...expression, operand: normalizeExpression(expression.operand) };
    case "binary":
      return {
        ...expression,
        left: normalizeExpression(expression.left),
        right: normalizeExpression(expression.right),
      };
    case "between":
      return {
        ...expression,
        value: normalizeExpression(expression.value),
        lower: normalizeExpression(expression.lower),
        upper: normalizeExpression(expression.upper),
      };
    case "in":
      return {
        ...expression,
        value: normalizeExpression(expression.value),
        options: expression.options.map((option) => normalizeExpression(option)),
      };
    case "function":
      return {
        kind: "function",
        name: normalizeFunctionName(expression.name),
        args: expression.args.map((arg) => normalizeExpression(arg)),
      };
    case "history":
      return {
        kind: "history",
        field: normalizeExpression(expression.field),
        verb: expression.verb,
        negated: expression.negated,
        comparison: expression.comparison
          ? {
              operator: expression.comparison.operator,
              value: expression.comparison.value
                ? normalizeExpression(expression.comparison.value)
                : undefined,
              values: expression.comparison.values?.map((value) => normalizeExpression(value)),
            }
          : undefined,
        qualifiers: expression.qualifiers.map((qualifier) => normalizeHistoryQualifier(qualifier)),
      };
    case "temporal":
      return {
        kind: "temporal",
        operator: expression.operator,
        value: normalizeExpression(expression.value),
        range: {
          start: normalizeExpression(expression.range.start),
          end: normalizeExpression(expression.range.end),
        },
      };
    default:
      return expression;
  }
}

function normalizeProjectionField(field: ProjectionField): ProjectionField {
  return {
    ...field,
    expression: normalizeExpression(field.expression),
  };
}

function normalizeOrderByField(field: OrderByField): OrderByField {
  return {
    ...field,
    expression: normalizeExpression(field.expression),
  };
}

function normalizeJoinSpec(join: JoinSpec): JoinSpec {
  return {
    ...join,
    condition: normalizeExpression(join.condition),
  };
}

function normalizeAggregateExpression(aggregate: AggregateExpression): AggregateExpression {
  return {
    ...aggregate,
    expression: normalizeExpression(aggregate.expression),
  };
}

function normalizeUpdateAssignment(assignment: UpdateAssignment): UpdateAssignment {
  return {
    field: normalizeExpression(assignment.field) as IdentifierExpression,
    value: normalizeExpression(assignment.value),
  };
}

function normalizeBaseStatement<T extends BaseStatement>(statement: T): T {
  return {
    ...statement,
    where: statement.where ? normalizeExpression(statement.where) : undefined,
    orderBy: statement.orderBy?.map((field) => normalizeOrderByField(field)),
    joins: statement.joins?.map((join) => normalizeJoinSpec(join)),
    stableBy: statement.stableBy?.map((expr) => normalizeExpression(expr)),
  } as T;
}

function normalizeStatement(statement: Statement): Statement {
  switch (statement.type) {
    case "FIND": {
      const base = normalizeBaseStatement(statement);
      return {
        ...base,
        projections: statement.projections.map((field) => normalizeProjectionField(field)),
      };
    }
    case "COUNT": {
      const base = normalizeBaseStatement(statement);
      return {
        ...base,
        projections: statement.projections?.map((field) => normalizeProjectionField(field)),
      };
    }
    case "AGGREGATE": {
      const base = normalizeBaseStatement(statement);
      return {
        ...base,
        aggregates: statement.aggregates.map((aggregate) => normalizeAggregateExpression(aggregate)),
        groupBy: statement.groupBy?.map((expr) => normalizeExpression(expr)),
        having: statement.having ? normalizeExpression(statement.having) : undefined,
      };
    }
    case "UPDATE": {
      const base = normalizeBaseStatement(statement);
      return {
        ...base,
        assignments: statement.assignments.map((assignment) => normalizeUpdateAssignment(assignment)),
        returning: statement.returning?.map((field) => normalizeProjectionField(field)),
      };
    }
    case "EXPLAIN":
      return {
        ...statement,
        target: normalizeStatement(statement.target),
      };
    default:
      return statement;
  }
}

export function parseOPQL(input: string, options: ParseOptions = {}): Statement {
  const lexer = new Lexer(input.trim());
  const tokens = lexer.getTokens();
  const parser = new Parser(tokens);
  const statement = normalizeStatement(parser.parseStatement());
  if (options.defaultSource && !statement.source) {
    (statement as BaseStatement).source = options.defaultSource;
  }
  return statement;
}

export interface CompiledIntent {
  operation: StatementType;
  collection: string;
  filters?: Array<{ field: string; operator: ComparisonOperator; value: unknown }>;
  projections?: string[];
  synonyms?: string[];
  dateAdjustments?: Array<{ field: string; offset: string }>;
}

export function compileIntentToStatement(intent: CompiledIntent): Statement {
  const base: Partial<BaseStatement> = {
    source: intent.collection,
  };
  const where = intent.filters?.reduce<Expression | undefined>((expr, filter) => {
    const comparison: BinaryExpression = {
      kind: "binary",
      operator: filter.operator,
      left: { kind: "identifier", name: filter.field },
      right: literalFromValue(filter.value),
    };
    if (!expr) return comparison;
    return { kind: "binary", operator: "AND", left: expr, right: comparison };
  }, undefined);

  switch (intent.operation) {
    case "FIND":
      return {
        type: "FIND",
        projections:
          intent.projections?.map((field) => ({
            expression: { kind: "identifier", name: field },
          })) ?? [{ expression: { kind: "identifier", name: "*" } }],
        where,
        ...base,
      };
    case "COUNT":
      return {
        type: "COUNT",
        projections: intent.projections?.map((field) => ({
          expression: { kind: "identifier", name: field },
        })),
        where,
        ...base,
      };
    case "AGGREGATE":
      return {
        type: "AGGREGATE",
        aggregates:
          intent.projections?.map((projection) => ({
            function: projection,
            expression: { kind: "identifier", name: projection },
          })) ?? [],
        where,
        ...base,
      };
    case "UPDATE":
      return {
        type: "UPDATE",
        assignments: [],
        where,
        ...base,
      };
    case "EXPLAIN":
      return {
        type: "EXPLAIN",
        target: {
          type: "FIND",
          projections: intent.projections?.map((field) => ({
            expression: { kind: "identifier", name: field },
          })) ?? [{ expression: { kind: "identifier", name: "*" } }],
          where,
          ...base,
        },
      };
    default:
      throw new Error(`Unsupported intent operation '${intent.operation}'`);
  }
}

export function literalFromValue(value: unknown): Expression {
  if (typeof value === "string") {
    return { kind: "literal", value, valueType: "string" };
  }
  if (typeof value === "number") {
    return { kind: "literal", value, valueType: "number" };
  }
  if (typeof value === "boolean") {
    return { kind: "literal", value, valueType: "boolean" };
  }
  if (value === null) {
    return { kind: "literal", value: null, valueType: "null" };
  }
  if (Array.isArray(value)) {
    return {
      kind: "function",
      name: "array",
      args: value.map(literalFromValue),
    };
  }
  return {
    kind: "literal",
    value: String(value),
    valueType: "string",
  };
}

export interface SynonymRewriteResult {
  expression: Expression;
  appliedSynonyms: string[];
}

export function rewriteSynonyms(expression: Expression, synonyms = OPQL_SYNONYM_CORPUS): SynonymRewriteResult {
  const appliedSynonyms: string[] = [];

  function traverse(expr: Expression): Expression {
    switch (expr.kind) {
      case "identifier": {
        const key = expr.name.toLowerCase();
        const synonymList = synonyms[key];
        if (!synonymList?.length) {
          return expr;
        }
        appliedSynonyms.push(...synonymList.map((syn) => `${expr.name}->${syn}`));
        return {
          kind: "function",
          name: "synonym_match",
          args: [expr, { kind: "function", name: "array", args: synonymList.map((syn) => literalFromValue(syn)) }],
        };
      }
      case "binary":
        return { ...expr, left: traverse(expr.left), right: traverse(expr.right) };
      case "unary":
        return { ...expr, operand: traverse(expr.operand) };
      case "between":
        return { ...expr, value: traverse(expr.value), lower: traverse(expr.lower), upper: traverse(expr.upper) };
      case "in":
        return { ...expr, value: traverse(expr.value), options: expr.options.map(traverse) };
      case "function":
        return { ...expr, args: expr.args.map(traverse) };
      case "date_math":
        return { ...expr, base: traverse(expr.base) };
      default:
        return expr;
    }
  }

  return { expression: traverse(expression), appliedSynonyms };
}

export interface DatePolicy {
  now?: Date;
  timezone?: string;
  floorToDay?: boolean;
}

export interface DateRewriteResult {
  expression: Expression;
  appliedPolicies: string[];
}

export function rewriteDateMath(expression: Expression, policy: DatePolicy = {}): DateRewriteResult {
  const appliedPolicies: string[] = [];
  const referenceNow = policy.now ? new Date(policy.now.getTime()) : new Date();

  const describe = (label: string) => describePolicy(label, policy);

  function traverse(expr: Expression): Expression {
    switch (expr.kind) {
      case "date_math": {
        const base = traverse(expr.base);
        const anchor = resolveDateAnchor(base, referenceNow);
        if (!anchor) {
          return { ...expr, base };
        }
        const offsetMs = durationToMs(expr.offset);
        const adjusted = new Date(anchor.getTime() + (expr.operator === "+" ? offsetMs : -offsetMs));
        const normalized = applyPolicyAdjustments(adjusted, policy);
        appliedPolicies.push(`${describe("date_math")}:${expr.operator}${expr.offset.value}${expr.offset.unit}`);
        return {
          kind: "literal",
          value: normalized.toISOString(),
          valueType: "string",
        } satisfies LiteralExpression;
      }
      case "function": {
        if (expr.name.toLowerCase() === "now") {
          const normalized = applyPolicyAdjustments(new Date(referenceNow.getTime()), policy);
          appliedPolicies.push(describe("now"));
          return {
            kind: "literal",
            value: normalized.toISOString(),
            valueType: "string",
          } satisfies LiteralExpression;
        }
        return { ...expr, args: expr.args.map(traverse) };
      }
      case "binary":
        return { ...expr, left: traverse(expr.left), right: traverse(expr.right) };
      case "unary":
        return { ...expr, operand: traverse(expr.operand) };
      case "between":
        return { ...expr, value: traverse(expr.value), lower: traverse(expr.lower), upper: traverse(expr.upper) };
      case "in":
        return { ...expr, value: traverse(expr.value), options: expr.options.map(traverse) };
      default:
        return expr;
    }
  }

  return { expression: traverse(expression), appliedPolicies };
}

function resolveDateAnchor(base: Expression, fallback: Date): Date | undefined {
  if (base.kind === "literal") {
    return parseLiteralDate(base.value);
  }
  if (base.kind === "function" && base.name.toLowerCase() === "now") {
    return new Date(fallback.getTime());
  }
  return undefined;
}

function parseLiteralDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === "number") {
    return new Date(value);
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return undefined;
}

function applyPolicyAdjustments(date: Date, policy: DatePolicy): Date {
  if (!policy.floorToDay) {
    return new Date(date.getTime());
  }
  return floorDate(date, policy.timezone);
}

function floorDate(date: Date, timezone: string | undefined): Date {
  if (!timezone) {
    const clone = new Date(date.getTime());
    clone.setHours(0, 0, 0, 0);
    return clone;
  }
  const locale = date.toLocaleString("en-US", { timeZone: timezone });
  const localDate = new Date(locale);
  const offset = date.getTime() - localDate.getTime();
  localDate.setHours(0, 0, 0, 0);
  return new Date(localDate.getTime() + offset);
}

function describePolicy(label: string, policy: DatePolicy): string {
  const modifiers: string[] = [];
  if (policy.floorToDay) {
    modifiers.push("floor");
  }
  if (policy.timezone) {
    modifiers.push(`tz=${policy.timezone}`);
  }
  if (!modifiers.length) {
    return label;
  }
  return `${label}[${modifiers.join(",")}]`;
}

function durationToMs(duration: DurationExpression): number {
  const { value, unit } = duration;
  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    case "mo":
      return value * 30 * 24 * 60 * 60 * 1000;
    case "y":
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      return value;
  }
}

export function formatExpression(expr: Expression): string {
  switch (expr.kind) {
    case "identifier":
      return expr.path?.length ? `${expr.name}.${expr.path.join(".")}` : expr.name;
    case "literal":
      if (expr.value === null) return "NULL";
      if (typeof expr.value === "string") return `'${expr.value}'`;
      return String(expr.value);
    case "duration":
      return `${expr.value}${expr.unit}`;
    case "date_math":
      return `${formatExpression(expr.base)} ${expr.operator} ${formatExpression(expr.offset)}`;
    case "unary":
      return `${expr.operator} ${formatExpression(expr.operand)}`;
    case "binary":
      return `${formatExpression(expr.left)} ${expr.operator} ${formatExpression(expr.right)}`;
    case "between":
      return `${formatExpression(expr.value)} ${expr.negated ? "NOT " : ""}BETWEEN ${formatExpression(expr.lower)} AND ${formatExpression(expr.upper)}`;
    case "in":
      return `${formatExpression(expr.value)} ${expr.negated ? "NOT " : ""}IN (${expr.options.map(formatExpression).join(", ")})`;
    case "function":
      return `${expr.name}(${expr.args.map(formatExpression).join(", ")})`;
    default:
      return "";
  }
}

export function formatStatement(statement: Statement): string {
  switch (statement.type) {
    case "FIND": {
      const projections = statement.projections.map((proj) =>
        proj.alias ? `${formatExpression(proj.expression)} AS ${proj.alias}` : formatExpression(proj.expression)
      );
      const distinct = statement.distinct ? "DISTINCT " : "";
      return `${distinct}FIND ${projections.join(", ")} FROM ${statement.source}`;
    }
    case "COUNT":
      return `COUNT FROM ${statement.source}`;
    case "AGGREGATE": {
      const base = `AGGREGATE ${statement.aggregates
        .map((agg) => `${agg.function}(${formatExpression(agg.expression)})${agg.alias ? ` AS ${agg.alias}` : ""}`)
        .join(", "
      )} FROM ${statement.source}`;
      const group = statement.groupBy?.length
        ? ` GROUP BY ${statement.groupBy.map((expr) => formatExpression(expr)).join(", ")}`
        : "";
      const having = statement.having ? ` HAVING ${formatExpression(statement.having)}` : "";
      return `${base}${group}${having}`;
    }
    case "UPDATE":
      return `UPDATE ${statement.source}`;
    case "EXPLAIN":
      return `EXPLAIN ${formatStatement(statement.target)}`;
    default:
      return "";
  }
}
