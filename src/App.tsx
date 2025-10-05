
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProfileProvider } from "./state/profile";
import { SecurityProvider } from "./components/security/SecurityProvider";
import { AccessibilityProvider } from "./components/accessibility/AccessibilityProvider";
import { OperationsProvider } from "./components/operations/OperationsProvider";
import { CommandPalette } from "./components/advanced-ux/CommandPalette";
import { KeyboardShortcuts } from "./components/advanced-ux/KeyboardShortcuts";
import { OutpagedThemeProvider } from "./components/theme/OutpagedThemeProvider";
import { SlackProvider } from "./components/integrations/SlackProvider";
import { ReleaseProvider } from "./components/releases/ReleaseProvider";
import { MarketingProvider } from "./components/marketing/MarketingProvider";
import { AppRoutes } from "./routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408 (timeout)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
          return false;
        }
        return failureCount < 3;
      }
    }
  }
});

const App = () => (
  <OutpagedThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <SecurityProvider>
            <AccessibilityProvider>
              <SlackProvider>
                <ReleaseProvider>
                  <OperationsProvider>
                    <MarketingProvider>
                      <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <BrowserRouter>
                          <CommandPalette />
                          <KeyboardShortcuts />
                          <AppRoutes />
                        </BrowserRouter>
                      </TooltipProvider>
                    </MarketingProvider>
                  </OperationsProvider>
                </ReleaseProvider>
              </SlackProvider>
            </AccessibilityProvider>
          </SecurityProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  </OutpagedThemeProvider>
);

export default App;
