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
import { PROJECT_TABS } from "@/components/common/TabBar";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      let label = findNavLabel(href);

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
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{user?.email ?? "Guest"}</span>
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
