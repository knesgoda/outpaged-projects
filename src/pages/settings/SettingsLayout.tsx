import { Outlet, NavLink, useLocation, Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

const settingsNav = [
  { to: "/settings", label: "Overview", end: true },
  { to: "/settings/profile", label: "Profile" },
  { to: "/settings/account", label: "Account" },
  { to: "/settings/security", label: "Security" },
  { to: "/settings/notifications", label: "Notifications" },
  { to: "/settings/appearance", label: "Appearance" },
  { to: "/settings/connections", label: "Connections" },
];

export function SettingsLayout() {
  const location = useLocation();

  const current = useMemo(() => {
    return settingsNav.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    );
  }, [location.pathname]);

  const title = current && current.label !== "Overview" ? `Settings · ${current.label}` : "Settings";

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="space-y-2">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/settings" className="hover:text-foreground">
                Settings
              </Link>
            </li>
            {current && current.label !== "Overview" && (
              <>
                <span className="text-muted-foreground">/</span>
                <li aria-current="page" className="text-foreground">
                  {current.label}
                </li>
              </>
            )}
          </ol>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage how Outpaged works for you.</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav className="lg:w-48">
          <ul className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {settingsNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors lg:justify-start",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
