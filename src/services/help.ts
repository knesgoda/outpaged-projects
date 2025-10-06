import { supabase } from "@/integrations/supabase/client";
import type { HelpArticle } from "@/types";
import { escapeLikePattern, mapSupabaseError, normalizeSearchTerm } from "./utils";
import { requireUserId } from "./session";

const HELP_SELECT =
  "id, owner, title, slug, category, tags, body_markdown, body_html, is_published, created_at, updated_at";

function sortByUpdated(items: HelpArticle[] = []) {
  return [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function searchHelp(q: string): Promise<HelpArticle[]> {
  const term = normalizeSearchTerm(q);
  if (!term) {
    return [];
  }

  const results = new Map<string, HelpArticle>();

  const { data: textMatches, error: textError } = await supabase
    .from("help_articles")
    .select(HELP_SELECT)
    .textSearch("search", term, { type: "websearch", config: "simple" })
    .limit(50);

  if (textError && !textError.message?.toLowerCase().includes("syntax")) {
    throw mapSupabaseError(textError, "Unable to search help articles.");
  }

  textMatches?.forEach((article) => {
    results.set(article.id, article);
  });

  const pattern = escapeLikePattern(term);
  if (pattern) {
    const { data: fallbackMatches, error: fallbackError } = await supabase
      .from("help_articles")
      .select(HELP_SELECT)
      .or(`title.ilike.%${pattern}%,body_markdown.ilike.%${pattern}%`)
      .limit(50);

    if (fallbackError) {
      throw mapSupabaseError(fallbackError, "Unable to search help articles.");
    }

    fallbackMatches?.forEach((article) => {
      results.set(article.id, article);
    });
  }

  return sortByUpdated(Array.from(results.values()));
}

export async function listHelpArticles(params?: {
  category?: string;
  q?: string;
  limit?: number;
}): Promise<HelpArticle[]> {
  const query = supabase
    .from("help_articles")
    .select(HELP_SELECT)
    .order("updated_at", { ascending: false });

  if (params?.category) {
    query.eq("category", params.category);
  }

  const searchTerm = params?.q ? normalizeSearchTerm(params.q) : "";
  if (searchTerm) {
    const pattern = escapeLikePattern(searchTerm);
    query.or(`title.ilike.%${pattern}%,body_markdown.ilike.%${pattern}%`);
  }

  if (params?.limit) {
    query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw mapSupabaseError(error, "Unable to load help articles.");
  }

  return data ?? [];
}

export async function getHelpArticleBySlug(slug: string): Promise<HelpArticle | null> {
  const { data, error } = await supabase
    .from("help_articles")
    .select(HELP_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load the help article.");
  }

  return data ?? null;
}

export async function createHelpArticle(
  input: Omit<HelpArticle, "id" | "owner" | "created_at" | "updated_at">
): Promise<HelpArticle> {
  const owner = await requireUserId();

  const { data, error } = await supabase
    .from("help_articles")
    .insert({ ...input, owner })
    .select(HELP_SELECT)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to create the help article.");
  }

  return data;
}

export async function updateHelpArticle(
  id: string,
  patch: Partial<Pick<HelpArticle, "title" | "category" | "tags" | "body_markdown" | "is_published">>
): Promise<HelpArticle> {
  const { data, error } = await supabase
    .from("help_articles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(HELP_SELECT)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to update the help article.");
  }

  return data;
}

export async function deleteHelpArticle(id: string): Promise<void> {
  const { error } = await supabase.from("help_articles").delete().eq("id", id);

  if (error) {
    throw mapSupabaseError(error, "Unable to delete the help article.");
  }
}
