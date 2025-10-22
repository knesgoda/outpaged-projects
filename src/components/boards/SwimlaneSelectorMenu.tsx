import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Layers, User, Flag, FolderKanban, Target, Grid3x3 } from "lucide-react";
import type { SwimlaneMode } from "@/types/kanban";
import { cn } from "@/lib/utils";

interface SwimlaneSelectorMenuProps {
  value: SwimlaneMode;
  onChange: (mode: SwimlaneMode, customField?: string) => void;
  customField?: string;
  availableFields?: string[];
  className?: string;
}

const SWIMLANE_OPTIONS: { value: SwimlaneMode; label: string; icon: any; description: string }[] = [
  {
    value: 'none',
    label: 'No Grouping',
    icon: Grid3x3,
    description: 'Single flat view',
  },
  {
    value: 'assignee',
    label: 'By Assignee',
    icon: User,
    description: 'Group by who is working on tasks',
  },
  {
    value: 'epic',
    label: 'By Epic',
    icon: Target,
    description: 'Group by parent epic or story',
  },
  {
    value: 'priority',
    label: 'By Priority',
    icon: Flag,
    description: 'Group by task priority level',
  },
  {
    value: 'project',
    label: 'By Project',
    icon: FolderKanban,
    description: 'Group by project (for cross-project boards)',
  },
  {
    value: 'custom_field',
    label: 'By Custom Field',
    icon: Layers,
    description: 'Group by any custom field',
  },
];

export function SwimlaneSelectorMenu({
  value,
  onChange,
  customField,
  availableFields = [],
  className,
}: SwimlaneSelectorMenuProps) {
  const [selectedMode, setSelectedMode] = useState<SwimlaneMode>(value);
  const [selectedField, setSelectedField] = useState<string>(customField || '');

  useEffect(() => {
    setSelectedMode(value);
  }, [value]);

  useEffect(() => {
    setSelectedField(customField || '');
  }, [customField]);

  const handleModeChange = (newMode: SwimlaneMode) => {
    setSelectedMode(newMode);
    
    if (newMode === 'custom_field') {
      // Keep the existing field or wait for user to select
      onChange(newMode, selectedField || availableFields[0]);
    } else {
      onChange(newMode);
    }
  };

  const handleFieldChange = (field: string) => {
    setSelectedField(field);
    onChange('custom_field', field);
  };

  const currentOption = SWIMLANE_OPTIONS.find(opt => opt.value === selectedMode);

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Group By (Swimlanes)
        </Label>
        
        <Select value={selectedMode} onValueChange={handleModeChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              <div className="flex items-center gap-2">
                {currentOption && <currentOption.icon className="h-4 w-4" />}
                <span>{currentOption?.label || 'Select grouping...'}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SWIMLANE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-start gap-3 py-1">
                  <option.icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentOption && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {currentOption.description}
          </p>
        )}
      </div>

      {/* Custom Field Selector */}
      {selectedMode === 'custom_field' && (
        <div>
          <Label className="text-sm">Custom Field</Label>
          {availableFields.length > 0 ? (
            <Select value={selectedField} onValueChange={handleFieldChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={selectedField}
              onChange={(e) => handleFieldChange(e.target.value)}
              placeholder="Enter field name (e.g. team, component)"
            />
          )}
        </div>
      )}

      {/* Info Banner */}
      {selectedMode !== 'none' && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 border">
          💡 <strong>Tip:</strong> Empty lanes are automatically hidden. Click the arrow on any lane to collapse it.
        </div>
      )}
    </div>
  );
}
