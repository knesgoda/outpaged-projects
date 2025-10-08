import { supabase } from "@/integrations/supabase/client";
import type { DocPage } from "@/types";
import {
  escapeLikePattern,
  mapSupabaseError,
  normalizeSearchTerm,
  requireUserId,
} from "./utils";

const DOC_FIELDS =
  "id, owner, project_id, parent_id, title, slug, body_markdown, body_html, is_published, version, created_by, updated_by, created_at, updated_at";

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

  return (data as DocPage | null) ?? null;
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

  await supabase.from("doc_versions" as any).insert({
    doc_id: doc.id,
    version: doc.version,
    title: doc.title,
    body_markdown: doc.body_markdown,
    body_html: doc.body_html,
    created_by: ownerId,
  } as any) as any;

  return doc;
}

export type UpdateDocInput = Partial<
  Pick<DocPage, "title" | "body_markdown" | "is_published" | "parent_id">
>;

export async function updateDoc(id: string, patch: UpdateDocInput): Promise<DocPage> {
  if (!id) {
    throw new Error("Doc id is required.");
  }

  const userId = await requireUserId();

  const { data: existing, error: fetchError } = await supabase
    .from("doc_pages" as any)
    .select("project_id")
    .eq("id", id)
    .maybeSingle() as any;

  if (fetchError || !existing) {
    throw mapSupabaseError(fetchError, "Doc not found.");
  }

  const scopeProjectId = (existing as { project_id?: string | null }).project_id ?? null;

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

  if (patch.body_markdown !== undefined) {
    updates.body_markdown = patch.body_markdown ?? "";
  }

  if (patch.is_published !== undefined) {
    updates.is_published = patch.is_published;
  }

  if (patch.parent_id !== undefined) {
    updates.parent_id = patch.parent_id ?? null;
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

  return data as DocPage;
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
  const nextVersion = currentVersion + 1;

  const { error: insertError } = await supabase.from("doc_versions" as any).insert({
    doc_id: docId,
    version: nextVersion,
    title: doc.title,
    body_markdown: doc.body_markdown,
    body_html: doc.body_html,
    created_by: userId,
  } as any) as any;

  if (insertError) {
    throw mapSupabaseError(insertError, "Unable to record version.");
  }

  const { error: updateError } = await supabase
    .from("doc_pages" as any)
    .update({ version: nextVersion })
    .eq("id", docId) as any;

  if (updateError) {
    throw mapSupabaseError(updateError, "Unable to bump doc version.");
  }
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

  await createDocVersionFromCurrent(docId);

  const refreshed = await getDoc(docId);
  return refreshed ?? (data as any);
}
