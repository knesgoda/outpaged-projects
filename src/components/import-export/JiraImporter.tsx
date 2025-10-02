import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JiraImporterProps {
  projectId?: string;
}

export function JiraImporter({ projectId }: JiraImporterProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState({
    jiraUrl: '',
    email: '',
    apiToken: '',
    projectKey: '',
    targetProjectId: projectId || '',
  });

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jiraUrl || !formData.email || !formData.apiToken || !formData.projectKey || !formData.targetProjectId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('import-jira', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.imported} tasks. ${data.errors > 0 ? `${data.errors} errors occurred.` : ''}`,
      });

      // Clear sensitive data
      setFormData(prev => ({
        ...prev,
        email: '',
        apiToken: '',
      }));
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import from Jira",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Import from Jira
        </CardTitle>
        <CardDescription>
          Import issues from your Jira project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You'll need a Jira API token. Create one at: Account Settings → Security → API tokens
          </AlertDescription>
        </Alert>

        <form onSubmit={handleImport} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jiraUrl">Jira URL</Label>
            <Input
              id="jiraUrl"
              placeholder="https://yourcompany.atlassian.net"
              value={formData.jiraUrl}
              onChange={(e) => setFormData({ ...formData, jiraUrl: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              type="password"
              placeholder="Your Jira API token"
              value={formData.apiToken}
              onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectKey">Jira Project Key</Label>
            <Input
              id="projectKey"
              placeholder="PROJ"
              value={formData.projectKey}
              onChange={(e) => setFormData({ ...formData, projectKey: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetProject">Target Project</Label>
            <Input
              id="targetProject"
              placeholder="Project ID"
              value={formData.targetProjectId}
              onChange={(e) => setFormData({ ...formData, targetProjectId: e.target.value })}
              required
            />
          </div>

          <Button type="submit" disabled={isImporting} className="w-full">
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import from Jira
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-semibold mb-2">What gets imported:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Issues (as tasks)</li>
            <li>Issue types (mapped to task types)</li>
            <li>Status (mapped to workflow states)</li>
            <li>Priority</li>
            <li>Story points (if configured)</li>
            <li>Comments (up to 10 per issue)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
