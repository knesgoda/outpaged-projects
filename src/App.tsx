
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { SecurityProvider } from "./components/security/SecurityProvider";
import { AccessibilityProvider } from "./components/accessibility/AccessibilityProvider";
import { OperationsProvider } from "./components/operations/OperationsProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthRedirect } from "./components/AuthRedirect";
import { CommandPalette } from "./components/advanced-ux/CommandPalette";
import { KeyboardShortcuts } from "./components/advanced-ux/KeyboardShortcuts";
import { EnterpriseControlPanel } from "./components/enterprise/EnterpriseControlPanel";
import { AdminGuard } from "./components/security/AdminGuard";
import { SecurityDashboard } from "./components/security/SecurityDashboard";
import { ProjectDetailsResolver } from "./components/projects/ProjectDetailsResolver";
import { ProjectSettingsResolver } from "./components/projects/ProjectSettingsResolver";
import { ErrorBoundary } from "./components/ui/error-boundary";
import TaskView from "./pages/TaskView";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Profile from "./pages/Profile";
import Tasks from "./pages/Tasks";
import KanbanBoard from "./pages/KanbanBoard";
import TeamDirectory from "./pages/TeamDirectory";
import { TeamMemberHandler } from "./components/team/TeamMemberHandler";
import Backlog from "./pages/Backlog";
import Tickets from "./pages/Tickets";
import SprintPlanning from "./pages/SprintPlanning";
import Roadmap from "./pages/Roadmap";
import Notifications from "./pages/Notifications";
import TimeAnalytics from "./pages/TimeAnalytics";
import Reports from "./pages/Reports";
import ProjectTemplates from "./pages/ProjectTemplates";
import Settings from "./pages/Settings";
import ProjectSettings from "./pages/ProjectSettings";
import Search from "./pages/Search";
import Automation from "./pages/Automation";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import OperationsCenter from "./pages/OperationsCenter";
import { OutpagedThemeProvider } from "./components/theme/OutpagedThemeProvider";

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
        <SecurityProvider>
          <AccessibilityProvider>
            <OperationsProvider>
              <ErrorBoundary>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <CommandPalette />
                    <KeyboardShortcuts />
                    <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Protected routes with layout */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }>
                  <Route index element={<Dashboard />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:projectId" element={<ProjectDetailsResolver />} />
                  <Route path="projects/:projectId/settings" element={<ProjectSettingsResolver />} />
                  <Route path="projects/code/:code" element={<ProjectDetailsResolver />} />
                  <Route path="projects/code/:code/settings" element={<ProjectSettingsResolver />} />
                  <Route path="projects/code/:code/tasks/:taskNumber" element={<TaskView />} />
                  <Route path="projects/:projectId/tasks/:taskNumber" element={<TaskView />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="board" element={<KanbanBoard />} />
                  <Route path="backlog" element={<Backlog />} />
                  <Route path="sprints" element={<SprintPlanning />} />
                  <Route path="roadmap" element={<Roadmap />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="templates" element={<ProjectTemplates />} />
                  <Route path="automation" element={<Automation />} />
                  <Route path="search" element={<Search />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="team" element={<TeamDirectory />} />
                  <Route path="team/:identifier" element={<TeamMemberHandler />} />
                  <Route path="tickets" element={<Tickets />} />
                  <Route path="security" element={
                    <AdminGuard>
                      <SecurityDashboard />
                    </AdminGuard>
                  } />
                  <Route path="enterprise" element={
                    <AdminGuard>
                      <EnterpriseControlPanel />
                    </AdminGuard>
                  } />
                  <Route path="operations" element={<OperationsCenter />} />
                </Route>
                
                {/* Default route - redirect based on auth status */}
                <Route path="/" element={<AuthRedirect />} />
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ErrorBoundary>
      </OperationsProvider>
    </AccessibilityProvider>
        </SecurityProvider>
      </AuthProvider>
    </QueryClientProvider>
  </OutpagedThemeProvider>
);

export default App;
