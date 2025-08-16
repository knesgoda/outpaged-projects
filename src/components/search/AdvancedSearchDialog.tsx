import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Calendar as CalendarIcon, X, User, Tag } from "lucide-react";
import { format } from "date-fns";

interface AdvancedSearchDialogProps {
  children: React.ReactNode;
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  query: string;
  status: string[];
  priority: string[];
  assignee: string[];
  project: string[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
  tags: string[];
  taskType: string[];
}

export const AdvancedSearchDialog = ({ children, onSearch }: AdvancedSearchDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    status: [],
    priority: [],
    assignee: [],
    project: [],
    dateRange: {},
    tags: [],
    taskType: [],
  });

  const handleSearch = () => {
    onSearch(filters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      status: [],
      priority: [],
      assignee: [],
      project: [],
      dateRange: {},
      tags: [],
      taskType: [],
    });
  };

  const statusOptions = ["todo", "in_progress", "in_review", "done", "cancelled"];
  const priorityOptions = ["low", "medium", "high", "urgent"];
  const taskTypeOptions = ["task", "bug", "feature", "epic", "story"];

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    setFilters({ ...filters, [key]: newArray });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search & Filters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Text Search */}
          <div>
            <Label htmlFor="search-query">Search Query</Label>
            <Input
              id="search-query"
              placeholder="Search in titles, descriptions, comments..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Filter */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Status
              </h3>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filters.status.includes(status)}
                      onCheckedChange={() => toggleArrayFilter("status", status)}
                    />
                    <Label htmlFor={`status-${status}`} className="capitalize">
                      {status.replace("_", " ")}
                    </Label>
                  </div>
                ))}
              </div>
            </Card>

            {/* Priority Filter */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Priority
              </h3>
              <div className="space-y-2">
                {priorityOptions.map((priority) => (
                  <div key={priority} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={filters.priority.includes(priority)}
                      onCheckedChange={() => toggleArrayFilter("priority", priority)}
                    />
                    <Label htmlFor={`priority-${priority}`} className="capitalize">
                      {priority}
                    </Label>
                  </div>
                ))}
              </div>
            </Card>

            {/* Task Type Filter */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">Task Type</h3>
              <div className="space-y-2">
                {taskTypeOptions.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.taskType.includes(type)}
                      onCheckedChange={() => toggleArrayFilter("taskType", type)}
                    />
                    <Label htmlFor={`type-${type}`} className="capitalize">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </Card>

            {/* Date Range */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Date Range
              </h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        {filters.dateRange.from ? (
                          format(filters.dateRange.from, "PPP")
                        ) : (
                          <span className="text-muted-foreground">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from}
                        onSelect={(date) => 
                          setFilters({ 
                            ...filters, 
                            dateRange: { ...filters.dateRange, from: date } 
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        {filters.dateRange.to ? (
                          format(filters.dateRange.to, "PPP")
                        ) : (
                          <span className="text-muted-foreground">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to}
                        onSelect={(date) => 
                          setFilters({ 
                            ...filters, 
                            dateRange: { ...filters.dateRange, to: date } 
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </Card>
          </div>

          {/* Active Filters Display */}
          <div className="flex flex-wrap gap-2">
            {filters.status.map((status) => (
              <Badge key={`status-${status}`} variant="secondary" className="gap-1">
                Status: {status.replace("_", " ")}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter("status", status)}
                />
              </Badge>
            ))}
            {filters.priority.map((priority) => (
              <Badge key={`priority-${priority}`} variant="secondary" className="gap-1">
                Priority: {priority}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter("priority", priority)}
                />
              </Badge>
            ))}
            {filters.taskType.map((type) => (
              <Badge key={`type-${type}`} variant="secondary" className="gap-1">
                Type: {type}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter("taskType", type)}
                />
              </Badge>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};