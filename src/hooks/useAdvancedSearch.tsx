import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import type { SearchResult as BaseSearchResult } from '@/types';

export type AdvancedSearchResult = BaseSearchResult & {
  description?: string;
  match_field: string;
  relevance_score: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export interface SearchFilters {
  types: ('project' | 'task' | 'comment' | 'team_member')[];
  status?: string[];
  priority?: string[];
  assignee?: string[];
  project?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  tags?: string[];
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  created_at: string;
}

export function useAdvancedSearch() {
  const { user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AdvancedSearchResult[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Global search function
  const search = async (query: string, filters: SearchFilters = { types: ['project', 'task', 'comment', 'team_member'] }) => {
    if (!user || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results: AdvancedSearchResult[] = [];
      
      // Search projects
      if (filters.types.includes('project')) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, description, status, created_at, updated_at, owner_id')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

        if (projects) {
          projects.forEach(project => {
            const matchField = project.name.toLowerCase().includes(query.toLowerCase()) ? 'name' : 'description';
            const relevance = calculateRelevance(query, project.name + ' ' + (project.description || ''));
            results.push({
              id: project.id,
              type: 'project',
              title: project.name,
              description: project.description || '',
              match_field: matchField,
              relevance_score: relevance,
              metadata: { status: project.status, owner_id: project.owner_id },
              created_at: project.created_at,
              updated_at: project.updated_at,
              snippet: project.description || null,
              url: `/projects/${project.id}`,
              project_id: project.id,
              score: relevance,
            });
          });
        }
      }

      // Search tasks
      if (filters.types.includes('task')) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select(`
            id, title, description, status, priority, created_at, updated_at, 
            assignee_id, reporter_id, project_id,
            projects!inner(name)
          `)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

        if (tasks) {
          tasks.forEach(task => {
            const matchField = task.title.toLowerCase().includes(query.toLowerCase()) ? 'title' : 'description';
            const relevance = calculateRelevance(query, task.title + ' ' + (task.description || ''));
            results.push({
              id: task.id,
              type: 'task',
              title: task.title,
              description: task.description || '',
              match_field: matchField,
              relevance_score: relevance,
              metadata: {
                status: task.status,
                priority: task.priority,
                project_name: task.projects?.name,
                project_id: task.project_id,
                assignee_id: task.assignee_id
              },
              created_at: task.created_at,
              updated_at: task.updated_at,
              snippet: task.description || null,
              url: `/tasks/${task.id}`,
              project_id: task.project_id,
              score: relevance,
            });
          });
        }
      }

      // Search comments
      if (filters.types.includes('comment')) {
        const { data: comments } = await supabase
          .from('comments')
          .select(`
            id, content, created_at, updated_at, author_id, task_id,
            tasks!inner(title, project_id, projects!inner(name))
          `)
          .ilike('content', `%${query}%`);

        if (comments) {
          comments.forEach(comment => {
            const relevance = calculateRelevance(query, comment.content);
              results.push({
                id: comment.id,
                type: 'comment',
                title: `Comment on: ${comment.tasks?.title}`,
                description: comment.content,
                match_field: 'content',
              relevance_score: relevance,
              metadata: {
                task_id: comment.task_id,
                task_title: comment.tasks?.title,
                project_name: comment.tasks?.projects?.name,
                author_id: comment.author_id
              },
              created_at: comment.created_at,
              updated_at: comment.updated_at,
                snippet: comment.content,
                url: comment.task_id
                  ? `/tasks/${comment.task_id}#comment-${comment.id}`
                  : '#',
                project_id: comment.tasks?.project_id ?? null,
                score: relevance,
              });
          });
        }
      }

      // Search team members
      if (filters.types.includes('team_member')) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, role, created_at, updated_at')
          .ilike('full_name', `%${query}%`);

        if (profiles) {
          profiles.forEach(profile => {
            const relevance = calculateRelevance(query, profile.full_name || '');
            results.push({
              id: profile.id,
              type: 'team_member',
              title: profile.full_name || 'Unknown User',
              description: `Role: ${profile.role}`,
              match_field: 'full_name',
              relevance_score: relevance,
              metadata: { role: profile.role, user_id: profile.user_id },
              created_at: profile.created_at,
              updated_at: profile.updated_at,
              snippet: `Role: ${profile.role}`,
              url: `/people/${profile.user_id ?? profile.id}`,
              project_id: null,
              score: relevance,
            });
          });
        }
      }

      // Apply additional filters
      let filteredResults = results;

      if (filters.status?.length) {
        filteredResults = filteredResults.filter(result => 
          !result.metadata?.status || filters.status!.includes(result.metadata.status)
        );
      }

      if (filters.priority?.length) {
        filteredResults = filteredResults.filter(result => 
          !result.metadata?.priority || filters.priority!.includes(result.metadata.priority)
        );
      }

      if (filters.project?.length) {
        filteredResults = filteredResults.filter(result => 
          !result.metadata?.project_id || filters.project!.includes(result.metadata.project_id)
        );
      }

      if (filters.dateRange) {
        filteredResults = filteredResults.filter(result => {
          const resultDate = new Date(result.created_at);
          return resultDate >= filters.dateRange!.from && resultDate <= filters.dateRange!.to;
        });
      }

      // Sort by relevance score
      filteredResults.sort((a, b) => b.relevance_score - a.relevance_score);

      setSearchResults(filteredResults);
      
      // Add to recent searches
      addToRecentSearches(query);

    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate relevance score
  const calculateRelevance = (query: string, text: string): number => {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    let score = 0;
    
    // Exact match gets highest score
    if (textLower.includes(queryLower)) {
      score += 100;
    }
    
    // Word matches
    const queryWords = queryLower.split(' ');
    queryWords.forEach(word => {
      if (textLower.includes(word)) {
        score += 20;
      }
    });
    
    // Position bonus (earlier matches score higher)
    const position = textLower.indexOf(queryLower);
    if (position !== -1) {
      score += Math.max(0, 50 - position);
    }
    
    return score;
  };

  // Add to recent searches
  const addToRecentSearches = (query: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q !== query);
      return [query, ...filtered].slice(0, 10); // Keep last 10 searches
    });
  };

  // Save search
  const saveSearch = async (name: string, query: string, filters: SearchFilters) => {
    if (!user) return;

    try {
      const searchData = {
        name,
        query,
        filters: JSON.stringify(filters),
        user_id: user.id,
      };

      // For now, we'll store in localStorage since we don't have a saved_searches table
      const existingSavedSearches = JSON.parse(localStorage.getItem('saved_searches') || '[]');
      const newSearch: SavedSearch = {
        id: `search-${Date.now()}`,
        name,
        query,
        filters,
        created_at: new Date().toISOString(),
      };
      
      const updatedSearches = [newSearch, ...existingSavedSearches];
      localStorage.setItem('saved_searches', JSON.stringify(updatedSearches));
      setSavedSearches(updatedSearches);

      toast({
        title: "Search Saved",
        description: `Search "${name}" has been saved.`,
      });
    } catch (error: any) {
      console.error('Error saving search:', error);
      toast({
        title: "Error",
        description: "Failed to save search.",
        variant: "destructive",
      });
    }
  };

  // Load saved searches
  const loadSavedSearches = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved_searches') || '[]');
      setSavedSearches(saved);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  // Delete saved search
  const deleteSavedSearch = (searchId: string) => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved_searches') || '[]');
      const filtered = saved.filter((s: SavedSearch) => s.id !== searchId);
      localStorage.setItem('saved_searches', JSON.stringify(filtered));
      setSavedSearches(filtered);

      toast({
        title: "Search Deleted",
        description: "Saved search has been removed.",
      });
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
  };

  // Clear search results
  const clearResults = () => {
    setSearchResults([]);
  };

  // Initialize
  useEffect(() => {
    if (user) {
      loadSavedSearches();
    }
  }, [user]);

  return {
    search,
    searchResults,
    isSearching,
    savedSearches,
    recentSearches,
    saveSearch,
    deleteSavedSearch,
    clearResults,
    addToRecentSearches,
  };
}