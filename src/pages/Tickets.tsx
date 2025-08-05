import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog";
import { TicketsList } from "@/components/tickets/TicketsList";
import { TicketStats } from "@/components/tickets/TicketStats";

export default function Tickets() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">
            Manage customer support tickets and track their resolution
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      <TicketStats />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Tickets</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="pending">Pending Customer</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TicketsList />
        </TabsContent>

        <TabsContent value="open" className="space-y-4">
          <TicketsList filter={{ status: 'open' }} />
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          <TicketsList filter={{ status: 'in_progress' }} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <TicketsList filter={{ status: 'pending_customer' }} />
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <TicketsList filter={{ status: 'resolved' }} />
        </TabsContent>
      </Tabs>

      <CreateTicketDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}