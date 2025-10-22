import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HelpCircle,
  Keyboard,
  Menu,
  Plus,
  Search,
  Building2,
  Briefcase,
  Layers,
  ChevronsUpDown,
  Loader2,
  Settings2,
} from "lucide-react";
import { NAV } from "@/lib/navConfig";
import { getWorkspaceRole, type Role } from "@/lib/auth";
import { PROJECT_TABS } from "@/components/common/TabBar";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useProfile";
import { useWorkspaceSettings } from "@/hooks/useWorkspace";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useWorkspaceContext } from "@/state/workspace";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatSuggestionValue } from "@/lib/opqlSuggestions";
import { opqlSuggest, searchAll, SearchAbuseError } from "@/services/search";
import type { OpqlSuggestionItem, OpqlSuggestionResponse } from "@/types";
import { useTelemetry } from "@/components/telemetry/TelemetryProvider";
import { useToast } from "@/hooks/use-toast";

function findNavLabel(path: string) {
  const walk = (items = NAV): string | undefined => {
    for (const item of items) {
      if (item.path === path) {
        return item.label;
      }
      if (item.matchPaths) {
        const match = item.matchPaths.find((candidate) => matchesPattern(candidate, path));
        if (match) {
          return item.label;
        }
      }
      if (item.children) {
        const found = walk(item.children);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  };

  return walk();
}

const SEGMENT_LABELS: Record<string, string> = {
  faq: "FAQ",
  shortcuts: "Shortcuts",
  changelog: "Changelog",
  contact: "Contact",
  onboarding: "Onboarding",
  search: "Search",
};

function formatSegment(segment: string) {
  const normalized = segment.toLowerCase();
  if (SEGMENT_LABELS[normalized]) {
    return SEGMENT_LABELS[normalized];
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const CUSTOM_CRUMBS = [
  { pattern: "/people", label: "People" },
  { pattern: "/people/:userId", label: "Member" },
  { pattern: "/teams", label: "Teams" },
  { pattern: "/teams/:teamId", label: "Team" },
  { pattern: "/time", label: "Time" },
  { pattern: "/time/my", label: "My" },
  { pattern: "/time/approvals", label: "Approvals" },
  { pattern: "/projects/:projectId/people", label: "People" },
  { pattern: "/projects/:projectId/teams", label: "Teams" },
  { pattern: "/projects/:projectId/time", label: "Time" },
] as const;

function matchesPattern(pattern: string, path: string) {
  if (pattern === path) return true;
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexPattern = escaped.replace(/:\w+/g, "[^/]+");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

function findCustomLabel(path: string) {
  const match = CUSTOM_CRUMBS.find((crumb) => matchesPattern(crumb.pattern, path));
  return match?.label;
}

const isTextInputLike = (element: Element | null) => {
  if (!element) return false;
  const tagName = element.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA") {
    return true;
  }
  return (element as HTMLElement).isContentEditable;
};

type TopbarProps = {
  onToggleSidebar: () => void;
  onOpenShortcuts?: () => void;
};

export function Topbar({ onToggleSidebar, onOpenShortcuts }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [role, setRole] = useState<Role>("viewer");
  const profileQuery = useMyProfile();
  const profile = profileQuery.data ?? null;
  const profileError = (profileQuery.error as Error | null) ?? null;
  const { data: workspaceSettings } = useWorkspaceSettings();
  const {
    organizations,
    currentOrganization,
    setOrganization,
    loadingOrganizations,
    workspaces,
    currentWorkspace,
    setWorkspace,
    loadingWorkspaces,
    spaces,
    currentSpace,
    setSpace,
    loadingSpaces,
  } = useWorkspaceContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { track } = useTelemetry();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [suggestionState, setSuggestionState] = useState<OpqlSuggestionResponse | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const suggestionRequestIdRef = useRef(0);
  const { toast } = useToast();

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Unable to sign out",
        description: message,
        variant: "destructive",
      });
    }
  }, [navigate, signOut, toast]);

  useEffect(() => {
    let active = true;

    async function loadRole() {
      if (!user) {
        if (active) {
          setRole("viewer");
        }
        return;
      }

      try {
        const workspaceRole = await getWorkspaceRole(user.id);
        if (active) {
          setRole(workspaceRole ?? "viewer");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (active) {
          if (message !== "You do not have access") {
            console.warn("Failed to load workspace role", message);
          }
          setRole("viewer");
        }
      }
    }

    loadRole();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    track("ui.shell_loaded", { path: location.pathname });
  }, [location.pathname, track]);

  const updateCursorFromElement = useCallback((element: HTMLInputElement | null) => {
    if (!element) return;
    const next = element.selectionStart ?? element.value.length;
    setCursor(next);
  }, []);

  const focusSearchInput = useCallback(
    (selectAll = false) => {
      const element = inputRef.current;
      if (!element) return;
      element.focus();
      if (selectAll) {
        requestAnimationFrame(() => {
          element.select();
          updateCursorFromElement(element);
        });
      } else {
        updateCursorFromElement(element);
      }
      setIsInputFocused(true);
    },
    [updateCursorFromElement]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (event: globalThis.KeyboardEvent) => {
      if (!event?.key) return;
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        focusSearchInput(true);
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const active = document.activeElement;
        if (!isTextInputLike(active)) {
          event.preventDefault();
          focusSearchInput(true);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusSearchInput]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestionState(null);
      setActiveSuggestion(-1);
      setIsSuggesting(false);
      return;
    }

    if (!isInputFocused) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    setIsSuggesting(true);
    const handle = window.setTimeout(() => {
      const requestId = suggestionRequestIdRef.current + 1;
      suggestionRequestIdRef.current = requestId;
      opqlSuggest({ text: query, cursor: Math.max(0, Math.min(cursor, query.length)) })
        .then((response) => {
          if (suggestionRequestIdRef.current !== requestId) return;
          setSuggestionState(response);
          setActiveSuggestion(response.items.length > 0 ? 0 : -1);
        })
        .catch((error) => {
          if (suggestionRequestIdRef.current !== requestId) return;
          console.warn("Failed to load OPQL suggestions", error);
          setSuggestionState(null);
          setActiveSuggestion(-1);
        })
        .finally(() => {
          if (suggestionRequestIdRef.current === requestId) {
            setIsSuggesting(false);
          }
        });
    }, 180);

    return () => {
      window.clearTimeout(handle);
    };
  }, [cursor, isInputFocused, query]);

  const suggestionItems = useMemo(() => suggestionState?.items ?? [], [suggestionState]);
  const isSuggestionPanelOpen =
    isInputFocused && query.trim().length > 0 && (isSuggesting || suggestionItems.length > 0);
  const suggestionListId = "topbar-search-suggestions";
  const activeSuggestionId =
    activeSuggestion >= 0 ? `${suggestionListId}-${activeSuggestion}` : undefined;
  const errorId = searchError ? "topbar-search-error" : undefined;

  const applyReplacement = useCallback(
    (replacement: string, range?: { start: number; end: number }) => {
      const tokenRange = range ?? suggestionState?.token ?? { start: query.length, end: query.length };
      const safeStart = Math.max(0, Math.min(tokenRange.start, query.length));
      const safeEnd = Math.max(0, Math.min(tokenRange.end, query.length));
      const before = query.slice(0, safeStart);
      const after = query.slice(safeEnd).replace(/^\s+/u, "");
      const nextValue = `${before}${replacement}${after}`;
      const nextCursorPosition = safeStart + replacement.length;
      setQuery(nextValue);
      setCursor(nextCursorPosition);
      setSearchError(null);
      requestAnimationFrame(() => {
        const element = inputRef.current;
        if (!element) return;
        element.focus();
        element.setSelectionRange(nextCursorPosition, nextCursorPosition);
      });
    },
    [query, suggestionState?.token]
  );

  const applySuggestionItem = useCallback(
    (item: OpqlSuggestionItem) => {
      const insertion = `${formatSuggestionValue(item)} `;
      applyReplacement(insertion);
      setActiveSuggestion(-1);
    },
    [applyReplacement]
  );

  const applyCompletion = useCallback(() => {
    const completion = suggestionState?.completion;
    if (completion) {
      applyReplacement(completion.insertText, completion.range);
      setActiveSuggestion(-1);
      return true;
    }
    const first = suggestionItems[0];
    if (first) {
      applySuggestionItem(first);
      return true;
    }
    return false;
  }, [applyReplacement, applySuggestionItem, suggestionItems, suggestionState?.completion]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      setSearchError(null);
      updateCursorFromElement(event.currentTarget);
    },
    [updateCursorFromElement]
  );

  const handleInputFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      setIsInputFocused(true);
      updateCursorFromElement(event.currentTarget);
    },
    [updateCursorFromElement]
  );

  const handleInputBlur = useCallback(() => {
    if (typeof window === "undefined") return;
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsInputFocused(false);
      setActiveSuggestion(-1);
    }, 100);
  }, []);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" && suggestionItems.length > 0) {
        event.preventDefault();
        setActiveSuggestion((previous) => {
          const next = previous + 1;
          if (next >= suggestionItems.length) {
            return 0;
          }
          return next;
        });
        return;
      }

      if (event.key === "ArrowUp" && suggestionItems.length > 0) {
        event.preventDefault();
        setActiveSuggestion((previous) => {
          if (previous <= 0) {
            return suggestionItems.length - 1;
          }
          return previous - 1;
        });
        return;
      }

      if (event.key === "Tab") {
        if (applyCompletion()) {
          event.preventDefault();
        }
        return;
      }

      if (event.key === "Enter") {
        if (isSuggestionPanelOpen && activeSuggestion >= 0 && suggestionItems[activeSuggestion]) {
          event.preventDefault();
          applySuggestionItem(suggestionItems[activeSuggestion]);
          return;
        }
        if (isSuggestionPanelOpen && suggestionState?.completion) {
          if (applyCompletion()) {
            event.preventDefault();
            return;
          }
        }
        return;
      }

      if (event.key === "Escape") {
        if (isSuggestionPanelOpen) {
          event.preventDefault();
          setSuggestionState(null);
          setActiveSuggestion(-1);
        }
        setIsInputFocused(false);
        event.currentTarget.blur();
      }
    },
    [activeSuggestion, applyCompletion, applySuggestionItem, isSuggestionPanelOpen, suggestionItems, suggestionState]
  );

  const handleFormSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }
      setIsSearching(true);
      setSearchError(null);
      try {
        await searchAll({ q: trimmed, limit: 20 });
        track("ui.nav_click", { target: "search", method: "submit" });
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      } catch (error) {
        if (error instanceof SearchAbuseError) {
          setSearchError(`Too many searches. Try again in ${Math.ceil(error.retryAfter)}s.`);
        } else {
          setSearchError("Search failed. Try again.");
        }
        console.error("Search submission failed", error);
      } finally {
        setIsSearching(false);
      }
    },
    [navigate, query, track]
  );

  const actions = useMemo(
    () => [
      { label: "New Project", path: "/projects?new=1" },
      { label: "New Board", path: "/boards/new" },
      { label: "New Task", path: "/tasks/new" },
      { label: "New Dashboard", path: "/dashboards/new" },
    ],
    []
  );

  const brandName =
    workspaceSettings?.brand_name?.trim() || workspaceSettings?.name?.trim() || "OutPaged";
  const brandLogo = workspaceSettings?.brand_logo_url ?? null;
  const organizationLabel =
    currentOrganization?.name ??
    (loadingOrganizations ? "Loading…" : organizations.length > 0 ? "Select organization" : "No organizations");
  const workspaceLabel =
    currentWorkspace?.name ??
    (loadingWorkspaces ? "Loading…" : workspaces.length > 0 ? "Select workspace" : "No workspaces");
  const spaceLabel =
    currentSpace?.name ??
    (loadingSpaces ? "Loading…" : spaces.length > 0 ? "Select space" : "No spaces");

  const organizationMenuBody = (
    <>
      <DropdownMenuLabel>Organizations</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {loadingOrganizations ? (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading organizations…</span>
        </div>
      ) : organizations.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">No organizations available.</div>
      ) : (
        organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            onSelect={(event) => {
              event.preventDefault();
              setOrganization(organization.id);
            }}
            className="flex flex-col items-start gap-0.5"
            aria-current={organization.id === currentOrganization?.id ? "true" : undefined}
          >
            <span className="text-sm font-medium text-foreground">{organization.name}</span>
            {organization.description ? (
              <span className="text-xs text-muted-foreground">{organization.description}</span>
            ) : null}
          </DropdownMenuItem>
        ))
      )}
    </>
  );

  const workspaceMenuBody = (
    <>
      <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {loadingWorkspaces ? (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading workspaces…</span>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">No workspaces available.</div>
      ) : (
        workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={(event) => {
              event.preventDefault();
              setWorkspace(workspace.id);
            }}
            className="flex flex-col items-start gap-0.5"
            aria-current={workspace.id === currentWorkspace?.id ? "true" : undefined}
          >
            <span className="text-sm font-medium text-foreground">{workspace.name}</span>
            {workspace.description ? (
              <span className="text-xs text-muted-foreground">{workspace.description}</span>
            ) : null}
          </DropdownMenuItem>
        ))
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          setIsDialogOpen(false);
          navigate("/admin/workspace");
        }}
      >
        <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" /> Manage workspace settings
      </DropdownMenuItem>
    </>
  );

  const spaceMenuBody = (
    <>
      <DropdownMenuLabel>Spaces</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {loadingSpaces ? (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading spaces…</span>
        </div>
      ) : spaces.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">No spaces available.</div>
      ) : (
        spaces.map((space) => (
          <DropdownMenuItem
            key={space.id}
            onSelect={(event) => {
              event.preventDefault();
              setSpace(space.id);
            }}
            className="flex flex-col items-start gap-0.5"
            aria-current={space.id === currentSpace?.id ? "true" : undefined}
          >
            <span className="text-sm font-medium text-foreground">{space.name}</span>
            {space.description ? (
              <span className="text-xs text-muted-foreground">{space.description}</span>
            ) : null}
          </DropdownMenuItem>
        ))
      )}
    </>
  );

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return [{ label: "Home", href: "/" }];
    }

    const crumbs: Array<{ label: string; href: string }> = [];
    let href = "";

    segments.forEach((segment, index) => {
      href += `/${segment}`;
      let label = findCustomLabel(href) ?? findNavLabel(href);

      if (!label && segments[0] === "projects") {
        if (index === 1) {
          label = `Project ${segment}`;
        } else if (index > 1) {
          label = PROJECT_TABS.find((tab) => tab.path === segment)?.label ?? formatSegment(segment);
        }
      }

      if (!label) {
        label = formatSegment(segment);
      }

      crumbs.push({ label, href });
    });

    return [{ label: "Home", href: "/" }, ...crumbs];
  }, [location.pathname]);

  const handleAction = (path: string) => {
    setIsDialogOpen(false);
    navigate(path);
  };

  const openHelpCenter = useCallback(() => {
    const newWindow = window.open("/help", "_blank", "noopener,noreferrer");
    newWindow?.focus();
  }, []);

  const fallbackLabel = user?.email ?? "Guest";
  const hasProfile = Boolean(profile) && !profileError;
  const displayName = hasProfile
    ? profile?.full_name?.trim() || fallbackLabel
    : fallbackLabel;
  const displayInitial = (displayName || fallbackLabel).charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url ?? undefined;

  const canCreate = role !== "viewer";

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="Toggle navigation">
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/" className="flex items-center gap-2" aria-label={`${brandName} home`}>
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={`${brandName} logo`}
              className="h-8 w-8 rounded-md object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden text-sm font-semibold text-foreground sm:inline">{brandName}</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden items-center gap-2 whitespace-nowrap sm:inline-flex"
              aria-label="Select organization"
            >
              {loadingOrganizations ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              <span className="max-w-[160px] truncate">{organizationLabel}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {organizationMenuBody}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Select organization"
            >
              {loadingOrganizations ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {organizationMenuBody}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden items-center gap-2 whitespace-nowrap sm:inline-flex"
              aria-label="Select workspace"
            >
              {loadingWorkspaces ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Briefcase className="h-4 w-4" />
              )}
              <span className="max-w-[160px] truncate">{workspaceLabel}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {workspaceMenuBody}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
            aria-label="Select workspace"
          >
            {loadingWorkspaces ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Briefcase className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {workspaceMenuBody}
        </DropdownMenuContent>
      </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden items-center gap-2 whitespace-nowrap lg:inline-flex"
              aria-label="Select space"
            >
              {loadingSpaces ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              <span className="max-w-[160px] truncate">{spaceLabel}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {spaceMenuBody}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Select space">
              {loadingSpaces ? <Loader2 className="h-5 w-5 animate-spin" /> : <Layers className="h-5 w-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {spaceMenuBody}
          </DropdownMenuContent>
        </DropdownMenu>
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mx-auto hidden w-full max-w-xl md:flex md:flex-col">
        <form onSubmit={handleFormSubmit} className="relative w-full">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              onKeyUp={(event) => updateCursorFromElement(event.currentTarget)}
              onClick={(event) => updateCursorFromElement(event.currentTarget)}
              onSelect={(event) => updateCursorFromElement(event.currentTarget)}
              placeholder="Search across tasks, docs, people…"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isSuggestionPanelOpen}
              aria-controls={isSuggestionPanelOpen ? suggestionListId : undefined}
              aria-activedescendant={activeSuggestionId}
              aria-describedby={errorId}
              className={cn(
                "h-10 w-full pl-9 pr-24",
                errorId ? "border-destructive focus-visible:ring-destructive" : undefined
              )}
            />
            {isSearching ? (
              <Loader2
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
                Ctrl&nbsp;K
              </span>
            )}
            {isSuggestionPanelOpen ? (
              <div
                className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"
                role="listbox"
                id={suggestionListId}
              >
                {isSuggesting ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Loading suggestions…</span>
                  </div>
                ) : suggestionItems.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No suggestions yet.</div>
                ) : (
                  suggestionItems.map((item, index) => (
                    <button
                      key={`${item.id}-${index}`}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySuggestionItem(item);
                      }}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm transition",
                        index === activeSuggestion ? "bg-accent text-accent-foreground" : undefined
                      )}
                      role="option"
                      aria-selected={index === activeSuggestion}
                      id={`${suggestionListId}-${index}`}
                    >
                      <span className="font-medium text-foreground">{formatSuggestionValue(item)}</span>
                      {item.description ? (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </form>
        {searchError ? (
          <p
            id={errorId}
            role="status"
            aria-live="polite"
            className="mt-1 text-xs text-destructive"
          >
            {searchError}
          </p>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Help and shortcuts">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                openHelpCenter();
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Open help center
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onOpenShortcuts?.();
              }}
            >
              <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" /> Keyboard shortcuts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Quick create</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                {actions.map((action) => (
                  <Button key={action.path} variant="outline" className="justify-start" onClick={() => handleAction(action.path)}>
                    {action.label}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2"
              data-testid="account-menu-trigger"
            >
              <Avatar className="h-8 w-8">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback>{displayInitial || "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void handleSignOut();
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
