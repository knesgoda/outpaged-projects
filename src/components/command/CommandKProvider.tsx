import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SearchResult } from "@/types";

const isTextInputLike = (element: Element | null) => {
  if (!element) return false;
  const tagName = element.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA") {
    return true;
  }
  const editable = (element as HTMLElement).isContentEditable;
  return editable;
};

type CommandScope = {
  projectId?: string;
  types?: Array<SearchResult["type"]>;
};

type CommandKContextValue = {
  open: boolean;
  query: string;
  scope: CommandScope;
  openPalette: (options?: {
    query?: string;
    projectId?: string;
    types?: Array<SearchResult["type"]>;
  }) => void;
  closePalette: () => void;
  togglePalette: () => void;
  setQuery: (value: string) => void;
};

const CommandKContext = createContext<CommandKContextValue | undefined>(
  undefined
);

export const CommandKProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<CommandScope>({});

  const openPalette = useCallback(
    (options?: { query?: string; projectId?: string; types?: Array<SearchResult["type"]> }) => {
      if (options?.query !== undefined) {
        setQuery(options.query);
      }
      setScope({ projectId: options?.projectId, types: options?.types });
      setOpen(true);
    },
    []
  );

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setScope({});
  }, []);

  const togglePalette = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const active = document.activeElement;
        if (!isTextInputLike(active)) {
          event.preventDefault();
          openPalette();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openPalette]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent =
        event as CustomEvent<
          | undefined
          | {
              query?: string;
              projectId?: string;
              types?: Array<SearchResult["type"]>;
            }
        >;
      openPalette(customEvent.detail ?? undefined);
    };

    document.addEventListener(
      "open-command-palette",
      handleOpen as EventListener
    );
    return () => {
      document.removeEventListener(
        "open-command-palette",
        handleOpen as EventListener
      );
    };
  }, [openPalette]);

  const value = useMemo(
    () => ({ open, query, scope, openPalette, closePalette, togglePalette, setQuery }),
    [open, query, scope, openPalette, closePalette, togglePalette, setQuery]
  );

  return (
    <CommandKContext.Provider value={value}>{children}</CommandKContext.Provider>
  );
};

export const useCommandKContext = () => {
  const context = useContext(CommandKContext);
  if (!context) {
    throw new Error("useCommandKContext must be used within a CommandKProvider");
  }
  return context;
};
