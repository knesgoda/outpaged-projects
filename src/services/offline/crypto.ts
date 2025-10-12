// @ts-nocheck
declare const Buffer: typeof import("buffer").Buffer | undefined;

const SESSION_KEY_STORAGE = "outpaged-offline-session-key";
const ENCRYPTION_VERSION = 1;

export interface EncryptedPayload {
  version: number;
  iv: string;
  ciphertext: string;
}

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof window.crypto !== "undefined";
}

function getCrypto(): Crypto | null {
  if (!isBrowserEnvironment()) return null;
  return window.crypto ?? null;
}

function getSubtle(): SubtleCrypto | null {
  return getCrypto()?.subtle ?? null;
}

function toBase64(buffer: ArrayBuffer): string {
  if (typeof window === "undefined") {
    return Buffer ? Buffer.from(buffer).toString("base64") : "";
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): ArrayBuffer {
  if (typeof window === "undefined") {
    return Buffer ? Buffer.from(value, "base64").buffer : new ArrayBuffer(0);
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function exportKey(key: CryptoKey): Promise<string> {
  const subtle = getSubtle();
  if (!subtle) throw new Error("WebCrypto not available");
  const exported = await subtle.exportKey("raw", key);
  return toBase64(exported);
}

async function importKey(raw: ArrayBuffer): Promise<CryptoKey> {
  const subtle = getSubtle();
  if (!subtle) throw new Error("WebCrypto not available");
  return subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function generateKey(): Promise<CryptoKey> {
  const subtle = getSubtle();
  if (!subtle) throw new Error("WebCrypto not available");
  return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

let keyPromise: Promise<CryptoKey | null> | null = null;

function readStoredKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(SESSION_KEY_STORAGE);
  } catch {
    return null;
  }
}

function writeStoredKey(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY_STORAGE, value);
  } catch {
    // ignore storage errors
  }
}

function removeStoredKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY_STORAGE);
  } catch {
    // ignore
  }
}

export function isEncryptionSupported(): boolean {
  return getSubtle() !== null;
}

export async function getSessionEncryptionKey(): Promise<CryptoKey | null> {
  if (!isEncryptionSupported()) return null;
  if (!keyPromise) {
    keyPromise = (async () => {
      const stored = readStoredKey();
      try {
        if (stored) {
          const buffer = fromBase64(stored);
          return await importKey(buffer);
        }
      } catch (error) {
        console.warn("Failed to import stored offline key", error);
        removeStoredKey();
      }
      try {
        const key = await generateKey();
        const serialized = await exportKey(key);
        writeStoredKey(serialized);
        return key;
      } catch (error) {
        console.warn("Failed to generate offline encryption key", error);
        return null;
      }
    })();
  }
  try {
    return await keyPromise;
  } catch (error) {
    console.warn("Failed to resolve offline encryption key", error);
    return null;
  }
}

export async function ensureSessionEncryptionKey(): Promise<boolean> {
  const key = await getSessionEncryptionKey();
  return Boolean(key);
}

function encodeUtf8(input: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input);
  }
  return Uint8Array.from(Buffer.from(input, "utf-8"));
}

function decodeUtf8(buffer: ArrayBuffer): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(buffer);
  }
  return Buffer.from(buffer).toString("utf-8");
}

function createIv(): Uint8Array {
  const crypto = getCrypto();
  if (!crypto) {
    const iv = new Uint8Array(12);
    for (let i = 0; i < iv.length; i += 1) {
      iv[i] = Math.floor(Math.random() * 256);
    }
    return iv;
  }
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

export async function encryptObject<T extends { id: string }>(value: T): Promise<EncryptedPayload | null> {
  const key = await getSessionEncryptionKey();
  if (!key) return null;
  const subtle = getSubtle();
  if (!subtle) return null;

  const iv = createIv();
  const serialized = JSON.stringify(value);
  const ciphertextBuffer = await subtle.encrypt({ name: "AES-GCM", iv }, key, encodeUtf8(serialized));

  return {
    version: ENCRYPTION_VERSION,
    iv: toBase64(iv.buffer),
    ciphertext: toBase64(ciphertextBuffer),
  } satisfies EncryptedPayload;
}

export async function decryptObject<T>(payload: unknown): Promise<T | null> {
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as Partial<EncryptedPayload>;
  if (envelope.version !== ENCRYPTION_VERSION || !envelope.iv || !envelope.ciphertext) {
    return null;
  }

  const key = await getSessionEncryptionKey();
  if (!key) return null;
  const subtle = getSubtle();
  if (!subtle) return null;

  try {
    const iv = new Uint8Array(fromBase64(envelope.iv));
    const ciphertext = fromBase64(envelope.ciphertext);
    const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    const decoded = decodeUtf8(decrypted);
    return JSON.parse(decoded) as T;
  } catch (error) {
    console.warn("Failed to decrypt offline payload", error);
    return null;
  }
}

export function clearSessionEncryptionState(): void {
  keyPromise = null;
  removeStoredKey();
}
