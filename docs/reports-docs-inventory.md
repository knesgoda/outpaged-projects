# Reports & Docs Inventory

## Reports
- `src/pages/reports/ReportsHome.tsx`
- `src/pages/reports/ReportCreate.tsx`
- `src/pages/reports/ReportDetail.tsx`
- `src/pages/reports/ReportEdit.tsx`
- `src/hooks/useReports.ts`
- `src/services/reports.ts`
- `supabase/migrations/20251005060000_add_reports.sql`

### Related legacy or auxiliary files
- `src/pages/Reports.tsx`
- `src/pages/ia/ReportsPage.tsx`
- `src/components/analytics/ReportsGenerator.tsx`
- `src/components/analytics/ReportScheduler.tsx`
- `src/pages/ia/projects/ProjectReportsPage.tsx`

## Docs & Wiki
- `src/pages/docs/DocsHome.tsx`
- `src/pages/docs/DocCreate.tsx`
- `src/pages/docs/DocDetail.tsx`
- `src/pages/docs/DocEdit.tsx`
- `src/pages/projects/ProjectDocsHome.tsx`
- `src/pages/projects/ProjectDocCreate.tsx`
- `src/pages/projects/ProjectDocDetail.tsx`
- `src/pages/projects/ProjectDocEdit.tsx`
- `src/components/docs/DocTree.tsx`
- `src/components/docs/DocToolbar.tsx`
- `src/components/docs/MarkdownEditor.tsx`
- `src/components/docs/VersionHistory.tsx`
- `src/hooks/useDocs.ts`
- `src/services/docs.ts`
- `src/services/storage.ts`
- `supabase/migrations/20251005060010_add_docs.sql`
- `supabase/migrations/20251005060020_add_docs_bucket.sql`

### Related legacy or auxiliary files
- `src/pages/Documents.tsx`
- `src/pages/ia/DocsPage.tsx`
- `src/components/docs/DocumentTemplates.tsx`
- `src/components/operations/DocsWorkspacePanel.tsx`
- `src/components/documents/DocumentManager.tsx`
- `src/components/documents/DocumentTemplateSelector.tsx`
- `src/components/knowledge/WikiKnowledgeBase.tsx`
- `src/pages/ia/projects/ProjectDocsPage.tsx`

## Routes
- `/reports`, `/reports/new`, `/reports/:reportId`, `/reports/:reportId/edit`
- `/docs`, `/docs/new`, `/docs/:docId`, `/docs/:docId/edit`
- `/projects/:projectId/docs`, `/projects/:projectId/docs/new`, `/projects/:projectId/docs/:docId`, `/projects/:projectId/docs/:docId/edit`

## Notes
- Sidebar highlights `/reports` and `/docs` and stays active inside project-scoped docs routes.
- Breadcrumbs resolve report names, doc titles, and project names where available.
- Supabase services power CRUD operations plus report execution and doc version history.
