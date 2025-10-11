import { addDays, isValid, parseISO } from "date-fns";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBoardViewContext } from "./context";
import { BoardMetricsHeader } from "./BoardMetricsHeader";

const DEFAULT_START_FIELDS = ["startDate", "start", "begin"];
const DEFAULT_END_FIELDS = ["endDate", "dueDate", "end"];
const DEPENDENCY_NONE_VALUE = "__none";

const toIsoDate = (value: unknown) => {
  if (typeof value === "string") {
    const parsed = parseISO(value);
    if (isValid(parsed)) {
      return parsed.toISOString();
    }
  }
  if (value instanceof Date && isValid(value)) {
    return value.toISOString();
  }
  return null;
};

const toDateInputValue = (value: unknown) => {
  const iso = toIsoDate(value);
  if (!iso) {
    return "";
  }
  return iso.slice(0, 10);
};

const findField = (candidates: string[], items: Record<string, unknown>[]) => {
  for (const candidate of candidates) {
    if (items.some((item) => item[candidate] != null)) {
      return candidate;
    }
  }
  return candidates[0] ?? "";
};

export function TimelineBoardView() {
  const { items, configuration, updateItem, updateConfiguration, isLoading } =
    useBoardViewContext();

  const availableFields = useMemo(() => {
    const fields = new Set<string>();
    items.forEach((item) => {
      Object.keys(item).forEach((key) => fields.add(key));
    });
    DEFAULT_START_FIELDS.forEach((field) => fields.add(field));
    DEFAULT_END_FIELDS.forEach((field) => fields.add(field));
    return Array.from(fields);
  }, [items]);

  const timeline = configuration.timeline ?? {
    startField: findField(DEFAULT_START_FIELDS, items),
    endField: findField(DEFAULT_END_FIELDS, items),
  };

  const dependencyField = timeline?.dependencyField;

  const shiftDate = (index: number, field: string, delta: number) => {
    const current = toIsoDate(items[index]?.[field]);
    if (!current) {
      return;
    }
    const next = addDays(parseISO(current), delta).toISOString();
    updateItem(index, { [field]: next });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading view…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <BoardMetricsHeader items={items} configuration={configuration} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Start</Label>
          <Select
            value={timeline.startField}
            onValueChange={(value) =>
              updateConfiguration({ timeline: { ...timeline, startField: value } })
            }
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">End</Label>
          <Select
            value={timeline.endField}
            onValueChange={(value) =>
              updateConfiguration({ timeline: { ...timeline, endField: value } })
            }
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Dependencies</Label>
          <Select
            value={dependencyField ?? DEPENDENCY_NONE_VALUE}
            onValueChange={(value) =>
              updateConfiguration({
                timeline: {
                  ...timeline,
                  dependencyField: value === DEPENDENCY_NONE_VALUE ? undefined : value,
                },
              })
            }
          >
            <SelectTrigger className="h-8 w-48">
              <SelectValue placeholder="Not tracked" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEPENDENCY_NONE_VALUE}>Not tracked</SelectItem>
              {availableFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline">{items.length} items</Badge>
      </div>

      <div className="grid gap-4">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No timeline records yet. Adjust filters or add work to this view.
          </div>
        ) : null}
        {items.map((item, index) => {
          const title =
            (typeof item.title === "string" && item.title) ||
            (typeof item.name === "string" && item.name) ||
            (typeof item.id === "string" && item.id) ||
            `Item ${index + 1}`;

          const startValue = toDateInputValue(item[timeline.startField]);
          const endValue = toDateInputValue(item[timeline.endField]);

          const dependencies = dependencyField
            ? item[dependencyField]
            : undefined;

          const dependencyList = Array.isArray(dependencies)
            ? dependencies
            : dependencies
            ? [dependencies]
            : [];

          const startId = `timeline-start-${index}`;
          const endId = `timeline-end-${index}`;

          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{title}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Adjust</span>
                  <Button size="sm" variant="outline" onClick={() => shiftDate(index, timeline.startField, -1)}>
                    −1d
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => shiftDate(index, timeline.startField, 1)}>
                    +1d
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={startId} className="text-xs uppercase text-muted-foreground">
                    Start
                  </Label>
                  <Input
                    id={startId}
                    type="date"
                    value={startValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value) {
                        updateItem(index, {
                          [timeline.startField]: new Date(value).toISOString(),
                        });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={endId} className="text-xs uppercase text-muted-foreground">
                    End
                  </Label>
                  <Input
                    id={endId}
                    type="date"
                    value={endValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value) {
                        updateItem(index, {
                          [timeline.endField]: new Date(value).toISOString(),
                        });
                      }
                    }}
                  />
                </div>
                {dependencyList.length > 0 ? (
                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase text-muted-foreground">Dependencies</Label>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {dependencyList.map((dependency, dependencyIndex) => (
                        <li key={dependencyIndex}>{String(dependency)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

