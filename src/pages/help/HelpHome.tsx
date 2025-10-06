import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileQuestion, Keyboard, LifeBuoy, Megaphone } from "lucide-react";
import { HelpSearchInput } from "@/components/help/HelpSearchInput";
import { ArticleCard } from "@/components/help/ArticleCard";
import { AnnouncementItem } from "@/components/help/AnnouncementItem";
import { useHelpArticles, useHelpSearch } from "@/hooks/useHelp";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const QUICK_LINKS = [
  {
    icon: FileQuestion,
    label: "FAQ",
    description: "Answers to the top questions.",
    to: "/help/faq",
  },
  {
    icon: Keyboard,
    label: "Shortcuts",
    description: "Master keyboard commands.",
    to: "/help/shortcuts",
  },
  {
    icon: Megaphone,
    label: "Changelog",
    description: "See what is new this week.",
    to: "/help/changelog",
  },
  {
    icon: LifeBuoy,
    label: "Contact",
    description: "Reach support for help.",
    to: "/help/contact",
  },
];

const CATEGORIES = [
  {
    id: "getting_started",
    title: "Getting started",
    description: "Invite teammates and launch your first project.",
    to: "/help/onboarding",
  },
  {
    id: "projects",
    title: "Projects",
    description: "Plan, assign, and track work across teams.",
    to: "/projects",
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Automate workflows and manage task lifecycles.",
    to: "/my-work",
  },
  {
    id: "security",
    title: "Security",
    description: "Configure permissions and guard your workspace.",
    to: "/admin/security",
  },
];

export function HelpHome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults = [], isLoading: isSearching, isError: searchError, error } = useHelpSearch(searchQuery);
  const {
    data: recentArticles = [],
    isLoading: loadingArticles,
    isError: articlesError,
    error: recentError,
  } = useHelpArticles({ limit: 4 });
  const {
    data: announcements = [],
    isLoading: loadingAnnouncements,
    isError: announcementsError,
    error: announcementsLoadError,
  } = useAnnouncements();

  const hasSearch = Boolean(searchQuery);
  const hasResults = searchResults.length > 0;

  const searchErrorMessage = useMemo(() => {
    if (searchError) {
      return (error as Error | undefined)?.message ?? "Unable to search help right now.";
    }
    return null;
  }, [searchError, error]);

  const handleExploreAll = () => {
    navigate("/help/search");
  };

  return (
    <div className="space-y-10 p-6">
      <Helmet>
        <title>Help</title>
      </Helmet>
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Help center</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Search guides, shortcuts, and release notes to get unstuck fast.
          </p>
        </div>
        <HelpSearchInput value={searchQuery} onSearch={setSearchQuery} autoFocus className="max-w-3xl" />

        {searchErrorMessage && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Search unavailable</AlertTitle>
            <AlertDescription>{searchErrorMessage}</AlertDescription>
          </Alert>
        )}

        {hasSearch && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Search results</h2>
              <Button variant="ghost" size="sm" onClick={handleExploreAll}>
                Open advanced search
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {isSearching && (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-36 rounded-lg" />
                ))}
              </div>
            )}
            {!isSearching && hasResults && (
              <div className="grid gap-4 md:grid-cols-2">
                {searchResults.slice(0, 4).map((article) => (
                  <ArticleCard key={article.id} article={article} highlightQuery={searchQuery} />
                ))}
              </div>
            )}
            {!isSearching && hasSearch && !hasResults && !searchErrorMessage && (
              <p className="text-sm text-muted-foreground">
                No results found. Try another keyword or browse the categories below.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quick start</h2>
            <Link to="/help/onboarding" className="text-sm font-medium text-primary hover:underline">
              View onboarding
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((category) => (
              <Link
                key={category.id}
                to={category.to}
                className="group flex h-full flex-col justify-between rounded-lg border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <h3 className="text-base font-semibold">{category.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                </div>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                  Explore
                  <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <h2 className="text-lg font-semibold">Quick links</h2>
          <div className="grid gap-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 rounded-md border bg-card p-3 transition hover:bg-muted"
              >
                <link.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium">{link.label}</p>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently updated</h2>
          <Button variant="link" className="px-0" onClick={handleExploreAll}>
            Search articles
          </Button>
        </div>
        {articlesError ? (
          <Alert variant="destructive">
            <AlertTitle>Cannot load articles</AlertTitle>
            <AlertDescription>
              {(recentError as Error | undefined)?.message ?? "You do not have access or the service is unavailable."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {loadingArticles &&
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-lg" />)}
            {!loadingArticles && recentArticles.length === 0 && (
              <p className="text-sm text-muted-foreground">No articles yet. Check back soon.</p>
            )}
            {!loadingArticles &&
              recentArticles.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest announcements</h2>
          <Link to="/help/changelog" className="text-sm font-medium text-primary hover:underline">
            View changelog
          </Link>
        </div>
        {announcementsError ? (
          <Alert variant="destructive">
            <AlertTitle>Cannot load announcements</AlertTitle>
            <AlertDescription>
              {(announcementsLoadError as Error | undefined)?.message ?? "Announcements are unavailable right now."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {loadingAnnouncements &&
              Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-lg" />)}
            {!loadingAnnouncements && announcements.length === 0 && (
              <p className="text-sm text-muted-foreground">No announcements published yet.</p>
            )}
            {!loadingAnnouncements &&
              announcements.slice(0, 2).map((announcement) => (
                <AnnouncementItem key={announcement.id} announcement={announcement} />
              ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold">Need more help?</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Visit the onboarding guide or contact support for personalized assistance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link to="/help/onboarding">Open onboarding</Link>
            </Button>
            <Button asChild>
              <Link to="/help/contact">Contact support</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HelpHome;
