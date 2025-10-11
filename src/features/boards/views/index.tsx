import type { ComponentType } from "react";
import type { BoardViewConfiguration, BoardViewMode } from "@/types/boards";
import {
  BoardViewProvider,
  type BoardViewProviderProps,
  type BoardViewRecord,
} from "./context";
import { KanbanBoardView } from "./KanbanBoardView";
import { TableBoardView } from "./TableBoardView";
import { TimelineBoardView } from "./TimelineBoardView";

export type BoardViewComponent = ComponentType;

export const boardViewRegistry: Record<BoardViewMode, BoardViewComponent> = {
  table: TableBoardView,
  kanban: KanbanBoardView,
  timeline: TimelineBoardView,
};

export interface BoardViewCanvasProps {
  items: BoardViewRecord[];
  configuration: BoardViewConfiguration;
  isLoading?: boolean;
  onItemsChange?: BoardViewProviderProps["onItemsChange"];
  onConfigurationChange?: BoardViewProviderProps["onConfigurationChange"];
}

export function BoardViewCanvas({
  items,
  configuration,
  isLoading = false,
  onItemsChange,
  onConfigurationChange,
}: BoardViewCanvasProps) {
  const Component = boardViewRegistry[configuration.mode] ?? TableBoardView;

  return (
    <BoardViewProvider
      items={items}
      configuration={configuration}
      isLoading={isLoading}
      onItemsChange={onItemsChange}
      onConfigurationChange={onConfigurationChange}
    >
      <Component />
    </BoardViewProvider>
  );
}

export type { BoardViewProviderProps, BoardViewRecord };

