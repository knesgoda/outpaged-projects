import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  FileIcon,
  FileText,
  GitPullRequest,
  MessageCircle,
  Pin,
  PinOff,
  UserPlus,
  Users,
  ClipboardList,
  Database,
  Download,
  Share2,
  ExternalLink,
} from "lucide-react";

import type { SearchResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  SearchResult["type"],
  {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    accent: string;
  }
> = {
  task: { label: "Task", icon: ClipboardList, accent: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  project: { label: "Project", icon: Users, accent: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
  doc: { label: "Doc", icon: FileText, accent: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  file: { label: "File", icon: FileIcon, accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  comment: { label: "Comment", icon: MessageCircle, accent: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300" },
  person: { label: "Person", icon: UserPlus, accent: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" },
  team_member: {
    label: "Team Member",
    icon: Users,
    accent: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
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

export type SearchResultCardProps = {
  result: SearchResult;
  query: string;
  isSelected?: boolean;
  isPinned?: boolean;
  inlineActionsEnabled?: boolean;
  onPreview?: (result: SearchResult) => void;
  onToggleSelect?: (result: SearchResult, nextSelected: boolean) => void;
  onTogglePin?: (result: SearchResult, nextPinned: boolean) => void;
  onPerformAction?: (result: SearchResult, action: string) => void;
};

export const SearchResultItem = memo(
  ({
    result,
    query,
    isSelected = false,
    isPinned = false,
    inlineActionsEnabled = true,
    onPreview,
    onToggleSelect,
    onTogglePin,
    onPerformAction,
  }: SearchResultCardProps) => {
    const updatedAt = result.updated_at
      ? formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })
      : null;

    const snippet = useMemo(() => (result.snippet ? buildHighlightedSnippet(result.snippet, query) : null), [
      result.snippet,
      query,
    ]);

    const typeConfig = TYPE_CONFIG[result.type];

    const handlePreview = () => {
      onPreview?.(result);
    };

    const handleToggleSelect = () => {
      onToggleSelect?.(result, !isSelected);
    };

    const handleTogglePin = () => {
      onTogglePin?.(result, !isPinned);
    };

    const handleAction = (action: string) => {
      onPerformAction?.(result, action);
    };

    const TypeIcon = typeConfig.icon;

    return (
      <TooltipProvider delayDuration={100} disableHoverableContent>
        <article
          role="option"
          aria-selected={isSelected}
          tabIndex={0}
          onMouseEnter={handlePreview}
          onFocus={handlePreview}
          className={cn(
            "group relative flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary", 
            isSelected && "border-primary/60 ring-1 ring-primary"
          )}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleToggleSelect}
              aria-label="Select result"
              className="mt-1"
            />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", 
                        typeConfig.accent
                      )}
                    >
                      <TypeIcon className="h-3.5 w-3.5" aria-hidden />
                      {typeConfig.label}
                    </span>
                    {isPinned ? (
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </Badge>
                    ) : null}
                  </div>
                  <Link
                    to={result.url}
                    className="line-clamp-2 text-left text-sm font-semibold leading-5 text-primary hover:underline"
                  >
                    {result.title || typeConfig.label}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="uppercase tracking-wide">
                      {typeConfig.label}
                    </Badge>
                    <span className="truncate" title={result.url}>
                      {result.url}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                  {updatedAt ? (
                    <time dateTime={result.updated_at ?? undefined}>{updatedAt}</time>
                  ) : (
                    <span aria-hidden className="text-muted-foreground/70">
                      No activity
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleTogglePin}
                    aria-label={isPinned ? "Unpin result" : "Pin result"}
                  >
                    {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {snippet ? (
                <p className={cn("text-sm text-muted-foreground", "line-clamp-3")}>{snippet}</p>
              ) : null}
            </div>
          </div>

          {inlineActionsEnabled ? (
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleAction("assign")}
                    aria-label="Assign">
                    <UserPlus className="mr-1 h-4 w-4" /> Assign
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Assign to teammate</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleAction("comment")}
                    aria-label="Add comment">
                    <MessageCircle className="mr-1 h-4 w-4" /> Comment
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Leave a note without leaving search</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleAction("join")}
                    aria-label="Join">
                    <Users className="mr-1 h-4 w-4" /> Join
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Join the conversation or project</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleAction("download")}
                    aria-label="Download">
                    <Download className="mr-1 h-4 w-4" /> Download
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download with masking applied</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleAction("open_pr")}
                    aria-label="Open pull request">
                    <GitPullRequest className="mr-1 h-4 w-4" /> Open PR
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Jump to related pull request</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-auto">
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>More options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleAction("open_as_board")}>
                    <ClipboardList className="mr-2 h-4 w-4" /> Open as board
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAction("open_as_report")}>
                    <Database className="mr-2 h-4 w-4" /> Open as report dataset
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAction("export")}
                    textValue="Export">
                    <Share2 className="mr-2 h-4 w-4" /> Export selection
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAction("open_external")}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Open externally
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </article>
      </TooltipProvider>
    );
  }
);

SearchResultItem.displayName = "SearchResultItem";
