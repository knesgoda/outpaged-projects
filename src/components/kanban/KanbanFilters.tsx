
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const activeFiltersCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'search' && value) return count + 1;
    if (key === 'tags' && Array.isArray(value) && value.length > 0) return count + 1;
    if (typeof value === 'string' && value !== 'all' && value !== '') return count + 1;
    return count;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-muted/30 border-muted focus:bg-background"
          />
        </div>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Tasks</h4>
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="text-muted-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assignee
                </label>
                <Select value={filters.assignee} onValueChange={(value) => updateFilter('assignee', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {availableAssignees.map(assignee => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hierarchy Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={filters.hierarchy} onValueChange={(value) => updateFilter('hierarchy', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="initiative">Initiatives</SelectItem>
                    <SelectItem value="epic">Epics</SelectItem>
                    <SelectItem value="story">Stories</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="subtask">Sub-tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Type</label>
                <Select value={filters.taskType} onValueChange={(value) => updateFilter('taskType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Task Types</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Due Date
                </label>
                <Select value={filters.dueDate} onValueChange={(value) => updateFilter('dueDate', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Due Date</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="today">Due Today</SelectItem>
                    <SelectItem value="tomorrow">Due Tomorrow</SelectItem>
                    <SelectItem value="this_week">Due This Week</SelectItem>
                    <SelectItem value="next_week">Due Next Week</SelectItem>
                    <SelectItem value="no_due_date">No Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {availableTags.map(tag => (
                      <Badge 
                        key={tag}
                        variant={filters.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => filters.tags.includes(tag) ? removeTag(tag) : addTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
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
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('search', '')}
              />
            </Badge>
          )}
          {filters.assignee !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Assignee: {filters.assignee === 'unassigned' ? 'Unassigned' : 
                availableAssignees.find(a => a.id === filters.assignee)?.name || filters.assignee}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('assignee', 'all')}
              />
            </Badge>
          )}
          {filters.priority !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Priority: {filters.priority}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('priority', 'all')}
              />
            </Badge>
          )}
          {filters.hierarchy !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type: {filters.hierarchy}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('hierarchy', 'all')}
              />
            </Badge>
          )}
          {filters.taskType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Task Type: {filters.taskType.replace('_', ' ')}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('taskType', 'all')}
              />
            </Badge>
          )}
          {filters.dueDate !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Due: {filters.dueDate.replace('_', ' ')}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilter('dueDate', 'all')}
              />
            </Badge>
          )}
          {filters.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              Tag: {tag}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
