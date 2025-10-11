import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { BoardFilterBuilder } from "./BoardFilterBuilder";
import type { BoardFilterDefinition } from "./types";
import { DEFAULT_FILTER_DEFINITION } from "./types";
import { QuickFilterChips } from "./QuickFilterChips";
import { FilterSharingControls } from "./FilterSharingControls";

interface BoardFilterPanelProps {
  definition: BoardFilterDefinition | null;
  onChange: (definition: BoardFilterDefinition) => void;
  boardId: string;
  viewId: string;
  canManageSharing: boolean;
  onReset?: () => void;
}

export function BoardFilterPanel({
  definition,
  onChange,
  boardId,
  viewId,
  canManageSharing,
  onReset,
}: BoardFilterPanelProps) {
  const resolvedDefinition = useMemo(() => definition ?? DEFAULT_FILTER_DEFINITION, [definition]);

  return (
    <Card className="border-muted-foreground/50 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
        </div>
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <QuickFilterChips definition={resolvedDefinition} onChange={onChange} />
        <BoardFilterBuilder definition={resolvedDefinition} onChange={onChange} />
        <FilterSharingControls boardId={boardId} viewId={viewId} canManageSharing={canManageSharing} />
      </CardContent>
    </Card>
  );
}
