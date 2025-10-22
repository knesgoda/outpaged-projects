import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface InlineEditFieldProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  disabled?: boolean;
  displayAs?: "text" | "heading";
}

export function InlineEditField({
  value: initialValue,
  onSave,
  onCancel,
  placeholder,
  className,
  multiline = false,
  disabled = false,
  displayAs = "text",
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(value);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      setValue(initialValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
    // For multiline: Cmd/Ctrl+Enter to save
    if (e.key === "Enter" && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => !disabled && setIsEditing(true)}
        className={cn(
          "cursor-pointer rounded px-2 py-1 transition-colors hover:bg-accent/50",
          displayAs === "heading" && "text-2xl font-semibold",
          displayAs === "text" && "text-sm",
          !value && "text-muted-foreground italic",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        {value || placeholder || "Click to edit"}
      </div>
    );
  }

  if (multiline) {
    return (
      <Textarea
        ref={inputRef as any}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSaving}
        className={cn("min-h-[100px]", className)}
      />
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef as any}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSaving}
        className={cn(
          displayAs === "heading" && "text-2xl font-semibold",
          className
        )}
      />
      {isSaving && (
        <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
