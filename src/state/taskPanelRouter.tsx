import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

interface TaskPanelRouterContextValue {
  selectedTaskKey: string | null;
  open: (taskKey: string, options?: { replace?: boolean }) => void;
  close: () => void;
  isOpen: boolean;
  isMobile: boolean;
  registerAnchor: (element: HTMLElement | null) => void;
}

const TaskPanelRouterContext = createContext<TaskPanelRouterContextValue | null>(null);

function sanitizeSearch(search: URLSearchParams) {
  const next = new URLSearchParams(search);
  if (next.get("item")) {
    next.set("item", next.get("item")!.trim());
  }
  return next;
}

export function TaskPanelRouterProvider({ children }: PropsWithChildren<unknown>) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const lastScrollTopRef = useRef<number | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(() => searchParams.get("item"));

  useEffect(() => {
    const item = searchParams.get("item");
    setSelectedTaskKey(item);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedTaskKey && lastScrollTopRef.current !== null) {
      const scrollTop = lastScrollTopRef.current;
      const focusTarget = lastFocusRef.current ?? anchor;
      lastScrollTopRef.current = null;
      lastFocusRef.current = null;
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollTop });
        if (focusTarget) {
          focusTarget.focus({ preventScroll: true });
        }
      });
    }
  }, [selectedTaskKey, anchor]);

  const open = useCallback(
    (taskKey: string, options?: { replace?: boolean }) => {
      if (!taskKey) return;
      const next = sanitizeSearch(searchParams);
      next.set("item", taskKey);
      lastScrollTopRef.current = window.scrollY;
      lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      navigate({ pathname: location.pathname, search: `?${next.toString()}` }, {
        replace: options?.replace ?? false,
        state: {
          ...location.state,
          taskPanel: { openedAt: Date.now() }
        },
      });
    },
    [navigate, location, searchParams],
  );

  const close = useCallback(() => {
    if (!selectedTaskKey) return;
    const state = location.state as Record<string, unknown> | null;
    if (state && typeof state === "object" && "taskPanel" in state) {
      navigate(-1);
      return;
    }
    const next = sanitizeSearch(searchParams);
    next.delete("item");
    navigate({ pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : "" }, { replace: true });
  }, [selectedTaskKey, searchParams, navigate, location]);

  const registerAnchor = useCallback((element: HTMLElement | null) => {
    if (element) {
      setAnchor(element);
    }
  }, []);

  const value = useMemo<TaskPanelRouterContextValue>(() => ({
    selectedTaskKey,
    open,
    close,
    isOpen: Boolean(selectedTaskKey),
    isMobile,
    registerAnchor,
  }), [selectedTaskKey, open, close, isMobile, registerAnchor]);

  return (
    <TaskPanelRouterContext.Provider value={value}>{children}</TaskPanelRouterContext.Provider>
  );
}

export function useTaskPanelRouter() {
  const context = useContext(TaskPanelRouterContext);
  if (!context) {
    throw new Error("useTaskPanelRouter must be used within a TaskPanelRouterProvider");
  }
  return context;
}
