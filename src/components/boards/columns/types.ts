import type { ReactNode } from "react";
import type {
  ColumnMetadataForType,
  ColumnMetadataValue,
  KanbanColumnType,
} from "@/types/boardColumns";

export interface ColumnRendererProps<T extends ColumnMetadataValue = ColumnMetadataValue> {
  value: unknown;
  metadata: T;
  fallback?: ReactNode;
}

export interface ColumnConfiguratorProps<
  TType extends KanbanColumnType,
  TMetadata extends ColumnMetadataValue = ColumnMetadataForType<TType>
> {
  metadata: TMetadata;
  onChange: (metadata: TMetadata) => void;
  disabled?: boolean;
}

export type ColumnConfiguratorComponent<TType extends KanbanColumnType> = (
  props: ColumnConfiguratorProps<TType>
) => ReactNode;
