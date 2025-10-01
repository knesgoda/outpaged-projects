import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ChecklistItem {
  item: string;
  completed: boolean;
  required: boolean;
}

interface HandoffChecklistManagerProps {
  handoffId: string;
  checklist: ChecklistItem[];
  status: string;
  onChecklistUpdate?: () => void;
}

export function HandoffChecklistManager({
  handoffId,
  checklist: initialChecklist,
  status,
  onChecklistUpdate,
}: HandoffChecklistManagerProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const toggleItem = async (index: number) => {
    const updatedChecklist = [...checklist];
    updatedChecklist[index].completed = !updatedChecklist[index].completed;
    setChecklist(updatedChecklist);

    try {
      setSaving(true);
      const { error } = await supabase
        .from("handoffs")
        .update({
          acceptance_checklist: updatedChecklist as any,
        })
        .eq("id", handoffId);

      if (error) throw error;

      toast({
        title: "Checklist Updated",
        description: "Acceptance checklist item updated",
      });

      onChecklistUpdate?.();
    } catch (error: any) {
      console.error("Error updating checklist:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update checklist",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const allRequiredCompleted = checklist
    .filter((item) => item.required)
    .every((item) => item.completed);

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const canAccept = status === "pending" && allRequiredCompleted;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Acceptance Checklist
              {allRequiredCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription>
              {completedCount} of {totalCount} items completed ({Math.round(progress)}%)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-3">
          {checklist.map((item, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                item.completed
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-background border-border"
              }`}
            >
              <Checkbox
                id={`item-${index}`}
                checked={item.completed}
                onCheckedChange={() => toggleItem(index)}
                disabled={saving || status !== "pending"}
                className="mt-0.5"
              />
              <label
                htmlFor={`item-${index}`}
                className={`flex-1 text-sm cursor-pointer ${
                  item.completed ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item.item}
                {item.required && (
                  <span className="text-destructive ml-1" title="Required">
                    *
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>

        {status === "pending" && !allRequiredCompleted && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>All required items must be completed before accepting this handoff</span>
          </div>
        )}

        {canAccept && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
            <CheckCircle2 className="h-4 w-4" />
            <span>All requirements met - ready to accept handoff</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
