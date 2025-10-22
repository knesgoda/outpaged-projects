import { createContext, useCallback, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import type { BoardViewConfiguration } from "@/types/boards";
import type { Database } from "@/integrations/supabase/types";

export type { BoardViewConfiguration };
export type BoardViewRecord = Record<string, unknown>;

export type BoardColumnRecord = Database["public"]["Tables"]["kanban_columns"]["Row"];

export interface BoardViewContextValue {
  items: BoardViewRecord[];
  configuration: BoardViewConfiguration;
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  updateItem: (index: number, patch: Partial<BoardViewRecord>) => void;
  replaceItems: (items: BoardViewRecord[]) => void;
  updateConfiguration: (patch: Partial<BoardViewConfiguration>) => void;
  loadMore?: () => Promise<void> | void;
  columns: BoardColumnRecord[];
}

export interface BoardViewProviderProps {
  items: BoardViewRecord[];
  configuration: BoardViewConfiguration;
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => Promise<void> | void;
  onItemsChange?: (items: BoardViewRecord[]) => void;
  onConfigurationChange?: (configuration: BoardViewConfiguration) => void;
  columns?: BoardColumnRecord[];
}

const BoardViewContext = createContext<BoardViewContextValue | undefined>(undefined);

export function BoardViewProvider({
  items,
  configuration,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onItemsChange,
  onConfigurationChange,
  columns = [],
  children,
}: PropsWithChildren<BoardViewProviderProps>) {
  const replaceItems = useCallback(
    (next: BoardViewRecord[]) => {
      onItemsChange?.(next);
    },
    [onItemsChange]
  );

  const updateItem = useCallback(
    (index: number, patch: Partial<BoardViewRecord>) => {
      if (index < 0 || index >= items.length) {
        return;
      }

      const next = items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      );

      replaceItems(next);
    },
    [items, replaceItems]
  );

  const updateConfiguration = useCallback(
    (patch: Partial<BoardViewConfiguration>) => {
      const next = { ...configuration, ...patch } as BoardViewConfiguration;
      onConfigurationChange?.(next);
    },
    [configuration, onConfigurationChange]
  );

  const loadMore = useCallback(() => {
    return onLoadMore?.();
  }, [onLoadMore]);

  const value = useMemo<BoardViewContextValue>(
    () => ({
      items,
      configuration,
      isLoading,
      hasMore,
      isLoadingMore,
      updateItem,
      replaceItems,
      updateConfiguration,
      loadMore,
      columns,
    }),
    [
      configuration,
      hasMore,
      isLoading,
      isLoadingMore,
      items,
      loadMore,
      replaceItems,
      updateConfiguration,
      updateItem,
      columns,
    ]
  );

  return <BoardViewContext.Provider value={value}>{children}</BoardViewContext.Provider>;
}

export function useBoardViewContext(): BoardViewContextValue {
  const context = useContext(BoardViewContext);
  if (!context) {
    throw new Error("useBoardViewContext must be used within a BoardViewProvider");
  }
  return context;
}

