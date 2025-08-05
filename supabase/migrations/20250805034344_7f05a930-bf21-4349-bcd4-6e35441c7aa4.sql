-- Create ticket categories table
CREATE TABLE public.ticket_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  required_fields JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket priority enum
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create ticket status enum
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'pending_customer', 'resolved', 'closed');

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.ticket_categories(id) NOT NULL,
  priority public.ticket_priority DEFAULT 'medium',
  status public.ticket_status DEFAULT 'open',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_company TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  assigned_to UUID,
  created_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket responses table (for both customer and internal responses)
CREATE TABLE public.ticket_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  author_id UUID,
  author_name TEXT,
  author_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket ratings table
CREATE TABLE public.ticket_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to get next ticket number
CREATE OR REPLACE FUNCTION public.get_next_ticket_number()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(ticket_number), 0) + 1 
  INTO next_number
  FROM public.tickets;
  
  RETURN next_number;
END;
$$;

-- Create trigger to assign ticket number
CREATE OR REPLACE FUNCTION public.assign_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number = get_next_ticket_number();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_assign_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION assign_ticket_number();

-- Add updated_at triggers
CREATE TRIGGER update_ticket_categories_updated_at
  BEFORE UPDATE ON public.ticket_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_responses_updated_at
  BEFORE UPDATE ON public.ticket_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_categories
CREATE POLICY "Anyone can view active categories" ON public.ticket_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.ticket_categories
  FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for tickets
CREATE POLICY "Customers can view their own tickets" ON public.tickets
  FOR SELECT USING (customer_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Anyone can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all tickets" ON public.tickets
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update tickets" ON public.tickets
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Assigned users can update their tickets" ON public.tickets
  FOR UPDATE USING (auth.uid() = assigned_to);

-- RLS Policies for ticket_responses
CREATE POLICY "Anyone can view non-internal responses" ON public.ticket_responses
  FOR SELECT USING (NOT is_internal);

CREATE POLICY "Admins can view all responses" ON public.ticket_responses
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can create responses" ON public.ticket_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can create internal responses" ON public.ticket_responses
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR NOT is_internal);

CREATE POLICY "Authors can update their responses" ON public.ticket_responses
  FOR UPDATE USING (auth.uid() = author_id);

-- RLS Policies for ticket_ratings
CREATE POLICY "Anyone can view ratings" ON public.ticket_ratings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create ratings" ON public.ticket_ratings
  FOR INSERT WITH CHECK (true);

-- Insert default categories
INSERT INTO public.ticket_categories (name, description, color, required_fields) VALUES
  ('Technical Support', 'Issues with software, hardware, or technical problems', '#ef4444', '["steps_to_reproduce", "error_message"]'),
  ('Billing', 'Questions about payments, invoices, or account billing', '#f59e0b', '["account_number", "invoice_number"]'),
  ('General Inquiry', 'General questions or information requests', '#6b7280', '[]'),
  ('Bug Reports', 'Report software bugs or unexpected behavior', '#dc2626', '["steps_to_reproduce", "expected_behavior", "actual_behavior"]'),
  ('Feature Requests', 'Suggestions for new features or improvements', '#059669', '["use_case", "priority_justification"]');