import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Download, Filter, Search, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
}

export function AuditLogViewer() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  // Mock audit data
  const mockAuditLogs: AuditEntry[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      userId: 'user-1',
      userEmail: 'admin@outpaged.com',
      action: 'UPDATE',
      entityType: 'task',
      entityId: 'task-123',
      changes: { status: { old: 'in_progress', new: 'done' } },
      ipAddress: '192.168.1.1',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      userId: 'user-2',
      userEmail: 'user@outpaged.com',
      action: 'CREATE',
      entityType: 'project',
      entityId: 'proj-456',
      changes: { name: { old: null, new: 'New Project' } },
      ipAddress: '192.168.1.2',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      userId: 'user-1',
      userEmail: 'admin@outpaged.com',
      action: 'DELETE',
      entityType: 'comment',
      entityId: 'comment-789',
      changes: {},
      ipAddress: '192.168.1.1',
    },
  ];

  const handleExport = () => {
    toast({
      title: 'Exporting Audit Logs',
      description: 'Your audit log export will be ready shortly.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Log</h2>
          <p className="text-muted-foreground">Complete history of all system changes</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, entity, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAuditLogs.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{entry.userEmail}</span>
                      <span className="text-muted-foreground">
                        {entry.action.toLowerCase()}d
                      </span>
                      <span className="font-medium">{entry.entityType}</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {entry.entityId}
                      </code>
                    </div>
                    {Object.keys(entry.changes).length > 0 && (
                      <div className="text-sm text-muted-foreground ml-6">
                        {Object.entries(entry.changes).map(([field, change]) => (
                          <div key={field}>
                            <span className="font-medium">{field}:</span>{' '}
                            <span className="line-through">{change.old}</span> →{' '}
                            <span className="text-foreground">{change.new}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {entry.ipAddress && (
                      <div className="text-xs text-muted-foreground mt-2 ml-6">
                        IP: {entry.ipAddress}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
