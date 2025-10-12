// @ts-nocheck
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useProjectId } from "@/hooks/useProjectId";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MemberRow {
  id: string;
  role: string | null;
  joined_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    role: string | null;
  } | null;
}

const toneByRole: Record<string, string> = {
  owner: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
  admin: "bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-100",
  manager: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100",
  contributor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
  reporter: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100",
  viewer: "bg-muted/60",
};

export default function ProjectPeoplePage() {
  const projectId = useProjectId() ?? "";
  useDocumentTitle(`Projects / ${projectId || "Project"} / People`);

  const membersQuery = useQuery<MemberRow[]>({
    queryKey: ["project", projectId, "members"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_members")
        .select(
          "id, role, joined_at, user:profiles!project_members_user_id_fkey(id, full_name, avatar_url, username, role)"
        )
        .eq("project_id", projectId)
        .order("joined_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data as MemberRow[]) ?? [];
    },
  });

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  const metrics = useMemo(() => {
    const joinedLast30 = members.filter(member => {
      try {
        const joined = parseISO(member.joined_at);
        const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
        return joined.getTime() >= thirtyDaysAgo;
      } catch {
        return false;
      }
    }).length;

    const byRole = members.reduce<Record<string, number>>((acc, member) => {
      const role = member.role?.toLowerCase() || member.user?.role?.toLowerCase() || "contributor";
      acc[role] = (acc[role] ?? 0) + 1;
      return acc;
    }, {});

    const primaryRoles = Object.entries(byRole)
      .map(([role, count]) => ({ role, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 3);

    return {
      total: members.length,
      joinedLast30,
      primaryRoles,
    };
  }, [members]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Project people</h1>
        <p className="text-sm text-muted-foreground">
          Review project memberships, roles, and recent additions.
        </p>
      </header>

      {membersQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load members</AlertTitle>
          <AlertDescription>
            {membersQuery.error instanceof Error ? membersQuery.error.message : "Check your connection and try again."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total members</CardTitle>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-semibold">{metrics.total}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Joined in last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-semibold">{metrics.joinedLast30}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Primary roles</CardTitle>
            <CardDescription className="text-xs">Top role distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {membersQuery.isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : metrics.primaryRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              metrics.primaryRoles.map(entry => (
                <div key={entry.role} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{entry.role}</span>
                  <span>{entry.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Members</CardTitle>
          <CardDescription>Each member inherits permissions from their project role.</CardDescription>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members have been added to this project.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => {
                  const profile = member.user;
                  const role = member.role ?? profile?.role ?? "Contributor";
                  const fullName = profile?.full_name ?? "Unknown user";
                  const joinedLabel = formatDistanceToNow(parseISO(member.joined_at), { addSuffix: true });
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={profile?.avatar_url ?? undefined} alt={fullName} />
                            <AvatarFallback>{fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-tight">{fullName}</p>
                            <p className="text-xs text-muted-foreground">@{profile?.username ?? profile?.id ?? "unknown"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize",
                            toneByRole[role.toLowerCase()] ?? toneByRole.viewer,
                          )}
                        >
                          {role}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{joinedLabel}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
