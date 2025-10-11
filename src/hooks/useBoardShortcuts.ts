import { useEffect } from "react";

export interface BoardShortcutHandlers {
  onNewItem?: () => void;
  onFocusFilters?: () => void;
  onFocusSearch?: () => void;
  onCycleView?: () => void;
  onOpenQuickActions?: () => void;
  enabled?: boolean;
}

const interactiveTags = new Set(["input", "textarea", "select"]);

export function useBoardShortcuts({
  onNewItem,
  onFocusFilters,
  onFocusSearch,
  onCycleView,
  onOpenQuickActions,
  enabled = true,
}: BoardShortcutHandlers): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (interactiveTags.has(tag) || target.isContentEditable) {
          return;
        }
      }

      const key = event.key.toLowerCase();

      switch (key) {
        case "n":
          if (onNewItem) {
            event.preventDefault();
            onNewItem();
          }
          break;
        case "f":
          if (onFocusFilters) {
            event.preventDefault();
            onFocusFilters();
          }
          break;
        case "/":
          if (onFocusSearch) {
            event.preventDefault();
            onFocusSearch();
          }
          break;
        case "v":
          if (onCycleView) {
            event.preventDefault();
            onCycleView();
          }
          break;
        case ";":
          if (onOpenQuickActions) {
            event.preventDefault();
            onOpenQuickActions();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onNewItem, onFocusFilters, onFocusSearch, onCycleView, onOpenQuickActions]);
}

