
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useWorkspaceSettings } from "@/hooks/useWorkspace";
import { useMyProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { 
  Home, 
  Folder, 
  CheckSquare, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  Search, 
  FileText, 
  Clock, 
  Target, 
  Bell, 
  Building2,
  Headphones,
  Shield,
  Activity,
  GitBranch,
  Briefcase,
  Zap,
  Calculator,
  Plug,
  FileCode,
  Smartphone,
  Settings2,
  Gauge
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType;
  description: string;
}

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    description: "Overview and quick access"
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Folder,
    description: "Manage your projects"
  },
  {
    title: "Tasks",
    url: "/dashboard/tasks",
    icon: CheckSquare,
    description: "View and manage tasks"
  },
  {
    title: "Kanban Board",
    url: "/dashboard/board",
    icon: Calendar,
    description: "Visual task management"
  },
  {
    title: "Team",
    url: "/dashboard/team",
    icon: Users,
    description: "Team directory and collaboration"
  },
  {
    title: "Support Tickets",
    url: "/dashboard/tickets",
    icon: Headphones,
    description: "Customer support and ticketing"
  },
  {
    title: "Workflows",
    url: "/dashboard/workflows",
    icon: GitBranch,
    description: "Custom workflows and handoffs"
  },
  {
    title: "Automation",
    url: "/dashboard/automation",
    icon: Zap,
    description: "Automation rules and triggers"
  },
  {
    title: "Planning",
    url: "/dashboard/planning",
    icon: Calculator,
    description: "Estimation, prioritization, and capacity planning"
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: Plug,
    description: "GitHub, Slack, Calendar, and more"
  },
  {
    title: "Documents",
    url: "/dashboard/documents",
    icon: FileCode,
    description: "Templates and saved filters"
  },
  {
    title: "Portfolio",
    url: "/dashboard/portfolio",
    icon: Briefcase,
    description: "Portfolio and initiative planning"
  },
  {
    title: "Operations",
    url: "/dashboard/operations",
    icon: Activity,
    description: "Incidents, changes, and service ownership"
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    description: "Analytics and insights"
  },
  {
    title: "Time Analytics",
    url: "/dashboard/analytics",
    icon: Clock,
    description: "Track time and productivity"
  },
  {
    title: "Advanced Analytics",
    url: "/dashboard/advanced-analytics",
    icon: BarChart3,
    description: "Advanced analytics and reporting"
  },
  {
    title: "Roadmap",
    url: "/dashboard/roadmap",
    icon: Target,
    description: "Project roadmaps and planning"
  },
  {
    title: "Templates",
    url: "/dashboard/templates",
    icon: FileText,
    description: "Project templates"
  },
  {
    title: "Notifications",
    url: "/dashboard/notifications",
    icon: Bell,
    description: "Updates and alerts"
  },
  {
    title: "Mobile",
    url: "/dashboard/mobile",
    icon: Smartphone,
    description: "Mobile inbox and approvals"
  },
  {
    title: "Search",
    url: "/dashboard/search",
    icon: Search,
    description: "Find anything quickly"
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    description: "Configure your preferences"
  }
];


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: workspaceSettings } = useWorkspaceSettings();
  const { data: profile } = useMyProfile();
  const location = useLocation();

  const brandName =
    workspaceSettings?.brand_name?.trim() || workspaceSettings?.name?.trim() || "OutPaged";
  const brandLogo = workspaceSettings?.brand_logo_url ?? null;
  const brandSubtitle = workspaceSettings?.brand_name ? "Workspace" : "Project Management";

  const profileName = profile?.full_name?.trim() || user?.email || "User";
  const profileAvatar = profile?.avatar_url ?? undefined;

  // Add enterprise navigation for admins
  const enterpriseItems = isAdmin ? [
    {
      title: "Admin Center",
      url: "/dashboard/admin",
      icon: Settings2,
      description: "Comprehensive admin console and governance"
    },
    {
      title: "Performance",
      url: "/dashboard/performance",
      icon: Gauge,
      description: "Performance monitoring and optimization"
    },
    {
      title: "QA & Testing",
      url: "/dashboard/qa",
      icon: CheckSquare,
      description: "Quality assurance and testing dashboard"
    },
    {
      title: "Enterprise Control",
      url: "/dashboard/enterprise",
      icon: Building2,
      description: "Enterprise management and analytics"
    },
    {
      title: "Security & Compliance",
      url: "/dashboard/security",
      icon: Shield,
      description: "Security policies, audit logs, and compliance"
    }
  ] : [];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex items-center gap-2">
                  {brandLogo ? (
                    <img
                      src={brandLogo}
                      alt={`${brandName} logo`}
                      className="size-8 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {brandName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{brandName}</span>
                    <span className="truncate text-xs text-muted-foreground">{brandSubtitle}</span>
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navigationItems.map((item) => {
              const normalizedUrl = item.url.replace(/\/+$/, "");
              const isProjects = normalizedUrl === "/projects";
              const isActive = isProjects
                ? location.pathname.startsWith("/projects")
                : location.pathname === normalizedUrl || location.pathname.startsWith(`${normalizedUrl}/`);

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.description} isActive={isActive}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>


        {enterpriseItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Enterprise</SidebarGroupLabel>
            <SidebarMenu>
              {enterpriseItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.description}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={profileName}>
              <Link to="/settings/profile">
                <Avatar className="h-6 w-6">
                  {profileAvatar ? <AvatarImage src={profileAvatar} alt={profileName} /> : null}
                  <AvatarFallback>{profileName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate">{profileName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
