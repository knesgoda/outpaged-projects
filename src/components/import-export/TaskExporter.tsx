import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TaskExporterProps {
  projectId?: string;
}

export function TaskExporter({ projectId }: TaskExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<'csv' | 'json' | 'markdown'>('csv');

  const handleExport = async () => {
    if (!projectId) {
      toast({
        title: "No Project Selected",
        description: "Please select a project to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('export-tasks', {
        body: { projectId, format }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 
              format === 'csv' ? 'text/csv' : 'text/markdown' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Tasks exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export tasks",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Export Tasks
        </CardTitle>
        <CardDescription>
          Download your tasks in various formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Export Format</Label>
          <Select value={format} onValueChange={(value: any) => setFormat(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV - Spreadsheet compatible</SelectItem>
              <SelectItem value="json">JSON - Structured data</SelectItem>
              <SelectItem value="markdown">Markdown - Documentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} disabled={isExporting || !projectId} className="w-full">
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Export as {format.toUpperCase()}
            </>
          )}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p className="font-semibold mb-2">What gets exported:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Task details (title, description, type)</li>
            <li>Status and priority</li>
            <li>Assignee and reporter information</li>
            <li>Story points</li>
            <li>Timestamps (created, updated, due date)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
