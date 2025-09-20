import { ReactNode } from "react";
import { Navigate, useLocation, useMatches } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { enableDomainAllowlist } from "@/lib/featureFlags";

const OUTPAGED_DOMAIN = "@outpaged.com";

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const matches = useMatches();
  const location = useLocation();
  const { user, loading } = useAuth();

  const isPublicRoute = matches.some((match) => (match.handle as any)?.public === true);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Checking session…</div>
      </div>
    );
  }

  if (!user) {
    const params = new URLSearchParams();
    params.set("reason", "signin");
    if (location.pathname) {
      params.set("next", `${location.pathname}${location.search}${location.hash}`);
    }
    return <Navigate to={`/login?${params.toString()}`} replace />;
  }

  if (enableDomainAllowlist) {
    const email = user.email?.toLowerCase() ?? "";
    if (!email.endsWith(OUTPAGED_DOMAIN)) {
      return <Navigate to="/login?reason=domain" replace />;
    }
  }

  return <>{children}</>;
}
