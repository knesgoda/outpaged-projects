import { useEffect, useState } from "react";
import { Share2, ShieldCheck, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import type { FilterVisibility } from "@/services/boards/filterSharingService";
import {
  addBoardFilterShare,
  listBoardFilterShares,
  removeBoardFilterShare,
  updateBoardFilterVisibility,
} from "@/services/boards/filterSharingService";

interface FilterSharingControlsProps {
  boardId: string;
  viewId: string;
  canManageSharing: boolean;
}

export function FilterSharingControls({ boardId, viewId, canManageSharing }: FilterSharingControlsProps) {
  const { toast } = useToast();
  const [shares, setShares] = useState<Array<{ id: string; userId: string; canEdit: boolean }>>([]);
  const [visibility, setVisibility] = useState<FilterVisibility>("private");
  const [pendingUser, setPendingUser] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const rows = await listBoardFilterShares(boardId, viewId);
        if (!mounted) return;
        setShares(rows.map((row) => ({ id: row.id, userId: row.userId, canEdit: row.canEdit })));
        if (rows.length > 0) {
          setVisibility(rows[0].visibility);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Unable to load sharing settings",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [boardId, viewId, toast]);

  const handleVisibilityChange = async (value: FilterVisibility) => {
    setVisibility(value);
    try {
      await updateBoardFilterVisibility(boardId, viewId, value);
      toast({
        title: "Filter visibility updated",
        description: value === "public" ? "Filters are now visible to everyone" : `Visibility set to ${value}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to update filter visibility",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleInvite = async () => {
    if (!pendingUser.trim()) return;
    setLoading(true);
    try {
      const share = await addBoardFilterShare(boardId, viewId, pendingUser.trim());
      setShares((current) => [...current, { id: share.id, userId: share.userId, canEdit: share.canEdit }]);
      setPendingUser("");
      toast({ title: "Filters shared", description: "The selected teammate can now access these filters." });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to share filters",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    setShares((current) => current.filter((share) => share.id !== shareId));
    try {
      await removeBoardFilterShare(shareId);
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to revoke access",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Share2 className="h-4 w-4" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Share filters</h3>
        <Badge variant="secondary" className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Supabase policies enforced
        </Badge>
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="board-filter-visibility" className="text-xs uppercase tracking-wide text-muted-foreground">
          Visibility
        </Label>
        <Select
          value={visibility}
          onValueChange={(value) => handleVisibilityChange(value as FilterVisibility)}
          disabled={!canManageSharing}
        >
          <SelectTrigger id="board-filter-visibility" className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="workspace">Workspace</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Shared teammates</Label>
        {shares.length === 0 ? (
          <p className="text-sm text-muted-foreground">Only you can see these filters.</p>
        ) : (
          <ul className="space-y-2">
            {shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">{share.userId}</span>
                  {share.canEdit && <Badge variant="outline">Can edit</Badge>}
                </div>
                {canManageSharing && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(share.id)} aria-label="Remove access">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManageSharing && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={pendingUser}
            onChange={(event) => setPendingUser(event.target.value)}
            placeholder="Teammate email or ID"
            className="sm:w-[260px]"
          />
          <Button onClick={handleInvite} disabled={loading || !pendingUser.trim()}>
            Invite
          </Button>
        </div>
      )}
    </div>
  );
}
