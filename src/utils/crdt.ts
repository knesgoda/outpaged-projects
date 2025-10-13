import * as Y from "yjs";

const CONTENT_FIELD = "content";

const hasBuffer = typeof Buffer !== "undefined";

function encodeBase64(data: Uint8Array): string {
  if (hasBuffer) {
    return Buffer.from(data).toString("base64");
  }
  let binary = "";
  data.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function decodeBase64(encoded: string): Uint8Array {
  if (hasBuffer) {
    return Uint8Array.from(Buffer.from(encoded, "base64"));
  }
  const binary = atob(encoded);
  const array = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    array[index] = binary.charCodeAt(index);
  }
  return array;
}

export function encodeUpdate(update: Uint8Array): string {
  return encodeBase64(update);
}

export function decodeUpdate(encoded?: string | null): Uint8Array | null {
  if (!encoded) return null;
  try {
    return decodeBase64(encoded);
  } catch (error) {
    console.error("Failed to decode CRDT update", error);
    return null;
  }
}

export function instantiateDocFromMarkdown(markdown: string): Y.Doc {
  const doc = new Y.Doc();
  const text = doc.getText(CONTENT_FIELD);
  if (markdown) {
    text.insert(0, markdown);
  }
  return doc;
}

export function applySnapshot(doc: Y.Doc, snapshot?: string | null): void {
  const update = decodeUpdate(snapshot);
  if (!update) return;
  Y.applyUpdate(doc, update, "snapshot");
}

export function applyOperations(doc: Y.Doc, operations?: string[]): void {
  if (!operations?.length) return;
  for (const encoded of operations) {
    const update = decodeUpdate(encoded);
    if (!update) continue;
    Y.applyUpdate(doc, update, "operation");
  }
}

export function getMarkdownFromDoc(doc: Y.Doc): string {
  const text = doc.getText(CONTENT_FIELD);
  return text.toString();
}

export function createSnapshot(doc: Y.Doc): string {
  const update = Y.encodeStateAsUpdate(doc);
  return encodeUpdate(update);
}

export function createStateVector(doc: Y.Doc): string {
  const stateVector = Y.encodeStateVector(doc);
  return encodeUpdate(stateVector);
}

export function materializeFromState({
  snapshot,
  operations,
  fallback,
}: {
  snapshot?: string | null;
  operations?: string[];
  fallback?: string;
}): { doc: Y.Doc; markdown: string } {
  const doc = new Y.Doc();
  if (snapshot) {
    applySnapshot(doc, snapshot);
  } else if (fallback) {
    const text = doc.getText(CONTENT_FIELD);
    text.insert(0, fallback);
  }
  if (operations?.length) {
    applyOperations(doc, operations);
  }
  const markdown = getMarkdownFromDoc(doc);
  return { doc, markdown };
}

export type SerializedDocState = {
  snapshot: string;
  stateVector: string;
  markdown: string;
};

export function serializeDoc(doc: Y.Doc): SerializedDocState {
  return {
    snapshot: createSnapshot(doc),
    stateVector: createStateVector(doc),
    markdown: getMarkdownFromDoc(doc),
  };
}

export const REMOTE_ORIGIN = Symbol("remote-update");
export const LOCAL_ORIGIN = Symbol("local-update");
