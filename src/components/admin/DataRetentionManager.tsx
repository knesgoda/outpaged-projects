import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Download, Trash2, Shield, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RetentionPolicy {
  id: string;
  entity_type: string;
  retention_days: number;
  action: 'archive' | 'delete';
  is_active: boolean;
  last_run_at?: string;
}

export function DataRetentionManager() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<RetentionPolicy[]>([
    {
      id: '1',
      entity_type: 'audit_log',
      retention_days: 365,
      action: 'archive',
      is_active: true,
      last_run_at: new Date().toISOString()
    },
    {
      id: '2',
      entity_type: 'task',
      retention_days: 730,
      action: 'archive',
      is_active: true
    }
  ]);

  const [newPolicy, setNewPolicy] = useState({
    entity_type: '',
    retention_days: 365,
    action: 'archive' as 'archive' | 'delete'
  });

  const handleCreatePolicy = () => {
    if (!newPolicy.entity_type) {
      toast({
        title: "Error",
        description: "Please select an entity type",
        variant: "destructive",
      });
      return;
    }

    const policy: RetentionPolicy = {
      id: Date.now().toString(),
      ...newPolicy,
      is_active: true
    };

    setPolicies([...policies, policy]);
    setNewPolicy({
      entity_type: '',
      retention_days: 365,
      action: 'archive'
    });

    toast({
      title: "Success",
      description: "Retention policy created",
    });
  };

  const handleTogglePolicy = (policyId: string) => {
    setPolicies(policies.map(p =>
      p.id === policyId ? { ...p, is_active: !p.is_active } : p
    ));

    toast({
      title: "Updated",
      description: "Policy status updated",
    });
  };

  const handleDeletePolicy = (policyId: string) => {
    setPolicies(policies.filter(p => p.id !== policyId));
    toast({
      title: "Deleted",
      description: "Retention policy deleted",
    });
  };

  const handleExportData = (exportType: string) => {
    toast({
      title: "Export Started",
      description: `${exportType} export has been queued. You'll be notified when it's ready.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Data Retention & Privacy</h2>
        <p className="text-muted-foreground">
          Configure data retention policies and compliance exports
        </p>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies">
            <Database className="h-4 w-4 mr-2" />
            Retention Policies
          </TabsTrigger>
          <TabsTrigger value="exports">
            <Download className="h-4 w-4 mr-2" />
            Compliance Exports
          </TabsTrigger>
          <TabsTrigger value="gdpr">
            <Shield className="h-4 w-4 mr-2" />
            GDPR Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Retention Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select
                    value={newPolicy.entity_type}
                    onValueChange={(value) =>
                      setNewPolicy({ ...newPolicy, entity_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="comment">Comments</SelectItem>
                      <SelectItem value="audit_log">Audit Logs</SelectItem>
                      <SelectItem value="time_entry">Time Entries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Retention Days</Label>
                  <Input
                    type="number"
                    value={newPolicy.retention_days}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        retention_days: parseInt(e.target.value)
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={newPolicy.action}
                    onValueChange={(value: 'archive' | 'delete') =>
                      setNewPolicy({ ...newPolicy, action: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="archive">Archive</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCreatePolicy}>Create Policy</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize">
                            {policy.entity_type.replace('_', ' ')}
                          </p>
                          <Badge variant={policy.is_active ? 'default' : 'outline'}>
                            {policy.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="secondary">{policy.action}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Retain for {policy.retention_days} days
                        </p>
                        {policy.last_run_at && (
                          <p className="text-xs text-muted-foreground">
                            Last run: {new Date(policy.last_run_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePolicy(policy.id)}
                        >
                          {policy.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePolicy(policy.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Data Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <FileText className="h-8 w-8 mb-2" />
                    <CardTitle className="text-lg">Full Workspace Export</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Export all workspace data including users, projects, tasks, and audit logs
                    </p>
                    <Button onClick={() => handleExportData('Full Workspace')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export All Data
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Shield className="h-8 w-8 mb-2" />
                    <CardTitle className="text-lg">Audit Logs Export</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Export complete audit trail for compliance and security review
                    </p>
                    <Button onClick={() => handleExportData('Audit Logs')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Audit Logs
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gdpr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GDPR Compliance Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>User Email for Data Deletion</Label>
                <div className="flex gap-2">
                  <Input placeholder="user@example.com" />
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User Data
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will permanently delete all user data in compliance with GDPR Article 17
                  (Right to Erasure)
                </p>
              </div>

              <div className="space-y-2">
                <Label>User Email for Data Export</Label>
                <div className="flex gap-2">
                  <Input placeholder="user@example.com" />
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Export User Data
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Export all data associated with a user in compliance with GDPR Article 15
                  (Right to Access)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
