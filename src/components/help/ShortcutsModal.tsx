import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SHORTCUT_SECTIONS } from "./shortcuts-data";

export type ShortcutsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl" aria-label="Keyboard shortcuts">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Reference for the most common commands across the workspace.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {SHORTCUT_SECTIONS.map((section) => (
              <section key={section.id} className="space-y-3">
                <header>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h2>
                </header>
                <ul className="space-y-2">
                  {section.shortcuts.map((shortcut) => (
                    <li key={shortcut.description} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        {shortcut.keys.map((key, index) => (
                          <kbd
                            key={`${shortcut.description}-${key}-${index}`}
                            className="rounded border bg-muted px-2 py-1 text-xs font-medium"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
