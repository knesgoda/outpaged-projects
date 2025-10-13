import { useEffect } from "react";
import { Download } from "lucide-react";
import { usePWA, useServiceWorker } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { isInstallable, promptInstall } = usePWA();
  const { updateAvailable, update } = useServiceWorker();
  const { toast } = useToast();

  useEffect(() => {
    if (updateAvailable) {
      toast({
        title: "Update available",
        description: "A new version of OutPaged is ready",
        action: (
          <Button size="sm" onClick={update}>
            Update
          </Button>
        ),
        duration: Infinity,
      });
    }
  }, [updateAvailable, update, toast]);

  useEffect(() => {
    if (isInstallable) {
      // Show install prompt after 30 seconds
      const timer = setTimeout(() => {
        toast({
          title: "Install OutPaged",
          description: "Get the full experience with our PWA",
          action: (
            <Button
              size="sm"
              onClick={async () => {
                const outcome = await promptInstall();
                if (outcome === "accepted") {
                  toast({ title: "Thanks for installing!" });
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Install
            </Button>
          ),
          duration: 10000,
        });
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, promptInstall, toast]);

  return <>{children}</>;
}
