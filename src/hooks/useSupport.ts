import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTicket,
  getTicket,
  listMyTickets,
  updateTicketStatus,
} from "@/services/support";
import type { SupportTicket } from "@/types";

const STALE_TIME = 1000 * 60 * 5;

export function useMyTickets() {
  return useQuery<SupportTicket[]>({
    queryKey: ["support", "tickets", "me"],
    queryFn: () => listMyTickets(),
    staleTime: STALE_TIME,
  });
}

export function useTicket(id: string | null | undefined) {
  const normalized = id?.trim();

  return useQuery<SupportTicket | null>({
    queryKey: ["support", "ticket", normalized],
    queryFn: () => getTicket(normalized ?? ""),
    enabled: Boolean(normalized),
    staleTime: STALE_TIME,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support", "tickets", "me"] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportTicket["status"] }) =>
      updateTicketStatus(id, status),
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["support", "ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["support", "tickets", "me"] });
    },
  });
}
