import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const CONNECTIONS = [
  {
    id: "slack",
    name: "Slack",
    description: "Send channel updates and alerts.",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Link pull requests and deployments.",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Sync issues across teams.",
  },
];

type ConnectionState = Record<string, boolean>;

export default function ConnectionsSettings() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<ConnectionState>({ slack: true, github: false, jira: false });
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggle = async (id: string) => {
    setLoading(id);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const nextValue = !connections[id];
    setConnections((prev) => ({ ...prev, [id]: nextValue }));
    setLoading(null);

    toast({
      title: nextValue ? "Connected" : "Disconnected",
      description: nextValue
        ? `Outpaged can now sync with ${id}.`
        : `Connection to ${id} has been removed.`,
    });
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Connections</h2>
        <p className="text-muted-foreground">Link other tools to keep work flowing automatically.</p>
      </header>

      <div className="space-y-4">
        {CONNECTIONS.map((connection) => {
          const isConnected = connections[connection.id] ?? false;
          return (
            <Card key={connection.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle>{connection.name}</CardTitle>
                  <CardDescription>{connection.description}</CardDescription>
                </div>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connected" : "Not connected"}
                </Badge>
              </CardHeader>
              <CardContent>
                <Button onClick={() => handleToggle(connection.id)} disabled={loading === connection.id}>
                  {loading === connection.id
                    ? "Working..."
                    : isConnected
                    ? "Disconnect"
                    : "Connect"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
