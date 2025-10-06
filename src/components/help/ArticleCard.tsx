import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HelpArticle } from "@/types";
import { cn } from "@/lib/utils";

function formatUpdatedAt(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch (_error) {
    return value;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ArticleCardProps = {
  article: HelpArticle;
  highlightQuery?: string;
  to?: string;
  className?: string;
};

export function ArticleCard({ article, highlightQuery, to, className }: ArticleCardProps) {
  const title = article.title.trim();
  const query = highlightQuery?.trim();

  const content = (
    <Card className={cn("h-full transition hover:shadow-md", className)}>
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {article.category && <span className="uppercase tracking-wide">{article.category}</span>}
          <span aria-hidden="true">•</span>
          <span>Updated {formatUpdatedAt(article.updated_at)}</span>
        </div>
        <CardTitle className="text-lg">
          {query ? (
            <HighlightedText text={title} query={query} />
          ) : (
            title
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {article.body_markdown?.replace(/[#*_`>\-]/g, " ").slice(0, 240) || ""}
        </p>
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block" aria-label={`Open article ${title}`}>
        {content}
      </Link>
    );
  }

  return content;
}

type HighlightedTextProps = {
  text: string;
  query: string;
};

function HighlightedText({ text, query }: HighlightedTextProps) {
  if (!query) {
    return <>{text}</>;
  }

  const regex = new RegExp(escapeRegExp(query), "ig");
  const parts: Array<string | { match: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ match: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <span key={index}>{part}</span>
        ) : (
          <mark key={index} className="rounded-sm bg-primary/10 px-0.5 text-primary">
            {part.match}
          </mark>
        )
      )}
    </>
  );
}
