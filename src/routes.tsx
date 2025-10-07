import { Suspense, type ReactNode } from "react";
import { Navigate, useRoutes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { InboxPage, type InboxTab } from "@/pages/inbox/InboxPage";
import HomePage from "@/pages/ia/HomePage";
import MyWorkPage from "@/pages/ia/MyWorkPage";
import Projects from "@/pages/Projects";
import ProjectDetails from "@/pages/ProjectDetails";
import TasksPage from "@/pages/Tasks";
import ReportsPage from "@/pages/Reports";
import DocumentsPage from "@/pages/Documents";
import FilesPage from "@/pages/files/FilesPage";
import NotificationsPage from "@/pages/Notifications";
import ProfilePage from "@/pages/Profile";
import TeamDirectoryPage from "@/pages/TeamDirectory";
import TeamMemberProfilePage from "@/pages/TeamMemberProfile";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import NotAuthorizedPage from "@/pages/NotAuthorized";
import NotFound from "@/pages/NotFound";

function InboxRoute({ tab }: { tab: InboxTab }) {
  return <InboxPage tab={tab} />;
}

function withAppLayout(element: ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
        {element}
      </Suspense>
    </ErrorBoundary>
  );
}

export function AppRoutes() {
  return useRoutes([
    {
      path: "/",
      element: withAppLayout(<AppLayout />),
      children: [
        { index: true, element: <HomePage /> },
        { path: "my-work", element: <MyWorkPage /> },
        { path: "inbox", element: <InboxRoute tab="all" /> },
        { path: "inbox/mentions", element: <InboxRoute tab="mentions" /> },
        { path: "inbox/assigned", element: <InboxRoute tab="assigned" /> },
        { path: "inbox/following", element: <InboxRoute tab="following" /> },
        { path: "inbox/due-soon", element: <InboxRoute tab="due-soon" /> },
        { path: "inbox/unread", element: <InboxRoute tab="unread" /> },
        { path: "projects", element: <Projects /> },
        { path: "projects/:projectId", element: <ProjectDetails /> },
        { path: "tasks", element: <TasksPage /> },
        { path: "reports", element: <ReportsPage /> },
        { path: "documents", element: <DocumentsPage /> },
        { path: "files", element: <FilesPage /> },
        { path: "notifications", element: <NotificationsPage /> },
        { path: "profile", element: <ProfilePage /> },
        { path: "team", element: <TeamDirectoryPage /> },
        { path: "team/:memberId", element: <TeamMemberProfilePage /> },
      ],
    },
    { path: "/login", element: <Login /> },
    { path: "/auth/callback", element: <AuthCallback /> },
    { path: "/auth", element: <Navigate to="/login" replace /> },
    { path: "/logout", element: <Navigate to="/login" replace /> },
    { path: "/not-authorized", element: <NotAuthorizedPage /> },
    { path: "*", element: <NotFound /> },
  ]);
}
