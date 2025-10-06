import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type HelpSearchInputProps = {
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  debounceMs?: number;
  label?: string;
};

export function HelpSearchInput({
  value,
  onSearch,
  placeholder = "Search help",
  autoFocus,
  className,
  debounceMs = 300,
  label = "Search help",
}: HelpSearchInputProps) {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      onSearch(internalValue.trim());
    }, debounceMs);

    return () => window.clearTimeout(handle);
  }, [internalValue, debounceMs, onSearch]);

  const inputId = useMemo(() => `help-search-${Math.random().toString(36).slice(2)}`, []);

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={inputId}
        type="search"
        role="searchbox"
        value={internalValue}
        onChange={(event) => setInternalValue(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="pl-9"
        aria-label={label}
      />
    </div>
  );
}
