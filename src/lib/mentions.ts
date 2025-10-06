export function extractMentionIds(markdown: string): string[] {
  const ids = new Set<string>();
  const mentionPattern = /\[@[^\]]+\]\(user:\/\/([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = mentionPattern.exec(markdown)) !== null) {
    const id = match[1]?.trim();
    if (id) {
      ids.add(id);
    }
  }

  return Array.from(ids);
}

type MentionToken = {
  id: string;
  name: string;
};

type EditorState = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

type InsertResult = {
  value: string;
  selection: number;
};

export function insertMentionToken(mention: MentionToken, state: EditorState): InsertResult {
  const token = `[@${mention.name}](user://${mention.id})`;
  const prefix = state.value.slice(0, state.selectionStart);
  const suffix = state.value.slice(state.selectionEnd);

  const beforeMention = prefix.replace(/@[^@\s]*$/, '');
  const needsSpace = beforeMention.length > 0 && !/[\s(\[]$/.test(beforeMention);
  const spacer = needsSpace ? ' ' : '';

  const value = `${beforeMention}${spacer}${token} ${suffix}`;
  const selection = (beforeMention + spacer + token + ' ').length;

  return { value, selection };
}
