import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useHelpArticles } from "@/hooks/useHelp";

type GroupedFaqs = Record<string, ReturnType<typeof useHelpArticles>["data"]>;

function toPlainParagraphs(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => (
      <p key={index} className="text-sm leading-relaxed text-muted-foreground">
        {block.replace(/[#*_`>\-]/g, " ")}
      </p>
    ));
}

export function FAQPage() {
  const {
    data: articles = [],
    isLoading,
    isError,
    error,
  } = useHelpArticles();

  const grouped = useMemo(() => {
    return (articles ?? []).reduce<GroupedFaqs>((acc, article) => {
      const category = article.category?.trim() || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category]?.push(article);
      return acc;
    }, {});
  }, [articles]);

  const hasContent = articles.length > 0;

  return (
    <div className="space-y-8 p-6">
      <Helmet>
        <title>Help / FAQ</title>
      </Helmet>
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h1>
        <p className="max-w-2xl text-muted-foreground">
          Browse common questions by topic. Still stuck? Reach out to our team.
        </p>
      </header>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load FAQs</AlertTitle>
          <AlertDescription>
            {(error as Error | undefined)?.message ?? "You do not have access or the service is unavailable."}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && !hasContent && !isError && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No FAQs published yet. Check back soon or contact support for help.
        </div>
      )}

      {!isLoading && hasContent && (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, faqs]) => (
              <section key={category} className="space-y-4">
                <header>
                  <h2 className="text-lg font-semibold">{category}</h2>
                  <p className="text-sm text-muted-foreground">
                    {faqs?.length ?? 0} {faqs && faqs.length === 1 ? "question" : "questions"}
                  </p>
                </header>
                <Accordion type="multiple" className="space-y-2">
                  {faqs?.map((article) => (
                    <AccordionItem key={article.id} value={article.id} className="rounded-lg border">
                      <AccordionTrigger className="px-4 text-left text-base font-medium">
                        {article.title}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 px-4 pb-4 pt-0">
                        {toPlainParagraphs(article.body_markdown || "")}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Need more help?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          If you cannot find the answer you need, contact support and we will get back to you shortly.
        </p>
        <Button asChild className="mt-4">
          <Link to="/help/contact">Contact support</Link>
        </Button>
      </div>
    </div>
  );
}

export default FAQPage;
