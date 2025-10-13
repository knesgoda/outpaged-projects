import { performance } from "node:perf_hooks";

import {
  type BaseStatement,
  type BinaryExpression,
  type CompiledIntent,
  type DatePolicy,
  type Expression,
  type InExpression,
  type OrderByField,
  type Statement,
  compileIntentToStatement,
  formatExpression,
  parseOPQL,
  rewriteDateMath,
  rewriteSynonyms,
  literalFromValue,
} from "@/lib/opql/parser";
import { compileJql, isLikelyJql } from "@/lib/opql/jqlCompiler";

import type { SearchIndexRecord } from "./indexer";

export interface PrincipalContext {
  principalId: string;
  workspaceId: string;
  roles: string[];
  permissions: string[];
  allowAll?: boolean;
}

export interface QueryRequest {
  workspaceId: string;
  principal: PrincipalContext;
  opql?: string;
  intent?: CompiledIntent;
  cursor?: string;
  limit?: number;
  timeoutMs?: number;
  explain?: boolean;
  boosts?: Record<string, number>;
  maxGraphDepth?: number;
  enforceStability?: boolean;
  datePolicy?: DatePolicy;
}

export interface RetrievalCandidate {
  documentId: string;
  entityType: string;
  score: number;
  source: "bm25" | "vector" | "structured" | "permission";
  record?: SearchIndexRecord;
  explanation?: Record<string, number>;
}

export interface HybridRetriever {
  bm25?: (statement: Statement, context: QueryContext) => Promise<RetrievalCandidate[]>;
  vector?: (statement: Statement, context: QueryContext) => Promise<RetrievalCandidate[]>;
  structured?: (statement: Statement, context: QueryContext) => Promise<RetrievalCandidate[]>;
}

export interface LearningToRankModel {
  score: (candidate: RetrievalCandidate, context: QueryContext) => number;
}

export interface FacetGenerator {
  build: (candidates: RetrievalCandidate[], statement: Statement, context: QueryContext) => Promise<FacetResult[]>;
}

export interface FacetResult {
  name: string;
  values: Array<{ value: string; count: number }>;
}

export interface QueryContext {
  request: QueryRequest;
  statement: Statement;
  rewrittenStatement: Statement;
  datePolicy: DatePolicy;
  synonymLog: string[];
  datePolicyLog: string[];
  permissionFilters: Expression[];
  startTime: number;
  deadline: number;
  metrics: QueryMetrics;
}

export interface QueryMetrics {
  timings: Record<string, number>;
  totalMs: number;
  deadline: number;
  stages: Array<{ name: string; duration: number }>;
  timeout?: boolean;
  p50Target?: number;
  p95Target?: number;
}

export interface PermissionFilterProvider {
  resolve: (statement: Statement, context: QueryContext) => Promise<Expression | null>;
}

export interface QueryEngineOptions {
  retriever?: HybridRetriever;
  ltr?: LearningToRankModel;
  facetGenerator?: FacetGenerator;
  permissionFilter?: PermissionFilterProvider;
  defaultBoosts?: Record<string, number>;
  p50TargetMs?: number;
  p95TargetMs?: number;
  defaultTimeoutMs?: number;
  graphTraversalCap?: number;
}

export interface QueryResultItem {
  documentId: string;
  entityType: string;
  score: number;
  stableScore: number;
  cursor: string;
  sourceBreakdown: Record<string, number>;
  payload?: SearchIndexRecord;
  explanation: ResultExplanation;
}

export interface ResultExplanation {
  reasons: string[];
  components: Record<string, unknown>;
}

export interface QueryResponse {
  items: QueryResultItem[];
  nextCursor?: string;
  totalResults: number;
  facets: FacetResult[];
  explain?: QueryExplain;
  metrics: QueryMetrics;
}

export interface QueryExplain {
  originalStatement: string;
  parsedStatement: Statement;
  rewrittenStatement: Statement;
  rewrites: { synonyms: string[]; datePolicies: string[]; permissions: string[] };
  retrieval: Record<string, unknown>;
  ltr: Record<string, unknown>;
  pagination: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_LIMIT = 25;

function trackStage<T>(context: QueryContext, name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  return fn().then((result) => {
    const duration = performance.now() - start;
    context.metrics.timings[name] = duration;
    context.metrics.stages.push({ name, duration });
    return result;
  });
}

function ensureWithinDeadline(context: QueryContext) {
  if (performance.now() > context.deadline) {
    context.metrics.timeout = true;
    throw new Error("Query deadline exceeded");
  }
}

function cloneStatement<T extends Statement | BaseStatement>(statement: T): T {
  return JSON.parse(JSON.stringify(statement));
}

function injectPermissionFilter(statement: Statement, filter: Expression): Statement {
  const next = cloneStatement(statement);
  const target = next.type === "EXPLAIN" ? (next.target as BaseStatement) : (next as BaseStatement);
  if (!target.where) {
    target.where = filter;
  } else {
    target.where = {
      kind: "binary",
      operator: "AND",
      left: target.where,
      right: filter,
    } as BinaryExpression;
  }
  return next;
}

function extractWhereExpressions(statement: Statement): Expression[] {
  const base = statement.type === "EXPLAIN" ? (statement.target as BaseStatement) : (statement as BaseStatement);
  const result: Expression[] = [];
  if (!base.where) return result;
  const stack: Expression[] = [base.where];
  while (stack.length) {
    const expr = stack.pop()!;
    if (expr.kind === "binary" && (expr.operator === "AND" || expr.operator === "OR")) {
      stack.push(expr.left, expr.right);
    } else {
      result.push(expr);
    }
  }
  return result;
}

function collectOrderBy(statement: Statement): OrderByField[] {
  const base = statement.type === "EXPLAIN" ? (statement.target as BaseStatement) : (statement as BaseStatement);
  return base.orderBy ?? [];
}

function decodeCursor(cursor: string | undefined): { score: number; id: string } | undefined {
  if (!cursor) return undefined;
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    const [score, id] = decoded.split(":");
    return { score: Number(score), id };
  } catch (_error) {
    return undefined;
  }
}

function encodeCursor(score: number, id: string): string {
  return Buffer.from(`${score}:${id}`, "utf8").toString("base64");
}

function applyBoosts(candidate: RetrievalCandidate, boosts: Record<string, number> | undefined): number {
  const base = candidate.score;
  if (!boosts) return base;
  const boost = boosts[candidate.entityType] ?? 1;
  return base * boost;
}

function ensureStableOrdering(candidate: RetrievalCandidate, index: number): number {
  return candidate.score + index / 1_000_000;
}

function mergeCandidates(candidates: RetrievalCandidate[]): RetrievalCandidate[] {
  const map = new Map<string, RetrievalCandidate>();
  for (const candidate of candidates) {
    const existing = map.get(candidate.documentId);
    if (!existing) {
      map.set(candidate.documentId, { ...candidate, explanation: { ...candidate.explanation } });
      continue;
    }
    const nextScore = Math.max(existing.score, candidate.score);
    map.set(candidate.documentId, {
      ...existing,
      score: nextScore,
      explanation: {
        ...(existing.explanation ?? {}),
        [`source:${candidate.source}`]: candidate.score,
      },
    });
  }
  return [...map.values()];
}

function paginateCandidates(
  candidates: QueryResultItem[],
  limit: number,
  cursor: string | undefined
): { page: QueryResultItem[]; nextCursor?: string } {
  if (!cursor) {
    const page = candidates.slice(0, limit);
    const nextCursor = page.length === limit ? page[page.length - 1]?.cursor : undefined;
    return { page, nextCursor };
  }

  const decoded = decodeCursor(cursor);
  if (!decoded) {
    const page = candidates.slice(0, limit);
    const nextCursor = page.length === limit ? page[page.length - 1]?.cursor : undefined;
    return { page, nextCursor };
  }

  const startIndex = candidates.findIndex((candidate) => {
    return (
      candidate.stableScore < decoded.score ||
      (candidate.stableScore === decoded.score && candidate.documentId === decoded.id)
    );
  });
  const sliceStart = startIndex >= 0 ? startIndex + 1 : 0;
  const page = candidates.slice(sliceStart, sliceStart + limit);
  const nextCursor = page.length === limit ? page[page.length - 1]?.cursor : undefined;
  return { page, nextCursor };
}

export class QueryEngine {
  private retriever: HybridRetriever;
  private ltr?: LearningToRankModel;
  private facetGenerator?: FacetGenerator;
  private permissionFilter?: PermissionFilterProvider;
  private defaultBoosts?: Record<string, number>;
  private p50TargetMs?: number;
  private p95TargetMs?: number;
  private defaultTimeoutMs: number;
  private graphTraversalCap?: number;

  constructor(options: QueryEngineOptions = {}) {
    this.retriever = options.retriever ?? {};
    this.ltr = options.ltr;
    this.facetGenerator = options.facetGenerator;
    this.permissionFilter = options.permissionFilter;
    this.defaultBoosts = options.defaultBoosts;
    this.p50TargetMs = options.p50TargetMs;
    this.p95TargetMs = options.p95TargetMs;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.graphTraversalCap = options.graphTraversalCap;
  }

  async execute(request: QueryRequest): Promise<QueryResponse> {
    const start = performance.now();
    let effectiveRequest: QueryRequest = { ...request };
    const timeoutMs = effectiveRequest.timeoutMs ?? this.defaultTimeoutMs;
    const deadline = start + timeoutMs;

    const metrics: QueryMetrics = {
      timings: {},
      totalMs: 0,
      deadline,
      stages: [],
      p50Target: this.p50TargetMs,
      p95Target: this.p95TargetMs,
    };

    let statement: Statement;
    let explainRequested = effectiveRequest.explain ?? false;
    let originalStatement = effectiveRequest.opql ?? (effectiveRequest.intent ? JSON.stringify(effectiveRequest.intent) : "");

    if (effectiveRequest.opql) {
      const opqlText = effectiveRequest.opql;
      if (isLikelyJql(opqlText)) {
        const compiled = compileJql(opqlText);
        statement = compiled.statement;
        effectiveRequest = { ...effectiveRequest, opql: compiled.opql };
        originalStatement = compiled.original;
      } else {
        statement = parseOPQL(opqlText);
      }
      explainRequested ||= statement.type === "EXPLAIN";
    } else if (effectiveRequest.intent) {
      statement = compileIntentToStatement(effectiveRequest.intent);
    } else {
      throw new Error("Either opql or intent must be provided");
    }

    const context: QueryContext = {
      request: effectiveRequest,
      statement,
      rewrittenStatement: statement,
      datePolicy: effectiveRequest.datePolicy ?? {},
      synonymLog: [],
      datePolicyLog: [],
      permissionFilters: [],
      startTime: start,
      deadline,
      metrics,
    };

    ensureWithinDeadline(context);

    const rewrittenStatement = await this.rewriteStatement(context);
    context.rewrittenStatement = rewrittenStatement;

    ensureWithinDeadline(context);

    const retrieval = await this.retrieveCandidates(context);

    ensureWithinDeadline(context);

    const ranked = await this.rankCandidates(context, retrieval.candidates, retrieval.breakdown);

    ensureWithinDeadline(context);

    const facets = await this.generateFacets(context, ranked.candidates);

    ensureWithinDeadline(context);

    const limit = effectiveRequest.limit ?? (rewrittenStatement as BaseStatement).limit ?? DEFAULT_LIMIT;
    const cursor = effectiveRequest.cursor ?? (rewrittenStatement as BaseStatement).cursor;

    const items = ranked.candidates.map((candidate, index) => {
      const stableScore = ensureStableOrdering(candidate, index);
      const cursorValue = encodeCursor(stableScore, candidate.documentId);
      return {
        documentId: candidate.documentId,
        entityType: candidate.entityType,
        score: candidate.score,
        stableScore,
        cursor: cursorValue,
        sourceBreakdown: candidate.explanation ?? ({} as Record<string, number>),
        payload: candidate.record,
        explanation: {
          reasons: buildReasons(candidate),
          components: {
            score: candidate.score,
            stableScore,
            ...(candidate.explanation ?? {}),
          },
        },
      } satisfies QueryResultItem;
    });

    const pagination = paginateCandidates(items, limit, cursor);

    const explain: QueryExplain | undefined = explainRequested
      ? {
          originalStatement,
          parsedStatement: statement,
          rewrittenStatement,
          rewrites: {
            synonyms: context.synonymLog,
            datePolicies: context.datePolicyLog,
            permissions: context.permissionFilters.map((expr) => formatExpression(expr)),
          },
          retrieval: ranked.explain.retrieval,
          ltr: ranked.explain.ltr,
          pagination: {
            requestedCursor: cursor,
            limit,
            returned: pagination.page.length,
            nextCursor: pagination.nextCursor,
          },
        }
      : undefined;

    const totalMs = performance.now() - start;
    metrics.totalMs = totalMs;

    return {
      items: pagination.page,
      nextCursor: pagination.nextCursor,
      totalResults: ranked.candidates.length,
      facets,
      explain,
      metrics,
    };
  }

  private async rewriteStatement(context: QueryContext): Promise<Statement> {
    return trackStage(context, "rewrite", async () => {
      let statement = cloneStatement(context.statement);
      const base = statement.type === "EXPLAIN" ? (statement.target as BaseStatement) : (statement as BaseStatement);

      if (context.request.maxGraphDepth || this.graphTraversalCap) {
        const cap = Math.min(context.request.maxGraphDepth ?? Infinity, this.graphTraversalCap ?? Infinity);
        if (cap < Infinity) {
          base.relations = (base.relations ?? []).map((relation) => ({
            ...relation,
            depth: relation.depth ? Math.min(relation.depth, cap) : cap,
          }));
        }
      }

      if (base.where) {
        const synonymRewrite = rewriteSynonyms(base.where);
        base.where = synonymRewrite.expression;
        if (synonymRewrite.appliedSynonyms.length) {
          context.synonymLog.push(...synonymRewrite.appliedSynonyms);
        }

        const dateRewrite = rewriteDateMath(base.where, context.datePolicy);
        base.where = dateRewrite.expression;
        if (dateRewrite.appliedPolicies.length) {
          context.datePolicyLog.push(...dateRewrite.appliedPolicies);
        }
      }

      if (this.permissionFilter) {
        const permissionFilter = await this.permissionFilter.resolve(statement, context);
        if (permissionFilter) {
          statement = injectPermissionFilter(statement, permissionFilter);
          context.permissionFilters.push(permissionFilter);
        }
      }

      return statement;
    });
  }

  private async retrieveCandidates(
    context: QueryContext
  ): Promise<{ candidates: RetrievalCandidate[]; breakdown: Record<string, RetrievalCandidate[]> }> {
    return trackStage(context, "retrieve", async () => {
      const stages: Array<Promise<RetrievalCandidate[]>> = [];
      const explain: Record<string, RetrievalCandidate[]> = {};

      const wrapResults = (source: string, results: RetrievalCandidate[]) =>
        results.map((candidate) => ({
          ...candidate,
          explanation: {
            ...(candidate.explanation ?? {}),
            [`source:${source}`]: candidate.score,
          },
          source: candidate.source ?? (source as RetrievalCandidate["source"]),
        }));

      if (this.retriever.bm25) {
        stages.push(
          this.retriever
            .bm25(context.rewrittenStatement, context)
            .then((results) => {
              explain.bm25 = wrapResults("bm25", results);
              return explain.bm25;
            })
            .catch(() => [])
        );
      }
      if (this.retriever.vector) {
        stages.push(
          this.retriever
            .vector(context.rewrittenStatement, context)
            .then((results) => {
              explain.vector = wrapResults("vector", results);
              return explain.vector;
            })
            .catch(() => [])
        );
      }
      if (this.retriever.structured) {
        stages.push(
          this.retriever
            .structured(context.rewrittenStatement, context)
            .then((results) => {
              explain.structured = wrapResults("structured", results);
              return explain.structured;
            })
            .catch(() => [])
        );
      }

      const results = (await Promise.all(stages)).flat();
      const merged = mergeCandidates(results);
      for (const [key, value] of Object.entries(explain)) {
        context.metrics.timings[`retrieval:${key}`] = value.length;
      }
      return { candidates: merged, breakdown: explain };
    });
  }

  private async rankCandidates(
    context: QueryContext,
    candidates: RetrievalCandidate[],
    breakdown: Record<string, RetrievalCandidate[]>
  ): Promise<{ candidates: RetrievalCandidate[]; explain: { retrieval: Record<string, unknown>; ltr: Record<string, unknown> } }> {
    return trackStage(context, "rank", async () => {
      const boosts = context.request.boosts ?? this.defaultBoosts;
      const ltrContributions: Record<string, number> = {};

      for (const candidate of candidates) {
        const baseScore = candidate.score;
        const boostedScore = applyBoosts(candidate, boosts);
        candidate.score = boostedScore;
        if (boostedScore !== baseScore) {
          candidate.explanation = {
            ...(candidate.explanation ?? {}),
            boost: (candidate.explanation?.boost ?? 0) + (boostedScore - baseScore),
          };
        }
        if (this.ltr) {
          const ltrScore = this.ltr.score(candidate, context);
          candidate.score += ltrScore;
          ltrContributions[candidate.documentId] = ltrScore;
          candidate.explanation = {
            ...(candidate.explanation ?? {}),
            ltr: ltrScore,
          };
        }
      }

      const ordered = [...candidates].sort((a, b) => {
        if (b.score === a.score) {
          return a.documentId.localeCompare(b.documentId);
        }
        return b.score - a.score;
      });

      return {
        candidates: ordered,
        explain: {
          retrieval: {
            totalCandidates: candidates.length,
            breakdown: Object.fromEntries(
              Object.entries(breakdown).map(([key, value]) => [key, value.length])
            ),
            orderBy: collectOrderBy(context.rewrittenStatement).map((field) => formatExpression(field.expression)),
            filters: extractWhereExpressions(context.rewrittenStatement).map((expr) => formatExpression(expr)),
          },
          ltr: ltrContributions,
        },
      };
    });
  }

  private async generateFacets(
    context: QueryContext,
    candidates: RetrievalCandidate[]
  ): Promise<FacetResult[]> {
    return trackStage(context, "facets", async () => {
      if (!this.facetGenerator) {
        return [];
      }
      return this.facetGenerator.build(candidates, context.rewrittenStatement, context);
    });
  }
}

function buildReasons(candidate: RetrievalCandidate): string[] {
  const reasons: string[] = [];
  if (candidate.explanation) {
    for (const [key, value] of Object.entries(candidate.explanation)) {
      reasons.push(`${key}=${value}`);
    }
  }
  return reasons;
}

export class DefaultPermissionFilter implements PermissionFilterProvider {
  async resolve(statement: Statement, context: QueryContext): Promise<Expression | null> {
    const principal = context.request.principal;
    if (principal.allowAll) return null;
    const permissions = principal.permissions ?? [];
    const workspaceId = principal.workspaceId;

    const permissionExpr: InExpression = {
      kind: "in",
      value: { kind: "identifier", name: "workspace_id" },
      options: [{ kind: "literal", value: workspaceId, valueType: "string" }],
    };

    if (!permissions.includes("search:read_all")) {
      return {
        kind: "binary",
        operator: "AND",
        left: permissionExpr,
        right: {
          kind: "function",
          name: "has_permission",
          args: [
            { kind: "literal", value: principal.principalId, valueType: "string" },
            { kind: "literal", value: "read", valueType: "string" },
          ],
        },
      } as BinaryExpression;
    }

    return permissionExpr;
  }
}

export class StaticHybridRetriever implements HybridRetriever {
  private bm25Results: RetrievalCandidate[];
  private vectorResults: RetrievalCandidate[];
  private structuredResults: RetrievalCandidate[];

  constructor(options: {
    bm25?: RetrievalCandidate[];
    vector?: RetrievalCandidate[];
    structured?: RetrievalCandidate[];
  }) {
    this.bm25Results = options.bm25 ?? [];
    this.vectorResults = options.vector ?? [];
    this.structuredResults = options.structured ?? [];
  }

  async bm25(): Promise<RetrievalCandidate[]> {
    return this.bm25Results;
  }

  async vector(): Promise<RetrievalCandidate[]> {
    return this.vectorResults;
  }

  async structured(): Promise<RetrievalCandidate[]> {
    return this.structuredResults;
  }
}

export class StaticFacetGenerator implements FacetGenerator {
  async build(candidates: RetrievalCandidate[]): Promise<FacetResult[]> {
    const byType = new Map<string, number>();
    for (const candidate of candidates) {
      byType.set(candidate.entityType, (byType.get(candidate.entityType) ?? 0) + 1);
    }
    return [
      {
        name: "entityType",
        values: [...byType.entries()].map(([value, count]) => ({ value, count })),
      },
    ];
  }
}

export class LinearLearningToRank implements LearningToRankModel {
  constructor(private weights: Record<string, number>) {}

  score(candidate: RetrievalCandidate): number {
    let total = 0;
    for (const [key, weight] of Object.entries(this.weights)) {
      const value = Number(candidate.explanation?.[key] ?? 0);
      total += value * weight;
    }
    return total;
  }
}

export function buildStructuredFilter(
  field: string,
  operator: string,
  value: unknown
): Expression {
  return {
    kind: "binary",
    operator: operator as BinaryExpression["operator"],
    left: { kind: "identifier", name: field },
    right: literalFromValue(value),
  };
}
