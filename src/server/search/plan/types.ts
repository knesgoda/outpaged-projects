import type {
  AggregateExpression,
  AggregateStatement,
  Expression,
  FindStatement,
  JoinSpec,
  OrderByField,
  ProjectionField,
  RelationSpec,
} from "@/lib/opql/parser";

import type { ExecutionMetrics, PrincipalContext } from "../queryEngine";
import type { MaterializedRow, RepositoryRow, SearchRepository } from "../repository";

export interface RuntimeRow {
  base: MaterializedRow | null;
  aliases: Record<string, MaterializedRow | null>;
  computed: Record<string, unknown>;
  maskedFields: Set<string>;
}

export interface PlanResult<T> {
  rows: T[];
  total: number;
  nextCursor?: string;
}

export interface LogicalPlan<T> {
  describe(): string[];
  execute(context: PlanExecutionContext): Promise<PlanResult<T>>;
}

export interface GraphTraversalPlan {
  relation: RelationSpec;
  depth: number;
}

export interface AliasResolution {
  alias: string;
  sources: string[];
}

export interface PlannerOptions {
  rootAlias: string;
  aliasSources: Record<string, string[]>;
  graphDepthCap: number;
  stableOrder: OrderByField[];
  cursor?: string;
}

export interface PlanExecutionContext {
  workspaceId: string;
  principal: PrincipalContext;
  repository: SearchRepository;
  targetTypes: string[];
  order: OrderByField[];
  limit: number;
  metrics: ExecutionMetrics;
  appliedFilters: string[];
  projections: string[];
  plan: string[];
  stableOrder: OrderByField[];
  cursor?: string;
  rootAlias: string;
  aliasSources: Record<string, string[]>;
  graphDepthCap: number;
}

export interface PlannerInput {
  statement: FindStatement | AggregateStatement;
  context: PlanExecutionContext;
}

export interface AggregatePlanConfig {
  aggregates: AggregateExpression[];
  groupBy?: Expression[];
  having?: Expression;
}

export interface ReturnConfig {
  projections?: ProjectionField[];
}

export interface OrderConfig {
  orderBy: OrderByField[];
}

export interface JoinConfig {
  joins?: JoinSpec[];
}

export interface RelationConfig {
  relations?: RelationSpec[];
}

export type BaseSourcePlan = LogicalPlan<RepositoryRow>;
