import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOfflinePolicyContext, requestRemoteWipe } from "@/components/offline/OfflinePolicyProvider";
import { saveOfflinePolicy } from "@/services/offline";

interface PolicyFormState {
  enabled: boolean;
  cacheLimitMb: number;
  retentionHours: number;
  remoteWipeReason: string;
  remoteWipeSessions: string;
}

export default function OfflinePoliciesPage() {
  const { toast } = useToast();
  const { policy, loading, refresh } = useOfflinePolicyContext();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<PolicyFormState>(() => ({
    enabled: policy.enabled,
    cacheLimitMb: policy.cacheLimitMb,
    retentionHours: policy.retentionHours,
    remoteWipeReason: "",
    remoteWipeSessions: "",
  }));

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      enabled: policy.enabled,
      cacheLimitMb: policy.cacheLimitMb,
      retentionHours: policy.retentionHours,
    }));
  }, [policy.cacheLimitMb, policy.enabled, policy.retentionHours]);

  const lastRemoteWipe = useMemo(() => {
    if (!policy.remoteWipe.active) return null;
    return {
      issuedAt: policy.remoteWipe.issuedAt,
      target: policy.remoteWipe.target ?? "all",
      reason: policy.remoteWipe.reason,
      sessions: policy.remoteWipe.sessionIds ?? [],
    };
  }, [policy.remoteWipe]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        enabled: form.enabled,
        cacheLimitMb: Number.isFinite(form.cacheLimitMb) ? form.cacheLimitMb : policy.cacheLimitMb,
        retentionHours: Number.isFinite(form.retentionHours) ? form.retentionHours : policy.retentionHours,
      };
      await saveOfflinePolicy(payload);
      await refresh();
      toast({ title: "Policy saved", description: "Offline policy updated successfully" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save offline policy",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoteWipe = async (target: "all" | "sessions") => {
    const sessionIds =
      target === "sessions"
        ? form.remoteWipeSessions
            .split(/[\s,]+/)
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
    setIsSaving(true);
    try {
      await requestRemoteWipe({
        reason: form.remoteWipeReason || undefined,
        target,
        sessionIds,
      });
      await refresh();
      toast({
        title: "Remote wipe scheduled",
        description: target === "all" ? "All sessions will be cleared" : `Sessions queued: ${sessionIds.join(", ") || "—"}`,
      });
      setForm((prev) => ({ ...prev, remoteWipeReason: "", remoteWipeSessions: "" }));
    } catch (error) {
      toast({
        title: "Remote wipe failed",
        description: error instanceof Error ? error.message : "Unable to trigger remote wipe",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Offline policies</h2>
        <p className="text-muted-foreground">Control offline caching, retention, and remote wipe behaviour.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Offline enablement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Allow offline caching</p>
                <p className="text-sm text-muted-foreground">
                  When disabled, local queues are cleared and new operations are not persisted.
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
                disabled={isSaving}
              />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cacheLimit">Cache limit (MB)</Label>
                <Input
                  id="cacheLimit"
                  type="number"
                  min={0}
                  value={form.cacheLimitMb}
                  onChange={(event) => setForm((prev) => ({ ...prev, cacheLimitMb: Number(event.target.value) }))}
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retention">Retention (hours)</Label>
                <Input
                  id="retention"
                  type="number"
                  min={0}
                  value={form.retentionHours}
                  onChange={(event) => setForm((prev) => ({ ...prev, retentionHours: Number(event.target.value) }))}
                  disabled={isSaving}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Remote wipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Issue a remote wipe to clear offline caches on targeted sessions. Users will be notified the next time they
            come online.
          </p>
          <div className="space-y-2">
            <Label htmlFor="remoteReason">Reason</Label>
            <Textarea
              id="remoteReason"
              placeholder="Optional context shown in diagnostics"
              value={form.remoteWipeReason}
              onChange={(event) => setForm((prev) => ({ ...prev, remoteWipeReason: event.target.value }))}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remoteSessions">Session IDs (comma separated)</Label>
            <Input
              id="remoteSessions"
              placeholder="session-123, session-456"
              value={form.remoteWipeSessions}
              onChange={(event) => setForm((prev) => ({ ...prev, remoteWipeSessions: event.target.value }))}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to target all sessions or provide explicit session identifiers to scope the wipe.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button variant="destructive" type="button" disabled={isSaving || loading} onClick={() => handleRemoteWipe("all")}> 
            Wipe all sessions
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={isSaving || loading}
            onClick={() => handleRemoteWipe("sessions")}
          >
            Wipe specified sessions
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={policy.enabled ? "default" : "destructive"}>
              {policy.enabled ? "Offline enabled" : "Offline disabled"}
            </Badge>
            <Badge variant="secondary">Cache limit {policy.cacheLimitMb} MB</Badge>
            <Badge variant="secondary">Retention {policy.retentionHours}h</Badge>
          </div>
          {lastRemoteWipe ? (
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">Pending remote wipe</p>
              <p className="text-muted-foreground">
                Target: {lastRemoteWipe.target} • Sessions: {lastRemoteWipe.sessions.join(", ") || "all"}
              </p>
              <p className="text-muted-foreground">
                Issued: {lastRemoteWipe.issuedAt ? new Date(lastRemoteWipe.issuedAt).toLocaleString() : "Pending"}
              </p>
              {lastRemoteWipe.reason ? <p className="text-muted-foreground">Reason: {lastRemoteWipe.reason}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active remote wipe instructions.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
