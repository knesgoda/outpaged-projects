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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Column Settings: {columnName}</DialogTitle>
          <DialogDescription>
            Configure WIP limits, entry policies, and SLA for this column
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">WIP Limits</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="soft-limit" className="text-xs">Soft Limit (Warning)</Label>
                <Input
                  id="soft-limit"
                  type="number"
                  min="0"
                  value={softLimit}
                  onChange={(e) => setSoftLimit(e.target.value)}
                  placeholder="e.g., 5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hard-limit" className="text-xs">Hard Limit (Block)</Label>
                <Input
                  id="hard-limit"
                  type="number"
                  min="0"
                  value={hardLimit}
                  onChange={(e) => setHardLimit(e.target.value)}
                  placeholder="e.g., 8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Entry Policies</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="require-assignee" className="text-sm font-normal">
                Require assignee
              </Label>
              <Switch
                id="require-assignee"
                checked={requireAssignee}
                onCheckedChange={setRequireAssignee}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="require-estimate" className="text-sm font-normal">
                Require estimate
              </Label>
              <Switch
                id="require-estimate"
                checked={requireEstimate}
                onCheckedChange={setRequireEstimate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">SLA</h4>
            <div className="space-y-1">
              <Label htmlFor="sla-hours" className="text-xs">Max time in column (hours)</Label>
              <Input
                id="sla-hours"
                type="number"
                min="0"
                value={slaHours}
                onChange={(e) => setSlaHours(e.target.value)}
                placeholder="e.g., 48"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
