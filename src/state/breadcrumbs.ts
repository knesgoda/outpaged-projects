import { useSyncExternalStore } from "react";

const overrides = new Map<string, string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setBreadcrumbLabel(path: string, label: string | null) {
  if (!path) return;
  if (label && label.trim()) {
    overrides.set(path, label.trim());
  } else {
    overrides.delete(path);
  }
  emit();
}

export function useBreadcrumbOverrides() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => new Map(overrides)
  );
}
