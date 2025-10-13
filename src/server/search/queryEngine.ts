import { performance } from "node:perf_hooks";

import {
  type BaseStatement,
  type BinaryExpression,
  type Expression,
  type FindStatement,
  type FunctionExpression,
  type InExpression,
  type LiteralExpression,
  type OrderByField,
  type ProjectionField,
  type Statement,
  formatExpression,
  literalFromValue,
  parseOPQL,
} from "@/lib/opql/parser";

import {
  type EntityDefinition,
  type FieldMaskRule,
  type FieldType,
  type MaterializedRow,
  type RepositoryRow,
  type SearchRepository,
  MockSearchRepository,
} from "./repository";

export interface PrincipalContext {
  principalId: string;
  workspaceId: string;
  roles: string[];
  permissions: string[];
  allowAll?: boolean;
}

export interface QueryEngineOptions {
  repository?: SearchRepository;
  defaultLimit?: number;
}

export interface QueryRequest {
  workspaceId: string;
  principal: PrincipalContext;
  opql?: string;
  statement?: Statement;
  cursor?: string;
  limit?: number;
  types?: string[];
  explain?: boolean;
  query?: string;
}

export interface ExecutionMetrics {
  totalMs: number;
  stages: Array<{ name: string; duration: number }>;
}

export interface EngineRow {
  entityId: string;
  entityType: string;
  workspaceId: string;
  score: number;
  values: Record<string, unknown>;
  maskedFields: string[];
}

export interface QueryExecution {
  rows: EngineRow[];
  total: number;
  nextCursor?: string;
  plan: string[];
  appliedFilters: string[];
  orderBy: string[];
  projections: string[];
  metrics: ExecutionMetrics;
}

interface ExecutionContext {
  workspaceId: string;
  principal: PrincipalContext;
  repository: SearchRepository;
  targetTypes: string[];
  order: OrderByField[];
  limit: number;
  cursor?: string;
  metrics: ExecutionMetrics;
  appliedFilters: string[];
  projections: string[];
  plan: string[];
}

interface CursorPayload {
  id: string;
  order: unknown[];
}

const DEFAULT_LIMIT = 25;

const BUILTIN_FIELDS = new Set(["*", "id", "entity_id", "entityId", "type", "entity_type", "workspace_id", "score", "searchable"]);

export function toSearchResult(row: EngineRow) {
  return {
    id: row.entityId,
    type: row.entityType,
    title: String(row.values.title ?? ""),
    snippet: (row.values.snippet as string | null | undefined) ?? null,
    url: String(row.values.url ?? ""),
    project_id: (row.values.project_id as string | null | undefined) ?? null,
    updated_at: (row.values.updated_at as string | null | undefined) ?? null,
    score: typeof row.values.score === "number" ? (row.values.score as number) : row.score,
  };
}

function isFindStatement(statement: Statement): statement is FindStatement {
  return statement.type === "FIND";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isLiteral(expression: Expression): expression is LiteralExpression {
  return expression.kind === "literal";
}

function isFunction(expression: Expression): expression is FunctionExpression {
  return expression.kind === "function";
}

function isIdentifier(expression: Expression): expression is Expression & { kind: "identifier" } {
  return expression.kind === "identifier";
}

function gatherIdentifiers(expression: Expression | undefined, output: Set<string>) {
  if (!expression) return;
  switch (expression.kind) {
    case "identifier":
      output.add(expression.name);
      if (expression.path?.length) {
        expression.path.forEach((segment) => output.add(segment));
      }
      break;
    case "binary":
      gatherIdentifiers(expression.left, output);
      gatherIdentifiers(expression.right, output);
      break;
    case "unary":
      gatherIdentifiers(expression.operand, output);
      break;
    case "between":
      gatherIdentifiers(expression.value, output);
      gatherIdentifiers(expression.lower, output);
      gatherIdentifiers(expression.upper, output);
      break;
    case "in":
      gatherIdentifiers(expression.value, output);
      expression.options.forEach((option) => gatherIdentifiers(option, output));
      break;
    case "function":
      expression.args.forEach((arg) => gatherIdentifiers(arg, output));
      break;
    case "date_math":
      gatherIdentifiers(expression.base, output);
      break;
    case "history":
      gatherIdentifiers(expression.field, output);
      expression.qualifiers.forEach((qualifier) => {
        if ("value" in qualifier && qualifier.value) {
          gatherIdentifiers(qualifier.value, output);
        }
        if ("values" in qualifier && qualifier.values) {
          qualifier.values.forEach((value) => gatherIdentifiers(value, output));
        }
        if ("start" in qualifier && qualifier.start) {
          gatherIdentifiers(qualifier.start, output);
        }
        if ("end" in qualifier && qualifier.end) {
          gatherIdentifiers(qualifier.end, output);
        }
      });
      break;
    case "temporal":
      gatherIdentifiers(expression.value, output);
      gatherIdentifiers(expression.range.start, output);
      gatherIdentifiers(expression.range.end, output);
      break;
    default:
      break;
  }
}

function collectTypeFilters(expression: Expression | undefined): string[] {
  if (!expression) return [];
  const values = new Set<string>();
  const stack: Expression[] = [expression];
  while (stack.length) {
    const current = stack.pop()!;
    if (current.kind === "binary") {
      if (current.operator === "AND" || current.operator === "OR") {
        stack.push(current.left, current.right);
      } else if (
        current.operator === "=" &&
        isIdentifier(current.left) &&
        current.left.name.toLowerCase() === "type" &&
        isLiteral(current.right)
      ) {
        values.add(String(current.right.value));
      }
    } else if (current.kind === "in" && isIdentifier(current.value) && current.value.name.toLowerCase() === "type") {
      current.options.forEach((option) => {
        if (isLiteral(option)) {
          values.add(String(option.value));
        }
      });
    }
  }
  return Array.from(values);
}

function intersect(left: string[] | undefined, right: string[]): string[] | undefined {
  if (!left) return right;
  const set = new Set(left);
  return right.filter((value) => set.has(value));
}

function decodeCursor(cursor: string | undefined): CursorPayload | undefined {
  if (!cursor) return undefined;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    const parsed = JSON.parse(json) as CursorPayload;
    if (parsed && typeof parsed.id === "string" && Array.isArray(parsed.order)) {
      return parsed;
    }
    return undefined;
  } catch (_error) {
    return undefined;
  }
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function timeStage<T>(context: ExecutionContext, name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    context.metrics.stages.push({ name, duration });
  }
}

function timeStageAsync<T>(context: ExecutionContext, name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    context.metrics.stages.push({ name, duration });
  });
}

function getFieldDefinition(definition: EntityDefinition | undefined, name: string): { field?: string; type?: FieldType } {
  if (!definition) return {};
  if (definition.fields[name]) {
    return { field: name, type: definition.fields[name]!.type };
  }
  const lower = name.toLowerCase();
  const direct = Object.entries(definition.fields).find(([key]) => key.toLowerCase() === lower);
  if (direct) {
    return { field: direct[0], type: direct[1]!.type };
  }
  return {};
}

function inferFieldName(expression: Expression): string {
  if (expression.kind === "identifier") {
    return expression.name;
  }
  return formatExpression(expression);
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return right === undefined || right === null ? 0 : -1;
  if (right === undefined || right === null) return 1;

  if (typeof left === "number" && typeof right === "number") {
    return left === right ? 0 : left < right ? -1 : 1;
  }

  const leftTime = maybeTimestamp(left);
  const rightTime = maybeTimestamp(right);
  if (leftTime !== undefined && rightTime !== undefined) {
    return leftTime === rightTime ? 0 : leftTime < rightTime ? -1 : 1;
  }

  const leftString = String(left).toLowerCase();
  const rightString = String(right).toLowerCase();
  if (leftString < rightString) return -1;
  if (leftString > rightString) return 1;
  return 0;
}

function maybeTimestamp(value: unknown): number | undefined {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u.test(value)) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function evaluateValue(expression: Expression, row: MaterializedRow): unknown {
  switch (expression.kind) {
    case "literal":
      return expression.value;
    case "identifier": {
      if (expression.name === "id" || expression.name === "entity_id") {
        return row.entityId;
      }
      if (expression.name === "type" || expression.name === "entity_type") {
        return row.entityType;
      }
      if (expression.name === "workspace_id") {
        return row.workspaceId;
      }
      if (expression.name === "score") {
        return row.score;
      }
      if (Object.prototype.hasOwnProperty.call(row.values, expression.name)) {
        return row.values[expression.name];
      }
      return row.values[expression.name.toLowerCase()];
    }
    case "binary": {
      const left = evaluateValue(expression.left, row);
      const right = evaluateValue(expression.right, row);
      return evaluateBinary(expression.operator, left, right);
    }
    case "unary": {
      if (expression.operator === "NOT") {
        return !evaluateBoolean(expression.operand, row);
      }
      if (expression.operator === "-") {
        const value = evaluateValue(expression.operand, row);
        return typeof value === "number" ? -value : value;
      }
      return undefined;
    }
    case "between": {
      const value = evaluateValue(expression.value, row);
      const lower = evaluateValue(expression.lower, row);
      const upper = evaluateValue(expression.upper, row);
      const comparison = compareValues(lower, value) <= 0 && compareValues(value, upper) <= 0;
      return expression.negated ? !comparison : comparison;
    }
    case "in": {
      const value = evaluateValue(expression.value, row);
      const options = expression.options.map((option) => evaluateValue(option, row));
      const match = options.some((option) => compareValues(option, value) === 0);
      return expression.negated ? !match : match;
    }
    case "function":
      return evaluateFunction(expression, row);
    case "history":
    case "temporal":
    case "date_math":
    case "duration":
      return undefined;
    default:
      return undefined;
  }
}

function evaluateBinary(operator: string, left: unknown, right: unknown): unknown {
  switch (operator) {
    case "AND":
      return Boolean(left) && Boolean(right);
    case "OR":
      return Boolean(left) || Boolean(right);
    case "=":
    case "==":
      return compareValues(left, right) === 0;
    case "!=":
    case "<>":
      return compareValues(left, right) !== 0;
    case ">":
      return compareValues(left, right) > 0;
    case ">=":
      return compareValues(left, right) >= 0;
    case "<":
      return compareValues(left, right) < 0;
    case "<=":
      return compareValues(left, right) <= 0;
    case "LIKE":
    case "ILIKE": {
      if (typeof left !== "string" || typeof right !== "string") return false;
      const pattern = right.replace(/%/g, "").toLowerCase();
      return left.toLowerCase().includes(pattern);
    }
    case "CONTAINS": {
      if (typeof left === "string" && typeof right === "string") {
        return left.toLowerCase().includes(right.toLowerCase());
      }
      if (Array.isArray(left)) {
        return left.some((item) => String(item).toLowerCase() === String(right).toLowerCase());
      }
      return false;
    }
    default:
      return undefined;
  }
}

function evaluateFunction(expression: FunctionExpression, row: MaterializedRow): unknown {
  const name = expression.name.toLowerCase();
  if (name === "contains" && expression.args.length >= 2) {
    const haystack = evaluateValue(expression.args[0]!, row);
    const needles = expression.args.slice(1).map((arg) => evaluateValue(arg, row));
    const normalizedHaystack = Array.isArray(haystack)
      ? haystack.map((value) => String(value).toLowerCase())
      : String(haystack ?? "").toLowerCase();
    return needles.every((needle) => {
      const value = String(needle ?? "").toLowerCase();
      if (Array.isArray(normalizedHaystack)) {
        return normalizedHaystack.includes(value);
      }
      return normalizedHaystack.includes(value);
    });
  }
  if (name === "match" && expression.args.length === 2) {
    const field = evaluateValue(expression.args[0]!, row);
    const target = evaluateValue(expression.args[1]!, row);
    return String(field ?? "").toLowerCase().includes(String(target ?? "").toLowerCase());
  }
  if (name === "array") {
    return expression.args.map((arg) => evaluateValue(arg, row));
  }
  return undefined;
}

function evaluateBoolean(expression: Expression, row: MaterializedRow): boolean {
  const value = evaluateValue(expression, row);
  if (typeof value === "boolean") return value;
  return Boolean(value);
}

function applyFieldMask(values: Record<string, unknown>, rules: Record<string, FieldMaskRule>, principal: PrincipalContext) {
  const masked: string[] = [];
  const result: Record<string, unknown> = { ...values };
  for (const [field, rule] of Object.entries(rules)) {
    if (!rule.required || principal.permissions.includes(rule.required)) {
      continue;
    }
    masked.push(field);
    result[field] = rule.mask ?? null;
  }
  return { values: result, masked };
}

class FindNode {
  constructor(private repository: SearchRepository) {}

  describe(): string[] {
    return ["FIND"];
  }

  async execute(context: ExecutionContext): Promise<{ rows: RepositoryRow[]; total: number }> {
    return timeStageAsync(context, "find", async () => {
      const rows = await this.repository.list(context.workspaceId, context.targetTypes);
      return { rows, total: rows.length };
    });
  }
}

class PermissionNode {
  constructor(private input: FindNode) {}

  describe(): string[] {
    return [...this.input.describe(), "PERMISSIONS"];
  }

  async execute(context: ExecutionContext): Promise<{ rows: MaterializedRow[]; total: number }> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "permissions", () => {
      const allowed = upstream.rows.filter((row) => {
        if (context.principal.allowAll) return true;
        const required = ensureArray(row.permissions?.required);
        if (!required.length) return true;
        const perms = new Set(context.principal.permissions);
        return required.every((perm) => perms.has(perm));
      });
      const materialized = allowed.map<MaterializedRow>((row) => {
        const applied = row.permissions?.fieldMasks
          ? applyFieldMask(row.values, row.permissions.fieldMasks, context.principal)
          : { values: row.values, masked: [] };
        return {
          entityId: row.entityId,
          entityType: row.entityType,
          workspaceId: row.workspaceId,
          score: row.score,
          values: applied.values,
          maskedFields: applied.masked,
        } satisfies MaterializedRow;
      });
      return { rows: materialized, total: materialized.length };
    });
  }
}

class ApplyNode {
  constructor(private input: PermissionNode, private expression: Expression) {}

  describe(): string[] {
    return [...this.input.describe(), "APPLY"];
  }

  async execute(context: ExecutionContext): Promise<{ rows: MaterializedRow[]; total: number }> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "apply", () => {
      context.appliedFilters.push(formatExpression(this.expression));
      const rows = upstream.rows.filter((row) => evaluateBoolean(this.expression, row));
      return { rows, total: rows.length };
    });
  }
}

class SortNode {
  constructor(private input: LogicalPlan<MaterializedRow>, private order: OrderByField[]) {}

  describe(): string[] {
    return [...this.input.describe(), "SORT"];
  }

  async execute(context: ExecutionContext): Promise<{ rows: MaterializedRow[]; total: number }> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "sort", () => {
      if (!this.order.length) {
        const sorted = [...upstream.rows].sort((a, b) => compareValues(b.score, a.score) || a.entityId.localeCompare(b.entityId));
        return { rows: sorted, total: sorted.length };
      }
      const sorted = [...upstream.rows].sort((a, b) => compareByOrder(a, b, this.order));
      return { rows: sorted, total: sorted.length };
    });
  }
}

class LimitNode {
  constructor(private input: LogicalPlan<MaterializedRow>, private limit: number, private cursor?: string, private order: OrderByField[]) {}

  describe(): string[] {
    return [...this.input.describe(), "LIMIT"];
  }

  async execute(context: ExecutionContext): Promise<{ rows: MaterializedRow[]; total: number; nextCursor?: string }> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "limit", () => {
      const decoded = decodeCursor(this.cursor);
      let start = 0;
      if (decoded) {
        start = findCursorIndex(upstream.rows, decoded, this.order);
        if (start >= 0) {
          start += 1;
        } else {
          start = 0;
        }
      }
      const page = upstream.rows.slice(start, start + this.limit);
      const hasMore = start + this.limit < upstream.rows.length;
      const lastRow = hasMore && page.length ? page[page.length - 1]! : undefined;
      const nextCursor = hasMore && lastRow
        ? encodeCursor({ id: lastRow.entityId, order: buildOrderValues(lastRow, this.order) })
        : undefined;
      return { rows: page, total: upstream.total, nextCursor };
    });
  }
}

class ReturnNode {
  constructor(private input: LogicalPlan<MaterializedRow>, private projections: ProjectionField[] | undefined) {}

  describe(): string[] {
    return [...this.input.describe(), "RETURN"];
  }

  async execute(context: ExecutionContext): Promise<QueryExecution> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "return", () => {
      if (this.projections?.length) {
        const formatted = this.projections.map((projection) => formatExpression(projection.expression));
        context.projections.push(...formatted);
      }
      const rows = upstream.rows.map<EngineRow>((row) => {
        const values = this.projectRow(row);
        return {
          entityId: row.entityId,
          entityType: row.entityType,
          workspaceId: row.workspaceId,
          score: typeof values.score === "number" ? (values.score as number) : row.score,
          values,
          maskedFields: [...row.maskedFields],
        } satisfies EngineRow;
      });
      return {
        rows,
        total: upstream.total,
        nextCursor: upstream.nextCursor,
        plan: context.plan,
        appliedFilters: context.appliedFilters,
        orderBy: context.order.map((entry) => formatExpression(entry.expression)),
        projections: context.projections,
        metrics: context.metrics,
      } satisfies QueryExecution;
    });
  }

  private projectRow(row: MaterializedRow): Record<string, unknown> {
    if (!this.projections?.length) {
      return { ...row.values, score: row.score };
    }
    if (this.projections.some((projection) => isIdentifier(projection.expression) && projection.expression.name === "*")) {
      return { ...row.values, score: row.score };
    }
    const projected: Record<string, unknown> = {};
    for (const projection of this.projections) {
      const value = evaluateValue(projection.expression, row);
      const key = projection.alias ?? inferFieldName(projection.expression);
      projected[key] = value;
    }
    if (!Object.prototype.hasOwnProperty.call(projected, "id")) {
      projected.id = row.entityId;
    }
    if (!Object.prototype.hasOwnProperty.call(projected, "type")) {
      projected.type = row.entityType;
    }
    if (!Object.prototype.hasOwnProperty.call(projected, "score")) {
      projected.score = row.score;
    }
    return projected;
  }
}

interface LogicalPlan<T> {
  describe(): string[];
  execute(context: ExecutionContext): Promise<{ rows: T[]; total: number; nextCursor?: string }>;
}

function compareByOrder(left: MaterializedRow, right: MaterializedRow, order: OrderByField[]): number {
  for (const field of order) {
    const direction = field.direction === "DESC" ? -1 : 1;
    const leftValue = evaluateValue(field.expression, left);
    const rightValue = evaluateValue(field.expression, right);
    const comparison = compareValues(leftValue, rightValue);
    if (comparison !== 0) {
      return comparison * direction;
    }
  }
  return left.entityId.localeCompare(right.entityId);
}

function buildOrderValues(row: MaterializedRow, order: OrderByField[]): unknown[] {
  if (!order.length) {
    return [row.score, row.entityId];
  }
  return order.map((entry) => evaluateValue(entry.expression, row));
}

function findCursorIndex(rows: MaterializedRow[], cursor: CursorPayload, order: OrderByField[]): number {
  return rows.findIndex((row) => {
    const values = buildOrderValues(row, order);
    for (let index = 0; index < cursor.order.length; index += 1) {
      const comparison = compareValues(values[index], cursor.order[index]);
      if (comparison !== 0) {
        return false;
      }
    }
    return row.entityId === cursor.id;
  });
}

function resolveSourceType(source: string | undefined, repository: SearchRepository): string[] | undefined {
  if (!source) return undefined;
  const normalized = source.toLowerCase();
  if (normalized === "documents" || normalized === "search") {
    return repository.listEntityTypes();
  }
  const known = repository.listEntityTypes();
  const direct = known.find((type) => type.toLowerCase() === normalized);
  if (direct) return [direct];
  const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
  const match = known.find((type) => type.toLowerCase() === singular);
  return match ? [match] : undefined;
}

export class QueryEngine {
  private repository: SearchRepository;
  private defaultLimit: number;

  constructor(options: QueryEngineOptions = {}) {
    this.repository = options.repository ?? new MockSearchRepository();
    this.defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  }

  getRepository(): SearchRepository {
    return this.repository;
  }

  async execute(request: QueryRequest): Promise<QueryExecution> {
    const start = performance.now();
    const statement = this.prepareStatement(request);
    if (!isFindStatement(statement)) {
      throw new Error(`Only FIND statements are supported, received '${statement.type}'`);
    }

    const base: BaseStatement = statement;
    const targetTypes = this.resolveTargetTypes(statement, request.types);
    if (!targetTypes.length) {
      throw new Error("No entity types matched the query context");
    }

    this.validateStatement(statement, targetTypes);

    const order = this.resolveOrder(statement, targetTypes);
    const limit = Math.max(1, request.limit ?? base.limit ?? this.defaultLimit);

    const metrics: ExecutionMetrics = { totalMs: 0, stages: [] };
    const context: ExecutionContext = {
      workspaceId: request.workspaceId,
      principal: request.principal,
      repository: this.repository,
      targetTypes,
      order,
      limit,
      cursor: request.cursor ?? base.cursor,
      metrics,
      appliedFilters: [],
      projections: [],
      plan: [],
    };

    const plan = this.buildPlan(statement, context);
    context.plan = plan.describe();
    const execution = await plan.execute(context);
    execution.metrics.totalMs = performance.now() - start;
    execution.plan = context.plan;
    execution.appliedFilters = [...new Set(context.appliedFilters)];
    execution.orderBy = context.order.map((entry) => formatExpression(entry.expression));
    execution.projections = [...new Set(context.projections)];
    return execution;
  }

  validate(opql: string): { valid: boolean; error?: string } {
    try {
      const statement = parseOPQL(opql.trim());
      if (!isFindStatement(statement)) {
        return { valid: false, error: "Only FIND statements are supported" };
      }
      const targetTypes = this.resolveTargetTypes(statement);
      this.validateStatement(statement, targetTypes.length ? targetTypes : this.repository.listEntityTypes());
      return { valid: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: message };
    }
  }

  private prepareStatement(request: QueryRequest): FindStatement {
    if (request.statement) {
      if (!isFindStatement(request.statement)) {
        throw new Error("QueryEngine only supports FIND statements");
      }
      return clone(request.statement);
    }

    if (request.opql) {
      const parsed = parseOPQL(request.opql.trim());
      if (!isFindStatement(parsed)) {
        throw new Error("QueryEngine only supports FIND statements");
      }
      return parsed;
    }

    if (request.query) {
      return this.buildFullTextStatement(request.query, request.types);
    }

    throw new Error("Query request must include an OPQL statement or query string");
  }

  private buildFullTextStatement(query: string, types?: string[]): FindStatement {
    const tokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .map((token) => token.trim())
      .filter(Boolean);

    let where: Expression | undefined;
    for (const token of tokens) {
      const match: Expression = {
        kind: "function",
        name: "contains",
        args: [
          { kind: "identifier", name: "searchable" },
          { kind: "literal", value: token, valueType: "string" },
        ],
      } satisfies FunctionExpression;
      where = where
        ? ({ kind: "binary", operator: "AND", left: where, right: match } as BinaryExpression)
        : match;
    }

    if (types?.length) {
      const typeFilter: Expression = {
        kind: "in",
        value: { kind: "identifier", name: "type" },
        options: types.map((type) => literalFromValue(type)),
      } satisfies InExpression;
      where = where
        ? ({ kind: "binary", operator: "AND", left: where, right: typeFilter } as BinaryExpression)
        : typeFilter;
    }

    return {
      type: "FIND",
      projections: [{ expression: { kind: "identifier", name: "*" } }],
      source: undefined,
      where,
      orderBy: [
        { expression: { kind: "identifier", name: "score" }, direction: "DESC" },
        { expression: { kind: "identifier", name: "updated_at" }, direction: "DESC" },
      ],
    } satisfies FindStatement;
  }

  private resolveTargetTypes(statement: FindStatement, explicit?: string[]): string[] {
    const sourceTypes = resolveSourceType(statement.source, this.repository);
    const whereTypes = collectTypeFilters(statement.where);
    let types = this.repository.listEntityTypes();
    if (explicit?.length) {
      types = intersect(explicit, types) ?? types;
    }
    if (sourceTypes?.length) {
      types = intersect(types, sourceTypes) ?? types;
    }
    if (whereTypes.length) {
      types = intersect(types, whereTypes) ?? types;
    }
    return types;
  }

  private resolveOrder(statement: FindStatement, targetTypes: string[]): OrderByField[] {
    if (statement.orderBy?.length) {
      return statement.orderBy;
    }
    const definitions = targetTypes.map((type) => this.repository.getDefinition(type));
    const defaultOrder = definitions
      .map((definition) => definition?.defaultOrder)
      .filter((order): order is OrderByField => Boolean(order));
    if (defaultOrder.length) {
      return defaultOrder;
    }
    return [
      { expression: { kind: "identifier", name: "score" }, direction: "DESC" },
      { expression: { kind: "identifier", name: "updated_at" }, direction: "DESC" },
    ];
  }

  private buildPlan(statement: FindStatement, context: ExecutionContext): ReturnNode {
    const find = new FindNode(this.repository);
    const permissions = new PermissionNode(find);
    let current: LogicalPlan<MaterializedRow> = permissions;
    if (statement.where) {
      const apply = new ApplyNode(permissions, statement.where);
      current = apply;
    }
    const sort = new SortNode(current, context.order);
    const limit = new LimitNode(sort, context.limit, context.cursor, context.order);
    const plan = new ReturnNode(limit, statement.projections);
    return plan;
  }

  private validateStatement(statement: FindStatement, targetTypes: string[]) {
    const identifiers = new Set<string>();
    gatherIdentifiers(statement.where, identifiers);
    statement.orderBy?.forEach((entry) => gatherIdentifiers(entry.expression, identifiers));
    statement.projections?.forEach((projection) => gatherIdentifiers(projection.expression, identifiers));

    const definitions = targetTypes.map((type) => this.repository.getDefinition(type));

    for (const identifier of identifiers) {
      if (BUILTIN_FIELDS.has(identifier)) continue;
      const presentInAll = definitions.every((definition) => {
        if (!definition) return false;
        const { field } = getFieldDefinition(definition, identifier);
        return Boolean(field);
      });
      if (!presentInAll) {
        throw new Error(`Unknown field '${identifier}' for entity types ${targetTypes.join(", ")}`);
      }
    }

    this.validateTypeConsistency(statement.where, definitions);
  }

  private validateTypeConsistency(expression: Expression | undefined, definitions: Array<EntityDefinition | undefined>) {
    if (!expression) return;
    switch (expression.kind) {
      case "binary": {
        if (isIdentifier(expression.left) && isLiteral(expression.right)) {
          this.ensureLiteralMatchesField(expression.left.name, expression.right, definitions);
        }
        if (isLiteral(expression.left) && isIdentifier(expression.right)) {
          this.ensureLiteralMatchesField(expression.right.name, expression.left, definitions);
        }
        this.validateTypeConsistency(expression.left, definitions);
        this.validateTypeConsistency(expression.right, definitions);
        break;
      }
      case "in": {
        if (isIdentifier(expression.value)) {
          expression.options.forEach((option) => {
            if (isLiteral(option)) {
              this.ensureLiteralMatchesField(expression.value.name, option, definitions);
            }
          });
        }
        break;
      }
      case "between": {
        if (isIdentifier(expression.value)) {
          if (isLiteral(expression.lower)) {
            this.ensureLiteralMatchesField(expression.value.name, expression.lower, definitions);
          }
          if (isLiteral(expression.upper)) {
            this.ensureLiteralMatchesField(expression.value.name, expression.upper, definitions);
          }
        }
        break;
      }
      case "function": {
        expression.args.forEach((arg) => this.validateTypeConsistency(arg, definitions));
        break;
      }
      case "unary":
        this.validateTypeConsistency(expression.operand, definitions);
        break;
      default:
        break;
    }
  }

  private ensureLiteralMatchesField(name: string, literal: LiteralExpression, definitions: Array<EntityDefinition | undefined>) {
    if (BUILTIN_FIELDS.has(name)) return;
    const matching = definitions
      .map((definition) => (definition ? getFieldDefinition(definition, name) : { field: undefined, type: undefined }))
      .filter((entry) => entry.field && entry.type) as Array<{ field: string; type: FieldType }>;
    if (!matching.length) {
      throw new Error(`Unknown field '${name}'`);
    }
    const expectedTypes = new Set(matching.map((entry) => entry.type));
    const literalType = literal.valueType;
    if (literalType === "number" && !expectedTypes.has("number")) {
      throw new Error(`Field '${name}' expects ${Array.from(expectedTypes).join("/")} but received number`);
    }
    if (literalType === "string" && expectedTypes.has("number")) {
      throw new Error(`Field '${name}' expects numeric value`);
    }
  }
}

export type { QueryExecution as QueryEngineResult };
