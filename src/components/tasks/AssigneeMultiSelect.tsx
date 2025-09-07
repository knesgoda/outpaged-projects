
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { ChevronDown } from "lucide-react";

interface AssigneeMultiSelectProps {
  projectId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

export default function AssigneeMultiSelect({
  projectId,
  value,
  onChange,
  label = "Assignees",
}: AssigneeMultiSelectProps) {
  const { members, loading } = useProjectMembers(projectId);

  const selected = useMemo(
    () => members.filter((m) => value.includes(m.user_id)),
    [members, value]
  );

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex flex-wrap gap-1 items-center">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">Select assignees...</span>
              ) : (
                selected.map((m) => (
                  <Badge key={m.user_id} variant="secondary" className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback>{m.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{m.full_name}</span>
                  </Badge>
                ))
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-72 overflow-auto z-[60]" align="start">
          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="text-sm text-muted-foreground">No project members found.</div>
            ) : (
              members.map((m) => {
                const checked = value.includes(m.user_id);
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => toggle(m.user_id)}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent text-left"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(m.user_id)} />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback>{m.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm">{m.full_name}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
