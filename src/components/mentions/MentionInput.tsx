import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface MentionUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
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
  placeholder = "Type your message...", 
  projectId,
  className 
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch members or directory for suggestions
  useEffect(() => {
    const fetchMembers = async () => {
      if (!mentionQuery) {
        setSuggestions([]);
        return;
      }

      try {
        if (projectId) {
          const { data, error } = await supabase
            .from('project_members')
            .select(`
              user_id,
              profiles:profiles (
                full_name,
                avatar_url
              )
            `)
            .eq('project_id', projectId)
            .limit(50);

          if (error) throw error;

          const members: MentionUser[] = (data || [])
            .map((member: any) => {
              const profile = member.profiles;
              return {
                id: member.user_id,
                full_name: profile?.full_name || 'Unknown User',
                avatar_url: profile?.avatar_url || null,
                email: ''
              };
            })
            .filter(member =>
              member.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
            );

          setSuggestions(members);
        } else {
          // Fallback to company directory search when no projectId
          const term = `%${mentionQuery}%`;
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, username')
            .or(`full_name.ilike.${term},username.ilike.${term}`)
            .order('full_name', { ascending: true })
            .limit(20);

          if (error) throw error;

          const users: MentionUser[] = (data || []).map((u: any) => ({
            id: u.user_id,
            full_name: u.full_name || 'Unknown User',
            avatar_url: u.avatar_url || null,
            email: ''
          }));

          setSuggestions(users);
        }
      } catch (error) {
        console.error('Error fetching mention suggestions:', error);
        setSuggestions([]);
      }
    };

    fetchMembers();
  }, [projectId, mentionQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(inputValue);

    // Check for mention trigger (@)
    const textBeforeCursor = inputValue.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9._-]*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowSuggestions(true);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  const handleSuggestionSelect = (suggestion: MentionUser) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    
    // Find the @ symbol position
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const beforeMention = value.slice(0, mentionStart);
    const mention = `@${suggestion.full_name} `;
    
    const newValue = beforeMention + mention + textAfterCursor;
    onChange(newValue);
    
    setShowSuggestions(false);
    setMentionQuery('');

    // Set cursor position after mention
    setTimeout(() => {
      const newCursorPos = mentionStart + mention.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedSuggestion]) {
          handleSuggestionSelect(suggestions[selectedSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setMentionQuery('');
        break;
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={4}
      />
      
      {/* Mention Suggestions Dropdown */}
      {showSuggestions && (
        <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto">
          <div className="p-1">
            {suggestions.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No matches</div>
            ) : (
              suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`flex items-center gap-2 p-2 cursor-pointer rounded hover:bg-accent ${
                    index === selectedSuggestion ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={suggestion.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {suggestion.full_name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{suggestion.full_name}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}