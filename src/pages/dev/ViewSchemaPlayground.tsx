import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewColumnSchemaControls } from "@/components/boards/columns/ViewColumnSchemaControls";
import type { ViewColumnPreferences } from "@/types/boards";

const SAMPLE_COLUMNS = ["title", "status", "assignee", "due_date"];

const deriveVisibleColumns = (preferences: ViewColumnPreferences) => {
  const order = preferences.order.length ? preferences.order : SAMPLE_COLUMNS;
  return order.filter((column) => !preferences.hidden.includes(column));
};

export default function ViewSchemaPlayground() {
  const [preferences, setPreferences] = useState<ViewColumnPreferences>({
    order: SAMPLE_COLUMNS,
    hidden: [],
  });
  const [lastSaved, setLastSaved] = useState<ViewColumnPreferences>(preferences);
  const visibleColumns = useMemo(
    () => deriveVisibleColumns(preferences),
    [preferences]
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>View schema controls demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ViewColumnSchemaControls
            columns={SAMPLE_COLUMNS}
            preferences={preferences}
            onChange={setPreferences}
            onReset={() => setPreferences({ order: SAMPLE_COLUMNS, hidden: [] })}
            onSave={() => setLastSaved(preferences)}
          />

          <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-medium" data-cy="visible-columns">
              Visible columns: {visibleColumns.join(", ") || "none"}
            </p>
            <p className="text-xs text-muted-foreground" data-cy="saved-columns">
              Last saved order: {lastSaved.order.join(", ") || "none"}
            </p>
            <p className="text-xs text-muted-foreground" data-cy="hidden-columns">
              Hidden columns: {lastSaved.hidden.join(", ") || "none"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
