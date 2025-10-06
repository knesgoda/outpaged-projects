import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addLinkedResource } from "@/services/linkedResources";
import type { IntegrationKey, LinkedResource } from "@/types";

const providerOptions: { value: IntegrationKey; label: string }[] = [
  { value: "gmail", label: "Gmail" },
  { value: "google_calendar", label: "Google Calendar" },
  { value: "google_docs", label: "Google Docs" },
  { value: "github", label: "GitHub" },
];

const externalTypeOptions: LinkedResource["external_type"][] = [
  "email",
  "thread",
  "event",
  "doc",
  "repo",
  "issue",
  "pr",
  "file",
];

type LinkExternalModalProps = {
  triggerLabel?: string;
  trigger?: React.ReactNode;
  entityType: LinkedResource["entity_type"];
  entityId: string;
  projectId?: string | null;
  defaultProvider?: IntegrationKey;
  defaultExternalType?: LinkedResource["external_type"];
  onCreate?: (
    input: Omit<LinkedResource, "id" | "created_at" | "created_by">
  ) => Promise<LinkedResource>;
  onLinked?: (resource: LinkedResource) => void;
};

export function LinkExternalModal({
  triggerLabel = "Link external item",
  trigger,
  entityType,
  entityId,
  projectId,
  defaultProvider = "google_docs",
  defaultExternalType = "doc",
  onCreate,
  onLinked,
}: LinkExternalModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<IntegrationKey>(defaultProvider);
  const [externalType, setExternalType] = useState<LinkedResource["external_type"]>(
    defaultExternalType
  );
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !url.trim()) {
      toast({
        title: "Missing info",
        description: "Provide a title and URL to link the resource.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Omit<LinkedResource, "id" | "created_at" | "created_by"> = {
        provider,
        external_type: externalType,
        external_id: url.trim(),
        url: url.trim(),
        title: title.trim(),
        metadata: notes ? { notes } : {},
        entity_type: entityType,
        entity_id: entityId,
        project_id: projectId ?? null,
      };

      const creator = onCreate ?? addLinkedResource;
      const resource = await creator(payload);
      onLinked?.(resource);

      toast({
        title: "Linked",
        description: "The external item is now attached.",
      });

      setTitle("");
      setUrl("");
      setNotes("");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Unable to link",
        description: error?.message ?? "Check the details and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link external resource</DialogTitle>
          <DialogDescription>Add a URL so the team can access it quickly.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as IntegrationKey)}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="external-type">Type</Label>
            <Select
              value={externalType}
              onValueChange={(value) => setExternalType(value as LinkedResource["external_type"])}
            >
              <SelectTrigger id="external-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {externalTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Brief label"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional context"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving" : "Save link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
