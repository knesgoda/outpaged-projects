import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProfileLite } from '@/types';

interface MentionAutocompleteProps {
  results: ProfileLite[];
  activeIndex: number;
  onSelect: (profile: ProfileLite) => void;
  onHover: (index: number) => void;
  emptyLabel?: string;
  isLoading?: boolean;
}

export function MentionAutocomplete({
  results,
  activeIndex,
  onSelect,
  onHover,
  emptyLabel = 'No matches',
  isLoading,
}: MentionAutocompleteProps) {
  return (
    <div className="absolute left-0 right-0 top-full mt-2 rounded-md border border-border bg-popover shadow-lg z-50">
      <ScrollArea className="max-h-56">
        {isLoading && (
          <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
        )}
        {!isLoading && results.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</div>
        )}
        <ul className="py-1">
          {results.map((profile, index) => (
            <li
              key={profile.id}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${
                index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
              }`}
              onMouseEnter={() => onHover(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(profile);
              }}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? ''} />
                <AvatarFallback>{profile.full_name?.[0] ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{profile.full_name ?? 'Unknown user'}</span>
                {profile.email && (
                  <span className="text-xs text-muted-foreground">{profile.email}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
