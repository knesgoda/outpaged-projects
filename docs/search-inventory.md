# Search & Command Palette Inventory (2025-10-05)

## Existing search/palette code
- `src/components/advanced-ux/CommandPalette.tsx` – legacy command palette UI (not wired into providers) with static actions.
- `src/components/command/CommandPalette.tsx`, `CommandKProvider.tsx`, `useCommandK.ts` – new command palette implementation with search + actions.
- `src/components/ui/command.tsx` – UI primitives (Radix-based) used across app.
- `src/components/search/*` – legacy advanced search components (dialog, search bar).
- `src/pages/search/GlobalSearchPage.tsx`, `SearchResultItem.tsx` – new global search page with filters.
- `src/pages/Search.tsx` – older search page (appears unused; confirm routing).
- `src/hooks/useAdvancedSearch.tsx` – local storage driven search state hook.
- `src/features/search/__tests__/search-flow.test.tsx` – palette/search smoke tests.
- `src/services/search.ts` – unified Supabase-backed search queries.
- `src/services/savedSearches.ts` – saved search helpers.

## Entities indexed / related models
- Tasks: multiple components/pages (`src/pages/Tasks.tsx`, kanban components, etc.).
- Projects: numerous pages under `src/pages/ia/projects/*` and `src/pages/Projects.tsx`.
- Docs: `doc_pages` features in `src/pages/Documents.tsx`, `src/components/docs/*`.
- Files: `project_files` references in `src/pages/ia/projects/ProjectFilesPage.tsx` and `src/hooks/useFileUpload.tsx`.
- Comments: `src/components/comments/*`, `src/components/comments/CommentsSystem.tsx` using `comments` table.
- Profiles/People: `src/pages/TeamDirectory.tsx`, `src/pages/TeamMemberProfile.tsx`, `src/state/profile.tsx`.
- Legacy wiki references: `src/components/knowledge/WikiKnowledgeBase.tsx` (no direct Supabase integration noted).

## Navigation / routing touchpoints
- `src/App.tsx` – wraps router provider.
- `src/routes.tsx` – defines route tree including `/search` pointing to `GlobalSearchPage`.
- Layout: `src/components/layout/AppLayout.tsx`, `Topbar.tsx`, `AppSidebar.tsx`, `Sidebar.tsx`.
- Additional layout entry points: `src/layouts/AppShell.tsx`, `src/components/layout/AppHeader.tsx`.

## Services and hooks
- Supabase services directory already includes `search.ts` and `savedSearches.ts`.
- Hooks include domain-specific logic (`useProjectNavigation`, `useTaskRelationships`, etc.) but no dedicated search hook besides `useAdvancedSearch` (local state).

## Supabase migrations referencing search/full-text
- Recent migrations `20251005060000_search_tasks.sql` through `20251005060050_search_profiles.sql` implement tsvector columns/triggers.
- `20251005060060_saved_searches.sql` introduces saved searches table with RLS.
- Older migrations mainly adjust function search_path; no prior full-text indexes detected.

## Gaps / TODO surfaced during inventory
- Duplicate search UIs (`src/pages/Search.tsx` vs new `GlobalSearchPage.tsx`); need consolidation.
- Radix `Select` warning noted in tests (`project` filter default empty string).
- App layout tests failing due to missing providers (`useProfile` dependency) when Topbar renders palette button.
- Confirm routing removes references to legacy `Search` page to avoid dead links.
