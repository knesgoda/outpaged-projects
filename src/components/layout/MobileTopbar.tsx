import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Plus, Bell, Command } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV } from "@/lib/navConfig";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCommandK } from "@/components/command/useCommandK";
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { executeOfflineQuery } from "@/services/offline/opqlIndex";
import type { SearchResult } from "@/types";

interface MobileTopbarProps {
  onToggleSidebar?: () => void;
  onOpenShortcuts?: () => void;
  onNavigate?: () => void;
}

interface SheetNavItem {
  label: string;
  path: string;
}

const PRIMARY_SECTIONS = new Set(["Projects", "Boards", "Documents", "Reports", "Files", "Calendar"]);

function extractPrimaryNav(): SheetNavItem[] {
  return NAV.filter((item) => PRIMARY_SECTIONS.has(item.label ?? ""))
    .slice(0, 8)
    .map((item) => ({ label: item.label ?? item.path ?? "Untitled", path: item.path ?? "/" }));
}

export function MobileTopbar({ onToggleSidebar, onOpenShortcuts, onNavigate }: MobileTopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { openPalette } = useCommandK();
  const connectivity = useConnectivityStatus(5_000);
  const navItems = useMemo(() => extractPrimaryNav(), []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [pendingReplay, setPendingReplay] = useState<string | null>(null);
  const [offlineResults, setOfflineResults] = useState<SearchResult[]>([]);
  const [offlineReason, setOfflineReason] = useState<string | null>(null);

  const currentLabel = useMemo(() => {
    const match = NAV.find((item) => item.path === location.pathname);
    return match?.label ?? "OutPaged";
  }, [location.pathname]);

  useEffect(() => {
    if (connectivity.state === "offline" && quickQuery.trim()) {
      setPendingReplay(quickQuery.trim());
    }
  }, [connectivity.state, quickQuery]);

  useEffect(() => {
    if (connectivity.state !== "offline" && pendingReplay) {
      navigate(`/search?q=${encodeURIComponent(pendingReplay)}`);
      setPendingReplay(null);
    }
  }, [connectivity.state, navigate, pendingReplay]);

  useEffect(() => {
    let cancelled = false;
    if (!searchOpen || connectivity.state !== "offline" || !quickQuery.trim()) {
      if (!quickQuery.trim()) {
        setOfflineResults([]);
      }
      if (connectivity.state !== "offline") {
        setOfflineReason(null);
      }
      return () => {
        cancelled = true;
      };
    }

    void executeOfflineQuery({ query: quickQuery, limit: 6 })
      .then((result) => {
        if (!cancelled) {
          setOfflineResults(result.items);
          setOfflineReason(result.reason ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOfflineResults([]);
          setOfflineReason("unavailable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connectivity.state, quickQuery, searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setQuickQuery("");
      setOfflineResults([]);
      setOfflineReason(null);
    }
  }, [searchOpen]);

  return (
    <div className="sticky top-0 z-40 flex flex-col gap-2 border-b border-border/70 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
            className="h-10 w-10 rounded-xl"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{currentLabel}</span>
            <span className="text-[11px] text-muted-foreground">Mobile workspace</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => openPalette("global")}
            aria-label="Open command palette"
          >
            <Command className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.full_name ?? ""} />
            <AvatarFallback>{user?.email?.slice(0, 2)?.toUpperCase() ?? "OP"}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-10 flex-1 justify-start gap-2 rounded-xl text-sm text-muted-foreground">
              <Search className="h-4 w-4" /> Search boards, docs, people…
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="max-h-[70vh] overflow-y-auto bg-background">
            <SheetHeader>
              <SheetTitle>Quick search</SheetTitle>
              <SheetDescription>
                Start typing to filter entities. For advanced queries use the command palette.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <Input
                placeholder="Search across projects, boards, docs…"
                className="h-11 rounded-xl"
                autoFocus
                value={quickQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuickQuery(value);
                  if (value.trim()) {
                    navigate(`/search?q=${encodeURIComponent(value)}`);
                  }
                }}
              />
              {connectivity.state === "offline" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Viewing cached matches. We'll refresh automatically when you're back online.
                </div>
              ) : null}
              {connectivity.state === "offline" && quickQuery.trim() && offlineResults.length ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Offline results</div>
                  <div className="flex flex-col gap-2">
                    {offlineResults.map((result) => (
                      <Button
                        key={result.id}
                        variant="ghost"
                        className="h-auto justify-start gap-1 rounded-lg px-3 py-2 text-left"
                        onClick={() => {
                          navigate(result.url);
                          setSearchOpen(false);
                          onNavigate?.();
                        }}
                      >
                        <span className="text-sm font-medium text-foreground">{result.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {connectivity.state === "offline" && quickQuery.trim() && !offlineResults.length ? (
                <div className="rounded-lg border border-dashed border-amber-200 px-3 py-2 text-xs text-amber-700">
                  {offlineReason
                    ? `Cached index could not answer this query (${offlineReason}).`
                    : "No cached matches yet. We'll run this search when you reconnect."}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                Tip: long-press the search icon or use Cmd/Ctrl+K for the full command palette.
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 rounded-xl"
          aria-label="Create"
          onClick={() => navigate("/projects?new=1")}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="h-9 flex-1 justify-start gap-2 rounded-xl text-xs text-muted-foreground">
              Browse workspace
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-background">
            <SheetHeader>
              <SheetTitle>Workspace navigation</SheetTitle>
              <SheetDescription>Select a destination to open the desktop-equivalent experience.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="outline"
                  className={cn("justify-start gap-2 rounded-xl text-sm", location.pathname === item.path && "border-primary text-primary")}
                  onClick={() => {
                    navigate(item.path);
                    onNavigate?.();
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" className="text-xs text-muted-foreground" onClick={onOpenShortcuts}>
                Keyboard shortcuts
              </Button>
              <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => navigate("/help")}>
                Help center
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
