# Settings and Admin Inventory

## Settings-related files
- `src/pages/settings/SettingsLayout.tsx`
- `src/pages/settings/SettingsHome.tsx`
- `src/pages/settings/ProfileSettings.tsx`
- `src/pages/settings/AccountSettings.tsx`
- `src/pages/settings/SecuritySettings.tsx`
- `src/pages/settings/NotificationSettings.tsx`
- `src/pages/settings/AppearanceSettings.tsx`
- `src/pages/settings/ConnectionsSettings.tsx`
- `src/services/profile.ts`
- `src/services/settings.ts`
- `src/hooks/useProfile.ts`
- `src/hooks/useWorkspace.ts`

## Profile-related files
- `src/pages/Profile.tsx`
- `src/pages/settings/ProfileSettings.tsx`
- `src/pages/TeamMemberProfile.tsx`
- `src/hooks/useProfile.ts`
- `src/components/team/EditProfileDialog.tsx`

## Admin-related files
- `src/pages/admin/AdminLayout.tsx`
- `src/pages/admin/AdminHome.tsx`
- `src/pages/admin/WorkspaceSettings.tsx`
- `src/pages/admin/MembersPage.tsx`
- `src/pages/admin/PermissionsPage.tsx`
- `src/pages/admin/SecurityPage.tsx`
- `src/pages/admin/AuditLogsPage.tsx`
- `src/pages/admin/DataPage.tsx`
- `src/pages/admin/WebhooksPage.tsx`
- `src/pages/admin/ApiExplorerPage.tsx`
- `src/pages/admin/BillingPage.tsx`
- `src/pages/AdminWorkspaces.tsx`
- `src/pages/AdminCenter.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `src/components/security/AdminGuard.tsx`

## Existing routes (`src/routes.tsx`)
Relevant routes currently include:
- `/settings` with nested `profile`, `account`, `security`, `notifications`, `appearance`, `connections`
- `/profile`
- `/admin` with nested `workspace`, `members`, `permissions`, `security`, `audit`, `data`, `webhooks`, `api`, `billing`

## Known navigation gaps
- `src/components/layout/AppSidebar.tsx` still links to `/dashboard/*` paths that are not defined in the router.
- `src/lib/navConfig.tsx` does not expose the `/settings` routes through the primary navigation or user menu.

## Broken imports or stubs
- `src/lib/auth.ts` returns a hard-coded mock user instead of reading the Supabase session.
- `src/hooks/useIsAdmin.tsx` depends on `getRoleForUser` from `src/lib/roles.ts`, which reads a `role` column that does not exist in the planned workspace membership schema.
- Admin service files for audit logs, API tokens, and webhooks are not implemented yet despite pages referencing those data sets.
