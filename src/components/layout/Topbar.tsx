codex/perform-deep-dive-on-settings-and-admin
import { Fragment, useEffect, useMemo, useState } from "react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { HelpCircle, Keyboard, Menu, Plus, Search } from "lucide-react";
import { NAV } from "@/lib/navConfig";
import { getWorkspaceRole, type Role } from "@/lib/auth";
import { useProfile } from "@/state/profile";
import { PROJECT_TABS } from "@/components/common/TabBar";
codex/perform-deep-dive-on-settings-and-admin
import { useAuth } from "@/hooks/useAuth";
import { useCommandK } from "@/components/command/useCommandK";

function findNavLabel(path: string) {
  const walk = (items = NAV): string | undefined => {
    for (const item of items) {
      if (item.path === path) {
        return item.label;
      }
      if (item.matchPaths) {
        const match = item.matchPaths.find((candidate) => matchesPattern(candidate, path));
        if (match) {
          return item.label;
        }
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

const SEGMENT_LABELS: Record<string, string> = {
  faq: "FAQ",
  shortcuts: "Shortcuts",
  changelog: "Changelog",
  contact: "Contact",
  onboarding: "Onboarding",
  search: "Search",
};

function formatSegment(segment: string) {
  const normalized = segment.toLowerCase();
  if (SEGMENT_LABELS[normalized]) {
    return SEGMENT_LABELS[normalized];
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const CUSTOM_CRUMBS = [
  { pattern: "/people", label: "People" },
  { pattern: "/people/:userId", label: "Member" },
  { pattern: "/teams", label: "Teams" },
  { pattern: "/teams/:teamId", label: "Team" },
  { pattern: "/time", label: "Time" },
  { pattern: "/time/my", label: "My" },
  { pattern: "/time/approvals", label: "Approvals" },
  { pattern: "/projects/:projectId/people", label: "People" },
  { pattern: "/projects/:projectId/teams", label: "Teams" },
  { pattern: "/projects/:projectId/time", label: "Time" },
] as const;

function matchesPattern(pattern: string, path: string) {
  if (pattern === path) return true;
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexPattern = escaped.replace(/:\w+/g, "[^/]+");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

function findCustomLabel(path: string) {
  const match = CUSTOM_CRUMBS.find((crumb) => matchesPattern(crumb.pattern, path));
  return match?.label;
}

type TopbarProps = {
  onToggleSidebar: () => void;
  onOpenShortcuts?: () => void;
};

export function Topbar({ onToggleSidebar, onOpenShortcuts }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState<Role>("viewer");
  const { profile, error: profileError } = useProfile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { openPalette } = useCommandK();

  useEffect(() => {
    let active = true;

    async function loadRole() {
      if (!user) {
        if (active) {
          setRole("viewer");
        }
        return;
      }

      try {
        const workspaceRole = await getWorkspaceRole(user.id);
        if (active) {
          setRole(workspaceRole ?? "viewer");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (active) {
          if (message !== "You do not have access") {
            console.warn("Failed to load workspace role", message);
          }
          setRole("viewer");
        }
      }
    }

    loadRole();

    return () => {
      active = false;
    };
  }, [user?.id]);

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
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return [{ label: "Home", href: "/" }];
    }

    const crumbs: Array<{ label: string; href: string }> = [];
    let href = "";

    segments.forEach((segment, index) => {
      href += `/${segment}`;
      let label = findCustomLabel(href) ?? findNavLabel(href);

      if (!label && segments[0] === "projects") {
        if (index === 1) {
          label = `Project ${segment}`;
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
  }, [location.pathname]);

  const handleAction = (path: string) => {
    setIsDialogOpen(false);
    navigate(path);
  };

  const openHelpCenter = useCallback(() => {
    const newWindow = window.open("/help", "_blank", "noopener,noreferrer");
    newWindow?.focus();
  }, []);

  const fallbackLabel = user?.email ?? "Guest";
  const hasProfile = Boolean(profile) && !profileError;
  const displayName = hasProfile
    ? profile.full_name?.trim() || fallbackLabel
    : fallbackLabel;
  const displayInitial = hasProfile
    ? (profile.full_name?.trim() ?? profile.role ?? fallbackLabel).charAt(0).toUpperCase()
    : fallbackLabel.charAt(0).toUpperCase();

  const canCreate = role !== "viewer";

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

      <div className="mx-auto hidden w-full max-w-xl md:flex">
        <button
          type="button"
          onClick={() => openPalette()}
          className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Open search"
        >
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-left">Search everything</span>
          <span className="hidden items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
            Ctrl&nbsp;K
          </span>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Help and shortcuts">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                openHelpCenter();
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Open help center
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onOpenShortcuts?.();
              }}
            >
              <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" /> Keyboard shortcuts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
