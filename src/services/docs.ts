import { supabase } from "@/integrations/supabase/client";
import type { DocPage } from "@/types";

type ListDocsParams = {
  projectId?: string;
  parentId?: string | null;
  q?: string;
};

type CreateDocInput = {
  title: string;
  body_markdown?: string;
  parent_id?: string | null;
  project_id?: string | null;
  is_published?: boolean;
};

type UpdateDocPatch = Partial<
  Pick<DocPage, "title" | "body_markdown" | "is_published" | "parent_id" | "version">
>;

type DocVersionSummary = {
  version: number;
  created_at: string;
  created_by: string | null;
};

const DOC_TABLE = "doc_pages";
const DOC_VERSION_TABLE = "doc_versions";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "untitled";
}

async function ensureUniqueSlug(
  baseSlug: string,
  projectId: string | null,
  excludeId?: string
) {
  let attempt = baseSlug;
  let counter = 1;

  while (true) {
    const query = supabase
      .from(DOC_TABLE)
      .select("id")
      .eq("slug", attempt)
      .limit(1);

    if (projectId) {
      query.eq("project_id", projectId);
    } else {
      query.is("project_id", null);
    }

    if (excludeId) {
      query.neq("id", excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to check slug uniqueness", error);
      throw error;
    }

    if (!data) {
      return attempt;
    }

    counter += 1;
    attempt = `${baseSlug}-${counter}`;

    if (counter > 50) {
      attempt = `${baseSlug}-${Date.now()}`;
    }
  }
}

function buildSearchFilter(query: any, q?: string) {
  if (!q) {
    return query;
  }

  const raw = q.trim();
  if (!raw) {
    return query;
  }

  const escaped = raw.replace(/[%_]/g, (char) => `\\${char}`);
  const tsQuery = raw
    .split(/\s+/)
    .map((part) => part.replace(/[':*!&|]/g, ""))
    .filter(Boolean)
    .join(" & ");

  if (tsQuery) {
    query.or(
      `title.ilike.%${escaped}%,search.fts.${tsQuery}`
    );
  } else {
    query.ilike("title", `%${escaped}%`);
  }

  return query;
}

async function fetchDoc(id: string): Promise<DocPage | null> {
  const { data, error } = await supabase
    .from(DOC_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch doc", error);
    throw error;
  }

  return data as DocPage | null;
}

async function cloneDocVersion(doc: DocPage, userId: string | null) {
  const { error } = await supabase.from(DOC_VERSION_TABLE).insert({
    doc_id: doc.id,
    version: doc.version,
    title: doc.title,
    body_markdown: doc.body_markdown,
    body_html: doc.body_html,
    created_by: userId,
  });

  if (error) {
    console.error("Failed to create doc version", error);
    throw error;
  }
}

export async function listDocs(params: ListDocsParams = {}): Promise<DocPage[]> {
  const { projectId, parentId, q } = params;

  let query = supabase
    .from(DOC_TABLE)
    .select("*")
    .order("title", { ascending: true });

  if (projectId === null) {
    query.is("project_id", null);
  } else if (projectId) {
    query.eq("project_id", projectId);
  }

  if (typeof parentId !== "undefined") {
    if (parentId === null) {
      query.is("parent_id", null);
    } else {
      query.eq("parent_id", parentId);
    }
  }

  query = buildSearchFilter(query, q);

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load docs", error);
    throw error;
  }

  return (data as DocPage[]) ?? [];
}

export async function getDoc(id: string): Promise<DocPage | null> {
  return fetchDoc(id);
}

export async function createDoc(input: CreateDocInput): Promise<DocPage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to create docs.");
  }

  const projectId = input.project_id ?? null;
  const title = input.title.trim();
  const baseSlug = slugify(title);
  const slug = await ensureUniqueSlug(baseSlug, projectId);

  const payload = {
    owner: user.id,
    created_by: user.id,
    updated_by: user.id,
    title,
    slug,
    body_markdown: input.body_markdown ?? "",
    parent_id: input.parent_id ?? null,
    project_id: projectId,
    is_published: input.is_published ?? true,
  };

  const { data, error } = await supabase
    .from(DOC_TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Failed to create doc", error);
    throw error;
  }

  return data as DocPage;
}

export async function updateDoc(id: string, patch: UpdateDocPatch): Promise<DocPage> {
  const doc = await fetchDoc(id);
  if (!doc) {
    throw new Error("Document not found");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cleanedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  ) as UpdateDocPatch;

  let slug = doc.slug ?? slugify(doc.title);
  if (
    typeof cleanedPatch.title === "string" &&
    cleanedPatch.title.trim() &&
    cleanedPatch.title.trim() !== doc.title
  ) {
    slug = await ensureUniqueSlug(
      slugify(cleanedPatch.title),
      doc.project_id ?? null,
      doc.id
    );
  }

  const shouldVersion =
    typeof cleanedPatch.version === "number"
      ? false
      : typeof cleanedPatch.title === "string" || typeof cleanedPatch.body_markdown === "string";

  if (shouldVersion) {
    await cloneDocVersion(doc, user?.id ?? null);
  }

  const payload = {
    ...cleanedPatch,
    slug,
    ...(shouldVersion
      ? { version: doc.version + 1 }
      : typeof cleanedPatch.version === "number"
      ? { version: cleanedPatch.version }
      : {}),
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? doc.updated_by ?? null,
  } as Partial<DocPage>;

  const { data, error } = await supabase
    .from(DOC_TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update doc", error);
    throw error;
  }

  return data as DocPage;
}

export async function deleteDoc(id: string): Promise<void> {
  const { error } = await supabase.from(DOC_TABLE).delete().eq("id", id);

  if (error) {
    console.error("Failed to delete doc", error);
    throw error;
  }
}

export async function listDocVersions(docId: string): Promise<DocVersionSummary[]> {
  const { data, error } = await supabase
    .from(DOC_VERSION_TABLE)
    .select("version, created_at, created_by")
    .eq("doc_id", docId)
    .order("version", { ascending: false });

  if (error) {
    console.error("Failed to load doc versions", error);
    throw error;
  }

  return (data as DocVersionSummary[]) ?? [];
}

export async function createDocVersionFromCurrent(docId: string): Promise<void> {
  const doc = await fetchDoc(docId);
  if (!doc) {
    throw new Error("Document not found");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await cloneDocVersion(doc, user?.id ?? null);
}
