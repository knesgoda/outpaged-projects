import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Plus, 
  Settings, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Inbox,
  Filter,
  Zap
} from 'lucide-react';

interface EmailRule {
  id: string;
  name: string;
  email_pattern: string;
  subject_pattern?: string;
  project_id: string;
  task_template: {
    title_template: string;
    description_template: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: string;
    labels: string[];
  };
  is_active: boolean;
  created_at: string;
  processed_count: number;
}

interface ProcessedEmail {
  id: string;
  from_email: string;
  subject: string;
  body_preview: string;
  task_id?: string;
  rule_id: string;
  processed_at: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
}

interface EmailTaskCreatorProps {
  projectId: string;
}

export function EmailTaskCreator({ projectId }: EmailTaskCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [processedEmails, setProcessedEmails] = useState<ProcessedEmail[]>([]);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [newRule, setNewRule] = useState({
    name: '',
    email_pattern: '',
    subject_pattern: '',
    task_template: {
      title_template: '{{subject}}',
      description_template: 'From: {{from}}\n\n{{body}}',
      priority: 'medium' as const,
      assignee_id: '',
      labels: [] as string[],
    },
  });

  useEffect(() => {
    if (user && projectId) {
      loadRules();
      loadProcessedEmails();
      generateEmailAddress();
    }
  }, [user, projectId]);

  const generateEmailAddress = () => {
    // Generate a unique email address for this project
    const uniqueId = projectId.slice(0, 8);
    setEmailAddress(`tasks-${uniqueId}@yourdomain.com`);
  };

  const loadRules = async () => {
    try {
      // For demo purposes, load from localStorage
      const savedRules = localStorage.getItem(`email_rules_${projectId}`);
      if (savedRules) {
        setRules(JSON.parse(savedRules));
      }
    } catch (error) {
      console.error('Error loading email rules:', error);
    }
  };

  const loadProcessedEmails = async () => {
    try {
      // For demo purposes, load from localStorage
      const savedEmails = localStorage.getItem(`processed_emails_${projectId}`);
      if (savedEmails) {
        setProcessedEmails(JSON.parse(savedEmails));
      } else {
        // Add some demo processed emails
        const demoEmails: ProcessedEmail[] = [
          {
            id: '1',
            from_email: 'customer@example.com',
            subject: 'Bug report: Login not working',
            body_preview: 'Hi, I am unable to login to my account. The login button does not respond when clicked...',
            task_id: 'task-123',
            rule_id: 'rule-1',
            processed_at: new Date(Date.now() - 3600000).toISOString(),
            status: 'success'
          },
          {
            id: '2',
            from_email: 'support@vendor.com',
            subject: 'Feature request: Dark mode',
            body_preview: 'We would like to request a dark mode feature for the application...',
            task_id: 'task-124',
            rule_id: 'rule-1',
            processed_at: new Date(Date.now() - 7200000).toISOString(),
            status: 'success'
          }
        ];
        setProcessedEmails(demoEmails);
        localStorage.setItem(`processed_emails_${projectId}`, JSON.stringify(demoEmails));
      }
    } catch (error) {
      console.error('Error loading processed emails:', error);
    }
  };

  const saveRules = (updatedRules: EmailRule[]) => {
    setRules(updatedRules);
    localStorage.setItem(`email_rules_${projectId}`, JSON.stringify(updatedRules));
  };

  const createRule = async () => {
    if (!newRule.name || !newRule.email_pattern) {
      toast({
        title: "Validation Error",
        description: "Please fill in the required fields.",
        variant: "destructive",
      });
      return;
    }

    const rule: EmailRule = {
      id: crypto.randomUUID(),
      ...newRule,
      project_id: projectId,
      is_active: true,
      created_at: new Date().toISOString(),
      processed_count: 0,
    };

    const updatedRules = [...rules, rule];
    saveRules(updatedRules);

    toast({
      title: "Rule Created",
      description: `Email processing rule "${rule.name}" has been created.`,
    });

    setIsCreateRuleOpen(false);
    setNewRule({
      name: '',
      email_pattern: '',
      subject_pattern: '',
      task_template: {
        title_template: '{{subject}}',
        description_template: 'From: {{from}}\n\n{{body}}',
        priority: 'medium',
        assignee_id: '',
        labels: [],
      },
    });
  };

  const toggleRule = (ruleId: string) => {
    const updatedRules = rules.map(rule =>
      rule.id === ruleId ? { ...rule, is_active: !rule.is_active } : rule
    );
    saveRules(updatedRules);

    const rule = updatedRules.find(r => r.id === ruleId);
    toast({
      title: rule?.is_active ? "Rule Enabled" : "Rule Disabled",
      description: `Rule "${rule?.name}" has been ${rule?.is_active ? 'enabled' : 'disabled'}.`,
    });
  };

  const copyEmailAddress = () => {
    navigator.clipboard.writeText(emailAddress);
    toast({
      title: "Copied",
      description: "Email address copied to clipboard.",
    });
  };

  const testEmailProcessing = async () => {
    // Simulate processing an email
    const testEmail: ProcessedEmail = {
      id: crypto.randomUUID(),
      from_email: 'test@example.com',
      subject: 'Test email for task creation',
      body_preview: 'This is a test email to verify the email-to-task processing is working correctly.',
      task_id: 'task-' + Date.now(),
      rule_id: rules[0]?.id || 'default',
      processed_at: new Date().toISOString(),
      status: 'success'
    };

    const updatedEmails = [testEmail, ...processedEmails];
    setProcessedEmails(updatedEmails);
    localStorage.setItem(`processed_emails_${projectId}`, JSON.stringify(updatedEmails));

    toast({
      title: "Test Email Processed",
      description: "Test email has been successfully converted to a task.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email to Task Integration</h2>
          <p className="text-muted-foreground">Convert emails directly into tasks</p>
        </div>
        
        <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Processing Rule</DialogTitle>
              <DialogDescription>
                Configure how emails should be converted into tasks
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name*</Label>
                  <Input
                    id="rule-name"
                    placeholder="Customer Support Emails"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email-pattern">From Email Pattern*</Label>
                  <Input
                    id="email-pattern"
                    placeholder="*@example.com or support@*"
                    value={newRule.email_pattern}
                    onChange={(e) => setNewRule(prev => ({ ...prev, email_pattern: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject-pattern">Subject Pattern (Optional)</Label>
                <Input
                  id="subject-pattern"
                  placeholder="Bug:* or Feature Request:*"
                  value={newRule.subject_pattern}
                  onChange={(e) => setNewRule(prev => ({ ...prev, subject_pattern: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Task Template</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title-template">Title Template</Label>
                    <Input
                      id="title-template"
                      placeholder="{{subject}}"
                      value={newRule.task_template.title_template}
                      onChange={(e) => setNewRule(prev => ({
                        ...prev,
                        task_template: { ...prev.task_template, title_template: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Default Priority</Label>
                    <Select
                      value={newRule.task_template.priority}
                      onValueChange={(value: any) => setNewRule(prev => ({
                        ...prev,
                        task_template: { ...prev.task_template, priority: value }
                      }))}
                    >
                      <SelectTrigger>
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description-template">Description Template</Label>
                  <Textarea
                    id="description-template"
                    placeholder="From: {{from}}&#10;&#10;{{body}}"
                    value={newRule.task_template.description_template}
                    onChange={(e) => setNewRule(prev => ({
                      ...prev,
                      task_template: { ...prev.task_template, description_template: e.target.value }
                    }))}
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateRuleOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createRule}>
                  Create Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Email Address Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Project Email Address
          </CardTitle>
          <CardDescription>
            Send emails to this address to automatically create tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={emailAddress}
              readOnly
              className="font-mono bg-muted"
            />
            <Button variant="outline" onClick={copyEmailAddress} className="gap-2">
              <Copy className="w-4 h-4" />
              Copy
            </Button>
            <Button variant="outline" onClick={testEmailProcessing} className="gap-2">
              <Zap className="w-4 h-4" />
              Test
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Configure your email client or forwarding rules to send emails to this address.
          </p>
        </CardContent>
      </Card>

      {/* Processing Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Processing Rules ({rules.length})
          </CardTitle>
          <CardDescription>
            Define how different types of emails should be processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Rules Configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first rule to start processing emails automatically.
              </p>
              <Button onClick={() => setIsCreateRuleOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${rule.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <h4 className="font-semibold">{rule.name}</h4>
                      <Badge variant="outline">{rule.processed_count} processed</Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>From: {rule.email_pattern}</p>
                      {rule.subject_pattern && <p>Subject: {rule.subject_pattern}</p>}
                      <p>Priority: {rule.task_template.priority} | Template: {rule.task_template.title_template}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            Recent Activity ({processedEmails.length})
          </CardTitle>
          <CardDescription>
            Recently processed emails and created tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedEmails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Emails Processed</h3>
              <p className="text-muted-foreground">
                Processed emails will appear here once you start receiving them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {processedEmails.slice(0, 10).map((email) => (
                <div key={email.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-1">
                    {email.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{email.subject}</p>
                      <Badge variant="outline" className="text-xs">
                        {email.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      From: {email.from_email}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {email.body_preview}
                    </p>
                    {email.task_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Created task: {email.task_id}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(email.processed_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}