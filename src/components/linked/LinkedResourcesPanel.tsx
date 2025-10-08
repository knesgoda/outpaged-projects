import { Fragment, useMemo, type ComponentType } from "react";
import { ExternalLink, Link as LinkIcon, Mail, Calendar, FileText, GitBranch, Trash2, Webhook } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkExternalModal } from "@/components/integrations/LinkExternalModal";
import { useLinkedResources } from "@/hooks/useLinkedResources";
import { useToast } from "@/hooks/use-toast";
import type { LinkedResource } from "@/types";
import { cn } from "@/lib/utils";

const providerInfo: Record<LinkedResource["provider"], { label: string; icon: ComponentType<any> }> = {
  gmail: { label: "Gmail", icon: Mail },
  google_calendar: { label: "Calendar", icon: Calendar },
  google_docs: { label: "Docs", icon: FileText },
  github: { label: "GitHub", icon: GitBranch },
  webhooks: { label: "Webhooks", icon: Webhook },
};

type LinkedResourcesPanelProps = {
  entityType: LinkedResource["entity_type"];
  entityId: string;
  projectId?: string | null;
  className?: string;
  title?: string;
  allowManualLink?: boolean;
};

export function LinkedResourcesPanel({
  entityType,
  entityId,
  projectId,
  className,
  title = "Linked resources",
  allowManualLink = true,
}: LinkedResourcesPanelProps) {
  const { toast } = useToast();
  const { resources, isLoading, isRefreshing, addResource, removeResource } = useLinkedResources({
    type: entityType,
    id: entityId,
  });

  const grouped = useMemo(() => {
    return resources.reduce<Record<string, LinkedResource[]>>((acc, resource) => {
      const key = resource.provider;
      if (!acc[key]) acc[key] = [];
      acc[key].push(resource);
      return acc;
    }, {});
  }, [resources]);

  const handleRemove = async (id: string) => {
    try {
      await removeResource(id);
      toast({ title: "Removed", description: "Link deleted." });
    } catch (error: any) {
      toast({
        title: "Unable to remove",
        description: error?.message ?? "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={cn("border-border/70", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-4">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep work connected across tools.
          </p>
        </div>
        {allowManualLink ? (
          <LinkExternalModal
            triggerLabel="Add link"
            entityType={entityType}
            entityId={entityId}
            projectId={projectId}
            onCreate={(input) => addResource(input)}
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}

        {!isLoading && resources.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing linked yet.</p>
        ) : null}

        {Object.entries(grouped).map(([provider, items]) => {
          const info = providerInfo[provider as LinkedResource["provider"]];
          const Icon = info?.icon ?? LinkIcon;
          return (
            <Fragment key={provider}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4" />
                <span>{info?.label ?? provider}</span>
                {isRefreshing ? <span className="text-xs text-muted-foreground">Refreshing…</span> : null}
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card/80 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={item.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate">{item.title ?? item.url ?? item.external_id}</span>
                        </a>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.external_type}
                        </Badge>
                      </div>
                      {item.metadata?.notes ? (
                        <p className="truncate text-xs text-muted-foreground">{item.metadata.notes}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove link</span>
                    </Button>
                  </div>
                ))}
              </div>
            </Fragment>
          );
        })}
      </CardContent>
    </Card>
  );
}
