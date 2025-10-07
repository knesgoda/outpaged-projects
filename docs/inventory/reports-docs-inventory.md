# Reports and Docs inventory

## Reports-related files
- src/services/reports.ts
- src/hooks/useReports.ts
- src/pages/reports/ReportsHome.tsx
- src/pages/reports/ReportCreate.tsx
- src/pages/reports/ReportDetail.tsx
- src/pages/reports/ReportEdit.tsx
- src/pages/ia/projects/ProjectReportsPage.tsx (legacy project-level wrapper)
- src/pages/ia/ReportsPage.tsx (legacy stub)
- src/pages/Reports.tsx (legacy analytics dashboard)
- src/components/analytics/ReportsGenerator.tsx (legacy component)
- src/components/analytics/ReportScheduler.tsx (legacy component)

## Docs & Wiki-related files
- src/services/docs.ts
- src/services/storage.ts (docs image upload helper)
- src/hooks/useDocs.ts
- src/components/docs/DocTree.tsx
- src/components/docs/DocToolbar.tsx
- src/components/docs/MarkdownEditor.tsx
- src/components/docs/VersionHistory.tsx
- src/pages/docs/DocsHome.tsx
- src/pages/docs/DocCreate.tsx
- src/pages/docs/DocDetail.tsx
- src/pages/docs/DocEdit.tsx
- src/pages/projects/ProjectDocsHome.tsx
- src/pages/projects/ProjectDocCreate.tsx
- src/pages/projects/ProjectDocDetail.tsx
- src/pages/projects/ProjectDocEdit.tsx
- src/pages/ia/DocsPage.tsx (legacy wrapper)
- src/pages/ia/projects/ProjectDocsPage.tsx (legacy wrapper)

## Current routes
- Global reports: /reports, /reports/new, /reports/:reportId, /reports/:reportId/edit (src/routes.tsx)
- Project reports: /projects/:projectId/reports (src/routes.tsx)
- Global docs: /docs, /docs/new, /docs/:docId, /docs/:docId/edit (src/routes.tsx)
- Project docs: /projects/:projectId/docs, /projects/:projectId/docs/new, /projects/:projectId/docs/:docId, /projects/:projectId/docs/:docId/edit (src/routes.tsx)

## Observations
- src/routes.tsx includes duplicate default imports for `PeoplePage` and `SearchPage`, which currently break type-checking.
- Legacy pages (src/pages/Reports.tsx, src/pages/ia/ReportsPage.tsx, src/pages/ia/DocsPage.tsx) are still present but unused by the active router.
- ProjectDocDetail renders raw markdown and lacks the restore/version plumbing added to DocDetail.
- DocsHome and ProjectDocsHome preview panes show raw markdown instead of sanitized HTML.
- Docs navigation entry in src/lib/navConfig.tsx does not provide matchPaths for nested project doc routes, so active styling will miss project views.
