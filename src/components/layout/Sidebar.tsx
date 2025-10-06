import { useMemo, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getNavForRole, type NavItem } from "@/lib/navConfig";
import { getCurrentUser, type Role } from "@/lib/auth";
import { useBadges } from "@/state/badges";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type SidebarProps = {
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  onNavigate?: () => void;
  className?: string;
};

export function Sidebar({ isCollapsed, onCollapseToggle, onNavigate, className }: SidebarProps) {
  const user = getCurrentUser();
  const role: Role = user?.role ?? "viewer";
  const navItems = useMemo(() => getNavForRole(role), [role]);
  const { inboxCount, myWorkCount } = useBadges();
  const badgeCounts = { inboxCount, myWorkCount } as const;
  const location = useLocation();
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const additionalActiveMatchers = useMemo(
    () => ({
      "/docs": (path: string) =>
        path === "/docs" ||
        path.startsWith("/docs/") ||
        /^\/projects\/[^/]+\/docs(\/.*)?$/.test(path),
      "/reports": (path: string) => path === "/reports" || path.startsWith("/reports/"),
    }),
    []
  );

  const flattened = useMemo(() => {
    const acc: Array<{ item: NavItem; depth: number }> = [];
    const walk = (items: NavItem[], depth: number) => {
      items.forEach((item) => {
        acc.push({ item, depth });
        if (item.children) {
          walk(item.children, depth + 1);
        }
      });
    };
    walk(navItems, 0);
    return acc;
  }, [navItems]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = itemRefs.current[index + 1] ?? itemRefs.current[0];
      next?.focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = itemRefs.current[index - 1] ?? itemRefs.current[itemRefs.current.length - 1];
      prev?.focus();
    }
    if (event.key === "Enter" || event.key === " ") {
      event.currentTarget.click();
    }
  };

  const renderNavItem = (item: NavItem, index: number, depth = 0) => {
    const baseActive =
      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    const extraActive = additionalActiveMatchers[item.path]?.(location.pathname) ?? false;
    const isActive = baseActive || extraActive;
    const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
    const showBadge = item.badgeKey ? badgeValue > 0 : false;

    const content = (
      <NavLink
        key={item.id}
        to={item.path}
        ref={(el) => {
          itemRefs.current[index] = el;
        }}
        onClick={onNavigate}
        onKeyDown={(event) => handleKeyDown(event, index)}
        className={({ isActive: navActive }) =>
          cn(
            "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition", // base
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
            depth > 0 && !isCollapsed ? "ml-6" : "",
            navActive || isActive
              ? "bg-primary/10 font-semibold text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            isCollapsed ? "justify-center px-0" : ""
          )
        }
        aria-current={isActive ? "page" : undefined}
      >
        {item.icon}
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {showBadge && (
          <span className="ml-auto inline-flex min-w-[1.5rem] justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
            {badgeValue}
          </span>
        )}
        {(isActive) && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full bg-primary"
          />
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.id} delayDuration={200}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" align="center" className="max-w-[200px]">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{content}</div>;
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-background p-4 transition-all duration-200",
        isCollapsed ? "w-[72px]" : "w-[280px]",
        className
      )}
      role="navigation"
      aria-label="Primary"
    >
      <div className={cn("flex items-center justify-between", isCollapsed && "justify-center")}>
        {!isCollapsed && <p className="text-lg font-semibold">Workspace</p>}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapseToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <TooltipProvider delayDuration={200}>
        <nav className="mt-6 flex-1 space-y-1" aria-label="Main navigation">
          {flattened.map(({ item, depth }, index) => renderNavItem(item, index, depth))}
        </nav>
      </TooltipProvider>
      {!isCollapsed && (
        <div className="mt-auto pt-4 text-xs text-muted-foreground">
          <p>Signed in as {user?.email ?? "Guest"}</p>
        </div>
      )}
    </aside>
  );
}
