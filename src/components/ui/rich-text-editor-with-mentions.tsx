import { useEffect, useState, useRef } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { Card } from './card';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { useProjectMembersView, type ProjectMemberProfile } from '@/hooks/useProjectMembersView';

interface RichTextEditorWithMentionsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  projectId?: string;
  className?: string;
  modules?: any;
}

export function RichTextEditorWithMentions({
  value,
  onChange,
  placeholder,
  projectId,
  className,
  modules
}: RichTextEditorWithMentionsProps) {
  const { members } = useProjectMembersView(projectId);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const filteredMembers = (members || []).filter(member =>
    (member.full_name || '').toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 8);

  const handleTextChange = (newValue: string) => {
    onChange(newValue);

    // Extract plain text for mention detection
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newValue;
    let plainText = tempDiv.textContent || tempDiv.innerText || '';

    // Normalize whitespace and zero-width chars
    plainText = plainText.replace(/[\u00A0\u200B]/g, ' ');

    // Detect last "@query" at end of current text
    const mentionMatch = plainText.match(/(?:^|\s)@([A-Za-z0-9._-]*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1] || '');
      setShowSuggestions(true);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (member: ProjectMemberProfile) => {
    // Get the current HTML content
    const currentHTML = value;
    
    // Create a temporary div to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHTML;
    let plainText = tempDiv.textContent || tempDiv.innerText || '';
    plainText = plainText.replace(/[\u00A0\u200B]/g, ' ');
    
    // Find the last @ symbol
    const lastAtIndex = plainText.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    // Replace the @query with the selected member's name
    const beforeMention = plainText.substring(0, lastAtIndex);
    const afterMention = plainText.substring(lastAtIndex + 1 + mentionQuery.length);
    const mentionText = `${beforeMention}@${member.full_name || 'User'} ${afterMention}`.trim();

    // Convert back to HTML (simple approach)
    const newHTML = `<p>${mentionText}</p>`;
    
    onChange(newHTML);
    setShowSuggestions(false);
    setMentionQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showSuggestions || filteredMembers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filteredMembers[selectedSuggestion]) {
          insertMention(filteredMembers[selectedSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setMentionQuery('');
        break;
    }
  };

  // Enhanced modules with mention support
  const enhancedModules = {
    ...modules,
    keyboard: {
      bindings: {
        // Handle @ key to trigger mentions
        mention: {
          key: '@',
          handler: () => {
            // Let the default behavior happen and detect in onChange
            return true;
          }
        }
      }
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showSuggestions) {
        handleKeyDown(e);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showSuggestions, filteredMembers, selectedSuggestion]);

  return (
    <div className="relative">
      <RichTextEditor
        value={value}
        onChange={handleTextChange}
        placeholder={placeholder}
        className={className}
        modules={enhancedModules}
      />
      
      {/* Mention Suggestions Dropdown */}
      {showSuggestions && filteredMembers.length > 0 && (
        <Card className="absolute z-50 w-64 mt-1 max-h-48 overflow-y-auto border shadow-md">
          <div className="p-1">
            {filteredMembers.map((member, index) => (
              <div
                key={member.user_id}
                className={`flex items-center gap-2 p-2 cursor-pointer rounded hover:bg-accent ${
                  index === selectedSuggestion ? 'bg-accent' : ''
                }`}
                onClick={() => insertMention(member)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(member.full_name || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{member.full_name || 'Unknown User'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}