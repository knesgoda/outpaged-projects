export {
  enqueueBoardMutation,
  listBoardMutations,
  updateBoardMutation,
  deleteBoardMutation,
  clearBoardMutations,
  saveBoardSnapshot,
  getBoardSnapshot,
  processBoardMutationQueue,
  resolveBoardConflict,
  isIndexedDbEnabled,
  enqueueItemMutation,
  enqueueDocOperation,
  listDocOperations,
  updateDocOperation,
  deleteDocOperation,
  enqueueCommentMutation,
  listCommentMutations,
  updateCommentMutation,
  deleteCommentMutation,
  listItemMutations,
  enqueueFileUpload,
  listFileUploads,
  updateFileUpload,
  deleteFileUpload,
  registerTimelineDependency,
  markOperationResolved,
  createResumableUploadAdapter,
  createTimelineDependencyAdapter,
  groupOperationsByBatch,
  listOfflineOperations,
  summarizeOfflineQueue,
  clearOfflineStorage,
  pruneOfflineRetention,
  enforceOfflineCacheBudget,
  resetOfflineOperation,
  getOfflineNodeId,
  enqueueProfilePreferenceMutation,
  listProfilePreferenceMutations,
  updateProfilePreferenceMutation,
  deleteProfilePreferenceMutation,
  saveProfilePreferenceSnapshot,
  getProfilePreferenceSnapshot,
  processProfilePreferenceQueue,
  saveCommentDraft,
  getCommentDraft,
  deleteCommentDraft,
  saveRichTextDraft,
  getRichTextDraft,
  deleteRichTextDraft,
  listRichTextDrafts,
  updateRichTextDraft,
} from "./indexedDbQueue";

export {
  executeOfflineQuery,
  recordOpqlResponse,
  planOfflineQuery,
  isOfflineIndexAvailable,
  normalizeQueryKey,
  clearOfflineIndex,
} from "./opqlIndex";

export type { OfflineQueryPlan, OfflineQueryResult, OfflineQueryKey } from "./opqlIndex";

export type {
  BoardSyncMutation,
  BoardSyncMutationPayload,
  BoardSnapshot,
  ProcessQueueResult,
  QueueSyncer,
  SyncOutcome,
  VectorClock,
  ConflictPolicy,
  ConflictPolicyStrategy,
  DocCrdtOperation,
  CommentMutation,
  ItemMutation,
  FileUploadRecord,
  OperationBatch,
  OfflineOperationSummary,
  OfflineQueueSummary,
  OfflineOperationSource,
  ProfilePreferenceMutation,
  ProfilePreferenceRecord,
  ProfilePreferenceSnapshot,
  ProfilePreferenceSyncer,
  ProcessPreferenceQueueResult,
  CommentDraftRecord,
  RichTextDraftRecord,
} from "./indexedDbQueue";

export type { OfflinePolicy, RemoteWipePolicy } from "./types";
export {
  fetchOfflinePolicy,
  saveOfflinePolicy,
  triggerRemoteWipe,
  getCachedOfflinePolicy,
} from "./policies";
export { initializeRemoteWipeListeners, onRemoteWipe, performRemoteWipe } from "./remoteWipe";

// Re-export UI components
export { ConflictResolver } from "@/components/offline/ConflictResolver";
export { DiagnosticsPanel } from "@/components/offline/DiagnosticsPanel";
export { PullToRefresh } from "@/components/offline/PullToRefresh";
export type { FieldConflict, ConflictRecord } from "@/components/offline/ConflictResolver";
