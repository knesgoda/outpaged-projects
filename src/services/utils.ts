import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  const user = data.user;
  if (!user) {
    throw new Error("You must be signed in.");
  }
  return user.id;
}

export function handleSupabaseError(error: PostgrestError | null, fallbackMessage: string): never {
  if (!error) {
    throw new Error(fallbackMessage);
  }

  if (error.code === "42501" || error.code === "PGRST301") {
    throw new Error("You do not have access");
  }

  throw new Error(error.message || fallbackMessage);
}

export function escapeLikePattern(value: string) {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

export function normalizeSearchTerm(term: string) {
  return term.trim().replace(/\s+/g, " ");
}

type SupabaseLikeError = { message?: string | null } | null;

export function mapSupabaseError(error: SupabaseLikeError, fallback: string) {
  if (!error) {
    return new Error(fallback);
  }

  const message = error.message ?? fallback;
  const normalized = message.toLowerCase();

  if (normalized.includes("permission denied") || normalized.includes("row-level security")) {
    return new Error("You do not have access to this resource.");
  }

  return new Error(message);
}
