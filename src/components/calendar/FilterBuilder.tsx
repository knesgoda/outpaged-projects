import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  CalendarFilterCondition,
  CalendarFilterField,
  CalendarFilterGroup,
  CalendarFilterOperator,
} from "@/types/calendar";
import { Plus, Trash2 } from "lucide-react";

interface FilterBuilderProps {
  groups: CalendarFilterGroup[];
  onChange: (groups: CalendarFilterGroup[]) => void;
}

const FIELD_OPTIONS: Array<{ value: CalendarFilterField; label: string }> = [
  { value: "calendar", label: "Calendar" },
  { value: "owner", label: "Owner" },
  { value: "team", label: "Team" },
  { value: "project", label: "Project" },
  { value: "status", label: "Status" },
  { value: "type", label: "Type" },
  { value: "label", label: "Label" },
  { value: "priority", label: "Priority" },
  { value: "linkedItemType", label: "Linked item" },
  { value: "hasAttachments", label: "Has attachments" },
  { value: "hasReminders", label: "Has reminders" },
  { value: "timeRange", label: "Time range" },
];

const OPERATOR_OPTIONS: Array<{ value: CalendarFilterOperator; label: string }> = [
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Does not equal" },
  { value: "includes", label: "Includes" },
  { value: "excludes", label: "Excludes" },
  { value: "exists", label: "Exists" },
  { value: "not-exists", label: "Does not exist" },
  { value: "in-range", label: "Within range" },
];

function createCondition(): CalendarFilterCondition {
  return { id: `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`, field: "type", operator: "equals", value: "meeting" };
}

export function FilterBuilder({ groups, onChange }: FilterBuilderProps) {
  const updateCondition = (groupId: string, conditionId: string, updates: Partial<CalendarFilterCondition>) => {
    onChange(
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map((condition) =>
                condition.id === conditionId ? { ...condition, ...updates } : condition
              ),
            }
          : group
      )
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    onChange(
      groups.map((group) =>
        group.id === groupId
          ? { ...group, conditions: group.conditions.filter((condition) => condition.id !== conditionId) }
          : group
      )
    );
  };

  const addCondition = (groupId: string) => {
    onChange(
      groups.map((group) =>
        group.id === groupId
          ? { ...group, conditions: [...group.conditions, createCondition()] }
          : group
      )
    );
  };

  const addGroup = () => {
    onChange([
      ...groups,
      { id: `group-${Date.now()}-${Math.random().toString(16).slice(2)}`, logic: "AND", conditions: [createCondition()] },
    ]);
  };

  const updateLogic = (groupId: string, logic: "AND" | "OR") => {
    onChange(
      groups.map((group) => (group.id === groupId ? { ...group, logic } : group))
    );
  };

  return (
    <div className="space-y-4 text-sm">
      {groups.map((group, groupIndex) => (
        <Fragment key={group.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs uppercase text-muted-foreground">Group {groupIndex + 1}</Label>
              <Select value={group.logic} onValueChange={(value) => updateLogic(group.id, value as "AND" | "OR")}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">All conditions</SelectItem>
                  <SelectItem value="OR">Any condition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onChange(groups.filter((item) => item.id !== group.id))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            {group.conditions.map((condition) => (
              <div key={condition.id} className="grid grid-cols-[120px_140px_1fr_auto] items-center gap-2">
                <Select value={condition.field} onValueChange={(value) => updateCondition(group.id, condition.id, { field: value as CalendarFilterField })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={condition.operator} onValueChange={(value) => updateCondition(group.id, condition.id, { operator: value as CalendarFilterOperator })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={typeof condition.value === "string" ? condition.value : ""}
                  onChange={(event) => updateCondition(group.id, condition.id, { value: event.target.value })}
                  placeholder="Value"
                  className="h-8 text-xs"
                  disabled={condition.operator === "exists" || condition.operator === "not-exists"}
                />
                <Button variant="ghost" size="icon" onClick={() => removeCondition(group.id, condition.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addCondition(group.id)} className="flex w-full items-center gap-2">
              <Plus className="h-4 w-4" /> Add condition
            </Button>
          </div>
          {groupIndex < groups.length - 1 && <Separator />}
        </Fragment>
      ))}
      <Button onClick={addGroup} variant="secondary" size="sm" className="flex items-center gap-2">
        <Plus className="h-4 w-4" /> Add filter group
      </Button>
    </div>
  );
}
