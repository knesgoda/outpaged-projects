import type React from "react";
import { NavLink } from "react-router-dom";
import {
  Calendar,
  FolderKanban,
  Home,
  MoreHorizontal,
  Search,
  UserCheck,
  FileText,
  BarChart3,
  Users,
  HelpCircle,
  BookText,
  UserCircle,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface QuickLink {
  to: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const QUICK_LINKS: QuickLink[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/my-work", label: "My work", icon: UserCheck },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/calendar", label: "Calendar", icon: Calendar },
];

const OVERFLOW_LINKS: QuickLink[] = [
  { to: "/profile", label: "Profile", icon: UserCircle },
  { to: "/documents", label: "Docs", icon: BookText },
  { to: "/boards", label: "Boards", icon: FolderKanban },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/files", label: "Files", icon: FileText },
  { to: "/team", label: "Teams", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help", icon: HelpCircle },
];

interface MobileQuickBarProps {
  onNavigate?: () => void;
  className?: string;
}

function NavItem({ to, label, icon: Icon, onNavigate }: QuickLink & { onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium",
          isActive ? "text-primary" : "text-muted-foreground",
          "transition-colors"
        )
      }
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="truncate" aria-hidden="true">
        {label}
      </span>
      <span className="sr-only">{label}</span>
    </NavLink>
  );
}

export function MobileQuickBar({ onNavigate, className }: MobileQuickBarProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto sticky bottom-0 z-40 w-full border-t border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className
      )}
      role="navigation"
      aria-label="Mobile quick navigation"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2">
        {QUICK_LINKS.map((link) => (
          <NavItem key={link.to} {...link} onNavigate={onNavigate} />
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-muted-foreground"
              aria-label="More navigation"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
              More destinations
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {OVERFLOW_LINKS.map((link) => (
              <DropdownMenuItem key={link.to} asChild>
                <NavLink to={link.to} onClick={onNavigate} className="flex items-center gap-2 text-sm">
                  <link.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{link.label}</span>
                </NavLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
