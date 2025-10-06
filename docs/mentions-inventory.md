# Mentions feature inventory

## Comment UIs
- `src/components/comments/CommentsSystemWithMentions.tsx`
- `src/components/comments/CommentBox.tsx`
- `src/components/comments/CommentList.tsx`
- `src/components/comments/CommentItem.tsx`
- Legacy scaffold: `src/components/comments/CommentsSystem.tsx`

## Document editors/renderers
- `src/components/documents/AdvancedDocumentEditor.tsx`
- `src/components/documents/DocumentManager.tsx`
- `src/components/documents/DocumentTemplateSelector.tsx`
- `src/pages/Documents.tsx`
- `src/pages/ia/DocsPage.tsx`
- `src/components/operations/DocsWorkspacePanel.tsx`

## Profiles / people related
- `src/services/people.ts`
- `src/pages/Profile.tsx`
- `src/pages/TeamMemberProfile.tsx`
- `src/components/team/EditProfileDialog.tsx`

## Mention-related stubs
- `src/components/mentions/MentionInput.tsx`
- `src/components/comments/CommentsSystemWithMentions.tsx`
- `src/components/comments/MentionAutocomplete.tsx`

## Current comment entry points
- Task comments embedded in `src/components/kanban/TaskDialog.tsx`
- Project comments embedded in `src/pages/ProjectDetails.tsx`
- Document comments embedded in `src/components/documents/AdvancedDocumentEditor.tsx`

## Issues spotted
- Comments service already targets multi-entity structure but UI still mixes legacy components
- Mention autocomplete exists in two places (comment box vs `MentionInput`)
- No broken imports spotted during inventory
