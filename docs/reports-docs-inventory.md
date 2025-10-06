# Reports & Docs Inventory

## Existing Files

### Reports
- `src/pages/Reports.tsx`
- `src/pages/ia/ReportsPage.tsx`
- `src/components/analytics/ReportsGenerator.tsx`
- `src/components/analytics/ReportScheduler.tsx`

### Docs & Wiki
- `src/pages/Documents.tsx`
- `src/pages/ia/DocsPage.tsx`
- `src/components/docs/DocumentTemplates.tsx`
- `src/components/operations/DocsWorkspacePanel.tsx`
- `src/components/documents/DocumentManager.tsx`
- `src/components/documents/DocumentTemplateSelector.tsx`
- `src/components/knowledge/WikiKnowledgeBase.tsx`

## Routes
- `/reports` → `src/pages/ia/ReportsPage.tsx`
- `/docs` → `src/pages/ia/DocsPage.tsx`
- `/projects/:id/reports` → `src/pages/ia/projects/ProjectReportsPage.tsx`
- `/projects/:id/docs` → `src/pages/ia/projects/ProjectDocsPage.tsx`

## Observations
- `ReportsPage`, `DocsPage`, `ProjectReportsPage`, and `ProjectDocsPage` are placeholders using shared templates.
- Legacy `src/pages/Reports.tsx` and `src/pages/Documents.tsx` are not wired into the router.
- No dedicated services, hooks, or Supabase tables for reports or docs exist yet.
