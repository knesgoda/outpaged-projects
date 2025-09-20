import { useState } from "react";
import { BookmarkCheck, Link as LinkIcon, Share2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOperations } from "./OperationsProvider";

export function SavedSearchPanel() {
  const { savedSearches, saveSearch } = useOperations();
  const { toast } = useToast();
  const [searchDraft, setSearchDraft] = useState({
    name: "",
    query: "",
    statuses: "",
    assignees: "",
    visibility: "team" as "private" | "team" | "organization",
  });

  const handleSaveSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchDraft.name || !searchDraft.query) {
      toast({ title: "Missing name or query", variant: "destructive" });
      return;
    }
    const filters: Record<string, unknown> = {};
    if (searchDraft.statuses) filters.statuses = searchDraft.statuses.split(",").map((value) => value.trim());
    if (searchDraft.assignees) filters.assignees = searchDraft.assignees.split(",").map((value) => value.trim());
    const saved = saveSearch({
      name: searchDraft.name,
      query: searchDraft.query,
      filters,
      visibility: searchDraft.visibility,
      owner: "operations",
    });
    toast({ title: "Search saved", description: `Share link generated for ${saved.name}.` });
    setSearchDraft({ name: "", query: "", statuses: "", assignees: "", visibility: searchDraft.visibility });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved search library</CardTitle>
        <CardDescription>
          Store advanced filter combinations and generate shareable links respecting workspace permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSaveSearch} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="saved-search-name">Name</Label>
            <Input
              id="saved-search-name"
              value={searchDraft.name}
              onChange={(event) => setSearchDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Sev1 incidents this week"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="saved-search-query">Query</Label>
            <Input
              id="saved-search-query"
              value={searchDraft.query}
              onChange={(event) => setSearchDraft((prev) => ({ ...prev, query: event.target.value }))}
              placeholder="severity:Sev1"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="saved-search-status">Statuses</Label>
            <Input
              id="saved-search-status"
              value={searchDraft.statuses}
              onChange={(event) => setSearchDraft((prev) => ({ ...prev, statuses: event.target.value }))}
              placeholder="open, monitoring"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="saved-search-assignee">Assignees</Label>
            <Input
              id="saved-search-assignee"
              value={searchDraft.assignees}
              onChange={(event) => setSearchDraft((prev) => ({ ...prev, assignees: event.target.value }))}
              placeholder="alice@example.com"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Visibility</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={searchDraft.visibility}
              onChange={(event) => setSearchDraft((prev) => ({ ...prev, visibility: event.target.value as typeof prev.visibility }))}
            >
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="organization">Organization</option>
            </select>
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              Save search
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          {savedSearches.length === 0 && (
            <div className="text-sm text-muted-foreground border rounded-lg p-6">
              Save a query to generate a shareable link accessible according to its visibility.
            </div>
          )}
          {savedSearches.map((search) => (
            <Card key={search.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookmarkCheck className="h-4 w-4 text-primary" /> {search.name}
                </CardTitle>
                <CardDescription>
                  {search.visibility.toUpperCase()} visibility • Query: {search.query}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(search.filters).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <a href={search.sharedUrl} className="flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer">
                    <LinkIcon className="h-3 w-3" /> {search.sharedUrl}
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(search.sharedUrl);
                      toast({ title: "Link copied", description: "Share the link to reproduce filters instantly." });
                    }}
                  >
                    <Share2 className="h-3 w-3 mr-1" /> Copy link
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
