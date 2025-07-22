-- Fix search path for new functions
ALTER FUNCTION public.get_next_ticket_number(UUID) SET search_path = 'public';
ALTER FUNCTION public.assign_ticket_number() SET search_path = 'public';