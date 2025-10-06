import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BreadcrumbLinkItem = {
  label: string;
  href?: string;
};

type BreadcrumbsContextValue = {
  breadcrumbs: BreadcrumbLinkItem[] | null;
  setBreadcrumbs: (items: BreadcrumbLinkItem[] | null) => void;
  title: string | null;
  setTitle: (title: string | null) => void;
};

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | undefined>(undefined);

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbState] = useState<BreadcrumbLinkItem[] | null>(null);
  const [title, setTitleState] = useState<string | null>(null);

  const setBreadcrumbs = useCallback((items: BreadcrumbLinkItem[] | null) => {
    setBreadcrumbState(items);
  }, []);

  const setTitle = useCallback((value: string | null) => {
    setTitleState(value);
  }, []);

  const value = useMemo(
    () => ({
      breadcrumbs,
      setBreadcrumbs,
      title,
      setTitle,
    }),
    [breadcrumbs, setBreadcrumbs, title, setTitle]
  );

  return <BreadcrumbsContext.Provider value={value}>{children}</BreadcrumbsContext.Provider>;
}

export function useBreadcrumbsState() {
  const context = useContext(BreadcrumbsContext);
  if (!context) {
    throw new Error("useBreadcrumbsState must be used within a BreadcrumbsProvider");
  }
  return context;
}

export function usePageMetadata({
  breadcrumbs,
  title,
  documentTitle,
}: {
  breadcrumbs?: BreadcrumbLinkItem[] | null;
  title?: string | null;
  documentTitle?: string | null;
}) {
  const { setBreadcrumbs, setTitle } = useBreadcrumbsState();

  useEffect(() => {
    if (breadcrumbs === undefined) {
      return;
    }

    setBreadcrumbs(breadcrumbs);
    return () => {
      setBreadcrumbs(null);
    };
  }, [breadcrumbs, setBreadcrumbs]);

  useEffect(() => {
    if (title === undefined) {
      return;
    }

    setTitle(title);
    return () => {
      setTitle(null);
    };
  }, [setTitle, title]);

  useEffect(() => {
    if (!documentTitle) {
      return;
    }

    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);
}
