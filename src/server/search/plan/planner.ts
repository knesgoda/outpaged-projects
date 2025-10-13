import {
  type AggregateStatement,
  type Expression,
  type FindStatement,
  type JoinSpec,
  type OrderByField,
  type ProjectionField,
  type RelationSpec,
  formatExpression,
} from "@/lib/opql/parser";

import type { MaterializedRow, RepositoryRow } from "../repository";

import {
  attachAlias,
  buildOrderResolver,
  buildOrderValues,
  compareByOrder,
  createEmptyRuntimeRow,
  createRuntimeRow,
  decodeCursor,
  encodeCursor,
  evaluateBoolean,
  evaluateValue,
  findCursorIndex,
  normalizeAlias,
  setComputed,
  timeStage,
  timeStageAsync,
} from "./runtime";
import { materializeRows } from "./materialize";
import type {
  AggregatePlanConfig,
  BaseSourcePlan,
  LogicalPlan,
  PlanExecutionContext,
  PlanResult,
  PlannerInput,
  PlannerOptions,
  RuntimeRow,
} from "./types";

const DEFAULT_STAGE = "FIND";

class FindNode implements BaseSourcePlan {
  describe(): string[] {
    return [DEFAULT_STAGE];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RepositoryRow>> {
    return timeStageAsync(context, "find", async () => {
      const rows = await context.repository.list(context.workspaceId, context.targetTypes);
      return { rows, total: rows.length } satisfies PlanResult<RepositoryRow>;
    });
  }
}

class PermissionNode implements LogicalPlan<RuntimeRow> {
  constructor(private input: BaseSourcePlan, private alias: string) {}

  describe(): string[] {
    return [...this.input.describe(), "PERMISSIONS"];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RuntimeRow>> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "permissions", () => {
      const materialized = materializeRows(upstream.rows, context);
      const runtime = materialized.map((row) => createRuntimeRow(row, this.alias));
      return { rows: runtime, total: runtime.length } satisfies PlanResult<RuntimeRow>;
    });
  }
}

class RelationNode implements LogicalPlan<RuntimeRow> {
  constructor(private input: LogicalPlan<RuntimeRow>, private relations: RelationSpec[] | undefined, private options: PlannerOptions) {}

  describe(): string[] {
    if (!this.relations?.length) {
      return this.input.describe();
    }
    return [...this.input.describe(), "RELATE"];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RuntimeRow>> {
    const upstream = await this.input.execute(context);
    if (!this.relations?.length) {
      return upstream;
    }
    return timeStage(context, "relate", () => {
      const { rows } = upstream;
      if (!rows.length) {
        return upstream;
      }

      const graphRows = context.repository.snapshot?.(context.workspaceId) ?? [];
      const materialized = materializeRows(graphRows, context);
      const indexByProject = buildProjectIndex(materialized);
      const visited = new Set<string>(rows.flatMap((row) => collectIdentifiers(row)));
      const additions: RuntimeRow[] = [];

      for (const relation of this.relations) {
        const depth = relation.depth ?? 1;
        if (depth > this.options.graphDepthCap) {
          throw new Error(`Graph depth ${depth} exceeds allowed cap of ${this.options.graphDepthCap}`);
        }
        const targetTypes = this.options.aliasSources[normalizeAlias(relation.relation)] ?? [];
        const traversal = traverseRelation(rows, materialized, indexByProject, targetTypes, depth);
        for (const candidate of traversal) {
          if (visited.has(candidate.entityId)) continue;
          visited.add(candidate.entityId);
          additions.push(createRuntimeRow(candidate, relation.relation));
        }
      }

      const combined = [...rows, ...additions];
      return { rows: combined, total: combined.length } satisfies PlanResult<RuntimeRow>;
    });
  }
}

class ApplyNode implements LogicalPlan<RuntimeRow> {
  constructor(private input: LogicalPlan<RuntimeRow>, private expression: Expression) {}

  describe(): string[] {
    return [...this.input.describe(), "APPLY"];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RuntimeRow>> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "apply", () => {
      context.appliedFilters.push(formatExpression(this.expression));
      const filtered = upstream.rows.filter((row) => evaluateBoolean(this.expression, row, context));
      return { rows: filtered, total: filtered.length } satisfies PlanResult<RuntimeRow>;
    });
  }
}

class JoinNode implements LogicalPlan<RuntimeRow> {
  constructor(private input: LogicalPlan<RuntimeRow>, private joins: JoinSpec[] | undefined, private options: PlannerOptions) {}

  describe(): string[] {
    if (!this.joins?.length) {
      return this.input.describe();
    }
    return [...this.input.describe(), "JOIN"];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RuntimeRow>> {
    const upstream = await this.input.execute(context);
    if (!this.joins?.length) {
      return upstream;
    }
    return timeStageAsync(context, "join", async () => {
      let current = upstream.rows;
      for (const join of this.joins) {
        current = await this.applyJoin(current, join, context);
      }
      return { rows: current, total: current.length } satisfies PlanResult<RuntimeRow>;
    });
  }

  private async applyJoin(rows: RuntimeRow[], join: JoinSpec, context: PlanExecutionContext): Promise<RuntimeRow[]> {
    const alias = normalizeAlias(join.alias ?? join.source);
    const sources = this.options.aliasSources[alias] ?? [join.source.toLowerCase()];
    const repositoryRows = await context.repository.list(context.workspaceId, sources);
    const materialized = materializeRows(repositoryRows, context);
    const unmatched = new Map<string, MaterializedRow>();
    for (const row of materialized) {
      unmatched.set(row.entityId, row);
    }

    const results: RuntimeRow[] = [];
    for (const row of rows) {
      let matched = false;
      for (const candidate of materialized) {
        const attached = attachAlias(row, join.alias ?? join.source, candidate);
        if (evaluateBoolean(join.condition, attached, context)) {
          matched = true;
          unmatched.delete(candidate.entityId);
          results.push(attached);
        }
      }
      if (!matched) {
        if (join.type === "LEFT" || join.type === "FULL") {
          results.push(attachAlias(row, join.alias ?? join.source, null));
        }
      }
    }

    if (join.type === "RIGHT" || join.type === "FULL") {
      for (const candidate of unmatched.values()) {
        const empty = createEmptyRuntimeRow();
        const attached = attachAlias(empty, join.alias ?? join.source, candidate);
        results.push(attached);
      }
    }

    return results;
  }
}

class SortNode implements LogicalPlan<RuntimeRow> {
  constructor(private input: LogicalPlan<RuntimeRow>, private order: OrderByField[], private stable: OrderByField[]) {}

  describe(): string[] {
    return [...this.input.describe(), "SORT"];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RuntimeRow>> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "sort", () => {
      const resolvers = buildResolvers([...this.order, ...this.stable], context);
      if (!resolvers.length) {
        const fallback = [...upstream.rows].sort((a, b) => (b.base?.score ?? 0) - (a.base?.score ?? 0));
        return { rows: fallback, total: fallback.length } satisfies PlanResult<RuntimeRow>;
      }
      const ordered = [...upstream.rows].sort((a, b) => compareByOrder(a, b, resolvers));
      return { rows: ordered, total: ordered.length } satisfies PlanResult<RuntimeRow>;
    });
  }
}

class LimitNode implements LogicalPlan<RuntimeRow> {
  constructor(private input: LogicalPlan<RuntimeRow>, private limit: number, private cursor: string | undefined, private order: OrderByField[], private stable: OrderByField[]) {}

  describe(): string[] {
    return [...this.input.describe(), "LIMIT"];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RuntimeRow>> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "limit", () => {
      const decoded = decodeCursor(this.cursor ?? context.cursor);
      const resolvers = buildResolvers([...this.order, ...this.stable], context);
      let start = 0;
      if (decoded) {
        start = findCursorIndex(upstream.rows, decoded, resolvers);
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
        ? encodeCursor({ id: getIdentifier(lastRow), order: buildOrderValues(lastRow, resolvers) })
        : undefined;
      return { rows: page, total: upstream.total, nextCursor } satisfies PlanResult<RuntimeRow>;
    });
  }
}

class AggregateNode implements LogicalPlan<RuntimeRow> {
  constructor(private input: LogicalPlan<RuntimeRow>, private config: AggregatePlanConfig) {}

  describe(): string[] {
    return [...this.input.describe(), "AGGREGATE"];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RuntimeRow>> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "aggregate", () => {
      const groups = buildGroups(upstream.rows, this.config.groupBy, context);
      const aggregated: RuntimeRow[] = [];
      let index = 0;
      for (const group of groups.values()) {
        const row = reduceGroup(group, this.config, context, index += 1);
        if (this.config.having && !evaluateBoolean(this.config.having, row, context)) {
          continue;
        }
        aggregated.push(row);
      }
      return { rows: aggregated, total: aggregated.length } satisfies PlanResult<RuntimeRow>;
    });
  }
}

class ProjectionNode implements LogicalPlan<RuntimeRow> {
  constructor(private input: LogicalPlan<RuntimeRow>, private projections: ProjectionField[] | undefined) {}

  describe(): string[] {
    return [...this.input.describe(), "RETURN"];
  }

  async execute(context: PlanExecutionContext): Promise<PlanResult<RuntimeRow>> {
    const upstream = await this.input.execute(context);
    return timeStage(context, "return", () => {
      if (this.projections?.length) {
        context.projections.push(...this.projections.map((projection) => formatExpression(projection.expression)));
      }
      return upstream;
    });
  }
}

export function buildFindPlan({ statement, context }: PlannerInput, options: PlannerOptions): LogicalPlan<RuntimeRow> {
  const source = new FindNode();
  const permissions = new PermissionNode(source, options.rootAlias);
  const relate = new RelationNode(permissions, statement.relations, options);
  const joined = new JoinNode(relate, statement.joins, options);
  const filtered = statement.where ? new ApplyNode(joined, statement.where) : joined;
  const sorted = new SortNode(filtered, context.order, options.stableOrder);
  const limited = new LimitNode(sorted, context.limit, options.cursor, context.order, options.stableOrder);
  const projected = new ProjectionNode(limited, (statement as FindStatement).projections);
  return projected;
}

export function buildAggregatePlan({ statement, context }: PlannerInput, options: PlannerOptions): LogicalPlan<RuntimeRow> {
  const source = new FindNode();
  const permissions = new PermissionNode(source, options.rootAlias);
  const relate = new RelationNode(permissions, statement.relations, options);
  const joined = new JoinNode(relate, statement.joins, options);
  const filtered = statement.where ? new ApplyNode(joined, statement.where) : joined;
  const aggregated = new AggregateNode(filtered, {
    aggregates: statement.aggregates,
    groupBy: statement.groupBy,
    having: statement.having,
  });
  const sorted = new SortNode(aggregated, context.order, options.stableOrder);
  const limited = new LimitNode(sorted, context.limit, options.cursor, context.order, options.stableOrder);
  const projected = new ProjectionNode(limited, undefined);
  return projected;
}

function buildProjectIndex(rows: MaterializedRow[]): Map<string, MaterializedRow[]> {
  const index = new Map<string, MaterializedRow[]>();
  for (const row of rows) {
    const project = row.values.project_id ? String(row.values.project_id) : undefined;
    if (!project) continue;
    if (!index.has(project)) {
      index.set(project, []);
    }
    index.get(project)!.push(row);
  }
  return index;
}

function collectIdentifiers(row: RuntimeRow): string[] {
  const ids = new Set<string>();
  if (row.base) ids.add(row.base.entityId);
  for (const alias of Object.values(row.aliases)) {
    if (alias) ids.add(alias.entityId);
  }
  return Array.from(ids);
}

function traverseRelation(
  seeds: RuntimeRow[],
  candidates: MaterializedRow[],
  indexByProject: Map<string, MaterializedRow[]>,
  targetTypes: string[],
  depth: number
): MaterializedRow[] {
  if (!seeds.length || !candidates.length) return [];
  const queue: Array<{ row: MaterializedRow; depth: number }>
    = seeds
      .map((seed) => seed.base)
      .filter((seed): seed is MaterializedRow => Boolean(seed))
      .map((seed) => ({ row: seed, depth: 0 }));
  const seen = new Set<string>(queue.map((entry) => entry.row.entityId));
  const results: MaterializedRow[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth >= depth) continue;
    const neighbors = findNeighbors(current.row, indexByProject, targetTypes);
    for (const neighbor of neighbors) {
      if (seen.has(neighbor.entityId)) continue;
      seen.add(neighbor.entityId);
      results.push(neighbor);
      queue.push({ row: neighbor, depth: current.depth + 1 });
    }
  }
  return results;
}

function findNeighbors(
  row: MaterializedRow,
  indexByProject: Map<string, MaterializedRow[]>,
  targetTypes: string[]
): MaterializedRow[] {
  const project = row.values.project_id ? String(row.values.project_id) : undefined;
  if (!project) return [];
  const neighbors = indexByProject.get(project) ?? [];
  if (!targetTypes.length) {
    return neighbors.filter((candidate) => candidate.entityId !== row.entityId);
  }
  const set = new Set(targetTypes.map((type) => type.toLowerCase()));
  return neighbors.filter((candidate) => candidate.entityId !== row.entityId && set.has(candidate.entityType.toLowerCase()));
}

function buildResolvers(order: OrderByField[], context: PlanExecutionContext) {
  const resolvers = order.map((field) => ({
    direction: field.direction ?? "ASC",
    resolve: (row: RuntimeRow) => evaluateValue(field.expression, row, context),
  }));
  return buildOrderResolver(resolvers);
}

function getIdentifier(row: RuntimeRow): string {
  return row.base?.entityId ?? collectIdentifiers(row)[0] ?? JSON.stringify(row.computed);
}

function buildGroups(rows: RuntimeRow[], groupBy: Expression[] | undefined, context: PlanExecutionContext) {
  const map = new Map<string, { key: unknown[]; rows: RuntimeRow[] }>();
  for (const row of rows) {
    const key = (groupBy ?? []).map((expr) => evaluateValue(expr, row, context));
    const identifier = JSON.stringify(key);
    if (!map.has(identifier)) {
      map.set(identifier, { key, rows: [] });
    }
    map.get(identifier)!.rows.push(row);
  }
  if (!groupBy?.length) {
    if (!map.size) {
      map.set("[]", { key: [], rows });
    }
  }
  return map;
}

function reduceGroup(
  group: { key: unknown[]; rows: RuntimeRow[] },
  config: AggregatePlanConfig,
  context: PlanExecutionContext,
  index: number
): RuntimeRow {
  const synthetic: MaterializedRow = {
    entityId: `agg-${index}`,
    entityType: "aggregate",
    workspaceId: context.workspaceId,
    score: 0,
    values: {},
    maskedFields: [],
  };
  const runtime = createRuntimeRow(synthetic, context.rootAlias);
  runtime.base = synthetic;
  runtime.maskedFields = new Set();

  (config.groupBy ?? []).forEach((expr, position) => {
    const key = formatExpression(expr);
    const value = group.key[position];
    synthetic.values[key] = value;
    setComputed(runtime, key, value);
  });

  for (const aggregate of config.aggregates) {
    const value = computeAggregate(aggregate.function, aggregate.expression, group.rows, context);
    const key = aggregate.alias ?? formatExpression(aggregate.expression);
    synthetic.values[key] = value;
    setComputed(runtime, key, value);
  }

  return runtime;
}

function computeAggregate(
  fn: string,
  expression: Expression,
  rows: RuntimeRow[],
  context: PlanExecutionContext
): unknown {
  const upper = fn.toUpperCase();
  const target = expression.kind === "function" && expression.args.length ? expression.args[0]! : expression;
  const values = rows.map((row) => (target ? evaluateValue(target, row, context) : undefined));
  switch (upper) {
    case "COUNT":
      return values.filter((value) => value !== undefined && value !== null).length;
    case "SUM":
      return values.reduce<number>((sum, value) => (typeof value === "number" ? sum + value : sum), 0);
    case "AVG": {
      const numeric = values.filter((value): value is number => typeof value === "number");
      if (!numeric.length) return 0;
      return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
    }
    case "MIN": {
      const filtered = values.filter((value) => value !== undefined && value !== null);
      return filtered.reduce<unknown>((min, value) => (min === undefined || compare(min, value) > 0 ? value : min), undefined);
    }
    case "MAX": {
      const filtered = values.filter((value) => value !== undefined && value !== null);
      return filtered.reduce<unknown>((max, value) => (max === undefined || compare(max, value) < 0 ? value : max), undefined);
    }
    case "ARRAY_AGG":
      return values;
    default:
      return values[0];
  }
}

function compare(left: unknown, right: unknown): number {
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}
