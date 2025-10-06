# Files and Integrations Inventory

## Files-related entries
- src/components/ui/file-upload.tsx
- src/hooks/useFiles.ts
- src/pages/files/FilesPage.tsx
- src/pages/ia/FilesPage.tsx
- src/pages/projects/ProjectFilesPage.tsx
- src/pages/ia/projects/ProjectFilesPage.tsx
- src/services/files.ts
- src/services/storage.ts

## Integrations-related entries
- src/components/integrations/FigmaIntegration.tsx
- src/components/integrations/GitHubIntegration.tsx
- src/components/integrations/GitHubIntegrationEnhanced.tsx
- src/components/integrations/GoogleCalendarIntegration.tsx
- src/components/integrations/SlackIntegrationEnhanced.tsx
- src/components/integrations/WebhookManager.tsx
- src/hooks/useIntegrations.ts
- src/pages/Integrations.tsx
- src/pages/integrations/IntegrationsPage.tsx
- src/pages/ia/IntegrationsPage.tsx
- src/pages/projects/ProjectIntegrationsPage.tsx
- src/pages/ia/projects/ProjectIntegrationsPage.tsx
- src/services/integrations.ts

## Routes discovered
- /files (src/routes.tsx → FilesPage via src/pages/ia/FilesPage.tsx)
- /projects/:projectId/files (src/routes.tsx → ProjectFilesPage via src/pages/ia/projects/ProjectFilesPage.tsx)
- /integrations (src/routes.tsx → IntegrationsPage via src/pages/ia/IntegrationsPage.tsx)
- /projects/:projectId/integrations (src/routes.tsx → ProjectIntegrationsPage via src/pages/ia/projects/ProjectIntegrationsPage.tsx)

## Observations
- ProjectFilesPage and ProjectIntegrationsPage now rely on the canonical `:projectId` param provided by `useProjectId()` and the updated routes.
- src/pages/Integrations.tsx renders a legacy tabbed experience that is not referenced by the current router.
- Existing Files and Integrations pages already load data through Supabase-backed hooks; no missing imports were encountered during this review.
