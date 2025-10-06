import { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MentionAutocomplete } from './MentionAutocomplete';
import { useMentionSearch } from '@/hooks/useMentions';
import { extractMentionIds, insertMentionToken } from '@/lib/mentions';
import { markdownToHtml } from '@/lib/markdown';
import { SafeHtml } from '@/components/ui/safe-html';
import type { ProfileLite } from '@/types';
import { cn } from '@/lib/utils';

interface CommentBoxProps {
  onSubmit: (payload: { markdown: string; html: string; mentions: string[] }) => Promise<void> | void;
  onCancel?: () => void;
  initialValue?: string;
  autoFocus?: boolean;
  submitting?: boolean;
  projectId?: string;
  placeholder?: string;
  submitLabel?: string;
}

export function CommentBox({
  onSubmit,
  onCancel,
  initialValue = '',
  autoFocus,
  submitting,
  projectId,
  placeholder = 'Write a comment…',
  submitLabel = 'Comment',
}: CommentBoxProps) {
  const [value, setValue] = useState(initialValue);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: mentionResults = [], isFetching } = useMentionSearch(mentionQuery, { projectId });

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!showMentions) {
      setActiveIndex(0);
    }
  }, [showMentions]);

  const previewHtml = useMemo(() => markdownToHtml(value), [value]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setValue(nextValue);

    const cursor = event.target.selectionStart ?? nextValue.length;
    const textBeforeCursor = nextValue.slice(0, cursor);
    const match = textBeforeCursor.match(/(^|\s)@([^@\s]*)$/);

    if (match && match[2] !== undefined) {
      setMentionQuery(match[2]);
      setShowMentions(true);
    } else {
      setMentionQuery('');
      setShowMentions(false);
    }
  };

  const handleSelectMention = (profile: ProfileLite) => {
    if (!textareaRef.current) return;

    const selectionStart = textareaRef.current.selectionStart ?? value.length;
    const selectionEnd = textareaRef.current.selectionEnd ?? value.length;

    const { value: nextValue, selection } = insertMentionToken(
      {
        id: profile.id,
        name: profile.full_name ?? profile.email ?? 'user',
      },
      { value, selectionStart, selectionEnd }
    );

    setValue(nextValue);
    setMentionQuery('');
    setShowMentions(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selection, selection);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionResults.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % mentionResults.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + mentionResults.length) % mentionResults.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const profile = mentionResults[activeIndex];
        if (profile) {
          handleSelectMention(profile);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setShowMentions(false);
        setMentionQuery('');
        return;
      }
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
      return;
    }

    if (event.key === 'Escape' && !showMentions) {
      onCancel?.();
    }
  };

  const handleSubmit = async () => {
    const markdown = value.trim();
    if (!markdown) return;

    const mentions = extractMentionIds(markdown);
    const html = markdownToHtml(markdown);

    await onSubmit({ markdown, html, mentions });

    setValue('');
    setMentionQuery('');
    setShowMentions(false);
    setActiveIndex(0);
  };

  const disableSubmit = submitting || value.trim().length === 0;

  return (
    <div className="relative space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[120px] resize-none"
        />

        {showMentions && (mentionResults.length > 0 || isFetching) && (
          <MentionAutocomplete
            results={mentionResults}
            activeIndex={activeIndex}
            onSelect={handleSelectMention}
            onHover={setActiveIndex}
            isLoading={isFetching}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={cn('transition-colors hover:text-foreground', showPreview && 'text-foreground font-medium')}
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          <span>Use @ to mention teammates. Cmd+Enter to submit.</span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={disableSubmit}>
            {submitting ? 'Sending…' : submitLabel}
          </Button>
        </div>
      </div>

      {showPreview && value.trim() && (
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <SafeHtml html={previewHtml} className="prose prose-sm max-w-none dark:prose-invert" />
        </div>
      )}
    </div>
  );
}
