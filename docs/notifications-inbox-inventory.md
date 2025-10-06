# Notifications & Inbox Inventory

## Existing Entry Points
- `src/pages/inbox/InboxPage.tsx`
- `src/components/mobile/MobileInbox.tsx`
- `src/pages/Notifications.tsx`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/AdvancedNotificationCenter.tsx`
- `src/hooks/useNotifications.tsx`
- `src/hooks/useNotificationPrefs.ts`
- `src/hooks/useSubscriptions.ts`
- `src/services/notifications.ts`
- `src/services/notificationPrefs.ts`
- `src/services/subscriptions.ts`
- `src/pages/settings/NotificationSettings.tsx`
- Routes wired in `src/routes.tsx`

## Producers Located
- Mentions & comment replies inside `src/components/comments/CommentsSystemWithMentions.tsx` (creates `mention` and `comment_reply` notifications + sends emails via edge functions when enabled).
- Task assignments handled in `src/hooks/useTaskAssignees.tsx` (fires `assigned` notifications and invokes email function).
- Bulk task status updates in `src/components/kanban/BulkTaskOperations.tsx` (publishes `status_change` notifications to followers).

### Gaps
- No producers yet for `due_soon`, `automation`, `file_shared`, or `doc_comment` types.
- Following tab relies on subscriptions but only bulk status updates feed it today.

## Notable Integration Stubs / Breakages
- `src/integrations/supabase/client.ts` guards `import.meta.env` access yet Jest still errors unless the module is mocked; tests currently mock a partial client per suite.
- Inbox page references `filteredNotifications` before it is declared, causing runtime failures in tests.
- `src/__tests__/notifications.test.tsx` mocks Supabase and hooks but fails until the Inbox bug is fixed.
