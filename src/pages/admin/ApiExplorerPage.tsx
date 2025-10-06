import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from "@/hooks/useApiTokens";
import type { ApiToken } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const METHODS = ["GET", "POST"] as const;

type RequestTesterState = {
  token: string;
  url: string;
  method: (typeof METHODS)[number];
  body: string;
};

const INITIAL_TESTER: RequestTesterState = {
  token: "",
  url: "https://postman-echo.com/get",
  method: "GET",
  body: "",
};

export default function ApiExplorerPage() {
  const { data: tokens = [], isLoading } = useApiTokens();
  const createToken = useCreateApiToken();
  const revokeToken = useRevokeApiToken();
  const { toast } = useToast();

  const [tokenName, setTokenName] = useState("");
  const [issuedToken, setIssuedToken] = useState<{ name: string; token: string } | null>(null);
  const [testerState, setTesterState] = useState<RequestTesterState>(INITIAL_TESTER);
  const [testerResponse, setTesterResponse] = useState<string>("");
  const [testerLoading, setTesterLoading] = useState(false);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tokenName.trim()) return;
    try {
      const result = await createToken.mutateAsync(tokenName.trim());
      setIssuedToken({ name: tokenName.trim(), token: result.token });
      setTokenName("");
      setTesterState((prev) => ({ ...prev, token: result.token }));
    } catch (error) {
      console.warn("Failed to create token", error);
    }
  };

  const handleRevoke = async (token: ApiToken) => {
    try {
      await revokeToken.mutateAsync(token.id);
    } catch (error) {
      console.warn("Failed to revoke token", error);
    }
  };

  const handleTesterChange = (field: keyof RequestTesterState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTesterState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const runTest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!testerState.token.trim()) {
      toast({ title: "Token required", description: "Paste an API token to run the request.", variant: "destructive" });
      return;
    }

    setTesterLoading(true);
    setTesterResponse("");
    try {
      const response = await fetch(testerState.url, {
        method: testerState.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testerState.token.trim()}`,
        },
        body: testerState.method === "POST" ? testerState.body || "{}" : undefined,
      });

      const text = await response.text();
      setTesterResponse(`Status: ${response.status}\n${text}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setTesterResponse(`Error: ${message}`);
    } finally {
      setTesterLoading(false);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">API access</h2>
        <p className="text-muted-foreground">Issue personal access tokens and validate requests against a sample endpoint.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create token</CardTitle>
          <CardDescription>Tokens inherit the permissions of your current workspace role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="token-name">Token name</Label>
              <Input
                id="token-name"
                required
                placeholder="CLI tool"
                value={tokenName}
                onChange={(event) => setTokenName(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={createToken.isPending}>
              {createToken.isPending ? "Creating" : "Create token"}
            </Button>
          </form>
          {issuedToken && (
            <div className="mt-4 rounded-md border bg-muted p-4">
              <p className="font-medium">Copy your new token</p>
              <p className="text-sm text-muted-foreground">
                {issuedToken.name}: <span className="font-mono text-xs">{issuedToken.token}</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                This value will not be shown again. Store it in your secrets manager.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active tokens</CardTitle>
          <CardDescription>Rotate credentials regularly and revoke unused access.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Last four</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Loading tokens...
                    </TableCell>
                  </TableRow>
                ) : tokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No tokens yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  tokens.map((token) => {
                    const isRevoked = Boolean(token.revoked_at);
                    return (
                      <TableRow key={token.id}>
                        <TableCell>{token.name}</TableCell>
                        <TableCell className="font-mono text-xs">{token.token_prefix}</TableCell>
                        <TableCell className="font-mono text-xs">{token.last_four}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(token.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {isRevoked ? (
                            <span className="text-xs font-medium uppercase text-destructive">Revoked</span>
                          ) : (
                            <span className="text-xs font-medium uppercase text-emerald-600">Active</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRevoked || revokeToken.isPending}
                            onClick={() => handleRevoke(token)}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request tester</CardTitle>
          <CardDescription>
            Use a disposable endpoint to confirm headers and payload formatting. This runs in your browser, so CORS policies
            apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={runTest} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tester-token">API token</Label>
                <Input
                  id="tester-token"
                  required
                  placeholder="Paste token"
                  value={testerState.token}
                  onChange={handleTesterChange("token")}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={testerState.method} onValueChange={(value) => setTesterState((prev) => ({ ...prev, method: value as (typeof METHODS)[number] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="tester-url">URL</Label>
                <Input
                  id="tester-url"
                  required
                  type="url"
                  value={testerState.url}
                  onChange={handleTesterChange("url")}
                />
              </div>
              {testerState.method === "POST" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tester-body">JSON body</Label>
                  <textarea
                    id="tester-body"
                    className="min-h-[120px] w-full rounded-md border border-input bg-background p-3 font-mono text-sm"
                    value={testerState.body}
                    onChange={handleTesterChange("body")}
                  />
                </div>
              )}
            </div>
            <Button type="submit" disabled={testerLoading}>
              {testerLoading ? "Sending" : "Send request"}
            </Button>
          </form>
          {testerResponse && (
            <pre className="mt-4 max-h-[320px] overflow-auto rounded-md border bg-muted p-4 text-xs text-muted-foreground">
              {testerResponse}
            </pre>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
