
import * as React from "react";
import { useProjectMembersView } from "@/hooks/useProjectMembersView";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
};

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function AssigneeProjectMemberSelect({ projectId, value, onChange, label }: Props) {
  const [open, setOpen] = React.useState(false);
  const { members, isLoading } = useProjectMembersView(projectId);

  const toggle = (id: string) => {
    const selected = new Set(value);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    onChange(Array.from(selected));
  };

  const selectedMembers = members.filter(m => value.includes(m.user_id));

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <UserPlus className="h-4 w-4 shrink-0" />
              {selectedMembers.length === 0 ? (
                <span className="truncate text-muted-foreground">Assign teammates</span>
              ) : (
                <div className="flex -space-x-2 items-center">
                  {selectedMembers.slice(0, 3).map((m) => (
                    <Avatar key={m.user_id} className="h-5 w-5 ring-2 ring-background">
                      <AvatarImage src={m.avatar_url || undefined} alt={m.full_name || "User"} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(m.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {selectedMembers.length > 3 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      +{selectedMembers.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-80" align="start">
          <Command>
            <CommandInput placeholder="Search members..." />
            <CommandEmpty>
              {isLoading ? "Loading..." : "No members found"}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {members.map((m) => {
                const checked = value.includes(m.user_id);
                return (
                  <CommandItem
                    key={m.user_id}
                    onSelect={() => toggle(m.user_id)}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={m.avatar_url || undefined} alt={m.full_name || "User"} />
                      <AvatarFallback className="text-[10px]">{getInitials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{m.full_name || "Unnamed user"}</span>
                    <Check className={cn("h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
