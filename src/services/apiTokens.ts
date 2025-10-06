import { supabase } from "@/integrations/supabase/client";
import type { ApiToken } from "@/types";
import { handleSupabaseError, requireUserId } from "@/services/utils";

const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_LENGTH = 48;

function getCrypto(): Crypto {
  const cryptoObject = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (!cryptoObject || !cryptoObject.getRandomValues || !cryptoObject.subtle) {
    throw new Error("Secure crypto APIs are not available");
  }
  return cryptoObject;
}

function generateToken(length = TOKEN_LENGTH) {
  const cryptoObject = getCrypto();
  const bytes = new Uint8Array(length);
  cryptoObject.getRandomValues(bytes);

  let token = "";
  for (let i = 0; i < bytes.length; i += 1) {
    token += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }

  return token;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token: string) {
  const cryptoObject = getCrypto();
  const encoded = new TextEncoder().encode(token);
  const digest = await cryptoObject.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

export async function listApiTokens(): Promise<ApiToken[]> {
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, user_id, name, token_prefix, last_four, created_at, revoked_at")
    .order("created_at", { ascending: false });

  if (error) {
    handleSupabaseError(error, "Failed to load API tokens.");
  }

  return (data as ApiToken[]) ?? [];
}

export async function createApiToken(name: string): Promise<{ token: string; tokenRow: ApiToken }> {
  if (!name.trim()) {
    throw new Error("Token name is required.");
  }

  const userId = await requireUserId();
  const token = generateToken();
  const token_hash = await hashToken(token);
  const token_prefix = token.slice(0, 8);
  const last_four = token.slice(-4);

  const { data, error } = await supabase
    .from("api_tokens")
    .insert({
      user_id: userId,
      name: name.trim(),
      token_prefix,
      token_hash,
      last_four,
    })
    .select("id, user_id, name, token_prefix, last_four, created_at, revoked_at")
    .single();

  if (error) {
    handleSupabaseError(error, "Failed to create API token.");
  }

  return { token, tokenRow: data as ApiToken };
}

export async function revokeApiToken(id: string): Promise<void> {
  const { error } = await supabase
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    handleSupabaseError(error, "Failed to revoke API token.");
  }
}
