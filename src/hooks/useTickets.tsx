import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalAuth } from './useOptionalAuth';

export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  required_fields: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  category_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_company: string | null;
  custom_fields: Record<string, any>;
  assigned_to: string | null;
  created_by: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  category?: TicketCategory;
}

export interface TicketResponse {
  id: string;
  ticket_id: string;
  content: string;
  is_internal: boolean;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  title: string;
  description: string;
  category_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_company?: string;
  custom_fields?: Record<string, any>;
}

export interface TicketFilter {
  status?: string;
  priority?: string;
  category_id?: string;
  assigned_to?: string;
}

export function useTicketCategories() {
  return useQuery({
    queryKey: ['ticket-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as TicketCategory[];
    },
  });
}

export function useTickets(filter?: TicketFilter) {
  const { user } = useOptionalAuth();
  
  return useQuery({
    queryKey: ['tickets', filter],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          category:ticket_categories(*)
        `)
        .order('created_at', { ascending: false });

      if (filter?.status) {
        query = query.eq('status', filter.status as any);
      }
      if (filter?.priority) {
        query = query.eq('priority', filter.priority as any);
      }
      if (filter?.category_id) {
        query = query.eq('category_id', filter.category_id);
      }
      if (filter?.assigned_to) {
        query = query.eq('assigned_to', filter.assigned_to);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Ticket[];
    },
  });
}

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          category:ticket_categories(*)
        `)
        .eq('id', ticketId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Ticket | null;
    },
    enabled: !!ticketId,
  });
}

export function useTicketResponses(ticketId: string) {
  const { user } = useOptionalAuth();
  
  return useQuery({
    queryKey: ['ticket-responses', ticketId],
    queryFn: async () => {
      let query = supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at');

      // If not admin, only show non-internal responses
      if (!user) {
        query = query.eq('is_internal', false);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as TicketResponse[];
    },
    enabled: !!ticketId,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketData: CreateTicketData) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert([ticketData as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Ticket> }) => {
      const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', data.id] });
    },
  });
}

export function useCreateTicketResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responseData: {
      ticket_id: string;
      content: string;
      is_internal?: boolean;
      author_name?: string;
      author_email?: string;
    }) => {
      const { data, error } = await supabase
        .from('ticket_responses')
        .insert([responseData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-responses', data.ticket_id] });
    },
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      // Manual calculation since RPC doesn't exist yet
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('status, priority, created_at');
      
      if (ticketsError) throw ticketsError;
      
      const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        avg_resolution_time: null, // Would need more complex calculation
      };
      
      return stats;
    },
  });
}