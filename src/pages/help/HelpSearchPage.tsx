import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { HelpSearchInput } from "@/components/help/HelpSearchInput";
import { ArticleCard } from "@/components/help/ArticleCard";
import { useHelpSearch } from "@/hooks/useHelp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type GroupedResults = Record<string, ReturnType<typeof useHelpSearch>["data"]>;

export function HelpSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(initialQuery);
  const query = initialQuery.trim();

  const {
    data: results = [],
    isLoading,
    isError,
    error,
  } = useHelpSearch(query, { enabled: Boolean(query) });

  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  const grouped = useMemo(() => {
    return (results ?? []).reduce<GroupedResults>((acc, article) => {
      const category = article.category?.trim() || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category]?.push(article);
      return acc;
    }, {});
  }, [results]);

  const handleSearch = (value: string) => {
    setInputValue(value);
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("q", value);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  };

  const hasQuery = Boolean(query);
  const hasResults = results && results.length > 0;

  return (
    <div className="space-y-6 p-6">
      <Helmet>
        <title>Help / Search</title>
      </Helmet>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Search help</h1>
        <p className="text-muted-foreground">
          Enter a keyword or phrase to search across guides, FAQs, and changelog updates.
        </p>
      </div>
      <HelpSearchInput value={inputValue} onSearch={handleSearch} autoFocus className="max-w-3xl" />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to search</AlertTitle>
          <AlertDescription>
            {(error as Error | undefined)?.message ?? "Search is unavailable right now. Try again later."}
          </AlertDescription>
        </Alert>
      )}

      {!hasQuery && !isError && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Start typing above to search articles, or explore featured categories from the help home page.
        </div>
      )}

      {hasQuery && isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-lg" />
          ))}
        </div>
      )}

      {hasQuery && !isLoading && !hasResults && !isError && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No matches found for <span className="font-semibold">{query}</span>. Try another phrase or check the FAQ.
        </div>
      )}

      {hasQuery && hasResults && (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB))
            .map(([category, articles]) => (
              <section key={category} className="space-y-4">
                <header>
                  <h2 className="text-lg font-semibold">{category}</h2>
                  <p className="text-sm text-muted-foreground">
                    {articles?.length ?? 0} {articles && articles.length === 1 ? "result" : "results"}
                  </p>
                </header>
                <div className="grid gap-4 md:grid-cols-2">
                  {articles?.map((article) => (
                    <ArticleCard key={article.id} article={article} highlightQuery={query} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

export default HelpSearchPage;
