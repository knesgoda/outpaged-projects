
import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MentionUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  projectId?: string;
  className?: string;
}

export function MentionInput({ 
  value, 
  onChange, 
  placeholder, 
  projectId,
  className 
}: MentionInputProps) {
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mentionQuery && projectId) {
      fetchProjectMembers();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [mentionQuery, projectId]);

  const fetchProjectMembers = async () => {
    if (!projectId) return;

    try {
      const { data: members, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          profiles!project_members_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      // Get the project owner as well
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          owner_id,
          profiles!projects_owner_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const allUsers: MentionUser[] = [];

      // Add project members
      if (members) {
        members.forEach(member => {
          const profile = (member as any).profiles;
          if (profile) {
            allUsers.push({
              id: member.user_id,
              full_name: profile.full_name || 'Unknown User',
              avatar_url: profile.avatar_url,
              email: '' // We don't have email in profiles, but it's required by interface
            });
          }
        });
      }

      // Add project owner if not already included
      if (project && (project as any).profiles) {
        const ownerProfile = (project as any).profiles;
        const isAlreadyIncluded = allUsers.some(u => u.id === project.owner_id);
        if (!isAlreadyIncluded) {
          allUsers.push({
            id: project.owner_id,
            full_name: ownerProfile.full_name || 'Unknown User',
            avatar_url: ownerProfile.avatar_url,
            email: ''
          });
        }
      }

      // Filter by query
      const filtered = allUsers.filter(user =>
        user.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
      );

      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestion(0);
    } catch (error) {
      console.error('Error fetching project members for mentions:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check if we're typing a mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setMentionQuery("");
      setShowSuggestions(false);
    }
  };

  const insertMention = (user: MentionUser) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    
    // Find the @ symbol position
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const beforeMention = textBeforeCursor.slice(0, mentionStart);
    const mention = `@${user.full_name} `;
    
    const newValue = beforeMention + mention + textAfterCursor;
    const newCursorPos = beforeMention.length + mention.length;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery("");
    
    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedSuggestion]) {
          insertMention(suggestions[selectedSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setMentionQuery("");
        break;
    }
  };

  const getSuggestionPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    const textarea = textareaRef.current;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length - 1;
    const currentLineText = lines[currentLine];
    
    // Approximate position calculation
    const lineHeight = 24; // Approximate line height
    const charWidth = 8; // Approximate character width
    
    return {
      top: (currentLine + 1) * lineHeight,
      left: currentLineText.length * charWidth
    };
  };

  const suggestionPosition = getSuggestionPosition();

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Card 
          ref={suggestionsRef}
          className="absolute z-50 w-64 max-h-48 overflow-y-auto bg-background border shadow-lg"
          style={{
            top: suggestionPosition.top + 'px',
            left: suggestionPosition.left + 'px'
          }}
        >
          <div className="p-1">
            {suggestions.map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                  index === selectedSuggestion 
                    ? 'bg-accent text-accent-foreground' 
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => insertMention(user)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {user.full_name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.full_name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
