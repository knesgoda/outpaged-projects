import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SecuritySettings() {
  const { toast } = useToast();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionHours, setSessionHours] = useState("72");
  const [locking, setLocking] = useState(false);

  const handlePasswordReset = async () => {
    const { data, error } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email || error) {
      toast({ title: "Reset failed", description: error?.message ?? "No email available.", variant: "destructive" });
      return;
    }

    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) throw resetError;
      toast({ title: "Email sent", description: "Follow the link in your inbox to update your password." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send reset email.";
      toast({ title: "Reset failed", description: message, variant: "destructive" });
    }
  };

  const handleLockdown = async () => {
    setLocking(true);
    try {
      await supabase.auth.signOut();
      toast({ title: "Signed out", description: "Current session ended. Sign in again with new credentials." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign out.";
      toast({ title: "Sign out failed", description: message, variant: "destructive" });
    } finally {
      setLocking(false);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Security</h2>
        <p className="text-muted-foreground">Keep your account protected with best practices.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Send yourself a reset link at any time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handlePasswordReset}>Send reset email</Button>
            <p className="text-sm text-muted-foreground">
              Use a password manager to keep long, unique passwords for every workspace.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session policy</CardTitle>
            <CardDescription>Control how long sessions stay active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionHours">Session timeout (hours)</Label>
              <Input
                id="sessionHours"
                type="number"
                min={4}
                max={168}
                value={sessionHours}
                onChange={(event) => setSessionHours(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require multi-factor</p>
                <p className="text-sm text-muted-foreground">Prompt for a code on every new device.</p>
              </div>
              <Switch
                checked={mfaRequired}
                onCheckedChange={(checked) => {
                  setMfaRequired(checked);
                  toast({
                    title: checked ? "MFA required" : "MFA optional",
                    description: checked
                      ? "Your next sign in will ask for a verification code."
                      : "You can enable MFA later from your authenticator app.",
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Force sign out</CardTitle>
          <CardDescription>End this session if you believe your account is at risk.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLockdown} disabled={locking}>
            {locking ? "Signing out" : "Sign out now"}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
