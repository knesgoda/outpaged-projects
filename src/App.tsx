
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthRedirect } from "./components/AuthRedirect";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Profile from "./pages/Profile";
import Tasks from "./pages/Tasks";
import KanbanBoard from "./pages/KanbanBoard";
import TeamDirectory from "./pages/TeamDirectory";
import TeamMemberProfile from "./pages/TeamMemberProfile";
import Backlog from "./pages/Backlog";
import SprintPlanning from "./pages/SprintPlanning";
import Roadmap from "./pages/Roadmap";
import Notifications from "./pages/Notifications";
import TimeAnalytics from "./pages/TimeAnalytics";
import Reports from "./pages/Reports";
import ProjectTemplates from "./pages/ProjectTemplates";
import Settings from "./pages/Settings";
import ProjectSettings from "./pages/ProjectSettings";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              <Route path="projects/:projectId" element={<ProjectDetails />} />
              <Route path="projects/:projectId/settings" element={<ProjectSettings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="board" element={<KanbanBoard />} />
              <Route path="backlog" element={<Backlog />} />
              <Route path="sprints" element={<SprintPlanning />} />
              <Route path="roadmap" element={<Roadmap />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="analytics" element={<TimeAnalytics />} />
              <Route path="reports" element={<Reports />} />
              <Route path="templates" element={<ProjectTemplates />} />
              <Route path="search" element={<Search />} />
              <Route path="settings" element={<Settings />} />
              <Route path="team" element={<TeamDirectory />} />
              <Route path="team/:memberId" element={<TeamMemberProfile />} />
            </Route>
            
            {/* Default route - redirect based on auth status */}
            <Route path="/" element={<AuthRedirect />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
