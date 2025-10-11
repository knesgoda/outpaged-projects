import { addDays, differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { useCallback, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Download } from "lucide-react";
import { useBoardViewContext } from "./context";
import { BoardMetricsHeader } from "./BoardMetricsHeader";
import type { TimelineExportFormat } from "@/types/boards";
import { cn } from "@/lib/utils";

const DEFAULT_START_FIELDS = ["startDate", "start", "begin"];
const DEFAULT_END_FIELDS = ["endDate", "dueDate", "end"];
const DEPENDENCY_NONE_VALUE = "__none";
const BASELINE_NONE_VALUE = "__none";
const EXPORT_FORMATS: TimelineExportFormat[] = ["csv", "json", "ics"];

interface TimelineDependencyRecord {
  id: string;
  offsetDays: number;
  type: "lead" | "lag";
}

const normaliseDependencyEntry = (entry: unknown): TimelineDependencyRecord | null => {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    const [id, offsetRaw] = entry.split("@");
    const offset = offsetRaw ? Number(offsetRaw) : 0;
    const offsetDays = Number.isFinite(offset) ? offset : 0;
    return {
      id: id.trim(),
      offsetDays,
      type: offsetDays < 0 ? "lead" : "lag",
    };
  }

  if (typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof record.targetId === "string"
          ? record.targetId
          : null;
    if (!id) {
      return null;
    }
    const offset = Number(record.offsetDays ?? record.offset ?? 0);
    const offsetDays = Number.isFinite(offset) ? offset : 0;
    const type = record.type === "lead" || record.type === "lag"
      ? (record.type as "lead" | "lag")
      : offsetDays < 0
        ? "lead"
        : "lag";
    return {
      id: id.trim(),
      offsetDays,
      type,
    };
  }

  return null;
};

export function mergeDependencyDraft(
  existing: unknown,
  draft: { target: string; offset: number },
  allowNegativeLag: boolean
): TimelineDependencyRecord[] | null {
  const target = typeof draft.target === "string" ? draft.target.trim() : "";
  if (!target) {
    return null;
  }

  let offset = Number(draft.offset ?? 0);
  if (!Number.isFinite(offset)) {
    offset = 0;
  }
  if (!allowNegativeLag && offset < 0) {
    offset = 0;
  }

  const normalized = (Array.isArray(existing) ? existing : existing ? [existing] : [])
    .map(normaliseDependencyEntry)
    .filter((entry): entry is TimelineDependencyRecord => Boolean(entry));

  if (normalized.some((entry) => entry.id === target && entry.offsetDays === offset)) {
    return null;
  }

  return [
    ...normalized,
    { id: target, offsetDays: offset, type: offset < 0 ? "lead" : "lag" },
  ];
}

const formatIsoDateForIcs = (iso: string) => {
  if (!iso) return "";
  return iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
};

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

  const [dependencyDrafts, setDependencyDrafts] = useState<
    Record<number, { target: string; offset: number }>
  >({});
  const [exporting, setExporting] = useState(false);

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
  const dependencyEditor = timeline.dependencyEditor ?? {
    defaultLagDays: 0,
    allowNegativeLag: false,
  };
  const baseline = timeline.baseline ?? {};
  const exportFormat = timeline.exportFormat ?? "csv";

  const timelineDurations = useMemo(
    () =>
      items.map((item) => {
        const startIso = toIsoDate(item[timeline.startField]);
        const endIso = toIsoDate(item[timeline.endField]);
        if (!startIso || !endIso) {
          return { startIso, endIso, duration: null };
        }
        const start = parseISO(startIso);
        const end = parseISO(endIso);
        if (!isValid(start) || !isValid(end)) {
          return { startIso, endIso, duration: null };
        }
        const duration = Math.max(0, differenceInCalendarDays(end, start));
        return { startIso, endIso, duration };
      }),
    [items, timeline.endField, timeline.startField]
  );

  const maxDuration = timeline.showCriticalPath
    ? timelineDurations.reduce((acc, entry) => {
        const value = entry.duration ?? 0;
        return value > acc ? value : acc;
      }, 0)
    : 0;

  const getDependencyDraft = useCallback(
    (index: number) =>
      dependencyDrafts[index] ?? {
        target: "",
        offset: dependencyEditor.defaultLagDays ?? 0,
      },
    [dependencyDrafts, dependencyEditor.defaultLagDays]
  );

  const setDependencyDraft = useCallback(
    (index: number, draft: { target: string; offset: number }) => {
      setDependencyDrafts((prev) => ({ ...prev, [index]: draft }));
    },
    []
  );

  const handleAddDependency = useCallback(
    (index: number) => {
      if (!dependencyField) {
        return;
      }

      const draft = getDependencyDraft(index);
      const next = mergeDependencyDraft(
        items[index]?.[dependencyField],
        draft,
        dependencyEditor.allowNegativeLag ?? false
      );
      const resetDraft = {
        target: "",
        offset: dependencyEditor.defaultLagDays ?? 0,
      };

      if (!next) {
        setDependencyDraft(index, resetDraft);
        return;
      }

      updateItem(index, { [dependencyField]: next });
      setDependencyDraft(index, resetDraft);
    },
    [
      dependencyEditor.allowNegativeLag,
      dependencyEditor.defaultLagDays,
      dependencyField,
      getDependencyDraft,
      items,
      setDependencyDraft,
      updateItem,
    ]
  );

  const handleExport = useCallback(() => {
    if (typeof window === "undefined" || !items.length) {
      return;
    }

    setExporting(true);
    try {
      const rows = items.map((item, index) => {
        const durationInfo = timelineDurations[index] ?? { duration: null, startIso: null, endIso: null };
        const dependencies = dependencyField
          ? (() => {
              const raw = item[dependencyField];
              const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
              return list
                .map(normaliseDependencyEntry)
                .filter((entry): entry is TimelineDependencyRecord => Boolean(entry));
            })()
          : [];
        return {
          title:
            (typeof item.title === "string" && item.title) ||
            (typeof item.name === "string" && item.name) ||
            (typeof item.id === "string" && item.id) ||
            `Item ${index + 1}`,
          start: durationInfo.startIso,
          end: durationInfo.endIso,
          durationDays: durationInfo.duration,
          baselineStart: baseline.startField ? toIsoDate(item[baseline.startField]) : null,
          baselineEnd: baseline.endField ? toIsoDate(item[baseline.endField]) : null,
          dependencies,
        };
      });

      let payload = "";
      let mime = "text/csv";
      let extension = exportFormat;

      if (exportFormat === "json") {
        payload = JSON.stringify(rows, null, 2);
        mime = "application/json";
      } else if (exportFormat === "ics") {
        const events = rows
          .filter((row) => row.start && row.end)
          .map((row, index) => {
            const start = row.start ? formatIsoDateForIcs(row.start) : "";
            const end = row.end ? formatIsoDateForIcs(row.end) : "";
            return [
              "BEGIN:VEVENT",
              `UID:timeline-${index}@outpaged`,
              start ? `DTSTART:${start}` : null,
              end ? `DTEND:${end}` : null,
              `SUMMARY:${row.title}`,
              "END:VEVENT",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n");
        payload = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Outpaged//Timeline Export//EN\n${events}\nEND:VCALENDAR`;
        mime = "text/calendar";
        extension = "ics";
      } else {
        const header = [
          "Title",
          "Start",
          "End",
          "DurationDays",
          "BaselineStart",
          "BaselineEnd",
          "Dependencies",
        ];
        const rowsAsCsv = rows.map((row) => {
          const dependencyLabel = row.dependencies
            .map((dependency) =>
              `${dependency.id}${dependency.offsetDays ? ` (${dependency.type} ${Math.abs(dependency.offsetDays)}d)` : ""}`
            )
            .join("; ");
          return [
            row.title,
            row.start ?? "",
            row.end ?? "",
            row.durationDays ?? "",
            row.baselineStart ?? "",
            row.baselineEnd ?? "",
            dependencyLabel,
          ]
            .map((cell) => {
              const value = cell == null ? "" : String(cell);
              return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
            })
            .join(",");
        });
        payload = [header.join(","), ...rowsAsCsv].join("\n");
        mime = "text/csv";
        extension = "csv";
      }

      const blob = new Blob([payload], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `timeline-export.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [baseline.endField, baseline.startField, dependencyField, exportFormat, items, timelineDurations]);

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

  const baselineStartValue = baseline.startField ?? BASELINE_NONE_VALUE;
  const baselineEndValue = baseline.endField ?? BASELINE_NONE_VALUE;

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
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Baseline start</Label>
          <Select
            value={baselineStartValue}
            onValueChange={(value) =>
              updateConfiguration({
                timeline: {
                  ...timeline,
                  baseline: {
                    ...baseline,
                    startField: value === BASELINE_NONE_VALUE ? undefined : value,
                  },
                },
              })
            }
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="No baseline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BASELINE_NONE_VALUE}>No baseline</SelectItem>
              {availableFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Baseline end</Label>
          <Select
            value={baselineEndValue}
            onValueChange={(value) =>
              updateConfiguration({
                timeline: {
                  ...timeline,
                  baseline: {
                    ...baseline,
                    endField: value === BASELINE_NONE_VALUE ? undefined : value,
                  },
                },
              })
            }
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="No baseline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BASELINE_NONE_VALUE}>No baseline</SelectItem>
              {availableFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Default lag (days)</Label>
          <Input
            type="number"
            className="h-8 w-24"
            value={String(dependencyEditor.defaultLagDays ?? 0)}
            onChange={(event) => {
              const next = Number(event.target.value);
              updateConfiguration({
                timeline: {
                  ...timeline,
                  dependencyEditor: {
                    ...dependencyEditor,
                    defaultLagDays: Number.isFinite(next) ? next : 0,
                  },
                },
              });
              setDependencyDrafts({});
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Allow lead</Label>
          <Switch
            checked={dependencyEditor.allowNegativeLag ?? false}
            onCheckedChange={(checked) =>
              updateConfiguration({
                timeline: {
                  ...timeline,
                  dependencyEditor: {
                    ...dependencyEditor,
                    allowNegativeLag: checked,
                  },
                },
              })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Critical path</Label>
          <Switch
            checked={timeline.showCriticalPath ?? false}
            onCheckedChange={(checked) =>
              updateConfiguration({
                timeline: {
                  ...timeline,
                  showCriticalPath: checked,
                },
              })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase text-muted-foreground">Export</Label>
          <Select
            value={exportFormat}
            onValueChange={(value) =>
              updateConfiguration({
                timeline: {
                  ...timeline,
                  exportFormat: value as TimelineExportFormat,
                },
              })
            }
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPORT_FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {format.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={handleExport}
          disabled={!items.length || exporting}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Export
        </Button>
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
          const startId = `timeline-start-${index}`;
          const endId = `timeline-end-${index}`;

          const durationInfo = timelineDurations[index] ?? {
            duration: null,
            startIso: null,
            endIso: null,
          };
          const durationLabel =
            durationInfo.duration != null ? `${durationInfo.duration}d` : "—";
          const isCritical =
            timeline.showCriticalPath && maxDuration > 0 && durationInfo.duration === maxDuration;

          const normalizedDependencies = dependencyField
            ? (() => {
                const raw = item[dependencyField];
                const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
                return list
                  .map(normaliseDependencyEntry)
                  .filter((entry): entry is TimelineDependencyRecord => Boolean(entry));
              })()
            : [];

          const baselineStartIso = baseline.startField
            ? toIsoDate(item[baseline.startField])
            : null;
          const baselineEndIso = baseline.endField
            ? toIsoDate(item[baseline.endField])
            : null;
          const baselineStartDisplay = baseline.startField
            ? toDateInputValue(item[baseline.startField])
            : "";
          const baselineEndDisplay = baseline.endField
            ? toDateInputValue(item[baseline.endField])
            : "";

          const baselineDuration =
            baselineStartIso && baselineEndIso
              ? Math.max(
                  0,
                  differenceInCalendarDays(parseISO(baselineEndIso), parseISO(baselineStartIso))
                )
              : null;
          const variance =
            durationInfo.duration != null && baselineDuration != null
              ? durationInfo.duration - baselineDuration
              : null;

          const dependencyDraft = getDependencyDraft(index);

          const varianceBadge = (() => {
            if (variance == null) {
              return null;
            }
            const label = `${variance > 0 ? "+" : ""}${variance}d`;
            const variant = variance > 0 ? "destructive" : variance < 0 ? "secondary" : "outline";
            return (
              <Badge variant={variant} className="text-xs">
                {variance === 0 ? "On baseline" : label}
              </Badge>
            );
          })();

          return (
            <Card
              key={index}
              className={cn(
                "overflow-hidden transition-shadow",
                isCritical && "border-primary/60 shadow-[0_0_0_1px_rgba(59,130,246,0.28)]"
              )}
            >
              <CardHeader
                className={cn(
                  "flex flex-row items-center justify-between",
                  isCritical && "bg-primary/10"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{title}</CardTitle>
                  {isCritical ? (
                    <Badge variant="secondary" className="text-xs">
                      Critical path
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="text-xs">
                    {durationLabel}
                  </Badge>
                </div>
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
                {(baseline.startField || baseline.endField) ? (
                  <div className="md:col-span-2 space-y-2 rounded-lg border border-dashed p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Baseline</span>
                      <span>
                        {baselineStartDisplay || "—"} → {baselineEndDisplay || "—"}
                      </span>
                      {varianceBadge}
                    </div>
                  </div>
                ) : null}
                {dependencyField ? (
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Link dependency</Label>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <Input
                        placeholder="Work item id"
                        className="md:w-48"
                        value={dependencyDraft.target}
                        onChange={(event) =>
                          setDependencyDraft(index, {
                            ...dependencyDraft,
                            target: event.target.value,
                          })
                        }
                      />
                      <Input
                        type="number"
                        className="md:w-32"
                        value={String(dependencyDraft.offset ?? 0)}
                        min={dependencyEditor.allowNegativeLag ? undefined : 0}
                        onChange={(event) =>
                          setDependencyDraft(index, {
                            ...dependencyDraft,
                            offset: Number(event.target.value ?? 0),
                          })
                        }
                      />
                      <Button type="button" size="sm" onClick={() => handleAddDependency(index)}>
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Positive values create lag; negative values lead when allowed.
                    </p>
                  </div>
                ) : null}
                {normalizedDependencies.length > 0 ? (
                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase text-muted-foreground">Dependencies</Label>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {normalizedDependencies.map((dependency) => (
                        <li key={`${dependency.id}-${dependency.offsetDays}`} className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{dependency.id}</span>
                          {dependency.offsetDays !== 0 ? (
                            <span>
                              ({dependency.type} {Math.abs(dependency.offsetDays)}d)
                            </span>
                          ) : null}
                        </li>
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

