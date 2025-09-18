import React, { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectMembers, type ProjectMember } from '@/hooks/useProjectMembers';

interface MentionAutocompleteProps {
  projectId?: string;
  onMentionSelect: (member: ProjectMember) => void;
  trigger: string;
  children: React.ReactNode;
}

export function MentionAutocomplete({ 
  projectId, 
  onMentionSelect, 
  trigger,
  children 
}: MentionAutocompleteProps) {
  const { members, loading } = useProjectMembers(projectId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // Open/close based on trigger and sync search with query after '@'
  useEffect(() => {
    const match = trigger.match(/@([^@\s]*)$/);
    if (match) {
      setOpen(true);
      setSearch(match[1]);
    } else {
      setOpen(false);
      setSearch("");
    }
  }, [trigger]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search team members..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading members..." : "No team members found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredMembers.map((member) => (
                <CommandItem
                  key={member.user_id}
                  value={member.full_name}
                  onSelect={() => {
                    onMentionSelect(member);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.full_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}