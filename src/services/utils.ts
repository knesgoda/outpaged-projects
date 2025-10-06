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
