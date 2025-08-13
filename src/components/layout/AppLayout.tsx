import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 overflow-auto pb-[max(env(safe-area-inset-bottom),theme(spacing.4))] supports-[height:100svh]:min-h-[calc(100svh-4rem)]">
            <Outlet />
          </main>
        </div>
      </div>
      <OnboardingFlow />
    </SidebarProvider>
  );
}