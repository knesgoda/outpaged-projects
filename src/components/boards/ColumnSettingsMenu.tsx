import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";

interface ColumnSettingsMenuProps {
  columnId: string;
  columnName: string;
  metadata?: any;
  onSave?: (metadata: any) => void;
}

export function ColumnSettingsMenu({
  columnId,
  columnName,
  metadata = {},
  onSave,
}: ColumnSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [softLimit, setSoftLimit] = useState(metadata?.wip?.soft || '');
  const [hardLimit, setHardLimit] = useState(metadata?.wip?.hard || '');
  const [requireAssignee, setRequireAssignee] = useState(
    metadata?.entryPolicy?.includes('requireAssignee') || false
  );
  const [requireEstimate, setRequireEstimate] = useState(
    metadata?.entryPolicy?.includes('requireEstimate') || false
  );
  const [slaHours, setSlaHours] = useState(metadata?.slaHours || '');

  function handleSave() {
    const entryPolicy = [];
    if (requireAssignee) entryPolicy.push('requireAssignee');
    if (requireEstimate) entryPolicy.push('requireEstimate');

    const newMetadata = {
      ...metadata,
      wip: {
        soft: softLimit ? parseInt(softLimit) : undefined,
        hard: hardLimit ? parseInt(hardLimit) : undefined,
        policy: hardLimit ? 'block' : 'warn',
      },
      entryPolicy,
      slaHours: slaHours ? parseInt(slaHours) : undefined,
    };

    onSave?.(newMetadata);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border border-[#0F3357] bg-[#001B33] text-white shadow-large">
        <DialogHeader>
          <DialogTitle className="text-white">Column Settings: {columnName}</DialogTitle>
          <DialogDescription className="text-white/70">
            Configure WIP limits, entry policies, and SLA for this column
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">WIP Limits</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="soft-limit" className="text-xs uppercase tracking-wide text-accent-light">
                  Soft Limit (Warning)
                </Label>
                <Input
                  id="soft-limit"
                  type="number"
                  min="0"
                  value={softLimit}
                  onChange={(e) => setSoftLimit(e.target.value)}
                  placeholder="e.g., 5"
                  className="border-transparent bg-[#E6ECF2] text-[#001B33] placeholder:text-[#4B5C6A] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hard-limit" className="text-xs uppercase tracking-wide text-accent-light">
                  Hard Limit (Block)
                </Label>
                <Input
                  id="hard-limit"
                  type="number"
                  min="0"
                  value={hardLimit}
                  onChange={(e) => setHardLimit(e.target.value)}
                  placeholder="e.g., 8"
                  className="border-transparent bg-[#E6ECF2] text-[#001B33] placeholder:text-[#4B5C6A] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Entry Policies</h4>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-white/5 px-3 py-2">
              <Label htmlFor="require-assignee" className="text-sm font-medium text-white">
                Require assignee
              </Label>
              <Switch
                id="require-assignee"
                checked={requireAssignee}
                onCheckedChange={setRequireAssignee}
                className="border border-accent/50 bg-[#112C47] focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33] data-[state=checked]:bg-accent"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-white/5 px-3 py-2">
              <Label htmlFor="require-estimate" className="text-sm font-medium text-white">
                Require estimate
              </Label>
              <Switch
                id="require-estimate"
                checked={requireEstimate}
                onCheckedChange={setRequireEstimate}
                className="border border-accent/50 bg-[#112C47] focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33] data-[state=checked]:bg-accent"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">SLA</h4>
            <div className="space-y-2">
              <Label htmlFor="sla-hours" className="text-xs uppercase tracking-wide text-accent-light">
                Max time in column (hours)
              </Label>
              <Input
                id="sla-hours"
                type="number"
                min="0"
                value={slaHours}
                onChange={(e) => setSlaHours(e.target.value)}
                placeholder="e.g., 48"
                className="border-transparent bg-[#E6ECF2] text-[#001B33] placeholder:text-[#4B5C6A] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-[#0F3357] bg-transparent text-white shadow-none hover:bg-[#0F3357] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#FF6A00] text-white shadow-none transition-colors hover:bg-[#E65E00] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33]"
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
