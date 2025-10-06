import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  useCreateWebhook,
  useDeleteWebhook,
  useUpdateWebhook,
  useWebhooks,
} from "@/hooks/useWebhooks";
import type { Webhook } from "@/types";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const INITIAL_FORM = {
  target_url: "",
  secret: "",
  active: true,
};

type FormState = typeof INITIAL_FORM;

type EditState = {
  target_url: string;
  secret: string;
  active: boolean;
};

export default function WebhooksPage() {
  const { data: webhooks = [], isLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleFormChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createWebhook.mutateAsync({
        target_url: form.target_url.trim(),
        secret: form.secret.trim() || undefined,
        active: form.active,
      });
      setForm(INITIAL_FORM);
    } catch (error) {
      console.warn("Failed to create webhook", error);
    }
  };

  const startEdit = (webhook: Webhook) => {
    setEditingId(webhook.id);
    setEditState({
      target_url: webhook.target_url,
      secret: webhook.secret ?? "",
      active: webhook.active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const handleEditChange = (field: keyof EditState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editState) return;
    const value = field === "active" ? (event.target as HTMLInputElement).checked : event.target.value;
    setEditState((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveEdit = async () => {
    if (!editingId || !editState) return;
    try {
      await updateWebhook.mutateAsync({
        id: editingId,
        patch: {
          target_url: editState.target_url.trim(),
          secret: editState.secret.trim() || undefined,
          active: editState.active,
        },
      });
      cancelEdit();
    } catch (error) {
      console.warn("Failed to update webhook", error);
    }
  };

  const handleTest = async (webhook: Webhook) => {
    setTestingId(webhook.id);
    try {
      const response = await fetch(webhook.target_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Outpaged-Test": "true",
          ...(webhook.secret ? { "X-Webhook-Secret": webhook.secret } : {}),
        },
        body: JSON.stringify({
          event: "workspace.test",
          timestamp: new Date().toISOString(),
          payload: {
            message: "Test ping from Outpaged",
          },
        }),
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`Received status ${response.status}`);
      }

      toast({ title: "Webhook responded", description: "The endpoint returned a success status." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      toast({
        title: "Test failed",
        description: `${message}. Some endpoints block browser requests, so verify with server logs if needed.`,
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  const maskedSecret = (secret: string | null | undefined) => {
    if (!secret) return "Not set";
    return `•••• ${secret.slice(-4)}`;
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Webhooks</h2>
        <p className="text-muted-foreground">
          Deliver realtime events to your systems. Secrets are masked after creation.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Register endpoint</CardTitle>
          <CardDescription>We send POST requests with JSON payloads for every subscribed event.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="target_url">Destination URL</Label>
              <Input
                id="target_url"
                required
                type="url"
                placeholder="https://example.com/webhooks/outpaged"
                value={form.target_url}
                onChange={handleFormChange("target_url")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret">Shared secret (optional)</Label>
              <Input
                id="secret"
                placeholder="Leave blank to skip signature"
                value={form.secret}
                onChange={handleFormChange("secret")}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))} />
              <span className="text-sm text-muted-foreground">Send events to this endpoint</span>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createWebhook.isPending}>
                {createWebhook.isPending ? "Creating" : "Create webhook"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing webhooks</CardTitle>
          <CardDescription>Toggle, update, or remove endpoints as your integration evolves.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading webhooks...</p>
          ) : webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks yet. Add one above to get started.</p>
          ) : (
            webhooks.map((webhook) => {
              const isEditing = editingId === webhook.id && editState;
              return (
                <div key={webhook.id} className="rounded-lg border p-4">
                  {isEditing ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`edit-url-${webhook.id}`}>Destination URL</Label>
                        <Input
                          id={`edit-url-${webhook.id}`}
                          value={editState?.target_url ?? ""}
                          onChange={handleEditChange("target_url")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-secret-${webhook.id}`}>Shared secret</Label>
                        <Input
                          id={`edit-secret-${webhook.id}`}
                          value={editState?.secret ?? ""}
                          onChange={handleEditChange("secret")}
                          placeholder="Leave blank to remove"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editState?.active ?? true}
                          onCheckedChange={(checked) =>
                            setEditState((prev) => (prev ? { ...prev, active: checked } : prev))
                          }
                        />
                        <span className="text-sm text-muted-foreground">Active</span>
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <Button type="button" onClick={saveEdit} disabled={updateWebhook.isPending}>
                          {updateWebhook.isPending ? "Saving" : "Save"}
                        </Button>
                        <Button type="button" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{webhook.target_url}</p>
                        <p className="text-sm text-muted-foreground">Secret: {maskedSecret(webhook.secret)}</p>
                        <p className="text-xs text-muted-foreground">Created {new Date(webhook.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => startEdit(webhook)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(webhook)}
                          disabled={testingId === webhook.id}
                        >
                          {testingId === webhook.id ? "Testing" : "Send test"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateWebhook.mutate({
                              id: webhook.id,
                              patch: { active: !webhook.active },
                            })
                          }
                        >
                          {webhook.active ? "Disable" : "Enable"}
                        </Button>
                        <ConfirmDialog
                          title="Remove webhook?"
                          description="Events will stop sending to this endpoint."
                          confirmLabel="Remove"
                          onConfirm={() => deleteWebhook.mutate(webhook.id)}
                          trigger={
                            <Button type="button" variant="destructive" size="sm">
                              Delete
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </section>
  );
}
