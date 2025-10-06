import { useMemo, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";
import { useProjectId } from "@/hooks/useProjectId";
import { PROJECT_TABS } from "@/pages/projects/projectTabs";

export function TabBar() {
  const projectId = useProjectId() ?? "";
  const location = useLocation();
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const tabItems = useMemo(
    () => PROJECT_TABS.map(({ label, path }) => ({ label, path })),
    []
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = tabRefs.current[(index + 1) % tabItems.length];
      next?.focus();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = tabRefs.current[(index - 1 + tabItems.length) % tabItems.length];
      prev?.focus();
    }
  };

  return (
    <nav className="overflow-x-auto" role="tablist" aria-label="Project navigation">
      <div className="flex min-w-max gap-1 rounded-md border bg-background p-1">
        {tabItems.map((tab, index) => {
          const tabPath = `/projects/${projectId}/${tab.path}`;
          const isActive =
            location.pathname === tabPath ||
            (tab.path === "overview" && location.pathname === `/projects/${projectId}`);

          return (
            <NavLink
              key={tab.path}
              to={tabPath}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
              role="tab"
              aria-selected={isActive}
              className={({ isActive: navActive }) =>
                cn(
                  "flex items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none transition",
                  navActive || isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
