import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  Save,
  Clock,
  X,
  Bookmark,
  FileText,
  CheckSquare,
  FolderKanban,
  MessageSquare,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAdvancedSearch, SearchFilters, SearchResult } from '@/hooks/useAdvancedSearch';
import { toast } from '@/hooks/use-toast';

interface AdvancedSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  embedded?: boolean;
}

const typeIcons = {
  project: FolderKanban,
  task: CheckSquare,
  comment: MessageSquare,
  team_member: Users,
};

const typeColors = {
  project: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  task: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  comment: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  team_member: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export function AdvancedSearch({ onResultSelect, embedded = false }: AdvancedSearchProps) {
  const {
    search,
    searchResults,
    isSearching,
    savedSearches,
    recentSearches,
    saveSearch,
    deleteSavedSearch,
    clearResults,
  } = useAdvancedSearch();

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  
  const [filters, setFilters] = useState<SearchFilters>({
    types: ['project', 'task', 'comment', 'team_member'],
    status: [],
    priority: [],
    assignee: [],
    project: [],
    tags: [],
  });

  const handleSearch = (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (queryToSearch.trim()) {
      search(queryToSearch, filters);
    } else {
      clearResults();
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTypeToggle = (type: 'project' | 'task' | 'comment' | 'team_member') => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const handleSaveSearch = () => {
    if (searchName.trim() && query.trim()) {
      saveSearch(searchName, query, filters);
      setSaveDialogOpen(false);
      setSearchName('');
    }
  };

  const handleSavedSearchSelect = (savedSearch: any) => {
    setQuery(savedSearch.query);
    setFilters(savedSearch.filters);
    search(savedSearch.query, savedSearch.filters);
  };

  const clearAllFilters = () => {
    setFilters({
      types: ['project', 'task', 'comment', 'team_member'],
      status: [],
      priority: [],
      assignee: [],
      project: [],
      tags: [],
    });
  };

  const activeFilterCount = 
    (filters.status?.length || 0) +
    (filters.priority?.length || 0) +
    (filters.assignee?.length || 0) +
    (filters.project?.length || 0) +
    (filters.tags?.length || 0) +
    (filters.dateRange ? 1 : 0) +
    (filters.types.length < 4 ? 1 : 0);

  return (
    <div className={cn("space-y-4", !embedded && "p-6")}>
      {/* Search Header */}
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold">Search</h1>
          <p className="text-muted-foreground">
            Find projects, tasks, comments, and team members
          </p>
        </div>
      )}

      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search across all content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleSearch()} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-2">Recent:</span>
            {recentSearches.slice(0, 3).map((recent, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery(recent);
                  handleSearch(recent);
                }}
                className="h-7 text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                {recent}
              </Button>
            ))}
          </div>
        )}

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7">
                <Bookmark className="h-3 w-3 mr-1" />
                Saved ({savedSearches.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Saved Searches</h4>
                {savedSearches.map((saved) => (
                  <div key={saved.id} className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSavedSearchSelect(saved)}
                      className="flex-1 justify-start h-8"
                    >
                      {saved.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSavedSearch(saved.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Save Search */}
        {query.trim() && (
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7">
                <Save className="h-3 w-3 mr-1" />
                Save Search
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Search</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search-name">Search Name</Label>
                  <Input
                    id="search-name"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Enter a name for this search..."
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Query: "{query}"
                </div>
                <Button onClick={handleSaveSearch} disabled={!searchName.trim()}>
                  Save Search
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Advanced Filters
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Content Types */}
            <div>
              <Label className="text-sm font-medium">Content Types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(['project', 'task', 'comment', 'team_member'] as const).map((type) => {
                  const Icon = typeIcons[type];
                  return (
                    <Button
                      key={type}
                      variant={filters.types.includes(type) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTypeToggle(type)}
                      className="h-8"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {type.replace('_', ' ')}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !filters.status?.includes(value)) {
                    handleFilterChange('status', [...(filters.status || []), value]);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add status filter..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {filters.status && filters.status.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.status.map((status) => (
                    <Badge key={status} variant="secondary">
                      {status}
                      <button
                        onClick={() => handleFilterChange('status', filters.status?.filter(s => s !== status))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Filter */}
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['low', 'medium', 'high', 'urgent'].map((priority) => (
                  <Button
                    key={priority}
                    variant={filters.priority?.includes(priority) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const current = filters.priority || [];
                      const updated = current.includes(priority)
                        ? current.filter(p => p !== priority)
                        : [...current, priority];
                      handleFilterChange('priority', updated);
                    }}
                    className="h-8"
                  >
                    {priority}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <Label className="text-sm font-medium">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !filters.dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "MMM d")} - {format(filters.dateRange.to, "MMM d")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange?.from}
                    selected={filters.dateRange}
                    onSelect={(range) => handleFilterChange('dateRange', range)}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {searchResults.map((result) => {
              const Icon = typeIcons[result.type];
              return (
                <div
                  key={`${result.type}-${result.id}`}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                    onResultSelect && "hover:border-primary"
                  )}
                  onClick={() => onResultSelect?.(result)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{result.title}</h4>
                        <Badge variant="outline" className={cn("text-xs", typeColors[result.type])}>
                          {result.type.replace('_', ' ')}
                        </Badge>
                        {result.metadata?.status && (
                          <Badge variant="secondary" className="text-xs">
                            {result.metadata.status}
                          </Badge>
                        )}
                        {result.metadata?.priority && (
                          <Badge 
                            variant={result.metadata.priority === 'urgent' ? 'destructive' : 'outline'} 
                            className="text-xs"
                          >
                            {result.metadata.priority}
                          </Badge>
                        )}
                      </div>
                      {result.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Match: {result.match_field}</span>
                        {result.metadata?.project_name && (
                          <>
                            <span>•</span>
                            <span>Project: {result.metadata.project_name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{format(new Date(result.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {query && !isSearching && searchResults.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <h3 className="font-medium mb-1">No results found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}