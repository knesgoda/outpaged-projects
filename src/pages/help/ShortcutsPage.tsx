import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { SHORTCUT_SECTIONS } from "@/components/help/shortcuts-data";
import { ShortcutsModal } from "@/components/help/ShortcutsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ShortcutsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 p-6">
      <Helmet>
        <title>Help / Shortcuts</title>
      </Helmet>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Keyboard shortcuts</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Work faster with keyboard commands. Press <kbd className="rounded border bg-muted px-1">?</kbd> from any page to
            open the shortcuts overlay.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="outline">
          Open shortcuts modal
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {SHORTCUT_SECTIONS.map((section) => (
          <Card key={section.id} className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {section.shortcuts.map((shortcut) => (
                  <li key={shortcut.description} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      {shortcut.keys.map((key, index) => (
                        <kbd
                          key={`${section.id}-${shortcut.description}-${key}-${index}`}
                          className="rounded border bg-muted px-2 py-1 text-xs font-medium"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Want a printable version? Save or screenshot this page, or press <kbd className="rounded border bg-muted px-1">?</kbd>
        to open the modal view.
      </div>

      <ShortcutsModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}

export default ShortcutsPage;
