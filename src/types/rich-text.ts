export type CrossReferenceSuggestion = {
  id: string;
  type: "task" | "project" | "doc" | "file" | "comment";
  title: string;
  subtitle?: string;
  icon?: string;
  url?: string;
};

export interface RichTextIndexFields {
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  commentHtml?: string | null;
  commentText?: string | null;
  docHtml?: string | null;
  docText?: string | null;
}
