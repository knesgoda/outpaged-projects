import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type JsonEditorProps = {
  id?: string;
  label?: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  onValidJson?: (value: unknown) => void;
  onValidationChange?: (error: string | null) => void;
  placeholder?: string;
  className?: string;
};

export function JsonEditor({
  id,
  label,
  description,
  value,
  onChange,
  onValidJson,
  onValidationChange,
  placeholder,
  className,
}: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value.trim().length === 0) {
      setError(null);
      onValidationChange?.(null);
    }
  }, [value, onValidationChange]);

  const handleBlur = () => {
    const text = value.trim();
    if (!text) {
      onValidJson?.({});
      return;
    }

    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      if (formatted !== value) {
        onChange(formatted);
      }
      setError(null);
      onValidationChange?.(null);
      onValidJson?.(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON";
      setError(message);
      onValidationChange?.(message);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder ?? "{\n  \"example\": true\n}"}
        className={cn(error ? "border-destructive" : "", "font-mono text-sm")}
        rows={8}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
