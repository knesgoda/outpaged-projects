import { supabase } from "@/integrations/supabase/client";
import type { CommentCrossReference } from "@/types";

type BacklinkInput = {
  id: string;
  type: CommentCrossReference["target_type"];
  title?: string;
  url?: string | null;
};

export async function upsertCommentBacklinks(commentId: string, backlinks: BacklinkInput[]) {
  await supabase.from("comment_backlinks").delete().eq("comment_id", commentId);
  if (backlinks.length === 0) return [];
  const records = backlinks.map((link) => ({
    comment_id: commentId,
    target_id: link.id,
    target_type: link.type,
    context: JSON.stringify({ title: link.title ?? null, url: link.url ?? null }),
  }));
  const { data, error } = await supabase.from("comment_backlinks").insert(records).select();
  if (error) throw error;
  return data ?? [];
}

export async function listBacklinksForEntity(targetType: CommentCrossReference["target_type"], targetId: string) {
  const { data, error } = await supabase
    .from("comment_backlinks")
    .select("comment_id, context, comments:comment_id(id, entity_type, entity_id)")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    comment_id: row.comment_id as string,
    context: typeof row.context === "string" ? safeParse(row.context) : row.context,
    comment: row.comments,
  }));
}

function safeParse(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as { title?: string; url?: string | null };
  } catch {
    return {};
  }
}
