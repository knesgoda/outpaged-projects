import { useEffect, useRef } from "react";
import { enableDomainAllowlist } from "@/lib/featureFlags";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useRequireOutpagedDomain() {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (!enableDomainAllowlist) {
      hasNotifiedRef.current = false;
      return;
    }
    if (!user?.email) {
      hasNotifiedRef.current = false;
      return;
    }
    if (hasNotifiedRef.current) return;

    if (!user.email.toLowerCase().endsWith("@outpaged.com")) {
      hasNotifiedRef.current = true;
      supabase.auth.signOut().finally(() => {
        toast({
          variant: "destructive",
          title: "Access restricted",
          description: "This environment is limited to @outpaged.com accounts.",
        });
      });
    }
  }, [user, toast]);
}
