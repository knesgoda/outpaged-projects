import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarVisualCategory } from "@/types/calendar";
import { VISUAL_CATEGORIES } from "./visualEncoding";

interface CalendarLegendProps {
  counts: Partial<Record<CalendarVisualCategory, number>>;
  activeCategory: CalendarVisualCategory | null;
  onActivate: (category: CalendarVisualCategory | null) => void;
}

export function CalendarLegend({ counts, activeCategory, onActivate }: CalendarLegendProps) {
  return (
    <Card aria-label="Calendar visual legend">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Visual legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {VISUAL_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          const count = counts[category.id] ?? 0;
          return (
            <div
              key={category.id}
              className={cn(
                "rounded-md border p-3 transition-colors",
                isActive && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onActivate(isActive ? null : category.id)}
                  >
                    {isActive ? "Hide" : "Highlight"}
                  </Button>
                  <span className="font-medium text-foreground">{category.label}</span>
                </div>
                <Badge variant={count > 0 ? "secondary" : "outline"}>{count}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">{category.description}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
