import type { OpqlSuggestionItem } from "@/types";

export const formatSuggestionValue = (item: OpqlSuggestionItem) => {
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
