import { useEffect, useState, type FormEvent } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface MobileQuickTaskSheetProps {
  open: boolean;
  defaultColumnLabel?: string;
  onClose: () => void;
  onSubmit: (payload: { title: string; description?: string }) => Promise<void> | void;
}

export function MobileQuickTaskSheet({
  open,
  defaultColumnLabel,
  onClose,
  onSubmit,
}: MobileQuickTaskSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ title, description });
      setTitle("");
      setDescription("");
      onClose();
    } catch {
      // keep the sheet open so the user can try again
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border border-white/10 bg-[#0d1f33] text-slate-100"
        data-testid="mobile-quick-task-sheet"
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-white">Quick task</SheetTitle>
          <SheetDescription className="text-sm text-slate-300">
            Add a card to {defaultColumnLabel ?? "the current column"} without leaving the board.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile-quick-task-title" className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Title
            </Label>
            <Input
              id="mobile-quick-task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to happen?"
              autoFocus
              className="rounded-xl border-white/10 bg-[#112840] text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1f33]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile-quick-task-description" className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Notes (optional)
            </Label>
            <Textarea
              id="mobile-quick-task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a quick summary or acceptance criteria"
              className="h-28 rounded-xl border-white/10 bg-[#112840] text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1f33]"
            />
          </div>

          <div className="grid gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full rounded-xl bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(255,106,0,0.45)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Adding…" : "Add task"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
