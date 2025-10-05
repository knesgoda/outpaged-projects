import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BadgesProvider } from "@/state/badges";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setIsMobile(window.matchMedia("(max-width: 1023px)").matches);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isMobile;
}

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen((open) => !open);
    } else {
      setIsCollapsed((value) => !value);
    }
  }, [isMobile]);

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return (
    <BadgesProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className={cn("hidden lg:flex", isCollapsed ? "w-[72px]" : "w-[280px]")}>
          <Sidebar isCollapsed={isCollapsed} onCollapseToggle={toggleSidebar} />
        </div>

        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={closeMobile}
              aria-label="Close navigation"
            />
            <div className="relative h-full w-[280px]">
              <Sidebar
                isCollapsed={false}
                onCollapseToggle={toggleSidebar}
                onNavigate={closeMobile}
                className="h-full w-full bg-background shadow-xl"
              />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <Topbar onToggleSidebar={toggleSidebar} />
          <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </BadgesProvider>
  );
}
