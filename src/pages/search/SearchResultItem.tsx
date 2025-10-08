import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  task: "Task",
  project: "Project",
  doc: "Doc",
  file: "File",
  comment: "Comment",
  person: "Person",
  team_member: "Team Member",
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildHighlightedSnippet = (snippet: string, query: string) => {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!terms.length) {
    return snippet;
  }

  const pattern = terms.map((term) => escapeRegExp(term)).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = snippet.split(regex);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }
    const key = `${part}-${index}`;
    if (index % 2 === 1) {
      return (
        <mark key={key} className="rounded bg-primary/10 px-1 text-primary">
          {part}
        </mark>
      );
    }
    return <span key={key}>{part}</span>;
  });
};

type SearchResultItemProps = {
  result: SearchResult;
  query: string;
};

export const SearchResultItem = ({ result, query }: SearchResultItemProps) => {
  const updatedAt = result.updated_at
    ? formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })
    : null;

  const snippet = result.snippet ? buildHighlightedSnippet(result.snippet, query) : null;

  return (
    <li className="rounded-lg border border-border bg-background p-4 shadow-sm transition hover:border-primary/40">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link to={result.url} className="text-sm font-semibold text-primary hover:underline">
              {result.title || TYPE_LABELS[result.type]}
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="uppercase">
                {TYPE_LABELS[result.type]}
              </Badge>
              <span className="truncate">{result.url}</span>
            </div>
          </div>
          {updatedAt ? (
            <time className="text-xs text-muted-foreground" dateTime={result.updated_at ?? undefined}>
              {updatedAt}
            </time>
          ) : null}
        </div>
        {snippet ? (
          <p className={cn("text-sm text-muted-foreground", "line-clamp-3")}>{snippet}</p>
        ) : null}
      </div>
    </li>
  );
};
