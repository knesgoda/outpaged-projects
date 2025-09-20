import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { enableDomainAllowlist } from "@/lib/featureFlags";

const OUTPAGED_DOMAIN = "@outpaged.com";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const finalizeSignIn = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }

        if (error || !data.session) {
          navigate("/login?reason=signin", { replace: true });
          return;
        }

        const email = data.session.user?.email?.toLowerCase() ?? "";
        if (enableDomainAllowlist && !email.endsWith(OUTPAGED_DOMAIN)) {
          navigate("/login?reason=domain", { replace: true });
          return;
        }
        const params = new URLSearchParams(location.search);
        const next = params.get("next");
        const destination = next && next.startsWith("/") ? next : "/";

        navigate(destination, { replace: true });
      } catch (err) {
        console.error("Failed to finalize Supabase session", err);
        if (isMounted) {
          navigate("/login?reason=signin", { replace: true });
        }
      }
    };

    finalizeSignIn();

    return () => {
      isMounted = false;
    };
  }, [navigate, location.search]);

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 px-4 py-12">
      <div className="rounded-xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-lg">
        <p className="text-sm font-medium text-neutral-600">Finalizing sign-in…</p>
      </div>
    </div>
  );
}
