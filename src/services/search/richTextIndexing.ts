/**
 * Rich Text Indexing for Search
 * 
 * This module extends search indexing to include rich-text fields like descriptions,
 * comments, and doc blocks that use the new Tiptap editor.
 */

import type { JSONContent } from "@tiptap/core";

export interface RichTextSearchable {
  id: string;
  type: "task" | "comment" | "doc" | "project";
  richTextFields: {
    field: string; // e.g., "description", "content", "body"
    html: string;
    json?: JSONContent;
    text: string; // Plain text extraction for indexing
  }[];
}

/**
 * Extract plain text from Tiptap JSON document for search indexing
 */
export function extractTextFromJSON(doc: JSONContent): string {
  if (!doc) return "";

  let text = "";

  const traverse = (node: JSONContent) => {
    // Add text content
    if (node.text) {
      text += node.text + " ";
    }

    // Extract special chip content for better search
    if (node.type === "mention" && node.attrs?.label) {
      text += `@${node.attrs.label} `;
    }

    if (node.type === "xref" && node.attrs?.title) {
      text += `[${node.attrs.title}] `;
    }

    // Traverse children
    if (node.content) {
      node.content.forEach(traverse);
    }
  };

  traverse(doc);

  return text.trim();
}

/**
 * Extract keywords from rich text for enhanced search ranking
 */
export function extractKeywords(doc: JSONContent): string[] {
  const keywords: Set<string> = new Set();

  const traverse = (node: JSONContent) => {
    // Headers are important keywords
    if (node.type === "heading" && node.content) {
      node.content.forEach((child) => {
        if (child.text) {
          child.text.split(/\s+/).forEach((word) => {
            if (word.length > 3) keywords.add(word.toLowerCase());
          });
        }
      });
    }

    // Bold/italic text might be emphasized
    if ((node.marks?.some((m) => m.type === "bold" || m.type === "italic")) && node.text) {
      node.text.split(/\s+/).forEach((word) => {
        if (word.length > 3) keywords.add(word.toLowerCase());
      });
    }

    // Code blocks might contain technical terms
    if (node.type === "codeBlock" && node.content) {
      node.content.forEach((child) => {
        if (child.text) {
          // Extract identifiers from code
          const identifiers = child.text.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
          identifiers.forEach((id) => {
            if (id.length > 3) keywords.add(id.toLowerCase());
          });
        }
      });
    }

    // Traverse children
    if (node.content) {
      node.content.forEach(traverse);
    }
  };

  traverse(doc);

  return Array.from(keywords);
}

/**
 * Extract mentions from rich text
 */
export function extractMentions(doc: JSONContent): Array<{ id: string; label: string }> {
  const mentions: Array<{ id: string; label: string }> = [];

  const traverse = (node: JSONContent) => {
    if (node.type === "mention" && node.attrs?.id && node.attrs?.label) {
      mentions.push({
        id: node.attrs.id,
        label: node.attrs.label,
      });
    }

    if (node.content) {
      node.content.forEach(traverse);
    }
  };

  traverse(doc);

  return mentions;
}

/**
 * Extract cross-references from rich text
 */
export function extractCrossReferences(doc: JSONContent): Array<{ id: string; type: string; title: string }> {
  const xrefs: Array<{ id: string; type: string; title: string }> = [];

  const traverse = (node: JSONContent) => {
    if (node.type === "xref" && node.attrs?.id && node.attrs?.type && node.attrs?.title) {
      xrefs.push({
        id: node.attrs.id,
        type: node.attrs.type,
        title: node.attrs.title,
      });
    }

    if (node.content) {
      node.content.forEach(traverse);
    }
  };

  traverse(doc);

  return xrefs;
}

/**
 * Prepare rich text content for search indexing
 */
export function prepareForIndexing(searchable: RichTextSearchable): {
  id: string;
  type: string;
  text: string;
  keywords: string[];
  mentions: Array<{ id: string; label: string }>;
  xrefs: Array<{ id: string; type: string; title: string }>;
} {
  let combinedText = "";
  const allKeywords: Set<string> = new Set();
  const allMentions: Array<{ id: string; label: string }> = [];
  const allXrefs: Array<{ id: string; type: string; title: string }> = [];

  searchable.richTextFields.forEach((field) => {
    // Add plain text
    combinedText += field.text + " ";

    // Extract from JSON if available
    if (field.json) {
      const keywords = extractKeywords(field.json);
      keywords.forEach((kw) => allKeywords.add(kw));

      const mentions = extractMentions(field.json);
      allMentions.push(...mentions);

      const xrefs = extractCrossReferences(field.json);
      allXrefs.push(...xrefs);
    }
  });

  return {
    id: searchable.id,
    type: searchable.type,
    text: combinedText.trim(),
    keywords: Array.from(allKeywords),
    mentions: allMentions,
    xrefs: allXrefs,
  };
}
