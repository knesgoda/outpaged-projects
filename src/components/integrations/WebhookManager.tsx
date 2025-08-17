import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Webhook, Plus } from 'lucide-react';

export function WebhookManager() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhook Management</h2>
          <p className="text-muted-foreground">Configure webhooks to integrate with external services</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Webhook
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Webhook className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Webhooks Configured</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first webhook to start receiving real-time notifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}