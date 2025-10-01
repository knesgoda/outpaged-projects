import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Figma, Link2, Image, FileText, CheckCircle2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FigmaLink {
  id: string;
  url: string;
  title: string;
  type: "file" | "prototype" | "component";
  thumbnail?: string;
  linkedAt: string;
}

export function FigmaIntegration() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [linkedDesigns, setLinkedDesigns] = useState<FigmaLink[]>([
    {
      id: "1",
      url: "https://figma.com/file/example",
      title: "User Dashboard Redesign",
      type: "file",
      linkedAt: new Date().toISOString(),
    },
  ]);

  const handleConnect = () => {
    // In a real implementation, this would trigger OAuth flow
    toast({
      title: "Figma Connection",
      description: "OAuth flow would be triggered here",
    });
    setIsConnected(true);
  };

  const handleLinkDesign = () => {
    if (!figmaUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a Figma file URL",
        variant: "destructive",
      });
      return;
    }

    const newLink: FigmaLink = {
      id: Date.now().toString(),
      url: figmaUrl,
      title: "New Figma Design",
      type: "file",
      linkedAt: new Date().toISOString(),
    };

    setLinkedDesigns([...linkedDesigns, newLink]);
    setFigmaUrl("");
    setShowLinkDialog(false);

    toast({
      title: "Design Linked",
      description: "Figma file has been linked successfully",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileText className="h-4 w-4" />;
      case "prototype":
        return <Image className="h-4 w-4" />;
      case "component":
        return <Figma className="h-4 w-4" />;
      default:
        return <Link2 className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Figma className="h-5 w-5" />
              Figma Integration
            </CardTitle>
            <CardDescription>
              Link design files and preview thumbnails
            </CardDescription>
          </div>
          {isConnected && (
            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Link2 className="mr-2 h-4 w-4" />
                  Link Design
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Figma Design</DialogTitle>
                  <DialogDescription>
                    Paste a Figma file, prototype, or component URL
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="figmaUrl">Figma URL</Label>
                    <Input
                      id="figmaUrl"
                      placeholder="https://figma.com/file/..."
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Supports file URLs, prototype URLs, and component URLs
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/50 p-3">
                    <h4 className="text-sm font-medium mb-2">Supported URLs</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• figma.com/file/...</li>
                      <li>• figma.com/proto/...</li>
                      <li>• figma.com/design/...</li>
                    </ul>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleLinkDesign}>Link Design</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 mb-4">
              <CheckCircle2 className="h-4 w-4" />
              Connected to Figma
            </div>

            {linkedDesigns.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Linked Designs</Label>
                {linkedDesigns.map((design) => (
                  <Card key={design.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {getTypeIcon(design.type)}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{design.title}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {design.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Linked {new Date(design.linkedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={design.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg bg-muted/50">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No designs linked yet
                </p>
              </div>
            )}

            <div className="rounded-lg border bg-muted/50 p-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Preview Figma designs inline</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Auto-sync design updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Link multiple design files per task</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Figma className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Connect Figma to link and preview design files
            </p>
            <Button onClick={handleConnect}>
              <Figma className="mr-2 h-4 w-4" />
              Connect Figma
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
