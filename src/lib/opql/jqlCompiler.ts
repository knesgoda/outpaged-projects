import { parseOPQL, type Statement } from "./parser";

export interface JqlCompilationOptions {
  /**
   * The OPQL collection that should be targeted when generating the FIND statement.
   * Defaults to the work item catalog which is the closest analogue to Jira issues.
   */
  source?: string;
  /**
   * The projection that should be requested by the FIND statement.  Defaults to ITEMS.
   */
  projection?: string;
}

export interface JqlCompilationResult {
  /** Raw OPQL text generated from the supplied JQL */
  opql: string;
  /** Parsed OPQL statement that callers can use directly */
  statement: Statement;
  /** Normalised representation of the original JQL (trimmed) */
  original: string;
}

type TokenType =
  | "keyword"
  | "identifier"
  | "string"
  | "number"
  | "operator"
  | "comma"
  | "lparen"
  | "rparen";

interface TokenBase {
  type: TokenType;
  value: string;
  raw?: string;
}

type Token = TokenBase;

const KEYWORDS = new Set([
  "AND",
  "OR",
  "NOT",
  "ORDER",
  "BY",
  "ASC",
  "DESC",
  "IN",
  "IS",
  "EMPTY",
  "NULL",
  "TRUE",
  "FALSE",
  "WAS",
  "CHANGED",
  "AFTER",
  "BEFORE",
  "DURING",
  "ON",
]);

const FIELD_TRANSLATIONS: Record<string, string> = {
  status: "status",
  state: "status",
  issuetype: "type",
  "issue type": "type",
  type: "type",
  project: "project_key",
  projectkey: "project_key",
  priority: "priority",
  assignee: "assignee",
  owner: "assignee",
  reporter: "reporter",
  creator: "reporter",
  summary: "title",
  description: "description",
  created: "created_at",
  updated: "updated_at",
  duedate: "due_at",
  resolution: "resolution",
  resolutiondate: "resolved_at",
  fixversion: "fix_version",
  labels: "labels",
};

const FUNCTION_TRANSLATIONS: Record<string, string> = {
  currentuser: "current_user",
  startofday: "start_of_day",
  endofday: "end_of_day",
  startofweek: "start_of_week",
  endofweek: "end_of_week",
  startofmonth: "start_of_month",
  endofmonth: "end_of_month",
  startofquarter: "start_of_quarter",
  endofquarter: "end_of_quarter",
  startofyear: "start_of_year",
  endofyear: "end_of_year",
  now: "now",
  today: "today",
};

interface ExpressionNode {
  text: string;
  precedence: number;
}

interface OrderByNode {
  field: string;
  direction: "ASC" | "DESC";
}

interface ParsedQuery {
  where?: ExpressionNode;
  orderBy: OrderByNode[];
}

class Lexer {
  private readonly input: string;
  private position = 0;
  private readonly tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
    this.tokenize();
  }

  private tokenize() {
    while (this.position < this.input.length) {
      const char = this.input[this.position]!;
      if (/\s/u.test(char)) {
        this.position += 1;
        continue;
      }

      if (char === ",") {
        this.tokens.push({ type: "comma", value: "," });
        this.position += 1;
        continue;
      }

      if (char === "(") {
        this.tokens.push({ type: "lparen", value: "(" });
        this.position += 1;
        continue;
      }

      if (char === ")") {
        this.tokens.push({ type: "rparen", value: ")" });
        this.position += 1;
        continue;
      }

      if (char === "'" || char === '"') {
        this.tokens.push(this.readString(char));
        continue;
      }

      if (/[0-9]/u.test(char)) {
        this.tokens.push(this.readNumber());
        continue;
      }

      if (char === "!" && this.peek() === "=") {
        this.tokens.push({ type: "operator", value: "!=" });
        this.position += 2;
        continue;
      }

      if (char === "!" && this.peek() === "~") {
        this.tokens.push({ type: "operator", value: "!~" });
        this.position += 2;
        continue;
      }

      if (char === "=" || char === "<" || char === ">" || char === "~") {
        const next = this.peek();
        if ((char === "<" || char === ">") && next === "=") {
          this.tokens.push({ type: "operator", value: `${char}${next}` });
          this.position += 2;
        } else {
          this.tokens.push({ type: "operator", value: char });
          this.position += 1;
        }
        continue;
      }

      if (char === "-" || char === "+") {
        this.tokens.push({ type: "operator", value: char });
        this.position += 1;
        continue;
      }

      if (/[A-Za-z_]/u.test(char)) {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      throw new Error(`Unexpected character '${char}' in JQL`);
    }
  }

  private peek(offset = 1): string | undefined {
    return this.input[this.position + offset];
  }

  private readString(quote: string): Token {
    let value = "";
    this.position += 1;
    while (this.position < this.input.length) {
      const char = this.input[this.position]!;
      if (char === "\\") {
        const next = this.input[this.position + 1];
        if (next) {
          value += next;
          this.position += 2;
          continue;
        }
      }
      if (char === quote) {
        this.position += 1;
        return { type: "string", value };
      }
      value += char;
      this.position += 1;
    }
    throw new Error("Unterminated string literal in JQL");
  }

  private readNumber(): Token {
    const start = this.position;
    while (this.position < this.input.length && /[0-9.]/u.test(this.input[this.position]!)) {
      this.position += 1;
    }
    const numberLiteral = this.input.slice(start, this.position);
    const remainder = this.input.slice(this.position);
    const unitMatch = remainder.match(/^(s|m|h|d|w|mo|y)/iu);
    if (unitMatch) {
      this.position += unitMatch[0].length;
      return { type: "identifier", value: `${numberLiteral}${unitMatch[0]}` };
    }
    return { type: "number", value: numberLiteral };
  }

  private readIdentifier(): Token {
    const start = this.position;
    while (
      this.position < this.input.length &&
      /[A-Za-z0-9_]/u.test(this.input[this.position]!)) {
      this.position += 1;
    }

    // Custom fields like cf[12345]
    if (this.input[this.position] === "[") {
      let end = this.position + 1;
      while (end < this.input.length && /[0-9]/u.test(this.input[end]!)) {
        end += 1;
      }
      if (this.input[end] === "]") {
        this.position = end + 1;
      }
    }

    const raw = this.input.slice(start, this.position);
    const upper = raw.toUpperCase();
    if (KEYWORDS.has(upper)) {
      return { type: "keyword", value: upper, raw };
    }
    return { type: "identifier", value: raw };
  }

  public getTokens(): Token[] {
    return this.tokens;
  }
}

class Parser {
  private readonly tokens: Token[];
  private position = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseQuery(): ParsedQuery {
    let where: ExpressionNode | undefined;
    if (!this.peekKeyword("ORDER") && !this.isEnd()) {
      where = this.parseExpression();
    }

    const orderBy: OrderByNode[] = [];
    if (this.consumeKeyword("ORDER")) {
      this.expectKeyword("BY");
      do {
        const field = this.parseFieldName();
        let direction: "ASC" | "DESC" = "ASC";
        if (this.consumeKeyword("DESC")) {
          direction = "DESC";
        } else {
          this.consumeKeyword("ASC");
        }
        orderBy.push({ field, direction });
      } while (this.consumeToken("comma"));
    }

    if (!this.isEnd()) {
      throw new Error(`Unexpected token '${this.peek()?.value ?? ""}' at end of JQL query`);
    }

    return { where, orderBy };
  }

  private parseExpression(precedence = 0): ExpressionNode {
    let left = this.parseUnary();
    while (true) {
      if (this.matchKeyword("OR") && precedence <= 1) {
        this.position += 1;
        const right = this.parseExpression(1);
        left = combineNodes("OR", left, right);
        continue;
      }
      if (this.matchKeyword("AND") && precedence <= 2) {
        this.position += 1;
        const right = this.parseExpression(2);
        left = combineNodes("AND", left, right);
        continue;
      }
      break;
    }
    return left;
  }

  private parseUnary(): ExpressionNode {
    if (this.consumeKeyword("NOT")) {
      const operand = this.parseUnary();
      return negateNode(operand);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    const token = this.peek();
    if (!token) throw new Error("Unexpected end of JQL input");
    if (token.type === "lparen") {
      this.position += 1;
      const expr = this.parseExpression();
      this.expectToken("rparen");
      return { text: `(${expr.text})`, precedence: 4 };
    }
    return this.parseComparison();
  }

  private parseComparison(): ExpressionNode {
    const fieldName = this.parseFieldName();
    const fieldNode = createNode(fieldName);

    if (this.consumeKeyword("IS")) {
      const negated = this.consumeKeyword("NOT");
      if (!this.consumeKeyword("EMPTY") && !this.consumeKeyword("NULL")) {
        throw new Error("Expected EMPTY or NULL after IS in JQL");
      }
      const operator = negated ? "!=" : "=";
      return createNode(`${fieldNode.text} ${operator} NULL`);
    }

    if (this.consumeKeyword("WAS")) {
      const negated = this.consumeKeyword("NOT");
      const history = `history(${fieldName})`;
      let node: ExpressionNode;
      if (this.consumeKeyword("IN")) {
        const values = this.parseValueList();
        node = createNode(`${history} ${negated ? "NOT IN" : "IN"} (${values})`);
      } else {
        const value = this.parseValue();
        node = createNode(`${history} ${negated ? "!=" : "="} ${value.text}`);
      }
      node = this.applyHistoryQualifiers(fieldName, node);
      return node;
    }

    if (this.consumeKeyword("CHANGED")) {
      let node = createNode(`changed(${fieldName})`);
      node = this.applyHistoryQualifiers(fieldName, node);
      return node;
    }

    if (this.consumeKeyword("IN")) {
      const values = this.parseValueList();
      return createNode(`${fieldNode.text} IN (${values})`);
    }

    if (this.consumeKeyword("NOT")) {
      if (this.consumeKeyword("IN")) {
        const values = this.parseValueList();
        return createNode(`${fieldNode.text} NOT IN (${values})`);
      }
      throw new Error("Unsupported NOT clause in JQL");
    }

    const operator = this.consumeOperator();
    if (!operator) {
      throw new Error(`Expected comparator after field '${fieldName}' in JQL`);
    }
    const value = this.parseValue();

    if (operator === "~") {
      return createNode(`contains(${fieldNode.text}, ${value.text})`);
    }
    if (operator === "!~") {
      return negateNode(createNode(`contains(${fieldNode.text}, ${value.text})`));
    }
    return createNode(`${fieldNode.text} ${operator} ${value.text}`);
  }

  private applyHistoryQualifiers(fieldName: string, base: ExpressionNode): ExpressionNode {
    let result = base;
    while (true) {
      if (this.consumeKeyword("BY")) {
        const value = this.parseValue();
        result = combineNodes("AND", result, createNode(`changed_by(${fieldName}, ${value.text})`));
        continue;
      }
      if (this.consumeKeyword("AFTER")) {
        const value = this.parseValue();
        result = combineNodes("AND", result, createNode(`changed_after(${fieldName}, ${value.text})`));
        continue;
      }
      if (this.consumeKeyword("BEFORE")) {
        const value = this.parseValue();
        result = combineNodes("AND", result, createNode(`changed_before(${fieldName}, ${value.text})`));
        continue;
      }
      if (this.consumeKeyword("DURING")) {
        const [start, end] = this.parseDuringRange();
        result = combineNodes("AND", result, createNode(`changed_during(${fieldName}, ${start.text}, ${end.text})`));
        continue;
      }
      break;
    }
    return result;
  }

  private parseDuringRange(): [ExpressionNode, ExpressionNode] {
    this.expectToken("lparen");
    const start = this.parseValue();
    this.expectToken("comma");
    const end = this.parseValue();
    this.expectToken("rparen");
    return [start, end];
  }

  private parseValue(): ExpressionNode {
    const token = this.peek();
    if (!token) throw new Error("Expected value in JQL predicate");
    if (token.type === "string") {
      this.position += 1;
      return createNode(quoteLiteral(token.value));
    }
    if (token.type === "number") {
      this.position += 1;
      return createNode(token.value);
    }
    if (token.type === "operator" && token.value === "-") {
      this.position += 1;
      const value = this.parseValue();
      return createNode(`-${value.text}`, value.precedence);
    }
    if (token.type === "identifier") {
      if (/^[0-9]+(s|m|h|d|w|mo|y)$/iu.test(token.value)) {
        this.position += 1;
        return createNode(token.value.toLowerCase());
      }
      if (this.peekAhead()?.type === "lparen") {
        this.position += 1;
        return this.parseFunction(token.value);
      }
      this.position += 1;
      return createNode(quoteLiteral(token.value));
    }
    if (token.type === "keyword") {
      if (token.value === "NULL") {
        this.position += 1;
        return createNode("NULL");
      }
      if (token.value === "TRUE" || token.value === "FALSE") {
        this.position += 1;
        return createNode(token.value.toLowerCase());
      }
      if (this.peekAhead()?.type === "lparen") {
        this.position += 1;
        return this.parseFunction(token.raw ?? token.value);
      }
      this.position += 1;
      return createNode(quoteLiteral(token.raw ?? token.value));
    }
    if (token.type === "lparen") {
      this.position += 1;
      const inner = this.parseExpression();
      this.expectToken("rparen");
      return { text: `(${inner.text})`, precedence: 4 };
    }
    throw new Error(`Unsupported value token '${token.value}' in JQL`);
  }

  private parseFunction(rawName: string): ExpressionNode {
    const name = translateFunctionName(rawName);
    this.expectToken("lparen");
    const args: ExpressionNode[] = [];
    if (!this.peekToken("rparen")) {
      do {
        args.push(this.parseValue());
      } while (this.consumeToken("comma"));
    }
    this.expectToken("rparen");
    const argText = args.map((arg) => arg.text).join(", ");
    return createNode(`${name}(${argText})`);
  }

  private parseValueList(): string {
    this.expectToken("lparen");
    const values: string[] = [];
    if (!this.peekToken("rparen")) {
      do {
        values.push(this.parseValue().text);
      } while (this.consumeToken("comma"));
    }
    this.expectToken("rparen");
    return values.join(", ");
  }

  private parseFieldName(): string {
    const token = this.peek();
    if (!token || (token.type !== "identifier" && token.type !== "keyword")) {
      throw new Error("Expected field identifier in JQL");
    }
    this.position += 1;
    const raw = token.type === "identifier" ? token.value : token.raw ?? token.value;
    return translateFieldName(raw);
  }

  private consumeOperator(): string | null {
    const token = this.peek();
    if (token?.type === "operator") {
      this.position += 1;
      return token.value;
    }
    return null;
  }

  private consumeKeyword(value: string): boolean {
    if (this.matchKeyword(value)) {
      this.position += 1;
      return true;
    }
    return false;
  }

  private matchKeyword(value: string): boolean {
    const token = this.peek();
    return token?.type === "keyword" && token.value === value;
  }

  private peekKeyword(value: string): boolean {
    return this.matchKeyword(value);
  }

  private expectKeyword(value: string) {
    if (!this.consumeKeyword(value)) {
      throw new Error(`Expected keyword '${value}' in JQL`);
    }
  }

  private expectToken(type: TokenType) {
    const token = this.peek();
    if (!token || token.type !== type) {
      throw new Error(`Expected token '${type}' in JQL`);
    }
    this.position += 1;
  }

  private consumeToken(type: TokenType): boolean {
    const token = this.peek();
    if (token?.type === type) {
      this.position += 1;
      return true;
    }
    return false;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private peekAhead(offset = 1): Token | undefined {
    return this.tokens[this.position + offset];
  }

  private peekToken(type: TokenType): boolean {
    return this.peek()?.type === type;
  }

  private isEnd(): boolean {
    return this.position >= this.tokens.length;
  }
}

const createNode = (text: string, precedence = 4): ExpressionNode => ({ text, precedence });

const combineNodes = (operator: "AND" | "OR", left: ExpressionNode, right: ExpressionNode): ExpressionNode => {
  const precedence = operator === "OR" ? 1 : 2;
  const leftText = left.precedence < precedence ? `(${left.text})` : left.text;
  const rightText = right.precedence < precedence ? `(${right.text})` : right.text;
  return { text: `${leftText} ${operator} ${rightText}`, precedence };
};

const negateNode = (node: ExpressionNode): ExpressionNode => {
  const needsParens = node.precedence < 3;
  return { text: `NOT ${needsParens ? `(${node.text})` : node.text}`, precedence: 3 };
};

const quoteLiteral = (value: string): string => {
  const escaped = value.replace(/"/gu, '\\"');
  return `"${escaped}"`;
};

const translateFieldName = (raw: string): string => {
  const normalised = raw.trim().toLowerCase();
  const mapped = FIELD_TRANSLATIONS[normalised];
  if (mapped) return mapped;
  const customMatch = normalised.match(/^cf\[(?<id>[0-9]+)\]$/u);
  if (customMatch?.groups?.id) {
    return `custom.cf_${customMatch.groups.id}`;
  }
  return toSnakeCase(raw);
};

const translateFunctionName = (raw: string): string => {
  const normalised = raw.replace(/\s+/gu, "").toLowerCase();
  const mapped = FUNCTION_TRANSLATIONS[normalised];
  if (mapped) return mapped;
  return toSnakeCase(raw);
};

const toSnakeCase = (value: string): string => {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[-\s]+/gu, "_")
    .toLowerCase();
};

export function isLikelyJql(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^(FIND|COUNT|AGGREGATE|UPDATE|EXPLAIN)\b/iu.test(trimmed)) {
    return false;
  }
  return /(ORDER\s+BY|status|issuetype|cf\[[0-9]+\]|\bWAS\b|\bCHANGED\b)/iu.test(trimmed);
}

export function compileJql(
  input: string,
  options: JqlCompilationOptions = {}
): JqlCompilationResult {
  const original = input.trim();
  const lexer = new Lexer(original);
  const parser = new Parser(lexer.getTokens());
  const parsed = parser.parseQuery();

  const projection = options.projection ?? "ITEMS";
  const source = options.source ?? "work_items";

  const parts: string[] = [`FIND ${projection} FROM ${source}`];
  if (parsed.where) {
    parts.push(`WHERE ${parsed.where.text}`);
  }
  if (parsed.orderBy.length) {
    const order = parsed.orderBy.map((entry) => `${entry.field} ${entry.direction}`).join(", ");
    parts.push(`ORDER BY ${order}`);
  }

  const opql = parts.join(" ");
  const statement = parseOPQL(opql);

  return { opql, statement, original };
}

