import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { enableGoogleSSO } from "@/lib/featureFlags";

const getRedirectUrl = (next?: string | null) => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const url = new URL("/auth/callback", window.location.origin);
  if (next && next.startsWith("/")) {
    url.searchParams.set("next", next);
  }
  return url.toString();
};

export default function Login() {
  const location = useLocation();
  const reason = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("reason");
  }, [location.search]);
  const next = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("next");
  }, [location.search]);

  const notice = useMemo(() => {
    if (reason === "signin") {
      return "Please sign in to continue.";
    }
    if (reason === "domain") {
      return "Only @outpaged.com accounts are allowed.";
    }
    return null;
  }, [reason]);

  const handleGoogleSignIn = async () => {
    console.log("Supabase configured:", supabaseConfigured);
    console.log("Environment variables:", {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
    });
    
    if (!supabaseConfigured) {
      console.error("Supabase is not configured properly");
      return;
    }
    
    try {
      console.log("Attempting Google sign in...");
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectUrl(next),
          queryParams: { prompt: "select_account" },
        },
      });
      console.log("Sign in result:", result);
    } catch (error) {
      console.error("Google sign-in failed", error);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-2xl font-bold text-neutral-900">OutPaged</span>
          <p className="text-sm text-neutral-500">Use your outpaged.com Google account</p>
        </div>

        {notice && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {notice}
          </div>
        )}

        {enableGoogleSSO ? (
          <>
            <button
              onClick={handleGoogleSignIn}
              className="flex h-11 w-full items-center justify-center rounded-md bg-[#0B3D91] text-sm font-medium text-white transition hover:bg-[#0A367F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3D91]/50 focus-visible:ring-offset-2"
              disabled={!supabaseConfigured}
            >
              Continue with Google
            </button>
            {!supabaseConfigured && (
              <p className="mt-2 text-center text-xs text-amber-600">
                Supabase credentials are not configured for this environment.
              </p>
            )}
          </>
        ) : (
          <div className="mb-2 rounded-md border border-neutral-200 bg-neutral-100 p-3 text-center text-sm text-neutral-600">
            Google sign-in is temporarily unavailable.
          </div>
        )}

        <p className="mt-4 text-center text-xs text-neutral-500">
          Only @outpaged.com accounts are allowed
        </p>
      </div>
    </main>
  );
}
