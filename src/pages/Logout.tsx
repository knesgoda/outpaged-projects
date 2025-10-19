import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Logout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const performSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({
          title: "Unable to sign out",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          navigate("/login", { replace: true });
        }
      }
    };

    void performSignOut();

    return () => {
      isMounted = false;
    };
  }, [navigate, signOut, toast]);

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 px-4 py-12">
      <div className="rounded-xl border bg-card px-6 py-8 text-center shadow-lg">
        <p className="text-sm font-medium text-neutral-600">Signing you out…</p>
      </div>
    </div>
  );
}
