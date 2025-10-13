import { performance } from "node:perf_hooks";

import {
  type AggregateStatement,
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
  type FieldType,
  type SearchRepository,
  MockSearchRepository,
} from "./repository";

import { buildAggregatePlan, buildFindPlan } from "./plan/planner";
import { evaluateValue, normalizeAlias, timeStage } from "./plan/runtime";
import type { PlanExecutionContext, PlanResult, PlannerOptions, RuntimeRow } from "./plan/types";
import type { MaterializedRow } from "./repository";

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
  graphDepthCap?: number;
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

const DEFAULT_LIMIT = 25;

const BUILTIN_FIELDS = new Set(["*", "id", "entity_id", "entityId", "type", "entity_type", "workspace_id", "score", "searchable"]);

const SOURCE_SYNONYMS: Record<string, string[]> = {
  documents: ["doc"],
  document: ["doc"],
  docs: ["doc"],
  doc: ["doc"],
  files: ["doc"],
  file: ["doc"],
  pages: ["doc"],
  tasks: ["task"],
  task: ["task"],
  projects: ["project"],
  project: ["project"],
  comments: ["comment"],
  comment: ["comment"],
  people: ["person"],
  persons: ["person"],
  users: ["person"],
  teammates: ["person"],
};

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

function isAggregateStatement(statement: Statement): statement is AggregateStatement {
  return statement.type === "AGGREGATE";
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

function resolveSourceType(source: string | undefined, repository: SearchRepository): string[] | undefined {
  if (!source) return undefined;
  const normalized = source.toLowerCase();
  if (normalized === "search") {
    return repository.listEntityTypes();
  }
  const alias = SOURCE_SYNONYMS[normalized];
  if (alias?.length) {
    return alias;
  }
  const known = repository.listEntityTypes();
  const direct = known.find((type) => type.toLowerCase() === normalized);
  if (direct) return [direct];
  const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
  const synonym = SOURCE_SYNONYMS[singular];
  if (synonym?.length) {
    return synonym;
  }
  const match = known.find((type) => type.toLowerCase() === singular);
  return match ? [match] : undefined;
}

export class QueryEngine {
  private repository: SearchRepository;
  private defaultLimit: number;
  private graphDepthCap: number;

  constructor(options: QueryEngineOptions = {}) {
    this.repository = options.repository ?? new MockSearchRepository();
    this.defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
    this.graphDepthCap = options.graphDepthCap ?? 3;
  }

  getRepository(): SearchRepository {
    return this.repository;
  }

  async execute(request: QueryRequest): Promise<QueryExecution> {
    const start = performance.now();
    const statement = this.prepareStatement(request);
    const base: BaseStatement = statement;
    const targetTypes = this.resolveTargetTypes(statement, request.types);
    if (!targetTypes.length) {
      throw new Error("No entity types matched the query context");
    }

    this.validateStatement(statement, targetTypes);

    const order = this.resolveOrder(statement, targetTypes);
    const stableOrder = this.resolveStableOrder(statement);
    const limit = Math.max(1, request.limit ?? base.limit ?? this.defaultLimit);
    const rootAlias = this.resolveRootAlias(base);
    const aliasSources = this.buildAliasSources(statement, targetTypes);

    const metrics: ExecutionMetrics = { totalMs: 0, stages: [] };
    const context: PlanExecutionContext = {
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
      stableOrder,
      rootAlias,
      aliasSources,
      graphDepthCap: this.graphDepthCap,
    };

    const plannerOptions: PlannerOptions = {
      rootAlias,
      aliasSources,
      graphDepthCap: this.graphDepthCap,
      stableOrder,
      cursor: request.cursor ?? base.cursor,
    };

    const plan = statement.type === "AGGREGATE"
      ? buildAggregatePlan({ statement, context }, plannerOptions)
      : buildFindPlan({ statement, context }, plannerOptions);

    context.plan = plan.describe();
    const result = await plan.execute(context);
    const execution = this.finalizeExecution(statement, result, context);
    execution.metrics.totalMs = performance.now() - start;
    execution.plan = context.plan;
    return execution;
  }

  validate(opql: string): { valid: boolean; error?: string } {
    try {
      const statement = parseOPQL(opql.trim());
      if (!isFindStatement(statement) && !isAggregateStatement(statement)) {
        return { valid: false, error: "Only FIND and AGGREGATE statements are supported" };
      }
      const targetTypes = this.resolveTargetTypes(statement);
      this.validateStatement(statement, targetTypes.length ? targetTypes : this.repository.listEntityTypes());
      return { valid: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: message };
    }
  }

  private prepareStatement(request: QueryRequest): FindStatement | AggregateStatement {
    if (request.statement) {
      if (!isFindStatement(request.statement) && !isAggregateStatement(request.statement)) {
        throw new Error("QueryEngine only supports FIND and AGGREGATE statements");
      }
      return clone(request.statement);
    }

    if (request.opql) {
      const parsed = parseOPQL(request.opql.trim());
      if (!isFindStatement(parsed) && !isAggregateStatement(parsed)) {
        throw new Error("QueryEngine only supports FIND and AGGREGATE statements");
      }
      return parsed as FindStatement | AggregateStatement;
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

  private resolveTargetTypes(statement: FindStatement | AggregateStatement, explicit?: string[]): string[] {
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

  private resolveOrder(statement: FindStatement | AggregateStatement, targetTypes: string[]): OrderByField[] {
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

  private resolveStableOrder(statement: BaseStatement): OrderByField[] {
    if (!statement.stableBy?.length) {
      return [];
    }
    return statement.stableBy.map((expression) => ({ expression, direction: "ASC" as const }));
  }

  private resolveRootAlias(statement: BaseStatement): string {
    if (statement.alias) return statement.alias;
    if (statement.source) return statement.source;
    return "search";
  }

  private buildAliasSources(statement: FindStatement | AggregateStatement, targetTypes: string[]): Record<string, string[]> {
    const sources: Record<string, string[]> = {};
    const root = this.resolveRootAlias(statement);
    sources[normalizeAlias(root)] = targetTypes;
    statement.joins?.forEach((join) => {
      const alias = normalizeAlias(join.alias ?? join.source);
      const types = resolveSourceType(join.source, this.repository) ?? [];
      if (types.length) {
        sources[alias] = types;
      }
    });
    statement.relations?.forEach((relation) => {
      const alias = normalizeAlias(relation.relation);
      const types = resolveSourceType(relation.relation, this.repository) ?? [];
      if (types.length) {
        sources[alias] = types;
      }
    });
    return sources;
  }

  private finalizeExecution(
    statement: FindStatement | AggregateStatement,
    result: PlanResult<RuntimeRow>,
    context: PlanExecutionContext
  ): QueryExecution {
    return timeStage(context, "finalize", () => {
      if (statement.type === "AGGREGATE") {
        statement.aggregates.forEach((aggregate) => {
          context.projections.push(aggregate.alias ?? formatExpression(aggregate.expression));
        });
        statement.groupBy?.forEach((expr) => context.projections.push(formatExpression(expr)));
        if (statement.having) {
          context.appliedFilters.push(formatExpression(statement.having));
        }
      }

      const projections = statement.type === "FIND" ? statement.projections : undefined;
      const rows = result.rows.map((row) => this.runtimeRowToEngineRow(row, projections, context));
      const orderExpressions = [...context.order, ...context.stableOrder].map((entry) => formatExpression(entry.expression));

      return {
        rows,
        total: result.total,
        nextCursor: result.nextCursor,
        plan: context.plan,
        appliedFilters: [...new Set(context.appliedFilters)],
        orderBy: [...new Set(orderExpressions)],
        projections: [...new Set(context.projections)],
        metrics: context.metrics,
      } satisfies QueryExecution;
    });
  }

  private runtimeRowToEngineRow(
    row: RuntimeRow,
    projections: ProjectionField[] | undefined,
    context: PlanExecutionContext
  ): EngineRow {
    const primary = this.selectPrimaryRow(row) ?? this.createSyntheticEntity(row, context);
    const values = this.projectRow(row, projections, context, primary);
    const score = typeof values.score === "number" ? (values.score as number) : primary.score;
    return {
      entityId: primary.entityId,
      entityType: primary.entityType,
      workspaceId: primary.workspaceId,
      score,
      values,
      maskedFields: Array.from(row.maskedFields),
    } satisfies EngineRow;
  }

  private projectRow(
    row: RuntimeRow,
    projections: ProjectionField[] | undefined,
    context: PlanExecutionContext,
    primary: MaterializedRow
  ): Record<string, unknown> {
    if (!projections?.length || projections.some((projection) => isIdentifier(projection.expression) && projection.expression.name === "*")) {
      return this.buildFullProjection(row, primary);
    }
    const projected: Record<string, unknown> = {};
    for (const projection of projections) {
      const value = evaluateValue(projection.expression, row, context);
      const key = projection.alias ?? inferFieldName(projection.expression);
      projected[key] = value;
    }
    if (!Object.prototype.hasOwnProperty.call(projected, "id")) {
      projected.id = primary.entityId;
    }
    if (!Object.prototype.hasOwnProperty.call(projected, "type")) {
      projected.type = primary.entityType;
    }
    if (!Object.prototype.hasOwnProperty.call(projected, "score")) {
      projected.score = primary.score;
    }
    return projected;
  }

  private buildFullProjection(row: RuntimeRow, primary: MaterializedRow): Record<string, unknown> {
    const values: Record<string, unknown> = { ...primary.values, id: primary.entityId, type: primary.entityType, score: primary.score };
    for (const [alias, materialized] of Object.entries(row.aliases)) {
      if (!materialized) {
        values[alias] = null;
        continue;
      }
      if (primary && materialized.entityId === primary.entityId) {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(values, alias)) {
        values[alias] = { ...materialized.values, id: materialized.entityId, type: materialized.entityType, score: materialized.score };
      }
    }
    for (const [key, computed] of Object.entries(row.computed)) {
      values[key] = computed;
    }
    return values;
  }

  private selectPrimaryRow(row: RuntimeRow): MaterializedRow | undefined {
    if (row.base) {
      return row.base;
    }
    for (const candidate of Object.values(row.aliases)) {
      if (candidate) {
        return candidate;
      }
    }
    return undefined;
  }

  private createSyntheticEntity(row: RuntimeRow, context: PlanExecutionContext): MaterializedRow {
    const encoded = Buffer.from(JSON.stringify(row.computed)).toString("base64").replace(/=+$/u, "").replace(/\+/gu, "-").replace(/\//gu, "_");
    const identifier = `virtual-${encoded}`;
    return {
      entityId: identifier,
      entityType: "virtual",
      workspaceId: context.workspaceId,
      score: 0,
      values: {},
      maskedFields: [],
    } satisfies MaterializedRow;
  }

  private validateStatement(statement: FindStatement | AggregateStatement, targetTypes: string[]) {
    const identifiers = new Set<string>();
    gatherIdentifiers(statement.where, identifiers);
    statement.orderBy?.forEach((entry) => gatherIdentifiers(entry.expression, identifiers));
    if (statement.type === "FIND") {
      statement.projections?.forEach((projection) => gatherIdentifiers(projection.expression, identifiers));
    } else if (statement.type === "AGGREGATE") {
      statement.aggregates.forEach((aggregate) => gatherIdentifiers(aggregate.expression, identifiers));
      statement.groupBy?.forEach((expr) => gatherIdentifiers(expr, identifiers));
      if (statement.having) {
        gatherIdentifiers(statement.having, identifiers);
      }
    }

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
    if (statement.type === "AGGREGATE") {
      statement.aggregates.forEach((aggregate) => this.validateTypeConsistency(aggregate.expression, definitions));
      statement.groupBy?.forEach((expr) => this.validateTypeConsistency(expr, definitions));
      if (statement.having) {
        this.validateTypeConsistency(statement.having, definitions);
      }
    }
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
