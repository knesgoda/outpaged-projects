import type { ComponentType } from "react";
import type { BoardViewConfiguration, BoardViewMode } from "@/types/boards";
import {
  BoardViewProvider,
  type BoardViewProviderProps,
  type BoardViewRecord,
} from "./context";
import { KanbanBoardView } from "./KanbanBoardView";
import { MasterBoardView } from "./MasterBoardView";
import { TableBoardView } from "./TableBoardView";
import { TimelineBoardView } from "./TimelineBoardView";
import { BoardStateProvider, BoardStateShell } from "./BoardStateProvider";

export type BoardViewComponent = ComponentType;

export const boardViewRegistry: Record<BoardViewMode, BoardViewComponent> = {
  table: TableBoardView,
  kanban: KanbanBoardView,
  timeline: TimelineBoardView,
  master: MasterBoardView,
  calendar: (() => <div>Calendar view coming soon</div>) as any,
};

export interface BoardViewCanvasProps {
  items: BoardViewRecord[];
  configuration: BoardViewConfiguration;
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => Promise<void> | void;
  onItemsChange?: BoardViewProviderProps["onItemsChange"];
  onConfigurationChange?: BoardViewProviderProps["onConfigurationChange"];
  columns?: BoardViewProviderProps["columns"];
}

export function BoardViewCanvas({
  items,
  configuration,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onItemsChange,
  onConfigurationChange,
  columns,
}: BoardViewCanvasProps) {
  const Component = boardViewRegistry[configuration.mode] ?? TableBoardView;

  return (
    <BoardStateProvider>
      <BoardViewProvider
        items={items}
        configuration={configuration}
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        onItemsChange={onItemsChange}
        onConfigurationChange={onConfigurationChange}
        columns={columns}
      >
        <BoardStateShell>
          <Component />
        </BoardStateShell>
      </BoardViewProvider>
    </BoardStateProvider>
  );
}

export type { BoardViewProviderProps, BoardViewRecord };

