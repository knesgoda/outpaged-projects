import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type ConnectCardProps = {
  title: string;
  description?: string;
  isConnected: boolean;
  isBusy?: boolean;
  onConnect?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
  connectLabel?: string;
  disconnectLabel?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

export function ConnectCard({
  title,
  description,
  isConnected,
  isBusy,
  onConnect,
  onDisconnect,
  connectLabel = "Connect",
  disconnectLabel = "Disconnect",
  children,
  footer,
}: ConnectCardProps) {
  const handleClick = async () => {
    if (isBusy) return;
    if (isConnected) {
      await onDisconnect?.();
    } else {
      await onConnect?.();
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge variant={isConnected ? "default" : "outline"} className="text-xs">
            {isConnected ? "Connected" : "Not connected"}
          </Badge>
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div>
          <Button
            variant={isConnected ? "outline" : "default"}
            onClick={handleClick}
            disabled={isBusy || (!isConnected && !onConnect) || (isConnected && !onDisconnect)}
          >
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isConnected ? disconnectLabel : connectLabel}
          </Button>
        </div>
      </CardContent>
      {footer ? <CardFooter className="flex flex-col items-start gap-3">{footer}</CardFooter> : null}
    </Card>
  );
}
