
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RelationshipType = "blocks" | "depends_on" | "duplicates" | "relates_to";

interface RelationshipPickerProps {
  projectId: string;
  excludeTaskId?: string;
  value: {
    relationship_type: RelationshipType;
    target_task_id: string;
    notes?: string;
  } | null;
  onChange: (val: RelationshipPickerProps["value"]) => void;
}

export default function RelationshipPicker({
  projectId,
  excludeTaskId,
  value,
  onChange,
}: RelationshipPickerProps) {
  const [tasks, setTasks] = useState<{ id: string; title: string; status: string }[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await import("@/integrations/supabase/client").then(m =>
        m.supabase
          .from("tasks")
          .select("id, title, status")
          .eq("project_id", projectId)
          .neq("id", excludeTaskId || "")
          .order("created_at", { ascending: false })
          .limit(100)
      );
      if (error) {
        console.error("[RelationshipPicker] Error fetching tasks:", error);
        setTasks([]);
        return;
      }
      setTasks(data || []);
    };
    fetchTasks();
  }, [projectId, excludeTaskId]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Relationship type</Label>
        <Select
          value={value?.relationship_type || "relates_to"}
          onValueChange={(v) =>
            onChange({
              relationship_type: v as RelationshipType,
              target_task_id: value?.target_task_id || "",
              notes: value?.notes,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose relationship type" />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            <SelectItem value="relates_to">Relates to</SelectItem>
            <SelectItem value="blocks">Blocks</SelectItem>
            <SelectItem value="depends_on">Depends on</SelectItem>
            <SelectItem value="duplicates">Duplicates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Target task</Label>
        <Select
          value={value?.target_task_id || ""}
          onValueChange={(v) =>
            onChange({
              relationship_type: value?.relationship_type || "relates_to",
              target_task_id: v,
              notes: value?.notes,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a task..." />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            {tasks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title} ({t.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          rows={2}
          placeholder="Add context about this relationship..."
          value={value?.notes || ""}
          onChange={(e) =>
            onChange({
              relationship_type: value?.relationship_type || "relates_to",
              target_task_id: value?.target_task_id || "",
              notes: e.target.value,
            })
          }
        />
      </div>
    </div>
  );
}
