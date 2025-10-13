import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Braces,
  Brackets,
  GitMerge,
  ListTree,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  BuilderChangeMeta,
  BuilderClause,
  BuilderGroup,
  BuilderNode,
  BuilderLogicalOperator,
  BuilderOrderByField,
  BuilderProjection,
  BuilderAggregate,
  BuilderRelation,
  BuilderQuery,
  cloneQuery,
  collectQueryParameters,
  countClauses,
  createAggregate,
  createClause,
  createGroup,
  createOrderBy,
  createProjection,
  createQuery,
  createRelation,
  mutateClauseById,
  mutateGroupById,
  normalizeGroup,
  normalizeQuery,
  opqlToQuery,
  queryToOpql,
  removeNodeById,
  summarizeQuery,
  visitNodes,
} from "@/lib/opql/builder";
import {
  NaturalLanguageSession,
  NaturalLanguageToken,
} from "@/lib/opql/naturalLanguage";
import { cn } from "@/lib/utils";

const FIELD_DEFINITIONS: Array<{
  value: string;
  label: string;
  comparators: string[];
  suggestions?: string[];
}> = [
  { value: "status", label: "Status", comparators: ["=", "!="] },
  { value: "assignee", label: "Assignee", comparators: ["=", "!="] },
  { value: "priority", label: "Priority", comparators: ["=", "!=", ">=", "<="] },
  { value: "project", label: "Project", comparators: ["=", "!="] },
  { value: "type", label: "Type", comparators: ["=", "!="] },
  { value: "tags", label: "Tag", comparators: ["CONTAINS", "NOT IN"] },
  { value: "due_at", label: "Due", comparators: ["=", "<", ">", "<=", ">="] },
  { value: "updated_at", label: "Updated", comparators: ["<", ">", "<=", ">="] },
  { value: "created_by", label: "Created by", comparators: ["=", "!="] },
  { value: "text", label: "Full text", comparators: ["MATCH", "CONTAINS"] },
];

const DEFAULT_COMPARATORS = [
  "=",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "MATCH",
  "CONTAINS",
  "LIKE",
  "BETWEEN",
];

const TRAVERSAL_HELPERS: Array<{
  id: string;
  label: string;
  description: string;
  clause: BuilderClause;
}> = [
  {
    id: "subtasks",
    label: "Include subtasks",
    description: "Traverse into subtasks when matching tasks.",
    clause: { ...createClause("relations.subtasks", "=", "include"), source: "helper" },
  },
  {
    id: "dependencies",
    label: "Follow dependencies",
    description: "Include work that depends on the matches.",
    clause: { ...createClause("relations.dependencies", "=", "include"), source: "helper" },
  },
  {
    id: "parents",
    label: "Show parent epics",
    description: "Surface parent epics for matching tasks.",
    clause: { ...createClause("relations.parents", "=", "include"), source: "helper" },
  },
];

export interface AggregationPivotEntry {
  value: string;
  count: number;
}

export interface AggregationPivot {
  key: string;
  label: string;
  field: string;
  entries: AggregationPivotEntry[];
}

interface QueryBuilderProps {
  value: BuilderQuery;
  opqlText: string;
  onChange: (query: BuilderQuery, meta: BuilderChangeMeta) => void;
  onOpqlChange: (opql: string) => void;
  naturalLanguage: NaturalLanguageSession;
  pivots?: AggregationPivot[];
  savedParameters?: Record<string, string | string[]>;
  resultCount?: number;
  isActive?: boolean;
}

interface GroupEditorProps {
  group: BuilderGroup;
  depth: number;
  editingClauseId: string | null;
  onStartEdit: (clauseId: string | null) => void;
  onAddClause: (groupId: string) => void;
  onAddGroup: (groupId: string, operator: BuilderLogicalOperator) => void;
  onToggleGroupOperator: (groupId: string) => void;
  onRemoveNode: (node: BuilderNode) => void;
  onClauseChange: (
    clauseId: string,
    updates: Partial<Pick<BuilderClause, "field" | "comparator" | "value">>
  ) => void;
}

interface ClauseEditorProps {
  clause: BuilderClause;
  isEditing: boolean;
  onStartEdit: (clauseId: string | null) => void;
  onChange: (
    clauseId: string,
    updates: Partial<Pick<BuilderClause, "field" | "comparator" | "value">>
  ) => void;
  onRemove: (clause: BuilderClause) => void;
}

const findFieldDefinition = (field: string) =>
  FIELD_DEFINITIONS.find((definition) => definition.value === field);

const ClauseEditor = ({
  clause,
  isEditing,
  onStartEdit,
  onChange,
  onRemove,
}: ClauseEditorProps) => {
  const definition = findFieldDefinition(clause.field);
  const comparatorOptions = definition?.comparators ?? DEFAULT_COMPARATORS;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onStartEdit(clause.id)}
        onKeyDown={(event) => {
          if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            onRemove(clause);
          }
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isEditing && "ring-2 ring-ring"
        )}
        aria-expanded={isEditing}
        aria-controls={`clause-editor-${clause.id}`}
      >
        <span className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="uppercase">
            {clause.field}
          </Badge>
          <span className="text-muted-foreground">{clause.comparator}</span>
          <span className="font-medium">{clause.value || "(value)"}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {(clause.confidence ?? 0.6) * 100 >= 100
            ? "100%"
            : `${Math.round((clause.confidence ?? 0.6) * 100)}%`}
        </span>
      </button>
      {isEditing ? (
        <div
          id={`clause-editor-${clause.id}`}
          className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,140px)_minmax(0,1fr)]"
        >
          <div>
            <Label htmlFor={`field-${clause.id}`} className="text-xs text-muted-foreground">
              Field
            </Label>
            <Select
              value={clause.field}
              onValueChange={(value) =>
                onChange(clause.id, {
                  field: value,
                  comparator: findFieldDefinition(value)?.comparators[0] ?? clause.comparator,
                })
              }
            >
              <SelectTrigger id={`field-${clause.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_DEFINITIONS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`comparator-${clause.id}`} className="text-xs text-muted-foreground">
              Operator
            </Label>
            <Select
              value={clause.comparator}
              onValueChange={(value) => onChange(clause.id, { comparator: value })}
            >
              <SelectTrigger id={`comparator-${clause.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {comparatorOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`value-${clause.id}`} className="text-xs text-muted-foreground">
              Value
            </Label>
            <Input
              id={`value-${clause.id}`}
              value={clause.value}
              onChange={(event) => onChange(clause.id, { value: event.target.value })}
              placeholder="Value"
            />
          </div>
          <div className="col-span-full flex justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(clause)}
            >
              Remove
            </Button>
            <Button type="button" size="sm" onClick={() => onStartEdit(null)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const GroupEditor = ({
  group,
  depth,
  editingClauseId,
  onStartEdit,
  onAddClause,
  onAddGroup,
  onToggleGroupOperator,
  onRemoveNode,
  onClauseChange,
}: GroupEditorProps) => {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-dashed border-border/60 bg-background/80 p-3",
        depth > 0 && "ml-4"
      )}
      aria-label={`Group with ${group.operator} operator`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="uppercase">
          {group.operator}
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => onToggleGroupOperator(group.id)}
        >
          <ArrowLeftRight className="mr-1 h-3 w-3" />
          Toggle to {group.operator === "AND" ? "OR" : "AND"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2"
          onClick={() => onAddClause(group.id)}
        >
          <Plus className="mr-1 h-3 w-3" /> Add condition
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2"
          onClick={() => onAddGroup(group.id, group.operator)}
        >
          <GitMerge className="mr-1 h-3 w-3" /> Nest group
        </Button>
      </div>
      <div className="space-y-3">
        {group.children.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            No conditions yet. Add a filter or choose a helper chip.
          </div>
        ) : null}
        {group.children.map((child) => {
          if (child.type === "clause") {
            return (
              <ClauseEditor
                key={child.id}
                clause={child}
                isEditing={editingClauseId === child.id}
                onStartEdit={onStartEdit}
                onChange={onClauseChange}
                onRemove={onRemoveNode}
              />
            );
          }
          return (
            <div key={child.id} className="relative">
              <div className="absolute left-[-12px] top-0 bottom-0 flex flex-col justify-between text-muted-foreground">
                <span>(</span>
                <span>)</span>
              </div>
              <GroupEditor
                group={child}
                depth={depth + 1}
                editingClauseId={editingClauseId}
                onStartEdit={onStartEdit}
                onAddClause={onAddClause}
                onAddGroup={onAddGroup}
                onToggleGroupOperator={onToggleGroupOperator}
                onRemoveNode={onRemoveNode}
                onClauseChange={onClauseChange}
              />
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => onRemoveNode(child)}
                >
                  Remove group
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const QueryBuilder = ({
  value,
  opqlText,
  onChange,
  onOpqlChange,
  naturalLanguage,
  pivots,
  savedParameters,
  resultCount,
  isActive = true,
}: QueryBuilderProps) => {
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);
  const [nlDraft, setNlDraft] = useState(() =>
    naturalLanguage.interpretation?.original ?? naturalLanguage.describe(value)
  );
  const [nlTokens, setNlTokens] = useState<NaturalLanguageToken[]>(
    naturalLanguage.interpretation?.tokens ?? []
  );
  const skipInterpretRef = useRef(false);
  const isApplyingRef = useRef(false);
  const historyRef = useRef<BuilderQuery[]>([normalizeQuery(value)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    if (isApplyingRef.current) {
      historyRef.current[historyIndex] = normalizeQuery(value);
      isApplyingRef.current = false;
      return;
    }
    const current = historyRef.current[historyIndex];
    if (!current || queryToOpql(current) !== queryToOpql(value)) {
      historyRef.current = [normalizeQuery(value)];
      setHistoryIndex(0);
    }
  }, [value, historyIndex]);

  const pushHistory = useCallback(
    (snapshot: BuilderQuery) => {
      const normalized = normalizeQuery(snapshot);
      const baseline = historyRef.current.slice(0, historyIndex + 1);
      baseline.push(normalized);
      historyRef.current = baseline.slice(-50);
      setHistoryIndex(historyRef.current.length - 1);
    },
    [historyIndex]
  );

  const applyChange = useCallback(
    (
      mutator: (draft: BuilderQuery) => void,
      origin: BuilderChangeMeta["origin"] = "builder"
    ) => {
      const draft = cloneQuery(value);
      mutator(draft);
      const normalized = normalizeQuery(draft);
      const opql = queryToOpql(normalized);
      isApplyingRef.current = true;
      pushHistory(normalized);
      onChange(normalized, { origin, opql, statement: normalized.statement });
      if (origin !== "opql") {
        onOpqlChange(opql);
      }
    },
    [onChange, onOpqlChange, pushHistory, value]
  );

  const handleClauseChange = useCallback(
    (
      target: "where" | "having",
      clauseId: string,
      updates: Partial<Pick<BuilderClause, "field" | "comparator" | "value">>
    ) => {
      applyChange((draft) => {
        const group = target === "where" ? draft.where : draft.having;
        mutateClauseById(group, clauseId, (clause) => {
          Object.assign(clause, updates);
          clause.source = clause.source ?? "manual";
          if (Object.prototype.hasOwnProperty.call(updates, "value")) {
            clause.valueWasQuoted = false;
          }
        });
      });
    },
    [applyChange]
  );

  const handleAddClause = useCallback(
    (target: "where" | "having", groupId: string) => {
      const clause = createClause("status", "=", "open");
      clause.source = "manual";
      applyChange((draft) => {
        const group = target === "where" ? draft.where : draft.having;
        mutateGroupById(group, groupId, (node) => {
          node.children = [...node.children, clause];
        });
      });
      setEditingClauseId(clause.id);
    },
    [applyChange]
  );

  const handleAddGroup = useCallback(
    (target: "where" | "having", groupId: string, operator: BuilderLogicalOperator) => {
      const newGroup = createGroup(operator);
      newGroup.children.push(createClause("text", "MATCH", ""));
      applyChange((draft) => {
        const group = target === "where" ? draft.where : draft.having;
        mutateGroupById(group, groupId, (node) => {
          node.children = [...node.children, newGroup];
        });
      });
      setEditingClauseId(newGroup.children[0]?.type === "clause" ? newGroup.children[0].id : null);
    },
    [applyChange]
  );

  const handleToggleGroupOperator = useCallback(
    (target: "where" | "having", groupId: string) => {
      applyChange((draft) => {
        const group = target === "where" ? draft.where : draft.having;
        mutateGroupById(group, groupId, (node) => {
          node.operator = node.operator === "AND" ? "OR" : "AND";
        });
      });
    },
    [applyChange]
  );

  const handleRemoveNode = useCallback(
    (target: "where" | "having", node: BuilderNode) => {
      applyChange((draft) => {
        const group = target === "where" ? draft.where : draft.having;
        removeNodeById(group, node.id);
      });
      if (editingClauseId === node.id) {
        setEditingClauseId(null);
      }
    },
    [applyChange, editingClauseId]
  );

  const handleProjectionUpdate = useCallback(
    (index: number, updates: Partial<BuilderProjection>) => {
      applyChange((draft) => {
        const next = [...draft.projections];
        next[index] = { ...next[index], ...updates };
        draft.projections = next;
      });
    },
    [applyChange]
  );

  const handleAddProjection = useCallback(() => {
    applyChange((draft) => {
      draft.projections = [...draft.projections, createProjection()];
    });
  }, [applyChange]);

  const handleRemoveProjection = useCallback(
    (index: number) => {
      applyChange((draft) => {
        const next = [...draft.projections];
        next.splice(index, 1);
        draft.projections = next;
      });
    },
    [applyChange]
  );

  const handleAggregateUpdate = useCallback(
    (index: number, updates: Partial<BuilderAggregate>) => {
      applyChange((draft) => {
        const next = [...draft.aggregates];
        next[index] = { ...next[index], ...updates };
        draft.aggregates = next;
      });
    },
    [applyChange]
  );

  const handleAddAggregate = useCallback(() => {
    applyChange((draft) => {
      draft.aggregates = [...draft.aggregates, createAggregate()];
    });
  }, [applyChange]);

  const handleRemoveAggregate = useCallback(
    (index: number) => {
      applyChange((draft) => {
        const next = [...draft.aggregates];
        next.splice(index, 1);
        draft.aggregates = next;
      });
    },
    [applyChange]
  );

  const handleGroupByUpdate = useCallback(
    (index: number, updates: Partial<BuilderProjection>) => {
      applyChange((draft) => {
        const next = [...draft.groupBy];
        next[index] = { ...next[index], ...updates };
        draft.groupBy = next;
      });
    },
    [applyChange]
  );

  const handleAddGroupBy = useCallback(() => {
    applyChange((draft) => {
      draft.groupBy = [...draft.groupBy, createProjection("field")];
    });
  }, [applyChange]);

  const handleRemoveGroupBy = useCallback(
    (index: number) => {
      applyChange((draft) => {
        const next = [...draft.groupBy];
        next.splice(index, 1);
        draft.groupBy = next;
      });
    },
    [applyChange]
  );

  const handleOrderByUpdate = useCallback(
    (index: number, updates: Partial<BuilderOrderByField>) => {
      applyChange((draft) => {
        const next = [...draft.orderBy];
        next[index] = { ...next[index], ...updates } as BuilderOrderByField;
        draft.orderBy = next;
      });
    },
    [applyChange]
  );

  const handleAddOrderBy = useCallback(() => {
    applyChange((draft) => {
      draft.orderBy = [...draft.orderBy, createOrderBy()];
    });
  }, [applyChange]);

  const handleRemoveOrderBy = useCallback(
    (index: number) => {
      applyChange((draft) => {
        const next = [...draft.orderBy];
        next.splice(index, 1);
        draft.orderBy = next;
      });
    },
    [applyChange]
  );

  const handleRelationUpdate = useCallback(
    (index: number, updates: Partial<BuilderRelation>) => {
      applyChange((draft) => {
        const next = [...draft.relations];
        next[index] = { ...next[index], ...updates };
        draft.relations = next;
      });
    },
    [applyChange]
  );

  const handleRelationDepthChange = useCallback(
    (index: number, value: string) => {
      const trimmed = value.trim();
      applyChange((draft) => {
        const next = [...draft.relations];
        const numeric = trimmed.length ? Number(trimmed) : undefined;
        next[index] = {
          ...next[index],
          depth: numeric != null && !Number.isNaN(numeric) ? numeric : undefined,
        };
        draft.relations = next;
      });
    },
    [applyChange]
  );

  const handleAddRelation = useCallback(() => {
    applyChange((draft) => {
      draft.relations = [...draft.relations, createRelation("relation")];
    });
  }, [applyChange]);

  const handleRemoveRelation = useCallback(
    (index: number) => {
      applyChange((draft) => {
        const next = [...draft.relations];
        next.splice(index, 1);
        draft.relations = next;
      });
    },
    [applyChange]
  );

  const handleReturningUpdate = useCallback(
    (index: number, updates: Partial<BuilderProjection>) => {
      applyChange((draft) => {
        const next = [...draft.returning];
        next[index] = { ...next[index], ...updates };
        draft.returning = next;
      });
    },
    [applyChange]
  );

  const handleAddReturning = useCallback(() => {
    applyChange((draft) => {
      draft.returning = [...draft.returning, createProjection("*")];
    });
  }, [applyChange]);

  const handleRemoveReturning = useCallback(
    (index: number) => {
      applyChange((draft) => {
        const next = [...draft.returning];
        next.splice(index, 1);
        draft.returning = next;
      });
    },
    [applyChange]
  );

  const handleLimitChange = useCallback(
    (next: string) => {
      applyChange((draft) => {
        const trimmed = next.trim();
        draft.limit = trimmed.length ? trimmed : undefined;
      });
    },
    [applyChange]
  );

  const handleOffsetChange = useCallback(
    (next: string) => {
      applyChange((draft) => {
        const trimmed = next.trim();
        draft.offset = trimmed.length ? trimmed : undefined;
      });
    },
    [applyChange]
  );

  const handleCursorChange = useCallback(
    (next: string) => {
      applyChange((draft) => {
        const trimmed = next.trim();
        draft.cursor = trimmed.length ? trimmed : undefined;
      });
    },
    [applyChange]
  );

  const handleOpqlInput = useCallback(
    (next: string) => {
      onOpqlChange(next);
      const parsed = opqlToQuery(next);
      const normalized = normalizeQuery(parsed);
      const opql = queryToOpql(normalized);
      skipInterpretRef.current = true;
      isApplyingRef.current = true;
      pushHistory(normalized);
      naturalLanguage.synchronizeFromBuilder(normalized);
      onChange(normalized, { origin: "opql", opql, statement: normalized.statement });
    },
    [naturalLanguage, onChange, onOpqlChange, pushHistory]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex === 0) return;
    const nextIndex = historyIndex - 1;
    const snapshot = historyRef.current[nextIndex];
    if (!snapshot) return;
    setHistoryIndex(nextIndex);
    isApplyingRef.current = true;
    const normalized = normalizeQuery(snapshot);
    const opql = queryToOpql(normalized);
    skipInterpretRef.current = true;
    naturalLanguage.synchronizeFromBuilder(normalized);
    onChange(normalized, { origin: "undo", opql, statement: normalized.statement });
    onOpqlChange(opql);
  }, [historyIndex, naturalLanguage, onChange, onOpqlChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const nextIndex = historyIndex + 1;
    const snapshot = historyRef.current[nextIndex];
    if (!snapshot) return;
    setHistoryIndex(nextIndex);
    isApplyingRef.current = true;
    const normalized = normalizeQuery(snapshot);
    const opql = queryToOpql(normalized);
    skipInterpretRef.current = true;
    naturalLanguage.synchronizeFromBuilder(normalized);
    onChange(normalized, { origin: "redo", opql, statement: normalized.statement });
    onOpqlChange(opql);
  }, [historyIndex, naturalLanguage, onChange, onOpqlChange]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyRef.current.length - 1;

  useEffect(() => {
    if (skipInterpretRef.current) {
      skipInterpretRef.current = false;
      return;
    }
    const state = naturalLanguage.interpretation;
    const opql = queryToOpql(value);
    if (state?.opql === opql && state.provenance === "natural-language") {
      setNlDraft(state.original);
      setNlTokens(state.tokens);
      return;
    }
    const summary = naturalLanguage.describe(value);
    setNlDraft(summary);
    setNlTokens(state?.tokens ?? []);
  }, [naturalLanguage, value]);

  useEffect(() => {
    if (!isActive) return;
    if (nlDraft == null) return;
    const state = naturalLanguage.interpretation;
    if (state && state.original === nlDraft) {
      return;
    }
    const handler = window.setTimeout(() => {
      if (!nlDraft.trim()) {
        const empty = createQuery();
        skipInterpretRef.current = true;
        naturalLanguage.synchronizeFromBuilder(empty);
        onChange(empty, { origin: "natural-language", opql: "", statement: empty.statement });
        onOpqlChange("");
        setNlTokens([]);
        return;
      }
      const interpretation = naturalLanguage.interpret(nlDraft);
      skipInterpretRef.current = true;
      setNlTokens(interpretation.tokens);
      onChange(interpretation.builder, {
        origin: "natural-language",
        opql: interpretation.opql,
        statement: interpretation.builder.statement,
      });
      onOpqlChange(interpretation.opql);
    }, 400);
    return () => window.clearTimeout(handler);
  }, [isActive, naturalLanguage, nlDraft, onChange, onOpqlChange]);

  const activeHelpers = useMemo(() => {
    const active = new Set<string>();
    visitNodes(value.where, (node) => {
      if (node.type !== "clause") return;
      const match = TRAVERSAL_HELPERS.find(
        (helper) =>
          helper.clause.field === node.field &&
          helper.clause.value === node.value &&
          helper.clause.comparator === node.comparator
      );
      if (match) {
        active.add(match.id);
      }
    });
    return active;
  }, [value]);

  const toggleTraversal = useCallback(
    (helperId: string) => {
      const helper = TRAVERSAL_HELPERS.find((item) => item.id === helperId);
      if (!helper) return;
      const isActiveHelper = activeHelpers.has(helperId);
      if (isActiveHelper) {
        applyChange((draft) => {
          const target = helper.clause;
          let removed = false;
          visitNodes(draft.where, (node, parent) => {
            if (removed || node.type !== "clause" || !parent) return;
            if (
              node.field === target.field &&
              node.value === target.value &&
              node.comparator === target.comparator
            ) {
              removeNodeById(parent, node.id);
              removed = true;
            }
          });
        });
        return;
      }
      applyChange((draft) => {
        const id =
          typeof globalThis.crypto !== "undefined" &&
          typeof globalThis.crypto.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `helper_${helper.id}_${Math.random().toString(16).slice(2)}`;
        draft.where.children = [...draft.where.children, { ...helper.clause, id }];
      });
    },
    [activeHelpers, applyChange]
  );

  const builderSummary = useMemo(() => summarizeQuery(value), [value]);

  const savedParamsEntries = useMemo(() => {
    if (!savedParameters) return [] as Array<[string, string]>;
    return Object.entries(savedParameters).map(([key, entryValue]) => [
      key,
      Array.isArray(entryValue) ? entryValue.join(", ") : entryValue,
    ]);
  }, [savedParameters]);

  const parameterNames = useMemo(() => collectQueryParameters(value), [value]);

  const totalClauses = useMemo(
    () => countClauses(value.where) + countClauses(value.having),
    [value]
  );

  const handlePivot = useCallback(
    (pivot: AggregationPivot, entry: AggregationPivotEntry) => {
      applyChange((draft) => {
        draft.where.children = [
          ...draft.where.children,
          {
            ...createClause(pivot.field, "=", entry.value),
            source: "helper",
            confidence: 0.7,
          },
        ];
      });
    },
    [applyChange]
  );

  return (
    <Card className="space-y-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Braces className="h-5 w-5" /> Visual query builder
        </CardTitle>
        <CardDescription>
          Compose complex OPQL visually, describe what you need in natural language,
          or edit the query text directly. Changes stay in sync across views.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="nl-input" className="text-sm font-medium">
              Describe your search
            </Label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Interpreted live
            </div>
          </div>
          <Textarea
            id="nl-input"
            value={nlDraft ?? ""}
            onChange={(event) => setNlDraft(event.target.value)}
            placeholder="e.g. open tasks assigned to me updated last week"
            className="min-h-[90px]"
          />
          {nlTokens.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {nlTokens.map((token) => (
                <Badge
                  key={`${token.text}-${token.start}-${token.end}`}
                  variant={token.kind === "noise" ? "outline" : "secondary"}
                >
                  {token.text}
                </Badge>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="opql-input" className="text-sm font-medium">
              OPQL preview
            </Label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Brackets className="h-3.5 w-3.5" /> Editable
            </div>
          </div>
          <Textarea
            id="opql-input"
            value={opqlText}
            onChange={(event) => handleOpqlInput(event.target.value)}
            spellCheck={false}
            className="font-mono"
          />
        </section>

        {value.statement === "AGGREGATE" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListTree className="h-4 w-4" /> Aggregations
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleAddAggregate}>
                <Plus className="mr-1 h-3 w-3" /> Add aggregate
              </Button>
            </div>
            <div className="space-y-2">
              {value.aggregates.map((aggregate, index) => (
                <div
                  key={aggregate.id}
                  className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_auto]"
                >
                  <Input
                    value={aggregate.expression}
                    onChange={(event) =>
                      handleAggregateUpdate(index, { expression: event.target.value })
                    }
                    placeholder="Function expression"
                  />
                  <Input
                    value={aggregate.alias ?? ""}
                    onChange={(event) =>
                      handleAggregateUpdate(index, { alias: event.target.value || undefined })
                    }
                    placeholder="Alias (optional)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAggregate(index)}
                    className="justify-self-end"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListTree className="h-4 w-4" /> Return fields
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleAddProjection}>
                <Plus className="mr-1 h-3 w-3" /> Add field
              </Button>
            </div>
            <div className="space-y-2">
              {value.projections.map((projection, index) => (
                <div
                  key={projection.id}
                  className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_auto]"
                >
                  <Input
                    value={projection.expression}
                    onChange={(event) =>
                      handleProjectionUpdate(index, { expression: event.target.value })
                    }
                    placeholder="Field or expression"
                  />
                  <Input
                    value={projection.alias ?? ""}
                    onChange={(event) =>
                      handleProjectionUpdate(index, { alias: event.target.value || undefined })
                    }
                    placeholder="Alias (optional)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProjection(index)}
                    className="justify-self-end"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListTree className="h-4 w-4" /> Group by
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddGroupBy}>
              <Plus className="mr-1 h-3 w-3" /> Add grouping
            </Button>
          </div>
          <div className="space-y-2">
            {value.groupBy.map((entry, index) => (
              <div key={entry.id} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={entry.expression}
                  onChange={(event) =>
                    handleGroupByUpdate(index, { expression: event.target.value })
                  }
                  placeholder="Field or expression"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveGroupBy(index)}
                  className="justify-self-end"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListTree className="h-4 w-4" /> Having
          </div>
          <GroupEditor
            group={value.having}
            depth={0}
            editingClauseId={editingClauseId}
            onStartEdit={setEditingClauseId}
            onAddClause={(groupId) => handleAddClause("having", groupId)}
            onAddGroup={(groupId, operator) => handleAddGroup("having", groupId, operator)}
            onToggleGroupOperator={(groupId) => handleToggleGroupOperator("having", groupId)}
            onRemoveNode={(node) => handleRemoveNode("having", node)}
            onClauseChange={(clauseId, updates) => handleClauseChange("having", clauseId, updates)}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListTree className="h-4 w-4" /> Order & limit
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddOrderBy}>
              <Plus className="mr-1 h-3 w-3" /> Add sort
            </Button>
          </div>
          <div className="space-y-2">
            {value.orderBy.map((order, index) => (
              <div
                key={order.id}
                className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,140px)_minmax(0,160px)_auto]"
              >
                <Input
                  value={order.expression}
                  onChange={(event) =>
                    handleOrderByUpdate(index, { expression: event.target.value })
                  }
                  placeholder="Field or expression"
                />
                <Select
                  value={order.direction}
                  onValueChange={(direction) =>
                    handleOrderByUpdate(index, { direction: direction as BuilderOrderByField["direction"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">Ascending</SelectItem>
                    <SelectItem value="DESC">Descending</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={order.nulls ?? "DEFAULT"}
                  onValueChange={(value) =>
                    handleOrderByUpdate(index, {
                      nulls: value === "DEFAULT" ? undefined : (value as BuilderOrderByField["nulls"]),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">Nulls default</SelectItem>
                    <SelectItem value="FIRST">Nulls first</SelectItem>
                    <SelectItem value="LAST">Nulls last</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOrderBy(index)}
                  className="justify-self-end"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="builder-limit" className="text-xs text-muted-foreground">
                Limit
              </Label>
              <Input
                id="builder-limit"
                value={value.limit ?? ""}
                onChange={(event) => handleLimitChange(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="builder-offset" className="text-xs text-muted-foreground">
                Offset
              </Label>
              <Input
                id="builder-offset"
                value={value.offset ?? ""}
                onChange={(event) => handleOffsetChange(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="builder-cursor" className="text-xs text-muted-foreground">
                Cursor
              </Label>
              <Input
                id="builder-cursor"
                value={value.cursor ?? ""}
                onChange={(event) => handleCursorChange(event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListTree className="h-4 w-4" /> Relations
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddRelation}>
              <Plus className="mr-1 h-3 w-3" /> Add relation
            </Button>
          </div>
          <div className="space-y-2">
            {value.relations.map((relation, index) => (
              <div
                key={relation.id}
                className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)_minmax(0,120px)_auto]"
              >
                <Input
                  value={relation.relation}
                  onChange={(event) =>
                    handleRelationUpdate(index, { relation: event.target.value })
                  }
                  placeholder="Relation name"
                />
                <Select
                  value={relation.direction ?? "DEFAULT"}
                  onValueChange={(value) =>
                    handleRelationUpdate(index, {
                      direction: value === "DEFAULT" ? undefined : (value as BuilderRelation["direction"]),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">Default</SelectItem>
                    <SelectItem value="INBOUND">Inbound</SelectItem>
                    <SelectItem value="OUTBOUND">Outbound</SelectItem>
                    <SelectItem value="BIDIRECTIONAL">Bidirectional</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={relation.depth != null ? String(relation.depth) : ""}
                  onChange={(event) => handleRelationDepthChange(index, event.target.value)}
                  placeholder="Depth"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRelation(index)}
                  className="justify-self-end"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </section>

        {value.returning.length || value.statement === "UPDATE" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListTree className="h-4 w-4" /> Return clause
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleAddReturning}>
                <Plus className="mr-1 h-3 w-3" /> Add return field
              </Button>
            </div>
            <div className="space-y-2">
              {value.returning.map((entry, index) => (
                <div
                  key={entry.id}
                  className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_auto]"
                >
                  <Input
                    value={entry.expression}
                    onChange={(event) =>
                      handleReturningUpdate(index, { expression: event.target.value })
                    }
                    placeholder="Field or expression"
                  />
                  <Input
                    value={entry.alias ?? ""}
                    onChange={(event) =>
                      handleReturningUpdate(index, { alias: event.target.value || undefined })
                    }
                    placeholder="Alias (optional)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveReturning(index)}
                    className="justify-self-end"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListTree className="h-4 w-4" /> Builder
          </div>
          <GroupEditor
            group={value.where}
            depth={0}
            editingClauseId={editingClauseId}
            onStartEdit={setEditingClauseId}
            onAddClause={(groupId) => handleAddClause("where", groupId)}
            onAddGroup={(groupId, operator) => handleAddGroup("where", groupId, operator)}
            onToggleGroupOperator={(groupId) => handleToggleGroupOperator("where", groupId)}
            onRemoveNode={(node) => handleRemoveNode("where", node)}
            onClauseChange={(clauseId, updates) => handleClauseChange("where", clauseId, updates)}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wand2 className="h-4 w-4" /> Traversal helpers
          </div>
          <div className="flex flex-wrap gap-2">
            {TRAVERSAL_HELPERS.map((helper) => (
              <Button
                key={helper.id}
                type="button"
                size="sm"
                variant={activeHelpers.has(helper.id) ? "default" : "outline"}
                onClick={() => toggleTraversal(helper.id)}
              >
                {helper.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Helpers insert or remove traversal clauses so you can follow relationships without
            writing OPQL manually.
          </p>
        </section>

        {pivots && pivots.length ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListTree className="h-4 w-4" /> Aggregation pivots
            </div>
            <div className="space-y-3">
              {pivots.map((pivot) => (
                <div key={pivot.key} className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {pivot.label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pivot.entries.slice(0, 8).map((entry) => (
                      <Button
                        key={`${pivot.key}-${entry.value}`}
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="gap-2 rounded-full border border-border"
                        onClick={() => handlePivot(pivot, entry)}
                      >
                        <span>{entry.value}</span>
                        <Badge variant="secondary">{entry.count}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {parameterNames.length ? (
          <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <div className="flex items-center gap-2 font-semibold uppercase text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Parameters in use
            </div>
            <div className="flex flex-wrap gap-2" data-testid="parameter-chip-container">
              {parameterNames.map((name) => (
                <Badge key={name} variant="outline" className="font-mono" aria-label={`parameter-${name}`}>
                  {name}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {savedParamsEntries.length ? (
          <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <div className="flex items-center gap-2 font-semibold uppercase text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Saved parameters
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {savedParamsEntries.map(([key, entryValue]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="font-medium">{key}</span>
                  <span className="truncate text-right text-muted-foreground">{entryValue}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Summarize</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> {resultCount ?? 0} matching results
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{builderSummary}</p>
        </section>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
          >
            <RotateCw className="mr-1 h-3.5 w-3.5" /> Redo
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{totalClauses} clauses</span>
        </div>
      </CardFooter>
    </Card>
  );
};
