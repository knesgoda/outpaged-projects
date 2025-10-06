import { ReactNode } from "react";
import {
  Archive,
  BadgeCheck,
  BarChart3,
  BookText,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock3,
  CreditCard,
  Files,
  FolderGit2,
  GaugeCircle,
  HelpCircle,
  Inbox,
  Layers3,
  LayoutDashboard,
  LineChart,
  ListChecks,
  ListTodo,
  Network,
  PieChart,
  Settings,
  Share2,
  SquareStack,
  Target,
  Users,
  Workflow,
  ShieldCheck,
} from "lucide-react";

import { FEATURE_FLAGS } from "./featureFlags";
import { Role } from "./auth";

export type BadgeKey = "inboxCount" | "myWorkCount";

export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon?: ReactNode;
  roles?: Role[];
  featureFlag?: keyof typeof FEATURE_FLAGS;
  badgeKey?: BadgeKey;
  matchPaths?: string[];
  children?: NavItem[];
};

const ALL_ROLES: Role[] = ["owner", "admin", "manager", "member", "billing", "viewer"];
const COLLAB_ROLES: Role[] = ["owner", "admin", "manager", "member"];
const LEADERSHIP_ROLES: Role[] = ["owner", "admin", "manager"];

export const NAV: NavItem[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
  },
  {
    id: "my-work",
    label: "My Work",
    path: "/my-work",
    icon: <ListTodo className="h-5 w-5" aria-hidden="true" />,
    roles: COLLAB_ROLES,
    badgeKey: "myWorkCount",
  },
  {
    id: "inbox",
    label: "Inbox",
    path: "/inbox",
    icon: <Inbox className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
    badgeKey: "inboxCount",
  },
  {
    id: "projects",
    label: "Projects",
    path: "/projects",
    icon: <Briefcase className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
  },
  {
    id: "boards",
    label: "Boards",
    path: "/boards",
    icon: <Layers3 className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
  },
  {
    id: "calendar",
    label: "Calendar",
    path: "/calendar",
    icon: <CalendarDays className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
  },
  {
    id: "timeline",
    label: "Timeline",
    path: "/timeline",
    icon: <LineChart className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
  },
  {
    id: "workload",
    label: "Workload",
    path: "/workload",
    icon: <GaugeCircle className="h-5 w-5" aria-hidden="true" />,
    roles: LEADERSHIP_ROLES,
  },
  {
    id: "dashboards",
    label: "Dashboards",
    path: "/dashboards",
    icon: <PieChart className="h-5 w-5" aria-hidden="true" />,
    roles: LEADERSHIP_ROLES,
    featureFlag: "dashboards",
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports",
    icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
    matchPaths: [
      "/reports/new",
      "/reports/:reportId",
      "/reports/:reportId/edit",
      "/projects/:projectId/reports",
    ],
  },
  {
    id: "docs",
    label: "Docs & Wiki",
    path: "/docs",
    icon: <BookText className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
  },
  {
    id: "files",
    label: "Files",
    path: "/files",
    icon: <Files className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
    matchPaths: ["/projects/:projectId/files"],
  },
  {
    id: "automations",
    label: "Automations",
    path: "/automations",
    icon: <Workflow className="h-5 w-5" aria-hidden="true" />,
    roles: LEADERSHIP_ROLES,
    featureFlag: "automations",
    matchPaths: ["/automations/:automationId", "/projects/:projectId/automations"],
  },
  {
    id: "integrations",
    label: "Integrations",
    path: "/integrations",
    icon: <Share2 className="h-5 w-5" aria-hidden="true" />,
    roles: LEADERSHIP_ROLES,
    featureFlag: "integrations",
    matchPaths: ["/projects/:projectId/integrations"],
  },
  {
    id: "forms",
    label: "Forms",
    path: "/forms",
    icon: <ClipboardList className="h-5 w-5" aria-hidden="true" />,
    roles: LEADERSHIP_ROLES,
    featureFlag: "forms",
  },
  {
    id: "goals",
    label: "Goals & OKRs",
    path: "/goals",
    icon: <Target className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
    featureFlag: "goals",
  },
  {
    id: "templates",
    label: "Templates",
    path: "/templates",
    icon: <SquareStack className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
  },
  {
    id: "people",
    label: "People & Teams",
    path: "/people",
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
    roles: LEADERSHIP_ROLES,
    featureFlag: "peopleTeams",
    matchPaths: [
      "/people/:userId",
      "/teams",
      "/teams/:teamId",
      "/projects/:projectId/people",
      "/projects/:projectId/teams",
    ],
  },
  {
    id: "time",
    label: "Time Tracking",
    path: "/time",
    icon: <Clock3 className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
    featureFlag: "timeTracking",
    matchPaths: [
      "/time/my",
      "/time/approvals",
      "/projects/:projectId/time",
    ],
  },
  {
    id: "admin",
    label: "Admin",
    path: "/admin",
    icon: <Settings className="h-5 w-5" aria-hidden="true" />,
    roles: ["owner", "admin"],
    children: [
      {
        id: "admin-workspace",
        label: "Workspace",
        path: "/admin/workspace",
        icon: <Building2 className="h-4 w-4" aria-hidden="true" />,
        roles: ["owner", "admin"],
      },
      {
        id: "admin-members",
        label: "Members",
        path: "/admin/members",
        icon: <Users className="h-4 w-4" aria-hidden="true" />,
        roles: ["owner", "admin"],
      },
      {
        id: "admin-permissions",
        label: "Permissions & Roles",
        path: "/admin/permissions",
        icon: <BadgeCheck className="h-4 w-4" aria-hidden="true" />,
        roles: ["owner", "admin"],
      },
      {
        id: "admin-security",
        label: "Security",
        path: "/admin/security",
        icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
        roles: ["owner", "admin"],
      },
      {
        id: "admin-audit",
        label: "Audit Logs",
        path: "/admin/audit",
        icon: <ListChecks className="h-4 w-4" aria-hidden="true" />,
        roles: ["owner", "admin"],
      },
      {
        id: "admin-data",
        label: "Data & Backups",
        path: "/admin/data",
        icon: <Archive className="h-4 w-4" aria-hidden="true" />,
        roles: ["owner", "admin"],
      },
      {
        id: "admin-webhooks",
        label: "Webhooks",
        path: "/admin/webhooks",
        icon: <Network className="h-4 w-4" aria-hidden="true" />,
        roles: ["admin"],
      },
      {
        id: "admin-api",
        label: "API Explorer",
        path: "/admin/api",
        icon: <FolderGit2 className="h-4 w-4" aria-hidden="true" />,
        roles: ["admin"],
        featureFlag: "apiExplorer",
      },
      {
        id: "admin-billing",
        label: "Billing & Plans",
        path: "/admin/billing",
        icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
        roles: ["admin"],
      },
    ],
  },
  {
    id: "help",
    label: "Help",
    path: "/help",
    icon: <HelpCircle className="h-5 w-5" aria-hidden="true" />,
    roles: ALL_ROLES,
  },
];

// TODO: Add favorites and pinning support once requirements are defined.

function filterItems(items: NavItem[], role: Role): NavItem[] {
  return items
    .map((item) => {
      if (item.roles && !item.roles.includes(role)) {
        return null;
      }
      if (item.featureFlag && !FEATURE_FLAGS[item.featureFlag]) {
        return null;
      }
      const children = item.children ? filterItems(item.children, role) : undefined;
      if (children && children.length === 0 && item.children) {
        return null;
      }
      return { ...item, children };
    })
    .filter((item): item is NavItem => Boolean(item));
}

export function getNavForRole(role: Role) {
  return filterItems(NAV, role);
}
