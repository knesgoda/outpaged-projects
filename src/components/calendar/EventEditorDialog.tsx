import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CalendarEvent, CalendarEventReminder } from "@/types/calendar";

interface EventEditorDialogProps {
  open: boolean;
  event: CalendarEvent | null;
  onOpenChange: (open: boolean) => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

export function EventEditorDialog({ open, event, onOpenChange, onSave, onDelete }: EventEditorDialogProps) {
  const [draft, setDraft] = useState<CalendarEvent | null>(event);

  useEffect(() => {
    setDraft(event);
  }, [event]);

  if (!draft) {
    return null;
  }

  const updateField = <K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateReminder = (index: number, value: Partial<CalendarEventReminder>) => {
    setDraft((current) => {
      if (!current) return current;
      const reminders = [...(current.reminders ?? [])];
      reminders[index] = { ...reminders[index], ...value } as CalendarEventReminder;
      return { ...current, reminders };
    });
  };

  const addReminder = () => {
    setDraft((current) => {
      if (!current) return current;
      const reminders = [...(current.reminders ?? [])];
      reminders.push({ id: `rem-${Date.now()}`, offsetMinutes: 10, method: "popup" });
      return { ...current, reminders };
    });
  };

  const removeReminder = (index: number) => {
    setDraft((current) => {
      if (!current) return current;
      const reminders = [...(current.reminders ?? [])];
      reminders.splice(index, 1);
      return { ...current, reminders };
    });
  };

  const handleSave = () => {
    if (draft) {
      onSave({ ...draft, updatedAt: new Date().toISOString() });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>Manage all event details including attendees, reminders, and permissions.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="recurrence">Recurrence</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={draft.title}
                  onChange={(event) => updateField("title", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-location">Location</Label>
                <Input
                  id="event-location"
                  value={draft.location ?? ""}
                  onChange={(event) => updateField("location", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={draft.start.slice(0, 16)}
                  onChange={(event) => updateField("start", new Date(event.target.value).toISOString())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={draft.end.slice(0, 16)}
                  onChange={(event) => updateField("end", new Date(event.target.value).toISOString())}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={draft.description ?? ""}
                onChange={(event) => updateField("description", event.target.value)}
                rows={5}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{draft.status ?? "Unspecified"}</Badge>
              <Badge variant="outline">Priority: {draft.priority ?? "normal"}</Badge>
              {draft.visibility && <Badge variant="outline">Visibility: {draft.visibility}</Badge>}
            </div>
          </TabsContent>
          <TabsContent value="attendees" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Attendee management is mocked for now. Existing attendees:
            </p>
            <ul className="space-y-2 text-sm">
              {(draft.attendees ?? []).map((attendee) => (
                <li key={attendee.id} className="flex items-center justify-between rounded-md border p-2">
                  <span>{attendee.name}</span>
                  <Badge variant="secondary">{attendee.response ?? "needs action"}</Badge>
                </li>
              ))}
              {(draft.attendees ?? []).length === 0 && <li className="text-muted-foreground">No attendees added.</li>}
            </ul>
            <Button type="button" variant="outline" size="sm">
              Add attendee
            </Button>
          </TabsContent>
          <TabsContent value="recurrence" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Build recurrence rules using RRULE syntax. Example: <code>FREQ=WEEKLY;BYDAY=MO</code>
            </p>
            <Textarea
              value={draft.recurrenceRule ?? ""}
              onChange={(event) => updateField("recurrenceRule", event.target.value || null)}
              rows={4}
            />
            <Textarea
              value={(draft.recurrenceExceptions ?? []).join("\n")}
              onChange={(event) => updateField("recurrenceExceptions", event.target.value.split("\n").filter(Boolean))}
              rows={3}
              placeholder="Exception dates (ISO), one per line"
            />
          </TabsContent>
          <TabsContent value="reminders" className="space-y-4 pt-4">
            <div className="space-y-2">
              {(draft.reminders ?? []).map((reminder, index) => (
                <div key={reminder.id} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    className="w-24"
                    value={reminder.offsetMinutes}
                    onChange={(event) => updateReminder(index, { offsetMinutes: Number(event.target.value) })}
                  />
                  <select
                    className="flex-1 rounded-md border bg-transparent px-2 py-1 text-sm"
                    value={reminder.method}
                    onChange={(event) =>
                      updateReminder(index, { method: event.target.value as CalendarEventReminder["method"] })
                    }
                  >
                    <option value="popup">Popup</option>
                    <option value="email">Email</option>
                    <option value="push">Push</option>
                    <option value="slack">Slack/Teams</option>
                    <option value="webhook">Webhook</option>
                  </select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeReminder(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              {(draft.reminders ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No reminders configured.</p>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addReminder}>
              Add reminder
            </Button>
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              onDelete(draft.id);
              onOpenChange(false);
            }}
          >
            Delete event
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
