import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export default function AccountSettings() {
  const { toast } = useToast();
  const [email, setEmail] = useState<string>("");
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [lastSignIn, setLastSignIn] = useState<string>("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error) {
        toast({ title: "Account unavailable", description: error.message, variant: "destructive" });
        setLoadingEmail(false);
        return;
      }

      const user = data.user;
      setEmail(user?.email ?? "");
      setLastSignIn(user?.last_sign_in_at ?? "");
      setLoadingEmail(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handlePasswordReset = async () => {
    if (!email) return;
    setResetting(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        throw error;
      }
      toast({ title: "Email sent", description: "Check your inbox for reset instructions." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send reset email.";
      toast({ title: "Reset failed", description: message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
        <p className="text-muted-foreground">Review your login details and sessions.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>Used for sign in and notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" value={email} disabled placeholder="Loading" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Last sign in:</span>
              {lastSignIn ? (
                <Badge variant="secondary">{new Date(lastSignIn).toLocaleString()}</Badge>
              ) : (
                <span>Unknown</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePasswordReset} disabled={!email || resetting}>
                {resetting ? "Sending" : "Send password reset"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Active sessions across your devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingEmail ? (
              <p className="text-sm text-muted-foreground">Loading sessions...</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">Current browser</p>
                    <p className="text-muted-foreground">Signed in from this device</p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <p className="text-muted-foreground">
                  Sign out from other browsers in the security tab if needed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Deleting your account will remove access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>
            Delete account (coming soon)
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
