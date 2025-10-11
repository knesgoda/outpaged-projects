import { Fragment } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type {
  BoardFilterCondition,
  BoardFilterDefinition,
  BoardFilterField,
  BoardFilterGroup,
  BoardFilterOperator,
} from "./types";

const FIELD_OPTIONS: Array<{ value: BoardFilterField; label: string }> = [
  { value: "search", label: "Search" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "hierarchy", label: "Hierarchy" },
  { value: "taskType", label: "Task Type" },
  { value: "dueDate", label: "Due Date" },
  { value: "tag", label: "Tag" },
  { value: "label", label: "Label" },
];

const OPERATOR_OPTIONS: Array<{ value: BoardFilterOperator; label: string }> = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "in", label: "in list" },
  { value: "not_in", label: "not in list" },
  { value: "regex", label: "matches regex" },
  { value: "relative_date", label: "relative date" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const RELATIVE_DATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "next_week", label: "Next week" },
  { value: "last_week", label: "Last week" },
  { value: "overdue", label: "Overdue" },
];

const LIST_OPERATORS: BoardFilterOperator[] = ["in", "not_in"];
const NO_VALUE_OPERATORS: BoardFilterOperator[] = ["is_empty", "is_not_empty"];
const RELATIVE_DATE_OPERATORS: BoardFilterOperator[] = ["relative_date"];

const generateId = () =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface BoardFilterBuilderProps {
  definition: BoardFilterDefinition;
  onChange: (definition: BoardFilterDefinition) => void;
  readOnly?: boolean;
}

function cloneGroup(group: BoardFilterGroup): BoardFilterGroup {
  return {
    ...group,
    conditions: group.conditions.map((condition) => ({ ...condition })),
    children: group.children.map(cloneGroup),
  };
}

export function cloneDefinition(definition: BoardFilterDefinition): BoardFilterDefinition {
  return {
    root: cloneGroup(definition.root),
  };
}

function updateDefinition(
  definition: BoardFilterDefinition,
  updater: (group: BoardFilterGroup) => void
): BoardFilterDefinition {
  const nextRoot = cloneGroup(definition.root);
  updater(nextRoot);
  return { root: nextRoot };
}

function updateGroup(
  group: BoardFilterGroup,
  groupId: string,
  updater: (target: BoardFilterGroup) => void
) {
  if (group.id === groupId) {
    updater(group);
    return;
  }

  group.children.forEach((child) => updateGroup(child, groupId, updater));
}

function removeGroup(group: BoardFilterGroup, groupId: string): BoardFilterGroup {
  return {
    ...group,
    children: group.children
      .filter((child) => child.id !== groupId)
      .map((child) => removeGroup(child, groupId)),
  };
}

function renderValueInput(
  condition: BoardFilterCondition,
  onValueChange: (value: BoardFilterCondition["value"]) => void
) {
  if (NO_VALUE_OPERATORS.includes(condition.operator)) {
    return null;
  }

  if (RELATIVE_DATE_OPERATORS.includes(condition.operator)) {
    return (
      <Select
        value={(condition.value as string) ?? "today"}
        onValueChange={(value) => onValueChange(value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {RELATIVE_DATE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (LIST_OPERATORS.includes(condition.operator)) {
    const values = Array.isArray(condition.value)
      ? (condition.value as string[])
      : typeof condition.value === "string"
      ? condition.value.split(",").map((value) => value.trim()).filter(Boolean)
      : [];

    return (
      <Input
        value={values.join(", ")}
        onChange={(event) =>
          onValueChange(
            event.target.value
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          )
        }
        placeholder="value1, value2, value3"
        className="w-[220px]"
      />
    );
  }

  return (
    <Input
      value={(condition.value as string) ?? ""}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder="Value"
      className="w-[220px]"
    />
  );
}

function renderCondition(
  condition: BoardFilterCondition,
  groupId: string,
  onChange: (updates: Partial<BoardFilterCondition>) => void,
  onRemove: () => void,
  readOnly?: boolean
) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-2">
      <Select
        value={condition.field}
        disabled={readOnly}
        onValueChange={(value) => onChange({ field: value as BoardFilterField })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {FIELD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        disabled={readOnly}
        onValueChange={(value) => onChange({ operator: value as BoardFilterOperator })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {OPERATOR_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {renderValueInput(condition, (value) => onChange({ value }))}

      {!readOnly && (
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove condition">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface GroupProps {
  group: BoardFilterGroup;
  depth: number;
  readOnly?: boolean;
  onChange: (next: BoardFilterGroup) => void;
  onRemove?: (groupId: string) => void;
}

function Group({ group, depth, onChange, onRemove, readOnly }: GroupProps) {
  const handleConditionUpdate = (conditionId: string, updates: Partial<BoardFilterCondition>) => {
    const nextConditions = group.conditions.map((condition) =>
      condition.id === conditionId ? { ...condition, ...updates } : condition
    );
    onChange({ ...group, conditions: nextConditions });
  };

  const handleAddCondition = () => {
    const condition: BoardFilterCondition = {
      id: generateId(),
      field: "status",
      operator: "is",
      value: "open",
    };
    onChange({ ...group, conditions: [...group.conditions, condition] });
  };

  const handleAddGroup = () => {
    const child: BoardFilterGroup = {
      id: generateId(),
      join: "AND",
      conditions: [],
      children: [],
    };
    onChange({ ...group, children: [...group.children, child] });
  };

  return (
    <Card className={cn("border-dashed", depth === 0 && "border-muted-foreground/40")}> 
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{depth === 0 ? "Root" : "Group"}</CardTitle>
          <Badge variant="secondary">{group.join}</Badge>
        </div>
        {!readOnly && depth > 0 && onRemove ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(group.id)}
            aria-label="Remove group"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={`join-${group.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
            Match
          </Label>
          <Select
            value={group.join}
            disabled={readOnly}
            onValueChange={(value) => onChange({ ...group, join: value as "AND" | "OR" })}
          >
            <SelectTrigger id={`join-${group.id}`} className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">All conditions</SelectItem>
              <SelectItem value="OR">Any condition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {group.conditions.map((condition) => (
            <Fragment key={condition.id}>
              {renderCondition(
                condition,
                group.id,
                (updates) => handleConditionUpdate(condition.id, updates),
                () => onChange({
                  ...group,
                  conditions: group.conditions.filter((item) => item.id !== condition.id),
                }),
                readOnly
              )}
            </Fragment>
          ))}
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={handleAddCondition}>
              <Plus className="mr-2 h-4 w-4" />
              Add condition
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {group.children.map((child) => (
            <Group
              key={child.id}
              depth={depth + 1}
              group={child}
              onChange={(next) => {
                const nextChildren = group.children.map((current) =>
                  current.id === child.id ? next : current
                );
                onChange({ ...group, children: nextChildren });
              }}
              onRemove={(groupId) => {
                const nextChildren = group.children.filter((current) => current.id !== groupId);
                onChange({ ...group, children: nextChildren });
              }}
              readOnly={readOnly}
            />
          ))}
          {!readOnly && (
            <Button variant="ghost" size="sm" onClick={handleAddGroup}>
              <Plus className="mr-2 h-4 w-4" />
              Add nested group
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BoardFilterBuilder({ definition, onChange, readOnly }: BoardFilterBuilderProps) {
  const handleRootUpdate = (nextGroup: BoardFilterGroup) => {
    onChange({ root: nextGroup });
  };

  return (
    <div className="space-y-4">
      <Group
        depth={0}
        group={definition.root}
        onChange={handleRootUpdate}
        readOnly={readOnly}
      />
    </div>
  );
}

export function addCondition(
  definition: BoardFilterDefinition,
  groupId: string,
  condition: Partial<Omit<BoardFilterCondition, "id">> & { id?: string }
): BoardFilterDefinition {
  const nextCondition: BoardFilterCondition = {
    id: condition.id ?? generateId(),
    field: condition.field ?? "status",
    operator: condition.operator ?? "is",
    value: condition.value ?? null,
    meta: condition.meta,
  };

  return updateDefinition(definition, (root) => {
    updateGroup(root, groupId, (target) => {
      target.conditions.push(nextCondition);
    });
  });
}

export function addGroup(
  definition: BoardFilterDefinition,
  parentId: string,
  join: BoardFilterGroup["join"] = "AND"
): BoardFilterDefinition {
  const child: BoardFilterGroup = {
    id: generateId(),
    join,
    conditions: [],
    children: [],
  };

  return updateDefinition(definition, (root) => {
    updateGroup(root, parentId, (target) => {
      target.children.push(child);
    });
  });
}

export function removeGroupById(
  definition: BoardFilterDefinition,
  groupId: string
): BoardFilterDefinition {
  if (groupId === definition.root.id) {
    return definition;
  }

  const nextRoot = removeGroup(definition.root, groupId);
  return { root: nextRoot };
}

export function removeConditions(
  definition: BoardFilterDefinition,
  predicate: (condition: BoardFilterCondition) => boolean
): BoardFilterDefinition {
  const prune = (group: BoardFilterGroup): BoardFilterGroup => {
    return {
      ...group,
      conditions: group.conditions.filter((condition) => !predicate(condition)),
      children: group.children.map(prune),
    };
  };

  return { root: prune(definition.root) };
}
