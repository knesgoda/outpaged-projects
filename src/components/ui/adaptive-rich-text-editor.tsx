import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { RichTextEditorWithMentions } from "@/components/ui/rich-text-editor-with-mentions";
import { MentionInput } from "@/components/mentions/MentionInput";

interface AdaptiveRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  projectId?: string;
  className?: string;
  modules?: any;
}

export function AdaptiveRichTextEditor({
  value,
  onChange,
  placeholder = "Write your comment...",
  projectId,
  className,
  modules,
}: AdaptiveRichTextEditorProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Use MentionInput for mobile - simpler and more touch-friendly
    return (
      <MentionInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        projectId={projectId}
        className={className}
      />
    );
  }

  // Use full RichTextEditor with mentions for desktop
  return (
    <RichTextEditorWithMentions
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      modules={modules}
      projectId={projectId}
    />
  );
}