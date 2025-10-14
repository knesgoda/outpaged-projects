import { useCallback, useState } from "react";

export interface ConflictResolution {
  strategy: "keep-local" | "keep-remote" | "merge";
  mergedContent?: string;
}

export interface UseRichTextConflictOptions {
  onResolve?: (resolution: ConflictResolution) => void;
}

export function useRichTextConflict({ onResolve }: UseRichTextConflictOptions = {}) {
  const [conflict, setConflict] = useState<{ local: string; remote: string } | null>(null);

  const detectConflict = useCallback((local: string, remote: string) => {
    if (local !== remote) {
      setConflict({ local, remote });
      return true;
    }
    return false;
  }, []);

  const resolveConflict = useCallback(
    (strategy: "keep-local" | "keep-remote" | "merge", mergedContent?: string) => {
      if (!conflict) return;

      const resolution: ConflictResolution = { strategy, mergedContent };
      onResolve?.(resolution);
      setConflict(null);
    },
    [conflict, onResolve]
  );

  return {
    conflict,
    detectConflict,
    resolveConflict,
    clearConflict: () => setConflict(null),
  };
}
