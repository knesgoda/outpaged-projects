import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Sparkles, Edit3, Eye, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TaskItem {
  id: string;
  ticketNumber: string;
  title: string;
  type: "feature" | "bug" | "improvement" | "breaking";
  description?: string;
}

interface ReleaseData {
  version: string;
  releaseDate: string;
  tasks: TaskItem[];
}

export function ReleaseNotesGenerator() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  
  // Mock release data
  const releaseData: ReleaseData = {
    version: "v2.5.0",
    releaseDate: "2025-02-15",
    tasks: [
      { id: "1", ticketNumber: "OP-456", title: "Advanced search with filters", type: "feature" },
      { id: "2", ticketNumber: "OP-457", title: "Real-time collaboration on boards", type: "feature" },
      { id: "3", ticketNumber: "OP-458", title: "Custom field formulas", type: "feature" },
      { id: "4", ticketNumber: "OP-459", title: "Fixed task assignment notifications", type: "bug" },
      { id: "5", ticketNumber: "OP-460", title: "Resolved memory leak in dashboard", type: "bug" },
      { id: "6", ticketNumber: "OP-461", title: "Improved kanban board performance", type: "improvement" },
      { id: "7", ticketNumber: "OP-462", title: "Updated API authentication method", type: "breaking" },
    ],
  };

  const generateMarkdown = (): string => {
    const features = releaseData.tasks.filter(t => t.type === "feature");
    const bugs = releaseData.tasks.filter(t => t.type === "bug");
    const improvements = releaseData.tasks.filter(t => t.type === "improvement");
    const breaking = releaseData.tasks.filter(t => t.type === "breaking");

    return `# Release ${releaseData.version}

**Release Date:** ${releaseData.releaseDate}

## 🎉 New Features

${features.map(f => `- **${f.title}** (${f.ticketNumber})`).join('\n')}

## 🐛 Bug Fixes

${bugs.map(b => `- ${b.title} (${b.ticketNumber})`).join('\n')}

## ⚡ Improvements

${improvements.map(i => `- ${i.title} (${i.ticketNumber})`).join('\n')}

${breaking.length > 0 ? `## ⚠️ Breaking Changes

${breaking.map(bc => `- **${bc.title}** (${bc.ticketNumber})`).join('\n')}
` : ''}

---

For detailed information, see the [full changelog](https://github.com/yourorg/yourproject/compare/v2.4.0...v2.5.0).
`;
  };

  const [markdownContent, setMarkdownContent] = useState(generateMarkdown());

  const handleGenerate = () => {
    const newContent = generateMarkdown();
    setMarkdownContent(newContent);
    toast({
      title: "Release notes generated",
      description: "Release notes have been auto-generated from completed tasks.",
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied to clipboard",
      description: "Release notes copied successfully.",
    });
  };

  const handleExport = (format: "md" | "html" | "pdf") => {
    // In real implementation, this would generate and download the file
    toast({
      title: `Exporting as ${format.toUpperCase()}`,
      description: `Release notes will be downloaded as ${format} file.`,
    });
  };

  const getTypeColor = (type: TaskItem["type"]) => {
    switch (type) {
      case "feature": return "bg-primary";
      case "bug": return "bg-destructive";
      case "improvement": return "bg-blue-500";
      case "breaking": return "bg-orange-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Release Notes Generator
        </CardTitle>
        <CardDescription>
          Auto-generate release notes from completed tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Release Info */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-semibold text-lg">{releaseData.version}</h3>
            <p className="text-sm text-muted-foreground">
              Release Date: {releaseData.releaseDate}
            </p>
          </div>
          <Button onClick={handleGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Notes
          </Button>
        </div>

        {/* Task Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Features", count: releaseData.tasks.filter(t => t.type === "feature").length, color: "text-primary" },
            { label: "Bug Fixes", count: releaseData.tasks.filter(t => t.type === "bug").length, color: "text-destructive" },
            { label: "Improvements", count: releaseData.tasks.filter(t => t.type === "improvement").length, color: "text-blue-600" },
            { label: "Breaking", count: releaseData.tasks.filter(t => t.type === "breaking").length, color: "text-orange-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview/Edit Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="edit">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks ({releaseData.tasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            <div className="prose prose-sm max-w-none bg-muted/50 p-6 rounded-lg">
              <pre className="whitespace-pre-wrap font-sans">{markdownContent}</pre>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline">
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button onClick={() => handleExport("md")} variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Export Markdown
              </Button>
              <Button onClick={() => handleExport("html")} variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Export HTML
              </Button>
              <Button onClick={() => handleExport("pdf")} variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="edit">
            <Textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Edit release notes..."
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-2">
            {releaseData.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Badge className={getTypeColor(task.type)}>
                  {task.type}
                </Badge>
                <span className="text-sm text-muted-foreground">{task.ticketNumber}</span>
                <span className="flex-1">{task.title}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Breaking Changes Warning */}
        {releaseData.tasks.some(t => t.type === "breaking") && (
          <Card className="border-orange-500/50 bg-orange-500/10">
            <CardHeader>
              <CardTitle className="text-base text-orange-600">
                ⚠️ Breaking Changes Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                This release contains breaking changes. Make sure to review the migration guide 
                and update dependent systems before deploying.
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
