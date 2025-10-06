import { Fragment, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Plus, Search } from "lucide-react";
import { NAV } from "@/lib/navConfig";
import { getCurrentUser } from "@/lib/auth";
import { useProfile } from "@/state/profile";
import { PROJECT_TABS } from "@/components/common/TabBar";
import { useReport } from "@/hooks/useReports";
import { useDoc } from "@/hooks/useDocs";
import { useProjectMeta } from "@/hooks/useProjectMeta";

function findNavLabel(path: string) {
  const walk = (items = NAV): string | undefined => {
    for (const item of items) {
      if (item.path === path) {
        return item.label;
      }
      if (item.children) {
        const found = walk(item.children);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  };

  return walk();
}

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type TopbarProps = {
  onToggleSidebar: () => void;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { profile, error: profileError } = useProfile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const segments = useMemo(
    () => location.pathname.split("/").filter(Boolean),
    [location.pathname]
  );
  const reportId =
    segments[0] === "reports" && segments[1] && segments[1] !== "new"
      ? segments[1]
      : undefined;
  const docId =
    segments[0] === "docs"
      ? segments[1] && segments[1] !== "new"
        ? segments[1]
        : undefined
      : segments[0] === "projects" && segments[2] === "docs" && segments[3] && segments[3] !== "new"
      ? segments[3]
      : undefined;
  const projectId = segments[0] === "projects" ? segments[1] : undefined;

  const reportQuery = useReport(reportId);
  const docQuery = useDoc(docId);
  const projectMetaQuery = useProjectMeta(projectId);

  const actions = useMemo(
    () => [
      { label: "New Project", path: "/projects/new" },
      { label: "New Board", path: "/boards/new" },
      { label: "New Task", path: "/tasks/new" },
      { label: "New Dashboard", path: "/dashboards/new" },
    ],
    []
  );

  const breadcrumbs = useMemo(() => {
    if (segments.length === 0) {
      return [{ label: "Home", href: "/" }];
    }

    const crumbs: Array<{ label: string; href: string }> = [];
    let href = "";

    segments.forEach((segment, index) => {
      href += `/${segment}`;
      let label = findNavLabel(href);

      if (!label && segments[0] === "reports" && index === 1) {
        label = reportQuery.data?.name;
      }

      if (!label && segments[0] === "docs" && index === 1) {
        label = docQuery.data?.title;
      }

      if (!label && segments[0] === "projects") {
        if (index === 1) {
          label = projectMetaQuery.data?.name ?? projectId ?? `Project ${segment}`;
        } else if (segments[2] === "docs" && index === 3) {
          label = docQuery.data?.title;
        } else if (index > 1) {
          label = PROJECT_TABS.find((tab) => tab.path === segment)?.label ?? formatSegment(segment);
        }
      }

      if (!label) {
        label = formatSegment(segment);
      }

      crumbs.push({ label, href });
    });

    return [{ label: "Home", href: "/" }, ...crumbs];
  }, [segments, reportQuery.data?.name, docQuery.data?.title, projectMetaQuery.data?.name, projectId]);

  const handleAction = (path: string) => {
    setIsDialogOpen(false);
    navigate(path);
  };

  const fallbackLabel = user?.email ?? "Guest";
  const hasProfile = Boolean(profile) && !profileError;
  const displayName = hasProfile
    ? profile.full_name?.trim() || fallbackLabel
    : fallbackLabel;
  const displayInitial = hasProfile
    ? (profile.full_name?.trim() ?? profile.role ?? fallbackLabel).charAt(0).toUpperCase()
    : fallbackLabel.charAt(0).toUpperCase();

  const canCreate = user?.role !== "viewer";

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="Toggle navigation">
          <Menu className="h-5 w-5" />
        </Button>
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mx-auto hidden w-full max-w-xl items-center gap-2 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input placeholder="Search tasks, projects, and people" className="border-0 shadow-none focus-visible:ring-0" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Quick create</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                {actions.map((action) => (
                  <Button key={action.path} variant="outline" className="justify-start" onClick={() => handleAction(action.path)}>
                    {action.label}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{displayInitial || "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/logout")}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
