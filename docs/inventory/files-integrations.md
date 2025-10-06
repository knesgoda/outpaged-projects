# Files and Integrations Inventory

## Files-related code
- `src/pages/files/FilesPage.tsx`
- `src/pages/projects/ProjectFilesPage.tsx`
- `src/pages/ia/FilesPage.tsx`
- `src/pages/ia/projects/ProjectFilesPage.tsx`
- `src/services/files.ts`
- `src/services/storage.ts`
- `src/types/files.ts`
- `src/components/ui/file-upload.tsx`

## Integration-related code
- `src/pages/integrations/IntegrationsPage.tsx`
- `src/pages/projects/ProjectIntegrationsPage.tsx`
- `src/pages/integrations/IntegrationsHome.tsx`
- `src/pages/Integrations.tsx`
- `src/pages/ia/IntegrationsPage.tsx`
- `src/pages/integrations/ProjectIntegrationsPage.tsx`
- `src/pages/ia/projects/ProjectIntegrationsPage.tsx`
- `src/services/integrations.ts`
- `src/services/webhooks.ts`
- `src/services/github.ts`
- `src/services/googleDocs.ts`
- `src/services/googleCalendar.ts`
- `src/types/integrations.ts`
- `src/hooks/useIntegrations.ts`

## Routes referencing these areas
- `/files` → `FilesPage` via `src/routes.tsx`
- `/projects/:projectId/files` → `ProjectFilesPage` via `src/routes.tsx`
- `/integrations` → `IntegrationsPage` via `src/routes.tsx`
- `/projects/:projectId/integrations` → `ProjectIntegrationsPage` via `src/routes.tsx`
- Legacy routes in `src/routes.tsx`: `/integrations/google`, `/integrations/github`, `/projects/:projectId/integrations` (duplicate), `/projects/:projectId/integrations/google`, `/projects/:projectId/integrations/github`

## Issues observed
- `src/routes.tsx` declares `<IntegrationsPage />` but does not import it, and still imports deprecated IA integration pages alongside new drafts, leaving duplicate route entries.
- Multiple historical IA pages (e.g., `src/pages/ia/FilesPage.tsx`, `src/pages/ia/IntegrationsPage.tsx`) remain as stubs while new implementations live under `src/pages/files` and `src/pages/integrations`, creating ambiguity.
- `src/routes.tsx` retains raw `codex/...` merge markers and duplicate People/Projects imports that will break builds once the file is touched.
- Untracked drafts (`src/pages/integrations/IntegrationsPage.tsx`, `src/pages/projects/ProjectIntegrationsPage.tsx`) diverge from the currently routed IA variants.
