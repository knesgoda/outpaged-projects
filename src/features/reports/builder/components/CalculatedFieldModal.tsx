import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MetricDefinition } from "@/server/analytics/types";

interface CalculatedFieldModalProps {
  open: boolean;
  metric: MetricDefinition | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (metric: MetricDefinition | null) => void;
}

export function CalculatedFieldModal({ open, metric, onOpenChange, onConfirm }: CalculatedFieldModalProps) {
  const [draft, setDraft] = useState<MetricDefinition | null>(metric);

  useEffect(() => {
    setDraft(metric);
  }, [metric]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Calculated Field</DialogTitle>
        </DialogHeader>
        {draft ? (
          <div className="space-y-3">
            <Input
              placeholder="Metric name"
              value={draft.label}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  label: event.target.value,
                })
              }
            />
            <Textarea
              placeholder="Enter SQL expression"
              value={(draft as unknown as { expression?: string }).expression ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  expression: event.target.value,
                } as MetricDefinition)
              }
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onConfirm(null)}>
            Cancel
          </Button>
          <Button onClick={() => draft && onConfirm(draft)}>Save calculation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
