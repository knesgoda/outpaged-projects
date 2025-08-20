import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Code, CheckCircle, AlertCircle } from "lucide-react";
import { generateCodesForExistingProjects } from "@/utils/projectCodeGenerator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ProjectCodeGenerator() {
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    withCodes: number;
    withoutCodes: number;
  } | null>(null);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      const { data: allProjects, error: allError } = await supabase
        .from('projects')
        .select('id, code')
        .order('created_at');

      if (allError) throw allError;

      const total = allProjects?.length || 0;
      const withCodes = allProjects?.filter(p => p.code && p.code.trim() !== '').length || 0;
      const withoutCodes = total - withCodes;

      setStats({ total, withCodes, withoutCodes });
    } catch (error) {
      console.error('Error fetching project stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch project statistics",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCodes = async () => {
    setGenerating(true);
    try {
      await generateCodesForExistingProjects();
      await fetchStats(); // Refresh stats
      toast({
        title: "Success",
        description: "Project codes have been generated successfully.",
      });
    } catch (error) {
      console.error('Error generating codes:', error);
      toast({
        title: "Error",
        description: "Failed to generate project codes",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          Project Code Generator
        </CardTitle>
        <CardDescription>
          Generate unique codes for existing projects that don't have them.
          Codes are used for clean URLs and task numbering.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={fetchStats}
            variant="outline"
            size="sm"
          >
            Check Statistics
          </Button>
          <Button 
            onClick={handleGenerateCodes}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Code className="w-4 h-4 mr-2" />
                Generate Codes
              </>
            )}
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="font-mono text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Projects</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                <CheckCircle className="w-5 h-5" />
                {stats.withCodes}
              </div>
              <div className="text-sm text-muted-foreground">With Codes</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-orange-600 flex items-center justify-center gap-1">
                <AlertCircle className="w-5 h-5" />
                {stats.withoutCodes}
              </div>
              <div className="text-sm text-muted-foreground">Need Codes</div>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>How it works:</strong></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Analyzes project names to generate meaningful codes</li>
            <li>Ensures all codes are unique across the system</li>
            <li>Uses initials, abbreviations, or first words as appropriate</li>
            <li>Adds numbers if conflicts occur (e.g., PROJ, PROJ2, PROJ3)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}