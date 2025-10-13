import type { OpqlSuggestionItem } from "@/types";

export const formatSuggestionValue = (item: OpqlSuggestionItem) => {
  if (item.template) {
    return item.template;
  }
  switch (item.trigger) {
    case "mention":
      return `@${item.value}`;
    case "label":
      return `#${item.value}`;
    case "project":
      return `proj:${item.value}`;
    case "space":
      return `space:${item.value.toLowerCase()}`;
    case "filetype":
      return `filetype:${item.value.toLowerCase()}`;
    default:
      return item.value;
  }
};

export const getSuggestionInsertion = (item: OpqlSuggestionItem) => {
  const base = formatSuggestionValue(item);
  let cursorOffset: number | undefined;
  if (item.template && item.parameters?.length) {
    const placeholder = `{{${item.parameters[0].name}}}`;
    const index = base.indexOf(placeholder);
    if (index !== -1) {
      cursorOffset = index;
    }
  }
  const insertText = `${base} `;
  return {
    text: insertText,
    cursorOffset: cursorOffset ?? insertText.length,
  };
};
