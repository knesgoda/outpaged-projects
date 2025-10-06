import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceMember } from "@/types";

export type Role = WorkspaceMember["role"] | "viewer";

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
};

const roleCache = new Map<string, Role | null>();
let cachedUser: CurrentUser | null = null;

function normalizeRole(role: string | null | undefined): Role | null {
  if (!role) {
    return null;
  }

  if (role === "owner" || role === "admin" || role === "manager" || role === "member" || role === "billing") {
    return role;
  }

  return "viewer";
}

export async function getWorkspaceRole(userId: string): Promise<Role | null> {
  if (!userId) {
    return null;
  }

  if (roleCache.has(userId)) {
    return roleCache.get(userId) ?? null;
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "42501" || error.code === "PGRST301") {
      roleCache.set(userId, null);
      throw new Error("You do not have access");
    }

    throw new Error(error.message);
  }

  const normalized = normalizeRole((data as Pick<WorkspaceMember, "role"> | null)?.role);
  roleCache.set(userId, normalized ?? null);
  return normalized ?? null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  const user = data.user;
  if (!user) {
    cachedUser = null;
    return null;
  }

  if (cachedUser && cachedUser.id === user.id) {
    return cachedUser;
  }

  let role: Role = "viewer";
  try {
    const memberRole = await getWorkspaceRole(user.id);
    if (memberRole) {
      role = memberRole;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message !== "You do not have access") {
      console.warn("Failed to determine workspace role", message);
    }
  }

  const currentUser: CurrentUser = {
    id: user.id,
    email: user.email ?? "",
    role,
  };
  cachedUser = currentUser;
  return currentUser;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getWorkspaceRole(userId);
  return role === "owner" || role === "admin";
}

type GuardState = "loading" | "allowed" | "denied";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<GuardState>("loading");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          if (active) setState("denied");
          return;
        }

        const allowed = await isAdmin(user.id);
        if (active) {
          setState(allowed ? "allowed" : "denied");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (active) {
          if (message === "You do not have access") {
            setState("denied");
          } else {
            console.warn("Admin guard error", message);
            setState("denied");
          }
        }
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  }

  if (state === "denied") {
    return <Navigate to="/not-authorized" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export function clearAuthCache() {
  cachedUser = null;
  roleCache.clear();
}
