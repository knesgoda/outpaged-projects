import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

type JsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onValidationChange?: (isValid: boolean) => void;
};

export function JsonEditor({ value, onChange, placeholder, onValidationChange }: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setError(null);
      onValidationChange?.(true);
    }
  }, [value, onValidationChange]);

  const handleBlur = () => {
    if (!value.trim()) {
      setError(null);
      onValidationChange?.(true);
      return;
    }

    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
      setError(null);
      onValidationChange?.(true);
    } catch (err) {
      setError("Invalid JSON");
      onValidationChange?.(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(event) => {
          setError(null);
          onChange(event.target.value);
        }}
        onBlur={handleBlur}
        placeholder={placeholder ?? "{\n  \"filters\": []\n}"}
        className="font-mono"
        rows={8}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
