
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Filter,
  X,
  Calendar,
  User,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAVY_SURFACE = "#0A1F44";

interface ActiveFilterChipProps {
  label: string;
  value: string;
  onClear: () => void;
}

function ActiveFilterChip({ label, value, onClear }: ActiveFilterChipProps) {
  const ariaLabel = `${label} filter ${value}`;

  return (
    <button
      type="button"
      onClick={onClear}
      className="group inline-flex items-center gap-2 rounded-full border border-[rgba(255,106,0,0.65)] bg-[#0A1F44] px-3 py-1 text-sm text-white shadow-[0_0_0_1px_rgba(8,23,55,0.65)] transition hover:border-[rgba(255,106,0,0.9)] hover:bg-[#0C254F] focus-visible:ring-2 focus-visible:ring-[rgba(55,120,255,0.75)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040f26]"
      aria-label={`Remove ${ariaLabel}`}
    >
      <span className="font-medium text-[color:rgba(255,255,255,0.85)]">{label}:</span>
      <span className="text-[color:rgba(255,255,255,0.9)]">{value}</span>
      <span className="sr-only">Remove {ariaLabel}</span>
      <X className="h-3.5 w-3.5 text-white/70 transition group-hover:text-white" aria-hidden="true" />
    </button>
  );
}

interface ToggleChipProps {
  label: string;
  isActive: boolean;
  onToggle: () => void;
}

function ToggleChip({ label, isActive, onToggle }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-[rgba(55,120,255,0.75)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081737]",
        isActive
          ? "border-[rgba(55,120,255,0.8)] bg-[rgba(55,120,255,0.15)] text-white shadow-[0_0_0_1px_rgba(55,120,255,0.3)]"
          : "border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10"
      )}
      aria-pressed={isActive}
      aria-label={`${isActive ? "Remove" : "Add"} tag filter ${label}`}
    >
      {label}
    </button>
  );
}

export interface KanbanFilters {
  search: string;
  assignee: string;
  priority: string;
  hierarchy: string;
  taskType: string;
  dueDate: string;
  tags: string[];
}

interface KanbanFiltersProps {
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  availableAssignees?: Array<{ id: string; name: string }>;
  availableTags?: string[];
}

export function KanbanFiltersComponent({
  filters,
  onFiltersChange,
  availableAssignees = [],
  availableTags = []
}: KanbanFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof KanbanFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilter('tags', [...filters.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag));
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      assignee: 'all',
      priority: 'all',
      hierarchy: 'all',
      taskType: 'all',
      dueDate: 'all',
      tags: []
    });
  };

  const activeFilters: Array<{ key: string; label: string; value: string; onClear: () => void }> = [];

  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: filters.search,
      onClear: () => updateFilter('search', '')
    });
  }

  if (filters.assignee !== 'all') {
    const assigneeLabel =
      filters.assignee === 'unassigned'
        ? 'Unassigned'
        : availableAssignees.find(a => a.id === filters.assignee)?.name || filters.assignee;
    activeFilters.push({
      key: 'assignee',
      label: 'Assignee',
      value: assigneeLabel,
      onClear: () => updateFilter('assignee', 'all')
    });
  }

  if (filters.priority !== 'all') {
    activeFilters.push({
      key: 'priority',
      label: 'Priority',
      value: filters.priority,
      onClear: () => updateFilter('priority', 'all')
    });
  }

  if (filters.hierarchy !== 'all') {
    activeFilters.push({
      key: 'hierarchy',
      label: 'Type',
      value: filters.hierarchy,
      onClear: () => updateFilter('hierarchy', 'all')
    });
  }

  if (filters.taskType !== 'all') {
    activeFilters.push({
      key: 'taskType',
      label: 'Task Type',
      value: filters.taskType.replace('_', ' '),
      onClear: () => updateFilter('taskType', 'all')
    });
  }

  if (filters.dueDate !== 'all') {
    activeFilters.push({
      key: 'dueDate',
      label: 'Due',
      value: filters.dueDate.replace('_', ' '),
      onClear: () => updateFilter('dueDate', 'all')
    });
  }

  filters.tags.forEach(tag => {
    activeFilters.push({
      key: `tag-${tag}`,
      label: 'Tag',
      value: tag,
      onClear: () => removeTag(tag)
    });
  });

  const activeFiltersCount = activeFilters.length;

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="kanban-filter-search" className="sr-only">
            Search tasks
          </label>
          <div
            className="group relative flex items-center gap-3 rounded-xl border border-white/10 px-4 py-2 shadow-[0_12px_32px_rgba(7,19,45,0.35)] transition focus-within:border-[rgba(55,120,255,0.45)] focus-within:ring-2 focus-within:ring-[rgba(55,120,255,0.55)] focus-within:ring-offset-2 focus-within:ring-offset-[#040f26]"
            style={{ backgroundColor: NAVY_SURFACE }}
          >
            <Search className="h-4 w-4 text-white/60" aria-hidden="true" />
            <Input
              id="kanban-filter-search"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="h-11 flex-1 border-none bg-transparent p-0 text-sm text-white caret-[#FF6A00] placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
            />
          </div>
        </div>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="relative flex items-center gap-2 rounded-xl border-white/20 bg-[#0A1F44] text-white shadow-[0_8px_24px_rgba(7,19,45,0.28)] transition hover:border-white/30 hover:bg-[#0C254F] focus-visible:ring-2 focus-visible:ring-[rgba(55,120,255,0.6)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040f26]"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6A00] text-xs font-semibold text-white shadow-[0_2px_6px_rgba(255,106,0,0.35)]">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 rounded-2xl border border-white/15 bg-[#081737] p-4 text-white shadow-[0_24px_48px_rgba(5,12,32,0.45)]"
            align="end"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold tracking-wide text-white/90">Filter Tasks</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-[color:rgba(55,120,255,0.85)] hover:text-white"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <User className="h-4 w-4 text-[color:rgba(55,120,255,0.85)]" aria-hidden="true" />
                  Assignee
                </label>
                <Select value={filters.assignee} onValueChange={(value) => updateFilter('assignee', value)}>
                  <SelectTrigger className="border-white/20 bg-[#0F2248] text-white focus-visible:ring-[rgba(55,120,255,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081737]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1C2D5A] bg-[#0F2248] text-white">
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="all">
                      All Assignees
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="unassigned">
                      Unassigned
                    </SelectItem>
                    {availableAssignees.map(assignee => (
                      <SelectItem
                        key={assignee.id}
                        value={assignee.id}
                        className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]"
                      >
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Priority</label>
                <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value)}>
                  <SelectTrigger className="border-white/20 bg-[#0F2248] text-white focus-visible:ring-[rgba(55,120,255,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081737]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1C2D5A] bg-[#0F2248] text-white">
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="all">
                      All Priorities
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="urgent">
                      Urgent
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="high">
                      High
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="medium">
                      Medium
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="low">
                      Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hierarchy Filter */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Type</label>
                <Select value={filters.hierarchy} onValueChange={(value) => updateFilter('hierarchy', value)}>
                  <SelectTrigger className="border-white/20 bg-[#0F2248] text-white focus-visible:ring-[rgba(55,120,255,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081737]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1C2D5A] bg-[#0F2248] text-white">
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="all">
                      All Types
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="initiative">
                      Initiatives
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="epic">
                      Epics
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="story">
                      Stories
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="task">
                      Tasks
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="subtask">
                      Sub-tasks
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type Filter */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Task Type</label>
                <Select value={filters.taskType} onValueChange={(value) => updateFilter('taskType', value)}>
                  <SelectTrigger className="border-white/20 bg-[#0F2248] text-white focus-visible:ring-[rgba(55,120,255,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081737]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1C2D5A] bg-[#0F2248] text-white">
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="all">
                      All Task Types
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="feature_request">
                      Feature Request
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="bug">
                      Bug
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="design">
                      Design
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="task">
                      Task
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <Calendar className="h-4 w-4 text-[color:rgba(55,120,255,0.85)]" aria-hidden="true" />
                  Due Date
                </label>
                <Select value={filters.dueDate} onValueChange={(value) => updateFilter('dueDate', value)}>
                  <SelectTrigger className="border-white/20 bg-[#0F2248] text-white focus-visible:ring-[rgba(55,120,255,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081737]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1C2D5A] bg-[#0F2248] text-white">
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="all">
                      Any Due Date
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="overdue">
                      Overdue
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="today">
                      Due Today
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="tomorrow">
                      Due Tomorrow
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="this_week">
                      Due This Week
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="next_week">
                      Due Next Week
                    </SelectItem>
                    <SelectItem className="data-[state=checked]:bg-[rgba(55,120,255,0.2)] data-[state=checked]:text-white focus:bg-[rgba(55,120,255,0.15)]" value="no_due_date">
                      No Due Date
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                    <Tag className="h-4 w-4 text-[color:rgba(55,120,255,0.85)]" aria-hidden="true" />
                    Tags
                  </label>
                  <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                    {availableTags.map(tag => {
                      const isActive = filters.tags.includes(tag);
                      return (
                        <ToggleChip
                          key={tag}
                          label={tag}
                          isActive={isActive}
                          onToggle={() => (isActive ? removeTag(tag) : addTag(tag))}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(filter => (
            <ActiveFilterChip
              key={filter.key}
              label={filter.label}
              value={filter.value}
              onClear={filter.onClear}
            />
          ))}
        </div>
      )}
    </div>
  );
}
