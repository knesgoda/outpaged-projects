import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Rocket, CheckCircle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

interface Release {
  id: string;
  version: string;
  name: string;
  status: "planning" | "ready" | "released";
  releaseDate?: string;
  notes: string;
  linkedItems: string[];
  checklist: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "id" | "completed">[] = [
  { label: "All linked items completed", required: true },
  { label: "Code reviewed and approved", required: true },
  { label: "Tests passing", required: true },
  { label: "Documentation updated", required: true },
  { label: "Deployment plan reviewed", required: true },
  { label: "Rollback plan documented", required: false },
  { label: "Stakeholders notified", required: false },
];

export function ReleaseManager() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const [newRelease, setNewRelease] = useState({
    version: "",
    name: "",
    releaseDate: "",
    notes: "",
  });

  const createRelease = () => {
    if (!newRelease.version || !newRelease.name) {
      toast.error("Version and name are required");
      return;
    }

    const release: Release = {
      id: `release_${Date.now()}`,
      version: newRelease.version,
      name: newRelease.name,
      status: "planning",
      releaseDate: newRelease.releaseDate,
      notes: newRelease.notes,
      linkedItems: [],
      checklist: DEFAULT_CHECKLIST.map((item, idx) => ({
        ...item,
        id: `check_${idx}`,
        completed: false,
      })),
    };

    setReleases([...releases, release]);
    setNewRelease({ version: "", name: "", releaseDate: "", notes: "" });
    setIsCreating(false);
    toast.success(`Release ${release.version} created`);
  };

  const toggleChecklist = (releaseId: string, checklistId: string) => {
    setReleases(releases.map(release => {
      if (release.id === releaseId) {
        return {
          ...release,
          checklist: release.checklist.map(item =>
            item.id === checklistId ? { ...item, completed: !item.completed } : item
          ),
        };
      }
      return release;
    }));
  };

  const canMarkAsReady = (release: Release) => {
    return release.checklist.filter(item => item.required).every(item => item.completed);
  };

  const updateReleaseStatus = (releaseId: string, status: Release["status"]) => {
    const release = releases.find(r => r.id === releaseId);
    if (status === "ready" && release && !canMarkAsReady(release)) {
      toast.error("Complete all required checklist items first");
      return;
    }

    setReleases(releases.map(r =>
      r.id === releaseId ? { ...r, status } : r
    ));
    toast.success(`Release status updated to ${status}`);
  };

  const generateReleaseNotes = (release: Release) => {
    const markdown = `# ${release.name} (${release.version})

${release.notes}

## Release Date
${release.releaseDate ? new Date(release.releaseDate).toLocaleDateString() : "TBD"}

## Linked Items
${release.linkedItems.length > 0 ? release.linkedItems.map(id => `- Item ${id}`).join("\n") : "No items linked"}

## Checklist Status
${release.checklist.map(item => `- [${item.completed ? "x" : " "}] ${item.label}`).join("\n")}
`;

    navigator.clipboard.writeText(markdown);
    toast.success("Release notes copied to clipboard");
  };

  const getStatusIcon = (status: Release["status"]) => {
    switch (status) {
      case "planning":
        return <Clock className="h-4 w-4" />;
      case "ready":
        return <CheckCircle className="h-4 w-4" />;
      case "released":
        return <Rocket className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Release["status"]) => {
    switch (status) {
      case "planning":
        return "bg-yellow-500/10 text-yellow-500";
      case "ready":
        return "bg-blue-500/10 text-blue-500";
      case "released":
        return "bg-green-500/10 text-green-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Release Management</h2>
          <p className="text-muted-foreground">Plan, track, and release versions</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Release
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Release</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    placeholder="v1.2.0"
                    value={newRelease.version}
                    onChange={(e) => setNewRelease({ ...newRelease, version: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="release-date">Release Date</Label>
                  <Input
                    id="release-date"
                    type="date"
                    value={newRelease.releaseDate}
                    onChange={(e) => setNewRelease({ ...newRelease, releaseDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Release Name *</Label>
                <Input
                  id="name"
                  placeholder="Q1 Feature Release"
                  value={newRelease.name}
                  onChange={(e) => setNewRelease({ ...newRelease, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Release Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe what's included in this release..."
                  value={newRelease.notes}
                  onChange={(e) => setNewRelease({ ...newRelease, notes: e.target.value })}
                  rows={5}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={createRelease}>
                Create Release
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {releases.map(release => (
          <Card key={release.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle>{release.name}</CardTitle>
                    <Badge variant="outline" className={getStatusColor(release.status)}>
                      {getStatusIcon(release.status)}
                      <span className="ml-1 capitalize">{release.status}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{release.version}</span>
                    {release.releaseDate && (
                      <>
                        <span>•</span>
                        <span>{new Date(release.releaseDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateReleaseNotes(release)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export Notes
                  </Button>
                  {release.status === "planning" && (
                    <Button
                      size="sm"
                      onClick={() => updateReleaseStatus(release.id, "ready")}
                      disabled={!canMarkAsReady(release)}
                    >
                      Mark Ready
                    </Button>
                  )}
                  {release.status === "ready" && (
                    <Button
                      size="sm"
                      onClick={() => updateReleaseStatus(release.id, "released")}
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      Release
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {release.notes && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{release.notes}</p>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Release Checklist</h4>
                <div className="space-y-2">
                  {release.checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        id={item.id}
                        checked={item.completed}
                        onCheckedChange={() => toggleChecklist(release.id, item.id)}
                        disabled={release.status === "released"}
                      />
                      <Label
                        htmlFor={item.id}
                        className="text-sm font-normal flex-1 cursor-pointer"
                      >
                        {item.label}
                        {item.required && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Required
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {releases.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Releases Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first release to start tracking versions
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Release
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
