import { createContext, useCallback, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import type { BoardViewConfiguration } from "@/types/boards";

export type BoardViewRecord = Record<string, unknown>;

export interface BoardViewContextValue {
  items: BoardViewRecord[];
  configuration: BoardViewConfiguration;
  isLoading: boolean;
  updateItem: (index: number, patch: Partial<BoardViewRecord>) => void;
  replaceItems: (items: BoardViewRecord[]) => void;
  updateConfiguration: (patch: Partial<BoardViewConfiguration>) => void;
}

export interface BoardViewProviderProps {
  items: BoardViewRecord[];
  configuration: BoardViewConfiguration;
  isLoading?: boolean;
  onItemsChange?: (items: BoardViewRecord[]) => void;
  onConfigurationChange?: (configuration: BoardViewConfiguration) => void;
}

const BoardViewContext = createContext<BoardViewContextValue | undefined>(undefined);

export function BoardViewProvider({
  items,
  configuration,
  isLoading = false,
  onItemsChange,
  onConfigurationChange,
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

  const value = useMemo<BoardViewContextValue>(
    () => ({
      items,
      configuration,
      isLoading,
      updateItem,
      replaceItems,
      updateConfiguration,
    }),
    [configuration, isLoading, items, replaceItems, updateConfiguration, updateItem]
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

