import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";

export default function TemplatesHome() {
  useEffect(() => {
    document.title = "Templates";
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable project blueprints live here.</p>
        </div>
        <Button variant="default">New template</Button>
      </div>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Template library coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
