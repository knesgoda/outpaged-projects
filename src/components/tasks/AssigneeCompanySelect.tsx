import React, { useMemo, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCompanyDirectory } from "@/hooks/useCompanyDirectory";
import { useProjectMembersView } from "@/hooks/useProjectMembersView";

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface AssigneeCompanySelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  suggestProjectId?: string;
  label?: string;
  // When provided, selection will call this for a single add instead of toggling
  onSelectOne?: (id: string) => void;
}

const AssigneeCompanySelect: React.FC<AssigneeCompanySelectProps> = ({
  value,
  onChange,
  suggestProjectId,
  label = "Assign to",
  onSelectOne,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: directoryData } = useCompanyDirectory(search, 25);
  const { members: projectMembers } = useProjectMembersView(suggestProjectId);

  const selectedIds = new Set(value);

  const filteredMembers = useMemo(() => {
    return projectMembers.filter((m) => !selectedIds.has(m.user_id));
  }, [projectMembers, selectedIds]);

  const directoryUsers = useMemo(() => {
    const users = directoryData?.users || [];
    // Exclude already selected and projectMembers that are already selected handled above
    return users.filter((u) => !selectedIds.has(u.user_id));
  }, [directoryData?.users, selectedIds]);

  const handleToggle = (id: string) => {
    if (onSelectOne) {
      onSelectOne(id);
      setOpen(false);
      return;
    }
    const exists = value.includes(id);
    onChange(exists ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-medium text-muted-foreground">{label}</div>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start bg-background border-input">
            {value.length === 0 ? (
              <span className="text-muted-foreground">Select assignees</span>
            ) : (
              <div className="flex -space-x-2 items-center overflow-hidden">
                {value.slice(0, 3).map((id) => {
                  const pm = projectMembers.find((m) => m.user_id === id);
                  const du = directoryData?.users?.find((u) => u.user_id === id);
                  const name = pm?.full_name || du?.full_name || "User";
                  const avatar = pm?.avatar_url || du?.avatar_url || undefined;
                  return (
                    <Avatar key={id} className="w-6 h-6 border-2 border-background">
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
                {value.length > 3 && (
                  <span className="ml-2 text-xs text-muted-foreground">+{value.length - 3}</span>
                )}
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-80 bg-background border-border shadow-xl z-[60]">
          <Command shouldFilter={false} className="bg-background">
            <CommandInput
              placeholder="Search by name or username..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="bg-background">
              <CommandEmpty>No users found.</CommandEmpty>
              {suggestProjectId && filteredMembers.length > 0 && (
                <CommandGroup heading="Project members">
                  {filteredMembers.map((m) => (
                    <CommandItem key={m.user_id} onSelect={() => handleToggle(m.user_id)}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{getInitials(m.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{m.full_name || "User"}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandGroup heading="Company directory">
                {directoryUsers.map((u) => (
                  <CommandItem key={u.user_id} onSelect={() => handleToggle(u.user_id)}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{u.full_name || u.username || "User"}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AssigneeCompanySelect;
