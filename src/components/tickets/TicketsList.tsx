import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MessageSquare, User } from "lucide-react";
import { useTickets, TicketFilter } from "@/hooks/useTickets";
import { TicketDialog } from "./TicketDialog";

interface TicketsListProps {
  filter?: TicketFilter;
}

export function TicketsList({ filter }: TicketsListProps) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const { data: tickets, isLoading } = useTickets(filter);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'pending_customer': return 'secondary';
      case 'resolved': return 'outline';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading tickets...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No tickets found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No tickets match your current filter criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono">
                  #{ticket.ticket_number}
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate font-medium">
                    {ticket.title}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{ticket.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {ticket.customer_email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: ticket.category?.color }}
                    />
                    {ticket.category?.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getPriorityColor(ticket.priority)}>
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(ticket.status)}>
                    {formatStatus(ticket.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTicket(ticket.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selectedTicket && (
        <TicketDialog
          ticketId={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
        />
      )}
    </>
  );
}