# Reports, Files, and Automations Inventory

## Reports-related files
- src/pages/Reports.tsx
- src/pages/ia/ReportsPage.tsx
- src/pages/ia/projects/ProjectReportsPage.tsx
- src/pages/reports/ReportsHome.tsx
- src/pages/reports/ReportCreate.tsx
- src/pages/reports/ReportDetail.tsx
- src/pages/reports/ReportEdit.tsx
- src/hooks/useReports.ts
- src/services/reports.ts
- src/components/analytics/ReportsGenerator.tsx
- src/components/analytics/ReportScheduler.tsx
- src/components/operations/ExecutiveReportingPanel.tsx
- src/components/security/ComplianceReports.tsx

## Files-related files
- src/pages/TeamMemberProfile.tsx
- src/pages/Profile.tsx
- src/pages/ia/FilesPage.tsx
- src/pages/ia/projects/ProjectFilesPage.tsx
- src/pages/files/FilesPage.tsx
- src/pages/projects/ProjectFilesPage.tsx
- src/hooks/useFiles.ts
- src/hooks/useFileUpload.tsx
- src/services/files.ts
- src/services/storage.ts
- src/pages/files/utils.ts
- src/lib/profile.ts
- src/components/team/EditProfileDialog.tsx
- src/components/ui/file-upload.tsx
- src/state/profile.tsx
- src/state/__tests__/profile.test.tsx

## Automations-related files
- src/pages/Automation.tsx
- src/pages/ia/AutomationsPage.tsx
- src/pages/ia/projects/ProjectAutomationsPage.tsx
- src/pages/automations/AutomationsPage.tsx
- src/pages/automations/AutomationDetailPage.tsx
- src/pages/projects/ProjectAutomationsPage.tsx
- src/pages/automations/AutomationForm.tsx
- src/hooks/useAutomation.tsx
- src/hooks/useAutomations.ts
- src/services/automations.ts
- src/components/workflows/HandoffAutomationPanel.tsx
- src/components/automation/AutomationRuleBuilder.tsx
- src/components/automation/AutomationDashboard.tsx

## Current routes
- /reports → src/pages/reports/ReportsHome.tsx
- /reports/new → src/pages/reports/ReportCreate.tsx
- /reports/:reportId → src/pages/reports/ReportDetail.tsx
- /reports/:reportId/edit → src/pages/reports/ReportEdit.tsx
- /files → src/pages/files/FilesPage.tsx
- /projects/:id/files → src/pages/projects/ProjectFilesPage.tsx
- /automations → src/pages/automations/AutomationsPage.tsx
- /automations/new → src/pages/automations/AutomationDetailPage.tsx
- /automations/:automationId → src/pages/automations/AutomationDetailPage.tsx
- /projects/:id/automations → src/pages/projects/ProjectAutomationsPage.tsx

## Observations
- Legacy IA pages (e.g., src/pages/ia/ReportsPage.tsx) still export placeholders that are unused by the main router.
- The active implementations live under src/pages/reports, src/pages/files, and src/pages/automations with Supabase-backed hooks and services.
- No broken imports surfaced during the scan, but the IA placeholder pages remain as stubs that could confuse future contributors.
