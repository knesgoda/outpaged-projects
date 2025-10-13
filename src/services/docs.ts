import type { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { DocCollaborationMetadata, DocCollaborationOperation, DocPage } from "@/types";
import { materializeFromState, serializeDoc } from "@/utils/crdt";
import {
  escapeLikePattern,
  mapSupabaseError,
  normalizeSearchTerm,
  requireUserId,
} from "./utils";

const DOC_FIELDS =
  "id, owner, project_id, parent_id, title, slug, body_markdown, body_html, is_published, version, created_by, updated_by, created_at, updated_at";

const DOC_COLLAB_STATE_TABLE = "doc_collaboration_states";
const DOC_COLLAB_UPDATE_TABLE = "doc_collaboration_updates";
const DOC_EVENTS_CHANNEL = "docs:events";
const DOC_REALTIME_NAMESPACE = "docs";

type DocCollaborationStateRow = {
  doc_id: string;
  snapshot?: string | null;
  state_vector?: string | null;
  version?: number | null;
  last_synced_at?: string | null;
  updated_at?: string | null;
  last_operation_id?: string | number | null;
};

type DocCollaborationUpdateRow = {
  id?: string | number;
  update: string;
  client_id?: string | null;
  created_at?: string | null;
  was_offline?: boolean | null;
};

let eventsChannel: RealtimeChannel | null = null;

async function ensureEventsChannel(): Promise<RealtimeChannel | null> {
  if (eventsChannel) {
    return eventsChannel;
  }

  const channel = supabase.channel(DOC_EVENTS_CHANNEL, {
    config: { broadcast: { ack: true } },
  });

  try {
    const subscription = await channel.subscribe();
    if ((subscription as any)?.error) {
      console.error("Failed to subscribe to doc events channel", (subscription as any).error);
      return null;
    }
  } catch (error) {
    console.error("Unable to subscribe to doc events channel", error);
    return null;
  }

  eventsChannel = channel;
  return eventsChannel;
}

async function emitDocEvent(
  docId: string,
  event: "doc.edited" | "doc.commented",
  payload: Record<string, unknown>
) {
  const channel = await ensureEventsChannel();
  if (!channel) return;

  try {
    await channel.send({
      type: "broadcast",
      event,
      payload: { docId, ...payload },
    });
  } catch (error) {
    console.error("Unable to broadcast doc event", error);
  }
}

export function createDocRealtimeChannel(
  docId: string,
  options?: RealtimeChannelOptions
): RealtimeChannel {
  const channelId = `${DOC_REALTIME_NAMESPACE}:${docId}`;
  if (options) {
    return supabase.channel(channelId, options);
  }

  return supabase.channel(channelId, {
    config: {
      broadcast: { ack: true },
      presence: { key: `client-${Math.random().toString(16).slice(2)}` },
    },
  });
}

export async function notifyDocCommentEvent(
  docId: string,
  payload: { commentId: string; userId: string; body?: string }
): Promise<void> {
  await emitDocEvent(docId, "doc.commented", payload);
}

type ResolvedCollaborationResult = {
  markdown: string;
  metadata: DocCollaborationMetadata;
};

async function resolveCollaborationState(
  docId: string,
  options: { fallbackMarkdown: string; version: number }
): Promise<ResolvedCollaborationResult> {
  const { fallbackMarkdown, version } = options;

  const { data: stateRow, error: stateError } = (await supabase
    .from(DOC_COLLAB_STATE_TABLE as any)
    .select("*")
    .eq("doc_id", docId)
    .maybeSingle()) as unknown as {
    data: DocCollaborationStateRow | null;
    error: { message: string; code?: string } | null;
  };

  if (stateError && stateError.code !== "PGRST116") {
    throw mapSupabaseError(stateError, "Unable to load collaborative state.");
  }

  const snapshot = stateRow?.snapshot ?? null;
  const stateVector = stateRow?.state_vector ?? null;
  const derivedVersion = Number(stateRow?.version ?? version ?? 1) || 1;
  const lastSyncedAt = (stateRow?.last_synced_at ?? stateRow?.updated_at ?? null) ?? null;

  let updatesQuery = supabase
    .from(DOC_COLLAB_UPDATE_TABLE as any)
    .select("id, update, client_id, created_at, was_offline")
    .eq("doc_id", docId)
    .order("created_at", { ascending: true })
    .limit(2000) as any;

  if (stateRow?.last_operation_id) {
    updatesQuery = updatesQuery.gt("id", stateRow.last_operation_id);
  }

  const { data: updateRows, error: updatesError } = (await updatesQuery) as unknown as {
    data: DocCollaborationUpdateRow[] | null;
    error: { message: string; code?: string } | null;
  };

  if (updatesError && updatesError.code !== "PGRST116") {
    throw mapSupabaseError(updatesError, "Unable to load collaboration updates.");
  }

  const operations: DocCollaborationOperation[] = (updateRows ?? []).map((row) => ({
    id: row.id?.toString(),
    update: row.update,
    clientId: row.client_id ?? null,
    createdAt: row.created_at ?? null,
    offline: Boolean(row.was_offline ?? false),
  }));

  const { doc, markdown } = materializeFromState({
    snapshot,
    operations: operations.map((operation) => operation.update),
    fallback: fallbackMarkdown,
  });

  let resolvedSnapshot = snapshot;
  let resolvedVector = stateVector;
  if (!resolvedSnapshot || !resolvedVector) {
    const serialized = serializeDoc(doc);
    resolvedSnapshot = serialized.snapshot;
    resolvedVector = serialized.stateVector;

    const { error: initializeError } = (await supabase
      .from(DOC_COLLAB_STATE_TABLE as any)
      .upsert(
        {
          doc_id: docId,
          snapshot: resolvedSnapshot,
          state_vector: resolvedVector,
          version: derivedVersion,
          last_synced_at: new Date().toISOString(),
        } as any,
        { onConflict: "doc_id" } as any
      )) as any;

    if (initializeError) {
      throw mapSupabaseError(initializeError, "Unable to initialize collaboration state.");
    }
  }

  const metadata: DocCollaborationMetadata = {
    snapshot: resolvedSnapshot,
    stateVector: resolvedVector,
    version: derivedVersion,
    lastSyncedAt,
    pendingOperations: operations,
  };

  return { markdown, metadata };
}

async function ensureCollaborationInitialized(
  docId: string,
  markdown: string
): Promise<DocCollaborationMetadata> {
  const { doc } = materializeFromState({
    fallback: markdown,
  });
  const serialized = serializeDoc(doc);
  const now = new Date().toISOString();
  const { error } = (await supabase
    .from(DOC_COLLAB_STATE_TABLE as any)
    .upsert(
      {
        doc_id: docId,
        snapshot: serialized.snapshot,
        state_vector: serialized.stateVector,
        version: 1,
        last_synced_at: now,
      } as any,
      { onConflict: "doc_id" } as any
    )) as any;

  if (error) {
    throw mapSupabaseError(error, "Unable to persist collaborative snapshot.");
  }

  return {
    snapshot: serialized.snapshot,
    stateVector: serialized.stateVector,
    version: 1,
    lastSyncedAt: now,
    pendingOperations: [],
  } satisfies DocCollaborationMetadata;
}

export type DocCollaborationOperationInput = {
  update: string;
  clientId: string;
  createdAt?: string;
  offline?: boolean;
};

export async function appendDocOperations(
  docId: string,
  operations: DocCollaborationOperationInput[]
): Promise<void> {
  if (!docId || !operations.length) return;

  const payload = operations.map((operation) => ({
    doc_id: docId,
    update: operation.update,
    client_id: operation.clientId,
    created_at: operation.createdAt ?? new Date().toISOString(),
    was_offline: operation.offline ?? false,
  }));

  const { error } = (await supabase
    .from(DOC_COLLAB_UPDATE_TABLE as any)
    .insert(payload as any)) as any;

  if (error) {
    throw mapSupabaseError(error, "Unable to persist collaboration updates.");
  }
}

async function hydrateDocWithCollaboration(doc: DocPage): Promise<DocPage> {
  const { markdown, metadata } = await resolveCollaborationState(doc.id, {
    fallbackMarkdown: doc.body_markdown ?? "",
    version: doc.version,
  });

  return { ...doc, body_markdown: markdown, collaboration: metadata };
}

export type ListDocsParams = {
  projectId?: string;
  parentId?: string | null;
  q?: string;
};

export async function listDocs(params: ListDocsParams = {}): Promise<DocPage[]> {
  const { projectId, parentId, q } = params;
  let query = supabase
    .from("doc_pages" as any)
    .select(DOC_FIELDS)
    .order("title", { ascending: true }) as any;

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else if (projectId === null) {
    query = query.is("project_id", null);
  }

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else if (parentId === null) {
    query = query.is("parent_id", null);
  }

  const term = normalizeSearchTerm(q ?? "");
  if (term) {
    const likeTerm = `%${escapeLikePattern(term)}%`;
    query = query.or(
      `title.ilike.${likeTerm},slug.ilike.${likeTerm},body_markdown.ilike.${likeTerm}`
    );
    try {
      query = query.textSearch("search", term, { type: "websearch" });
    } catch (_error) {
      // text search optional; ignore when not available
    }
  }

  const { data, error } = await query;

  if (error) {
    throw mapSupabaseError(error, "Unable to load docs.");
  }

  return (data as DocPage[]) ?? [];
}

export async function getDoc(id: string): Promise<DocPage | null> {
  if (!id) {
    throw new Error("Doc id is required.");
  }

  const { data, error } = await supabase
    .from("doc_pages" as any)
    .select(DOC_FIELDS)
    .eq("id", id)
    .maybeSingle() as any;

  if (error && error.code !== "PGRST116") {
    throw mapSupabaseError(error, "Unable to load the doc.");
  }

  const rawDoc = (data as DocPage | null) ?? null;
  if (!rawDoc) {
    return null;
  }

  return hydrateDocWithCollaboration(rawDoc);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function resolveUniqueSlug(
  title: string,
  projectId?: string | null,
  excludeId?: string
): Promise<string> {
  const base = slugify(title) || `doc-${Date.now()}`;
  let candidate = base;
  let attempt = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let check = supabase
      .from("doc_pages" as any)
      .select("id")
      .eq("slug", candidate)
      .limit(1) as any;

    if (projectId) {
      check = check.eq("project_id", projectId);
    } else {
      check = check.is("project_id", null);
    }

    const { data, error } = await check;

    if (error) {
      throw mapSupabaseError(error, "Unable to validate doc slug.");
    }

    const conflict = (data as Array<{ id: string }> | null)?.[0];
    if (!conflict || conflict.id === excludeId) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

export type CreateDocInput = {
  title: string;
  body_markdown?: string;
  parent_id?: string | null;
  project_id?: string | null;
  is_published?: boolean;
};

export async function createDoc(input: CreateDocInput): Promise<DocPage> {
  const ownerId = await requireUserId();
  const title = input.title.trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  const slug = await resolveUniqueSlug(title, input.project_id ?? null);

  const payload = {
    owner: ownerId,
    project_id: input.project_id ?? null,
    parent_id: input.parent_id ?? null,
    title,
    slug,
    body_markdown: input.body_markdown ?? "",
    body_html: null,
    is_published: input.is_published ?? true,
    created_by: ownerId,
    updated_by: ownerId,
  } as Record<string, unknown>;

  const { data, error } = await supabase
    .from("doc_pages" as any)
    .insert(payload)
    .select(DOC_FIELDS)
    .single() as any;

  if (error) {
    throw mapSupabaseError(error, "Unable to create the doc.");
  }

  const doc = data as DocPage;
  const collaboration = await ensureCollaborationInitialized(doc.id, doc.body_markdown ?? "");

  await supabase.from("doc_versions" as any).insert({
    doc_id: doc.id,
    version: doc.version,
    title: doc.title,
    body_markdown: doc.body_markdown,
    body_html: doc.body_html,
    created_by: ownerId,
  } as any) as any;

  return { ...doc, collaboration };
}

export type UpdateDocInput = Partial<
  Pick<DocPage, "title" | "is_published" | "parent_id">
> & {
  body_markdown?: string;
  collab_snapshot?: string | null;
  collab_state_vector?: string | null;
  collab_operations?: DocCollaborationOperationInput[];
};

export async function updateDoc(id: string, patch: UpdateDocInput): Promise<DocPage> {
  if (!id) {
    throw new Error("Doc id is required.");
  }

  const userId = await requireUserId();

  const { data: existing, error: fetchError } = await supabase
    .from("doc_pages" as any)
    .select("project_id, title, body_markdown, version")
    .eq("id", id)
    .maybeSingle() as any;

  if (fetchError || !existing) {
    throw mapSupabaseError(fetchError, "Doc not found.");
  }

  const existingRow = existing as {
    project_id?: string | null;
    title?: string | null;
    body_markdown?: string | null;
    version?: number | null;
  };
  const scopeProjectId = existingRow.project_id ?? null;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };

  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    if (!trimmed) {
      throw new Error("Title cannot be empty.");
    }
    updates.title = trimmed;
    updates.slug = await resolveUniqueSlug(trimmed, scopeProjectId, id);
  }

  if (patch.is_published !== undefined) {
    updates.is_published = patch.is_published;
  }

  if (patch.parent_id !== undefined) {
    updates.parent_id = patch.parent_id ?? null;
  }

  const hasContentChanges =
    patch.body_markdown !== undefined ||
    patch.collab_snapshot !== undefined ||
    patch.collab_state_vector !== undefined ||
    Boolean(patch.collab_operations && patch.collab_operations.length > 0);

  const finalBody =
    patch.body_markdown !== undefined
      ? patch.body_markdown ?? ""
      : existingRow.body_markdown ?? "";

  const currentVersion = Number(existingRow.version ?? 1) || 1;
  const nextVersion = hasContentChanges ? currentVersion + 1 : currentVersion;

  if (hasContentChanges) {
    updates.body_markdown = finalBody;
    updates.version = nextVersion;
  }

  const { data, error } = await supabase
    .from("doc_pages" as any)
    .update(updates)
    .eq("id", id)
    .select(DOC_FIELDS)
    .single() as any;

  if (error) {
    throw mapSupabaseError(error, "Unable to update the doc.");
  }

  if (patch.collab_operations?.length) {
    await appendDocOperations(id, patch.collab_operations);
  }

  if (
    patch.collab_snapshot !== undefined ||
    patch.collab_state_vector !== undefined
  ) {
    const { error: stateError } = (await supabase
      .from(DOC_COLLAB_STATE_TABLE as any)
      .upsert(
        {
          doc_id: id,
          snapshot: patch.collab_snapshot ?? null,
          state_vector: patch.collab_state_vector ?? null,
          version: nextVersion,
          last_synced_at: new Date().toISOString(),
        } as any,
        { onConflict: "doc_id" } as any
      )) as any;

    if (stateError) {
      throw mapSupabaseError(stateError, "Unable to update collaborative snapshot.");
    }
  }

  if (hasContentChanges) {
    const { error: versionError } = (await supabase
      .from("doc_versions" as any)
      .insert({
        doc_id: id,
        version: nextVersion,
        title: (updates.title as string | undefined) ?? existingRow.title ?? "Untitled doc",
        body_markdown: finalBody,
        body_html: (data as DocPage).body_html ?? null,
        created_by: userId,
      } as any)) as any;

    if (versionError) {
      throw mapSupabaseError(versionError, "Unable to record version.");
    }

    await emitDocEvent(id, "doc.edited", {
      version: nextVersion,
      userId,
    });
  }

  return hydrateDocWithCollaboration(data as DocPage);
}

export async function deleteDoc(id: string): Promise<void> {
  if (!id) {
    throw new Error("Doc id is required.");
  }

  const { error } = await supabase.from("doc_pages" as any).delete().eq("id", id) as any;

  if (error) {
    throw mapSupabaseError(error, "Unable to delete the doc.");
  }
}

export async function listDocVersions(
  docId: string
): Promise<Array<{ version: number; created_at: string; created_by: string | null }>> {
  if (!docId) {
    throw new Error("Doc id is required.");
  }

  const { data, error } = await supabase
    .from("doc_versions" as any)
    .select("version, created_at, created_by")
    .eq("doc_id", docId)
    .order("version", { ascending: false }) as any;

  if (error) {
    throw mapSupabaseError(error, "Unable to load versions.");
  }

  return (data as Array<{ version: number; created_at: string; created_by: string | null }>) ?? [];
}

export async function createDocVersionFromCurrent(docId: string): Promise<void> {
  if (!docId) {
    throw new Error("Doc id is required.");
  }

  const userId = await requireUserId();

  const { data: doc, error } = await supabase
    .from("doc_pages" as any)
    .select("id, title, body_markdown, body_html, version")
    .eq("id", docId)
    .maybeSingle() as any;

  if (error || !doc) {
    throw mapSupabaseError(error, "Unable to snapshot the doc.");
  }

  const currentVersion = Number(doc.version) || 1;
  const { markdown, metadata } = await resolveCollaborationState(docId, {
    fallbackMarkdown: doc.body_markdown ?? "",
    version: currentVersion,
  });
  const nextVersion = currentVersion + 1;

  const { error: insertError } = await supabase.from("doc_versions" as any).insert({
    doc_id: docId,
    version: nextVersion,
    title: doc.title,
    body_markdown: markdown,
    body_html: doc.body_html,
    created_by: userId,
  } as any) as any;

  if (insertError) {
    throw mapSupabaseError(insertError, "Unable to record version.");
  }

  const { error: updateError } = await supabase
    .from("doc_pages" as any)
    .update({ version: nextVersion, body_markdown: markdown })
    .eq("id", docId) as any;

  if (updateError) {
    throw mapSupabaseError(updateError, "Unable to bump doc version.");
  }

  const { error: stateError } = (await supabase
    .from(DOC_COLLAB_STATE_TABLE as any)
    .upsert(
      {
        doc_id: docId,
        snapshot: metadata.snapshot,
        state_vector: metadata.stateVector,
        version: nextVersion,
        last_synced_at: new Date().toISOString(),
      } as any,
      { onConflict: "doc_id" } as any
    )) as any;

  if (stateError) {
    throw mapSupabaseError(stateError, "Unable to sync collaboration snapshot.");
  }

  await emitDocEvent(docId, "doc.edited", {
    version: nextVersion,
    userId,
    snapshot: true,
  });
}

export async function restoreDocVersion(docId: string, version: number): Promise<DocPage> {
  if (!docId) {
    throw new Error("Doc id is required.");
  }

  const userId = await requireUserId();

  const { data: versionRow, error: versionError } = await supabase
    .from("doc_versions" as any)
    .select("title, body_markdown, body_html")
    .eq("doc_id", docId)
    .eq("version", version)
    .maybeSingle() as any;

  if (versionError || !versionRow) {
    throw mapSupabaseError(versionError, "Version not found.");
  }

  const { data, error } = await supabase
    .from("doc_pages" as any)
    .update({
      title: versionRow.title,
      body_markdown: versionRow.body_markdown,
      body_html: versionRow.body_html ?? null,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", docId)
    .select(DOC_FIELDS)
    .single() as any;

  if (error) {
    throw mapSupabaseError(error, "Unable to restore the doc.");
  }

  const { doc: restoredDoc } = materializeFromState({ fallback: versionRow.body_markdown ?? "" });
  const serialized = serializeDoc(restoredDoc);
  const now = new Date().toISOString();
  const { error: stateError } = (await supabase
    .from(DOC_COLLAB_STATE_TABLE as any)
    .upsert(
      {
        doc_id: docId,
        snapshot: serialized.snapshot,
        state_vector: serialized.stateVector,
        version,
        last_synced_at: now,
      } as any,
      { onConflict: "doc_id" } as any
    )) as any;

  if (stateError) {
    throw mapSupabaseError(stateError, "Unable to update collaborative state.");
  }

  await supabase
    .from(DOC_COLLAB_UPDATE_TABLE as any)
    .delete()
    .eq("doc_id", docId);

  await emitDocEvent(docId, "doc.edited", {
    version,
    userId,
    restored: true,
  });

  await createDocVersionFromCurrent(docId);

  const refreshed = await getDoc(docId);
  return refreshed ?? hydrateDocWithCollaboration(data as DocPage);
}
