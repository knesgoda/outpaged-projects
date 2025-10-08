import { supabase } from "@/integrations/supabase/client";
import type { SupportTicket } from "@/types";
import { mapSupabaseError } from "./utils";
import { requireUserId } from "./session";

const TICKET_SELECT =
  "id, user_id, subject, body, status, priority, created_at, updated_at";

export async function listMyTickets(): Promise<SupportTicket[]> {
  const userId = await requireUserId();

  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .select(TICKET_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw mapSupabaseError(error, "Unable to load your support tickets.");
  }

  return data ?? [];
}

export async function createTicket(
  input: Pick<SupportTicket, "subject" | "body" | "priority">
): Promise<SupportTicket> {
  const userId = await requireUserId();

  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .insert({ ...input, user_id: userId })
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to create the support ticket.");
  }

  return data;
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load the support ticket.");
  }

  return data ?? null;
}

export async function updateTicketStatus(
  id: string,
  status: SupportTicket["status"]
): Promise<SupportTicket> {
  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to update the ticket status.");
  }

  return data;
}
