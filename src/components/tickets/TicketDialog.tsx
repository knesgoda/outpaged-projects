import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  MessageSquare,
  Star,
  Lock
} from "lucide-react";
import { 
  useTicket, 
  useTicketResponses, 
  useUpdateTicket,
  useCreateTicketResponse 
} from "@/hooks/useTickets";
import { useOptionalAuth } from "@/hooks/useOptionalAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";

interface TicketDialogProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDialog({ ticketId, open, onOpenChange }: TicketDialogProps) {
  const [newResponse, setNewResponse] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");

  const { user } = useOptionalAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();

  const { data: ticket } = useTicket(ticketId);
  const { data: responses } = useTicketResponses(ticketId);
  const updateTicket = useUpdateTicket();
  const createResponse = useCreateTicketResponse();

  const handleStatusUpdate = async (newStatus: string) => {
    if (!ticket) return;

    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      } else if (newStatus === 'closed') {
        updates.closed_at = new Date().toISOString();
      }

      await updateTicket.mutateAsync({ id: ticket.id, updates });
      
      toast({
        title: "Status Updated",
        description: `Ticket status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const handlePriorityUpdate = async (newPriority: string) => {
    if (!ticket) return;

    try {
      await updateTicket.mutateAsync({ 
        id: ticket.id, 
        updates: { priority: newPriority as any }
      });
      
      toast({
        title: "Priority Updated",
        description: `Ticket priority changed to ${newPriority}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket priority",
        variant: "destructive",
      });
    }
  };

  const handleSubmitResponse = async () => {
    if (!newResponse.trim()) return;

    try {
      await createResponse.mutateAsync({
        ticket_id: ticketId,
        content: newResponse,
        is_internal: isInternal,
        author_name: user ? undefined : authorName,
        author_email: user ? undefined : authorEmail,
      });

      setNewResponse("");
      setAuthorName("");
      setAuthorEmail("");
      
      toast({
        title: "Response Added",
        description: "Your response has been added to the ticket",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add response",
        variant: "destructive",
      });
    }
  };

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

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90svh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">#{ticket.ticket_number}</span>
            {ticket.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden p-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">
            {/* Ticket Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{ticket.description}</p>
                
                {/* Custom Fields */}
                {ticket.custom_fields && Object.keys(ticket.custom_fields).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Additional Information:</h4>
                    {Object.entries(ticket.custom_fields).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium capitalize">
                          {key.replace('_', ' ')}:
                        </span>{' '}
                        {value as string}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Responses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Responses ({responses?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {responses?.map((response, index) => (
                  <div key={response.id}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">
                            {response.author_name || 'Anonymous'}
                          </span>
                          {response.author_email && (
                            <span>({response.author_email})</span>
                          )}
                          {response.is_internal && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Internal
                            </Badge>
                          )}
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">
                          {response.content}
                        </p>
                      </div>
                    </div>
                    {index < (responses?.length || 0) - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}

                {(!responses || responses.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No responses yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Add Response */}
            <Card>
              <CardHeader>
                <CardTitle>Add Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Your Name</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Your Email</label>
                      <input
                        type="email"
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        value={authorEmail}
                        onChange={(e) => setAuthorEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Textarea
                    placeholder="Write your response..."
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="internal"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    <label htmlFor="internal" className="text-sm">
                      Internal note (not visible to customer)
                    </label>
                  </div>
                )}

                <Button 
                  onClick={handleSubmitResponse}
                  disabled={!newResponse.trim() || createResponse.isPending}
                  className="w-full"
                >
                  {createResponse.isPending ? "Adding Response..." : "Add Response"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 overflow-y-auto">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{ticket.customer_email}</span>
                </div>
                {ticket.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{ticket.customer_phone}</span>
                  </div>
                )}
                {ticket.customer_company && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{ticket.customer_company}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={ticket.status}
                    onValueChange={handleStatusUpdate}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="pending_customer">Pending Customer</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={ticket.priority}
                    onValueChange={handlePriorityUpdate}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Category</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: ticket.category?.color }}
                    />
                    {ticket.category?.name}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}