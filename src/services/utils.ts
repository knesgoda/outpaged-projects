import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";

export async function requireUserId(): Promise<string> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Failed to resolve Supabase user", error);
    }
    const userId = data?.user?.id ?? getCurrentUser()?.id;
    if (!userId) {
      throw new Error("Sign in required");
    }
    return userId;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Sign in required");
  }
}

export function supabaseErrorMessage(
  error: { message?: string } | null,
  fallback: string
): string {
  if (error?.message) {
    console.error("Supabase error", error);
    return error.message;
  }
  return fallback;
}
