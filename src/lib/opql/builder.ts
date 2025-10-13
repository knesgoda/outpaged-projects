import {
  formatExpression,
  parseOPQL,
  StatementType,
  type AggregateExpression,
  type BaseStatement,
  type Expression,
  type JoinSpec,
  type OrderByField,
  type ProjectionField,
  type RelationSpec,
  type Statement,
} from "./parser";

export type BuilderLogicalOperator = "AND" | "OR";

export interface BuilderClause {
  id: string;
  type: "clause";
  field: string;
  comparator: string;
  value: string;
  source?: "manual" | "natural-language" | "opql" | "helper" | "saved";
  confidence?: number;
  valueWasQuoted?: boolean;
}

export interface BuilderGroup {
  id: string;
  type: "group";
  operator: BuilderLogicalOperator;
  children: BuilderNode[];
  label?: string;
}

export type BuilderNode = BuilderGroup | BuilderClause;

const createNodeId = () =>
  (typeof globalThis !== "undefined" &&
  "crypto" in globalThis &&
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `qb_${Math.random().toString(16).slice(2)}`);

export const createClause = (
  field = "text",
  comparator = "MATCH",
  value = ""
): BuilderClause => ({
  id: createNodeId(),
  type: "clause",
  field,
  comparator,
  value,
  source: "manual",
  confidence: 1,
  valueWasQuoted: false,
});

export const createGroup = (
  operator: BuilderLogicalOperator = "AND",
  children: BuilderNode[] = []
): BuilderGroup => ({
  id: createNodeId(),
  type: "group",
  operator,
  children,
});

export const cloneNode = (node: BuilderNode): BuilderNode => {
  if (node.type === "clause") {
    return { ...node };
  }
  return {
    ...node,
    children: node.children.map(cloneNode),
  };
};

export interface BuilderProjection {
  id: string;
  expression: string;
  alias?: string;
}

export interface BuilderAggregate {
  id: string;
  expression: string;
  alias?: string;
}

export interface BuilderJoin {
  id: string;
  type: JoinSpec["type"];
  source: string;
  alias?: string;
  condition: string;
}

export interface BuilderRelation {
  id: string;
  relation: string;
  direction?: RelationSpec["direction"];
  depth?: number;
}

export interface BuilderOrderByField {
  id: string;
  expression: string;
  direction: OrderByField["direction"];
  nulls?: OrderByField["nulls"];
}

export interface BuilderQuery {
  statement: StatementType;
  source: string;
  alias?: string;
  distinct?: boolean;
  projections: BuilderProjection[];
  aggregates: BuilderAggregate[];
  joins: BuilderJoin[];
  relations: BuilderRelation[];
  where: BuilderGroup;
  groupBy: BuilderProjection[];
  having: BuilderGroup;
  orderBy: BuilderOrderByField[];
  limit?: string;
  offset?: string;
  cursor?: string;
  returning: BuilderProjection[];
}

export const createProjection = (expression = "*", alias?: string): BuilderProjection => ({
  id: createNodeId(),
  expression,
  alias,
});

export const createAggregate = (expression = "COUNT(*)", alias?: string): BuilderAggregate => ({
  id: createNodeId(),
  expression,
  alias,
});

export const createJoin = (
  type: JoinSpec["type"] = "INNER",
  source = "items",
  condition = ""
): BuilderJoin => ({
  id: createNodeId(),
  type,
  source,
  alias: undefined,
  condition,
});

export const createRelation = (relation = "*"): BuilderRelation => ({
  id: createNodeId(),
  relation,
});

export const createOrderBy = (
  expression = "updated_at",
  direction: OrderByField["direction"] = "DESC"
): BuilderOrderByField => ({
  id: createNodeId(),
  expression,
  direction,
});

export const createQuery = (): BuilderQuery => ({
  statement: "FIND",
  source: "ITEMS",
  projections: [createProjection("*")],
  aggregates: [],
  joins: [],
  relations: [],
  where: createGroup("AND"),
  groupBy: [],
  having: createGroup("AND"),
  orderBy: [],
  returning: [],
});

const cloneProjection = (projection: BuilderProjection): BuilderProjection => ({
  ...projection,
});

const cloneAggregate = (aggregate: BuilderAggregate): BuilderAggregate => ({
  ...aggregate,
});

const cloneJoin = (join: BuilderJoin): BuilderJoin => ({
  ...join,
});

const cloneRelation = (relation: BuilderRelation): BuilderRelation => ({
  ...relation,
});

const cloneOrderBy = (order: BuilderOrderByField): BuilderOrderByField => ({
  ...order,
});

export const cloneQuery = (query: BuilderQuery): BuilderQuery => ({
  ...query,
  projections: query.projections.map(cloneProjection),
  aggregates: query.aggregates.map(cloneAggregate),
  joins: query.joins.map(cloneJoin),
  relations: query.relations.map(cloneRelation),
  where: cloneNode(query.where) as BuilderGroup,
  groupBy: query.groupBy.map(cloneProjection),
  having: cloneNode(query.having) as BuilderGroup,
  orderBy: query.orderBy.map(cloneOrderBy),
  returning: query.returning.map(cloneProjection),
});

export const shallowClone = <T extends BuilderNode>(node: T): T =>
  node.type === "clause"
    ? ({ ...node } as T)
    : ({
        ...node,
        children: node.children.map((child) => shallowClone(child)),
      } as T);

const quoteValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '""';
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && `${numeric}` === trimmed) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "true" || lower === "false" || lower === "null") {
    return lower;
  }
  if (/^:[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }
  const escaped = trimmed.replace(/'/gu, "\\'");
  return `'${escaped}'`;
};

const clauseToOpql = (clause: BuilderClause): string => {
  const operator = clause.comparator.toUpperCase();
  if (operator === "IN" || operator === "NOT IN") {
    return `${clause.field} ${operator} (${clause.value})`;
  }
  if (operator === "BETWEEN") {
    return `${clause.field} BETWEEN ${clause.value}`;
  }
  if (operator.startsWith("IS")) {
    return clause.value
      ? `${clause.field} ${operator} ${clause.value}`
      : `${clause.field} ${operator}`;
  }
  if (operator === "MATCH" || operator === "CONTAINS") {
    return `${clause.field} ${operator} ${quoteValue(clause.value)}`;
  }
  if (operator === "LIKE") {
    return `${clause.field} LIKE ${quoteValue(clause.value)}`;
  }
  return `${clause.field} ${operator} ${quoteValue(clause.value)}`;
};

export const groupToOpql = (group: BuilderGroup): string => {
  const parts = group.children.map((child) => {
    if (child.type === "clause") {
      return clauseToOpql(child);
    }
    const inner = groupToOpql(child);
    if (!inner) return "";
    if (child.children.length > 1) {
      return `(${inner})`;
    }
    return inner;
  });
  const filtered = parts.filter((part) => part.trim().length > 0);
  return filtered.join(` ${group.operator} `);
};

type Token =
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "AND" }
  | { type: "OR" }
  | { type: "TEXT"; value: string };

const isBoundary = (char: string | undefined) => !char || /[\s(),]/u.test(char);

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let buffer = "";
  let index = 0;

  const pushBuffer = () => {
    const trimmed = buffer.trim();
    if (trimmed.length === 0) {
      buffer = "";
      return;
    }
    tokens.push({ type: "TEXT", value: trimmed });
    buffer = "";
  };

  while (index < input.length) {
    const char = input[index];

    if (char === "'" || char === '"') {
      buffer += char;
      index += 1;
      while (index < input.length) {
        const next = input[index];
        buffer += next;
        index += 1;
        if (next === char && input[index - 2] !== "\\") {
          break;
        }
      }
      continue;
    }

    if (char === "(") {
      pushBuffer();
      tokens.push({ type: "LPAREN" });
      index += 1;
      continue;
    }

    if (char === ")") {
      pushBuffer();
      tokens.push({ type: "RPAREN" });
      index += 1;
      continue;
    }

    const upper = input.slice(index).toUpperCase();
    if (
      (upper.startsWith("AND") && isBoundary(input[index - 1]) && isBoundary(input[index + 3])) ||
      (upper.startsWith("OR") && isBoundary(input[index - 1]) && isBoundary(input[index + 2]))
    ) {
      pushBuffer();
      const keyword = upper.startsWith("AND") ? "AND" : "OR";
      tokens.push({ type: keyword as "AND" | "OR" });
      index += keyword.length;
      continue;
    }

    buffer += char;
    index += 1;
  }

  pushBuffer();
  return tokens;
};

type Node = BuilderNode;

const parseClause = (text: string): BuilderClause => {
  const betweenMatch = text.match(/^(?<field>.+?)\s+BETWEEN\s+(?<value>.+)$/iu);
  if (betweenMatch?.groups) {
    return {
      id: createNodeId(),
      type: "clause",
      field: betweenMatch.groups.field,
      comparator: "BETWEEN",
      value: betweenMatch.groups.value.trim(),
      source: "opql",
    };
  }

  const inMatch = text.match(/^(?<field>.+?)\s+(?<operator>NOT\s+IN|IN)\s+\((?<value>.+)\)$/iu);
  if (inMatch?.groups) {
    return {
      id: createNodeId(),
      type: "clause",
      field: inMatch.groups.field,
      comparator: inMatch.groups.operator.replace(/\s+/gu, " ").toUpperCase(),
      value: inMatch.groups.value.trim(),
      source: "opql",
    };
  }

  const comparison = text.match(
    /^(?<field>.+?)\s+(?<operator>=|!=|<>|<=|>=|<|>|MATCH|LIKE|CONTAINS|IS\s+NOT\s+NULL|IS\s+NULL|IS\s+NOT\s+EMPTY|IS\s+EMPTY|IS\s+NOT|IS)\s*(?<value>.*)$/iu
  );
  if (comparison?.groups) {
    const rawValue = comparison.groups.value?.trim() ?? "";
    const quoteChar = rawValue[0];
    const hasMatchingQuotes =
      (quoteChar === "'" || quoteChar === '"') && rawValue[rawValue.length - 1] === quoteChar;
    return {
      id: createNodeId(),
      type: "clause",
      field: comparison.groups.field,
      comparator: comparison.groups.operator.replace(/\s+/gu, " ").toUpperCase(),
      value: comparison.groups.value
        .trim()
        .replace(/^"|"$/gu, "")
        .replace(/^'|'$/gu, ""),
      source: "opql",
      valueWasQuoted: hasMatchingQuotes || undefined,
    };
  }

  return {
    id: createNodeId(),
    type: "clause",
    field: "text",
    comparator: "MATCH",
    value: text.replace(/^"|"$/gu, "").replace(/^'|'$/gu, ""),
    source: "opql",
    confidence: 0.4,
  };
};

const expressionToNode = (expression: Expression): BuilderNode => {
  if (expression.kind === "binary" && (expression.operator === "AND" || expression.operator === "OR")) {
    const operator = expression.operator as BuilderLogicalOperator;
    const group = createGroup(operator);
    const append = (node: BuilderNode) => {
      if (node.type === "group" && node.operator === operator) {
        group.children.push(...node.children);
      } else {
        group.children.push(node);
      }
    };
    append(expressionToNode(expression.left));
    append(expressionToNode(expression.right));
    return group;
  }
  return parseClause(formatExpression(expression));
};

const parsePrimary = (tokens: Token[], position: { index: number }): Node | null => {
  const token = tokens[position.index];
  if (!token) return null;
  if (token.type === "LPAREN") {
    position.index += 1;
    const node = parseExpression(tokens, position);
    if (tokens[position.index]?.type === "RPAREN") {
      position.index += 1;
    }
    if (!node) return createGroup();
    return node;
  }
  if (token.type === "TEXT") {
    position.index += 1;
    return parseClause(token.value);
  }
  return null;
};

const collectGroup = (
  operator: BuilderLogicalOperator,
  nodes: Node[]
): Node => {
  if (nodes.length === 1) {
    const single = nodes[0];
    return single.type === "group"
      ? single
      : { ...createGroup(operator, []), children: nodes };
  }
  const group = createGroup(operator);
  group.children = nodes.map((node) =>
    node.type === "group" ? node : ({ ...node } as BuilderNode)
  );
  return group;
};

const parseAnd = (tokens: Token[], position: { index: number }): Node | null => {
  const nodes: Node[] = [];
  let current = parsePrimary(tokens, position);
  if (!current) return null;
  nodes.push(current);
  while (tokens[position.index]?.type === "AND") {
    position.index += 1;
    const next = parsePrimary(tokens, position);
    if (!next) break;
    nodes.push(next);
  }
  return collectGroup("AND", nodes);
};

const parseExpression = (tokens: Token[], position: { index: number }): Node | null => {
  const nodes: Node[] = [];
  let current = parseAnd(tokens, position);
  if (!current) return null;
  nodes.push(current);
  while (tokens[position.index]?.type === "OR") {
    position.index += 1;
    const next = parseAnd(tokens, position);
    if (!next) break;
    nodes.push(next);
  }
  return collectGroup("OR", nodes);
};

export const opqlToGroup = (input: string): BuilderGroup => {
  const trimmed = input.trim();
  if (!trimmed) {
    return createGroup();
  }
  const tokens = tokenize(trimmed);
  const position = { index: 0 };
  const expression = parseExpression(tokens, position);
  if (!expression) {
    return createGroup();
  }
  if (expression.type === "group") {
    return normalizeGroup(expression);
  }
  return normalizeGroup(createGroup("AND", [expression]));
};

export const visitNodes = (
  node: BuilderNode,
  visitor: (node: BuilderNode, parent: BuilderGroup | null) => void,
  parent: BuilderGroup | null = null
) => {
  visitor(node, parent);
  if (node.type === "group") {
    node.children.forEach((child) => visitNodes(child, visitor, node));
  }
};

export const mutateGroupById = (
  node: BuilderGroup,
  id: string,
  mutate: (group: BuilderGroup) => void
): boolean => {
  if (node.id === id) {
    mutate(node);
    return true;
  }
  return node.children.some((child) => {
    if (child.type === "group") {
      return mutateGroupById(child, id, mutate);
    }
    return false;
  });
};

export const mutateClauseById = (
  node: BuilderGroup,
  id: string,
  mutate: (clause: BuilderClause, parent: BuilderGroup) => void
): boolean => {
  return node.children.some((child, index) => {
    if (child.type === "clause" && child.id === id) {
      mutate(child, node);
      return true;
    }
    if (child.type === "group") {
      return mutateClauseById(child, id, mutate);
    }
    return false;
  });
};

export const removeNodeById = (group: BuilderGroup, id: string): boolean => {
  const index = group.children.findIndex((child) => child.id === id);
  if (index >= 0) {
    group.children.splice(index, 1);
    return true;
  }
  return group.children.some((child) => {
    if (child.type === "group") {
      const removed = removeNodeById(child, id);
      if (removed && child.children.length === 0) {
        removeNodeById(group, child.id);
      }
      return removed;
    }
    return false;
  });
};

export const normalizeGroup = (group: BuilderGroup): BuilderGroup => {
  const clone: BuilderGroup = {
    ...group,
    children: [],
  };
  group.children.forEach((child) => {
    if (child.type === "group") {
      const normalized = normalizeGroup(child);
      if (normalized.children.length > 0) {
        clone.children.push(normalized);
      }
      return;
    }
    if (child.value.trim().length === 0 && child.field !== "text") {
      return;
    }
    clone.children.push({ ...child });
  });
  return clone;
};

export const summarizeGroup = (
  group: BuilderGroup,
  mode: "long" | "short" = "long"
): string => {
  if (group.children.length === 0) {
    return "No filters applied";
  }
  const pieces: string[] = [];
  group.children.forEach((child) => {
    if (child.type === "clause") {
      const value = child.value.replace(/^"|"$/gu, "");
      pieces.push(`${child.field} ${child.comparator.toLowerCase()} ${value}`);
      return;
    }
    const inner = summarizeGroup(child, mode);
    pieces.push(mode === "long" ? `(${inner})` : inner);
  });
  return pieces.join(mode === "long" ? ` ${group.operator} ` : ` ${group.operator.toLowerCase()} `);
};

export const findClause = (
  group: BuilderGroup,
  predicate: (clause: BuilderClause) => boolean
): BuilderClause | null => {
  let result: BuilderClause | null = null;
  visitNodes(group, (node) => {
    if (result || node.type !== "clause") return;
    if (predicate(node)) {
      result = node;
    }
  });
  return result;
};

export const countClauses = (group: BuilderGroup): number => {
  let count = 0;
  visitNodes(group, (node) => {
    if (node.type === "clause") {
      count += 1;
    }
  });
  return count;
};

export const ensureGroup = (group?: BuilderGroup): BuilderGroup =>
  group?.type === "group" ? group : createGroup();

const projectionFieldToBuilder = (projection: ProjectionField): BuilderProjection => ({
  id: createNodeId(),
  expression: formatExpression(projection.expression),
  alias: projection.alias,
});

const aggregateToBuilder = (aggregate: AggregateExpression): BuilderAggregate => ({
  id: createNodeId(),
  expression: formatExpression(aggregate.expression),
  alias: aggregate.alias,
});

const joinToBuilder = (join: JoinSpec): BuilderJoin => ({
  id: createNodeId(),
  type: join.type,
  source: join.source,
  alias: join.alias,
  condition: formatExpression(join.condition),
});

const relationToBuilder = (relation: RelationSpec): BuilderRelation => ({
  id: createNodeId(),
  relation: relation.relation,
  direction: relation.direction,
  depth: relation.depth,
});

const orderByToBuilder = (order: OrderByField): BuilderOrderByField => ({
  id: createNodeId(),
  expression: formatExpression(order.expression),
  direction: order.direction,
  nulls: order.nulls,
});

const expressionToGroup = (expression: BaseStatement["where"]): BuilderGroup => {
  if (!expression) {
    return createGroup("AND");
  }
  const node = expressionToNode(expression as Expression);
  if (node.type === "group") {
    return normalizeGroup(node);
  }
  return normalizeGroup(createGroup("AND", [node]));
};

const normalizeProjection = (projection: BuilderProjection): BuilderProjection => ({
  ...projection,
  id: projection.id || createNodeId(),
  expression: projection.expression.trim(),
  alias: projection.alias?.trim() || undefined,
});

const normalizeAggregate = (aggregate: BuilderAggregate): BuilderAggregate => ({
  ...aggregate,
  id: aggregate.id || createNodeId(),
  expression: aggregate.expression.trim(),
  alias: aggregate.alias?.trim() || undefined,
});

const normalizeJoin = (join: BuilderJoin): BuilderJoin => ({
  ...join,
  id: join.id || createNodeId(),
  source: join.source.trim(),
  alias: join.alias?.trim() || undefined,
  condition: join.condition.trim(),
});

const normalizeRelation = (relation: BuilderRelation): BuilderRelation => ({
  ...relation,
  id: relation.id || createNodeId(),
  relation: relation.relation.trim(),
  direction: relation.direction,
  depth: relation.depth,
});

const normalizeOrderByField = (order: BuilderOrderByField): BuilderOrderByField => ({
  ...order,
  id: order.id || createNodeId(),
  expression: order.expression.trim(),
  direction: order.direction,
  nulls: order.nulls,
});

export const normalizeQuery = (query: BuilderQuery): BuilderQuery => {
  const draft = cloneQuery(query);
  draft.where = normalizeGroup(draft.where);
  draft.having = normalizeGroup(draft.having);
  draft.projections = draft.projections
    .map(normalizeProjection)
    .filter((projection) => projection.expression.length > 0);
  if (!draft.projections.length && draft.statement !== "AGGREGATE") {
    draft.projections = [createProjection("*")];
  }
  draft.aggregates = draft.aggregates
    .map(normalizeAggregate)
    .filter((aggregate) => aggregate.expression.length > 0);
  draft.groupBy = draft.groupBy
    .map(normalizeProjection)
    .filter((projection) => projection.expression.length > 0);
  draft.joins = draft.joins
    .map(normalizeJoin)
    .filter((join) => join.source.length > 0 && join.condition.length > 0);
  draft.relations = draft.relations
    .map(normalizeRelation)
    .filter((relation) => relation.relation.length > 0);
  draft.orderBy = draft.orderBy
    .map(normalizeOrderByField)
    .filter((order) => order.expression.length > 0);
  draft.returning = draft.returning
    .map(normalizeProjection)
    .filter((projection) => projection.expression.length > 0);
  draft.limit = draft.limit?.toString().trim() || undefined;
  draft.offset = draft.offset?.toString().trim() || undefined;
  draft.cursor = draft.cursor?.toString().trim() || undefined;
  return draft;
};

const projectionToOpql = (projection: BuilderProjection): string =>
  projection.alias ? `${projection.expression} AS ${projection.alias}` : projection.expression;

const aggregateToOpql = (aggregate: BuilderAggregate): string =>
  aggregate.alias ? `${aggregate.expression} AS ${aggregate.alias}` : aggregate.expression;

const joinToOpqlString = (join: BuilderJoin): string => {
  const alias = join.alias ? ` ${join.alias}` : "";
  return `${join.type} JOIN ${join.source}${alias} ON ${join.condition}`;
};

const relationToOpqlString = (relation: BuilderRelation): string => {
  const pieces = [relation.relation];
  if (relation.direction) {
    pieces.push(relation.direction);
  }
  if (typeof relation.depth === "number" && Number.isFinite(relation.depth)) {
    pieces.push(`DEPTH ${relation.depth}`);
  }
  return pieces.join(" ");
};

const orderByToOpqlString = (order: BuilderOrderByField): string => {
  const parts = [order.expression, order.direction];
  if (order.nulls) {
    parts.push("NULLS", order.nulls);
  }
  return parts.join(" ");
};

export const queryToOpql = (query: BuilderQuery): string => {
  const normalized = normalizeQuery(query);
  const parts: string[] = [];
  switch (normalized.statement) {
    case "FIND": {
      const prefix = normalized.distinct ? "DISTINCT FIND" : "FIND";
      parts.push(`${prefix} ${normalized.projections.map(projectionToOpql).join(", ")}`);
      break;
    }
    case "COUNT": {
      const prefix = normalized.distinct ? "COUNT DISTINCT" : "COUNT";
      const projections = normalized.projections.length
        ? ` ${normalized.projections.map(projectionToOpql).join(", ")}`
        : "";
      parts.push(`${prefix}${projections}`);
      break;
    }
    case "AGGREGATE": {
      const aggregates = normalized.aggregates.length
        ? normalized.aggregates.map(aggregateToOpql).join(", ")
        : "COUNT(*)";
      parts.push(`AGGREGATE ${aggregates}`);
      break;
    }
    default:
      parts.push(`${normalized.statement}`);
  }

  if (normalized.statement !== "UPDATE" && normalized.statement !== "EXPLAIN") {
    parts.push(`FROM ${normalized.source}`);
    if (normalized.alias) {
      parts.push(`AS ${normalized.alias}`);
    }
  }

  normalized.joins.forEach((join) => parts.push(joinToOpqlString(join)));

  if (normalized.relations.length) {
    parts.push(`RELATE ${normalized.relations.map(relationToOpqlString).join(", ")}`);
  }

  const whereOpql = groupToOpql(normalized.where);
  if (whereOpql) {
    parts.push(`WHERE ${whereOpql}`);
  }

  if (normalized.groupBy.length) {
    parts.push(`GROUP BY ${normalized.groupBy.map((group) => group.expression).join(", ")}`);
  }

  const havingOpql = groupToOpql(normalized.having);
  if (havingOpql) {
    parts.push(`HAVING ${havingOpql}`);
  }

  if (normalized.orderBy.length) {
    parts.push(`ORDER BY ${normalized.orderBy.map(orderByToOpqlString).join(", ")}`);
  }

  if (normalized.limit) {
    parts.push(`LIMIT ${normalized.limit}`);
  }

  if (normalized.offset) {
    parts.push(`OFFSET ${normalized.offset}`);
  }

  if (normalized.cursor) {
    parts.push(`CURSOR ${normalized.cursor}`);
  }

  if (normalized.returning.length) {
    parts.push(`RETURNING ${normalized.returning.map(projectionToOpql).join(", ")}`);
  }

  return parts.join(" ").replace(/\s+/gu, " ").trim();
};

const applyBaseStatement = (statement: BaseStatement, query: BuilderQuery) => {
  if (statement.source) {
    query.source = statement.source;
  }
  query.alias = statement.alias;
  query.where = expressionToGroup(statement.where);
  query.orderBy = statement.orderBy?.map(orderByToBuilder) ?? [];
  query.limit = statement.limit != null ? String(statement.limit) : undefined;
  query.offset = statement.offset != null ? String(statement.offset) : undefined;
  query.cursor = statement.cursor ?? undefined;
  query.joins = statement.joins?.map(joinToBuilder) ?? [];
  query.relations = statement.relations?.map(relationToBuilder) ?? [];
};

const statementToBuilderQuery = (statement: Statement): BuilderQuery => {
  const base = createQuery();
  base.statement = statement.type;
  switch (statement.type) {
    case "FIND": {
      applyBaseStatement(statement, base);
      base.distinct = statement.distinct;
      base.projections = statement.projections.map(projectionFieldToBuilder);
      base.groupBy = [];
      base.having = createGroup("AND");
      base.aggregates = [];
      break;
    }
    case "COUNT": {
      applyBaseStatement(statement, base);
      base.distinct = statement.distinct;
      base.projections = statement.projections?.map(projectionFieldToBuilder) ?? [];
      base.groupBy = [];
      base.having = createGroup("AND");
      base.aggregates = [];
      break;
    }
    case "AGGREGATE": {
      applyBaseStatement(statement, base);
      base.aggregates = statement.aggregates.map(aggregateToBuilder);
      base.groupBy = statement.groupBy?.map((expr) => ({
        id: createNodeId(),
        expression: formatExpression(expr),
      })) ?? [];
      base.having = statement.having ? expressionToGroup(statement.having) : createGroup("AND");
      base.projections = [];
      break;
    }
    case "UPDATE": {
      applyBaseStatement(statement, base);
      base.returning = statement.returning?.map(projectionFieldToBuilder) ?? [];
      base.projections = [];
      base.aggregates = [];
      break;
    }
    case "EXPLAIN": {
      return statementToBuilderQuery(statement.target);
    }
    default:
      applyBaseStatement(statement as BaseStatement, base);
      break;
  }
  return normalizeQuery(base);
};

type ParameterReplacement = {
  text: string;
  map: Record<string, string>;
};

const NUMERIC_KEYWORDS = new Set(["LIMIT", "OFFSET", "DEPTH", "CAP"]);
const NUMERIC_PLACEHOLDER_BASE = 987650000;

const findPreviousKeyword = (input: string, position: number): string | null => {
  let index = position - 1;
  while (index >= 0 && /\s/u.test(input[index])) {
    index -= 1;
  }
  if (index < 0) return null;
  let end = index;
  while (end >= 0 && /[a-zA-Z_]/u.test(input[end])) {
    end -= 1;
  }
  if (end === index) return null;
  return input.slice(end + 1, index + 1);
};

const replaceParameters = (input: string): ParameterReplacement => {
  let sanitized = "";
  const map: Record<string, string> = {};
  let index = 0;
  let inSingle = false;
  let inDouble = false;

  const pushPlaceholder = (token: string, numeric: boolean) => {
    const placeholder = numeric ? String(NUMERIC_PLACEHOLDER_BASE + index) : `__PARAM_${index}__`;
    map[placeholder] = token;
    sanitized += placeholder;
    index += 1;
  };

  for (let position = 0; position < input.length; position += 1) {
    const char = input[position];
    if (char === "'" && !inDouble) {
      if (inSingle && input[position + 1] === "'") {
        sanitized += "''";
        position += 1;
        continue;
      }
      inSingle = !inSingle;
      sanitized += char;
      continue;
    }
    if (char === '"' && !inSingle) {
      if (inDouble && input[position + 1] === '"') {
        sanitized += '""';
        position += 1;
        continue;
      }
      inDouble = !inDouble;
      sanitized += char;
      continue;
    }
    if (!inSingle && !inDouble && char === ":") {
      const next = input[position + 1];
      if (next && /[a-zA-Z_]/u.test(next)) {
        let end = position + 2;
        while (end < input.length && /[\w-]/u.test(input[end])) {
          end += 1;
        }
        const token = input.slice(position, end);
        const keyword = findPreviousKeyword(input, position)?.toUpperCase();
        const numeric = keyword ? NUMERIC_KEYWORDS.has(keyword) : false;
        pushPlaceholder(token, numeric);
        position = end - 1;
        continue;
      }
    }
    sanitized += char;
  }

  if (inSingle || inDouble) {
    return { text: input, map: {} };
  }

  return { text: sanitized, map };
};

const extractParametersFromText = (value: string | undefined): string[] => {
  if (!value) return [];
  const { map } = replaceParameters(value);
  if (!Object.keys(map).length) {
    return [];
  }
  return Array.from(new Set(Object.values(map)));
};

const lastKeywordIndex = (upper: string, keyword: string): number => {
  const target = keyword.toUpperCase();
  let index = upper.lastIndexOf(target);
  while (index >= 0) {
    const before = upper[index - 1];
    const after = upper[index + target.length];
    const beforeOk = !before || /[\s(,]/u.test(before);
    const afterOk = !after || /[\s(]/u.test(after);
    if (beforeOk && afterOk) {
      return index;
    }
    index = upper.lastIndexOf(target, index - 1);
  }
  return -1;
};

const splitOrderSegment = (segment: string): string[] => {
  const parts: string[] = [];
  let buffer = "";
  let depth = 0;
  for (let i = 0; i < segment.length; i += 1) {
    const char = segment[i];
    if (char === "(") {
      depth += 1;
    } else if (char === ")" && depth > 0) {
      depth -= 1;
    }
    if (char === "," && depth === 0) {
      if (buffer.trim().length > 0) {
        parts.push(buffer.trim());
      }
      buffer = "";
      continue;
    }
    buffer += char;
  }
  if (buffer.trim().length > 0) {
    parts.push(buffer.trim());
  }
  return parts;
};

const parseOrderSegment = (segment: string): BuilderOrderByField[] => {
  return splitOrderSegment(segment).map((part) => {
    let text = part.trim();
    let nulls: BuilderOrderByField["nulls"];
    const nullsMatch = text.match(/\s+NULLS\s+(FIRST|LAST)$/iu);
    if (nullsMatch?.index != null) {
      nulls = nullsMatch[1].toUpperCase() as BuilderOrderByField["nulls"];
      text = text.slice(0, nullsMatch.index).trim();
    }
    let direction: BuilderOrderByField["direction"] = "ASC";
    const directionMatch = text.match(/\s+(ASC|DESC)$/iu);
    if (directionMatch?.index != null) {
      direction = directionMatch[1].toUpperCase() as BuilderOrderByField["direction"];
      text = text.slice(0, directionMatch.index).trim();
    }
    return {
      id: createNodeId(),
      expression: text,
      direction,
      nulls,
    };
  });
};

const extractToken = (source: string): string | undefined => {
  const trimmed = source.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^\S+/u);
  return match?.[0];
};

const fillMissingClauses = (builder: BuilderQuery, source: string) => {
  const upper = source.toUpperCase();
  const returningIdx = lastKeywordIndex(upper, "RETURNING");
  const cursorIdx = lastKeywordIndex(upper, "CURSOR");
  const offsetIdx = lastKeywordIndex(upper, "OFFSET");
  const limitIdx = lastKeywordIndex(upper, "LIMIT");
  const orderIdx = lastKeywordIndex(upper, "ORDER BY");

  const nextAfter = (index: number) =>
    [returningIdx, cursorIdx, offsetIdx, limitIdx]
      .filter((candidate) => candidate > index)
      .reduce((min, candidate) => (min === -1 || candidate < min ? candidate : min), -1);

  if (!builder.orderBy.length && orderIdx >= 0) {
    const start = orderIdx + "ORDER BY".length;
    const endCandidate = nextAfter(orderIdx);
    const end = endCandidate >= 0 ? endCandidate : source.length;
    const segment = source.slice(start, end).trim();
    if (segment) {
      builder.orderBy = parseOrderSegment(segment);
    }
  }

  if (!builder.limit && limitIdx >= 0) {
    const start = limitIdx + "LIMIT".length;
    const endCandidate = [offsetIdx, cursorIdx, returningIdx]
      .filter((candidate) => candidate > limitIdx)
      .reduce((min, candidate) => (min === -1 || candidate < min ? candidate : min), -1);
    const end = endCandidate >= 0 ? endCandidate : source.length;
    const token = extractToken(source.slice(start, end));
    if (token) {
      builder.limit = token;
    }
  }

  if (!builder.offset && offsetIdx >= 0) {
    const start = offsetIdx + "OFFSET".length;
    const endCandidate = [cursorIdx, returningIdx]
      .filter((candidate) => candidate > offsetIdx)
      .reduce((min, candidate) => (min === -1 || candidate < min ? candidate : min), -1);
    const end = endCandidate >= 0 ? endCandidate : source.length;
    const token = extractToken(source.slice(start, end));
    if (token) {
      builder.offset = token;
    }
  }

  if (!builder.cursor && cursorIdx >= 0) {
    const start = cursorIdx + "CURSOR".length;
    const endCandidate = returningIdx > cursorIdx ? returningIdx : source.length;
    const token = extractToken(source.slice(start, endCandidate));
    if (token) {
      builder.cursor = token;
    }
  }
};

const restoreParameterValue = (value: string, map: Record<string, string>): string => {
  let restored = value;
  Object.entries(map).forEach(([placeholder, original]) => {
    const pattern = new RegExp(placeholder, "gu");
    restored = restored.replace(pattern, original);
  });
  return restored;
};

const restoreParametersInQuery = (query: BuilderQuery, map: Record<string, string>) => {
  if (!map || !Object.keys(map).length) {
    return;
  }
  visitNodes(query.where, (node) => {
    if (node.type === "clause") {
      node.value = restoreParameterValue(node.value, map);
      node.field = restoreParameterValue(node.field, map);
    }
  });
  visitNodes(query.having, (node) => {
    if (node.type === "clause") {
      node.value = restoreParameterValue(node.value, map);
      node.field = restoreParameterValue(node.field, map);
    }
  });
  query.projections = query.projections.map((projection) => ({
    ...projection,
    expression: restoreParameterValue(projection.expression, map),
    alias: projection.alias,
  }));
  query.aggregates = query.aggregates.map((aggregate) => ({
    ...aggregate,
    expression: restoreParameterValue(aggregate.expression, map),
    alias: aggregate.alias,
  }));
  query.groupBy = query.groupBy.map((entry) => ({
    ...entry,
    expression: restoreParameterValue(entry.expression, map),
  }));
  query.orderBy = query.orderBy.map((order) => ({
    ...order,
    expression: restoreParameterValue(order.expression, map),
  }));
  query.joins = query.joins.map((join) => ({
    ...join,
    source: restoreParameterValue(join.source, map),
    alias: join.alias ? restoreParameterValue(join.alias, map) : join.alias,
    condition: restoreParameterValue(join.condition, map),
  }));
  query.relations = query.relations.map((relation) => ({
    ...relation,
    relation: restoreParameterValue(relation.relation, map),
  }));
  query.returning = query.returning.map((entry) => ({
    ...entry,
    expression: restoreParameterValue(entry.expression, map),
  }));
  query.limit = query.limit ? restoreParameterValue(query.limit, map) : query.limit;
  query.offset = query.offset ? restoreParameterValue(query.offset, map) : query.offset;
  query.cursor = query.cursor ? restoreParameterValue(query.cursor, map) : query.cursor;
};

export const opqlToQuery = (input: string): BuilderQuery => {
  const trimmed = input.trim();
  if (!trimmed) {
    return normalizeQuery(createQuery());
  }
  try {
    const { text: sanitized, map } = replaceParameters(trimmed);
    const parsed = parseOPQL(sanitized);
    const builder = statementToBuilderQuery(parsed);
    fillMissingClauses(builder, sanitized);
    restoreParametersInQuery(builder, map);
    return normalizeQuery(builder);
  } catch (error) {
    const fallback = createQuery();
    fallback.where = opqlToGroup(trimmed);
    return normalizeQuery(fallback);
  }
};

export const collectQueryParameters = (query: BuilderQuery): string[] => {
  const params = new Set<string>();
  const scanValue = (value: string | undefined) => {
    extractParametersFromText(value).forEach((match) => params.add(match));
  };
  visitNodes(query.where, (node) => {
    if (node.type === "clause") {
      if (node.valueWasQuoted !== true) {
        scanValue(node.value);
      }
      scanValue(node.field);
    }
  });
  visitNodes(query.having, (node) => {
    if (node.type === "clause") {
      if (node.valueWasQuoted !== true) {
        scanValue(node.value);
      }
      scanValue(node.field);
    }
  });
  query.projections.forEach((projection) => scanValue(projection.expression));
  query.aggregates.forEach((aggregate) => scanValue(aggregate.expression));
  query.groupBy.forEach((entry) => scanValue(entry.expression));
  query.orderBy.forEach((entry) => scanValue(entry.expression));
  query.joins.forEach((join) => {
    scanValue(join.condition);
    scanValue(join.source);
    scanValue(join.alias);
  });
  query.returning.forEach((entry) => scanValue(entry.expression));
  query.relations.forEach((relation) => scanValue(relation.relation));
  scanValue(query.limit);
  scanValue(query.offset);
  scanValue(query.cursor);
  return Array.from(params);
};

export const summarizeQuery = (query: BuilderQuery): string => {
  const normalized = normalizeQuery(query);
  const pieces: string[] = [];
  const whereSummary = summarizeGroup(normalized.where, "short");
  if (whereSummary && whereSummary !== "No filters applied") {
    pieces.push(whereSummary);
  }
  if (normalized.groupBy.length) {
    const fields = normalized.groupBy.map((entry) => entry.expression).join(", ");
    pieces.push(`grouped by ${fields}`);
  }
  if (normalized.orderBy.length) {
    const order = normalized.orderBy
      .map((entry) => `${entry.expression} ${entry.direction.toLowerCase()}`)
      .join(", ");
    pieces.push(`ordered by ${order}`);
  }
  if (normalized.limit) {
    pieces.push(`limit ${normalized.limit}`);
  }
  return pieces.length ? pieces.join(", ") : "No filters applied";
};

export type BuilderChangeMeta = {
  origin: "builder" | "natural-language" | "opql" | "undo" | "redo" | "saved";
  opql: string;
  statement?: StatementType;
};
