import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ExternalLink, Server, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";

type ServiceTier = "tier1" | "tier2" | "tier3";

interface Service {
  id: string;
  name: string;
  description: string;
  tier: ServiceTier;
  owner: {
    team: string;
    lead: string;
  };
  runbookUrl?: string;
  repositoryUrl?: string;
  dependencies: string[];
}

const TIER_CONFIG = {
  tier1: { label: "Tier 1", color: "bg-red-500/10 text-red-500", description: "Business Critical" },
  tier2: { label: "Tier 2", color: "bg-orange-500/10 text-orange-500", description: "Important" },
  tier3: { label: "Tier 3", color: "bg-blue-500/10 text-blue-500", description: "Supporting" },
};

export function ServiceRegistry() {
  const [services, setServices] = useState<Service[]>([
    {
      id: "svc_1",
      name: "API Gateway",
      description: "Primary API gateway handling all external requests",
      tier: "tier1",
      owner: {
        team: "Platform",
        lead: "Alice Johnson",
      },
      runbookUrl: "https://wiki.example.com/api-gateway",
      repositoryUrl: "https://github.com/example/api-gateway",
      dependencies: ["Database", "Cache"],
    },
    {
      id: "svc_2",
      name: "Authentication Service",
      description: "OAuth and user authentication",
      tier: "tier1",
      owner: {
        team: "Security",
        lead: "Bob Smith",
      },
      runbookUrl: "https://wiki.example.com/auth",
      dependencies: ["User Database"],
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    tier: "tier2" as ServiceTier,
    team: "",
    lead: "",
    runbookUrl: "",
    repositoryUrl: "",
  });

  const createService = () => {
    if (!newService.name || !newService.team) {
      toast.error("Name and owner team are required");
      return;
    }

    const service: Service = {
      id: `svc_${Date.now()}`,
      name: newService.name,
      description: newService.description,
      tier: newService.tier,
      owner: {
        team: newService.team,
        lead: newService.lead,
      },
      runbookUrl: newService.runbookUrl,
      repositoryUrl: newService.repositoryUrl,
      dependencies: [],
    };

    setServices([...services, service]);
    setNewService({
      name: "",
      description: "",
      tier: "tier2",
      team: "",
      lead: "",
      runbookUrl: "",
      repositoryUrl: "",
    });
    setIsCreating(false);
    toast.success(`Service "${service.name}" registered`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Service Registry</h2>
          <p className="text-muted-foreground">Catalog of services and their ownership</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Register Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    placeholder="API Gateway"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier">Service Tier *</Label>
                  <Select
                    value={newService.tier}
                    onValueChange={(value: ServiceTier) => setNewService({ ...newService, tier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier1">Tier 1 - Business Critical</SelectItem>
                      <SelectItem value="tier2">Tier 2 - Important</SelectItem>
                      <SelectItem value="tier3">Tier 3 - Supporting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the service"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team">Owner Team *</Label>
                  <Input
                    id="team"
                    placeholder="Platform"
                    value={newService.team}
                    onChange={(e) => setNewService({ ...newService, team: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead">Tech Lead</Label>
                  <Input
                    id="lead"
                    placeholder="Alice Johnson"
                    value={newService.lead}
                    onChange={(e) => setNewService({ ...newService, lead: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="runbook">Runbook URL</Label>
                <Input
                  id="runbook"
                  placeholder="https://wiki.example.com/service-runbook"
                  value={newService.runbookUrl}
                  onChange={(e) => setNewService({ ...newService, runbookUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repository">Repository URL</Label>
                <Input
                  id="repository"
                  placeholder="https://github.com/example/service"
                  value={newService.repositoryUrl}
                  onChange={(e) => setNewService({ ...newService, repositoryUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={createService}>
                Register Service
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map(service => {
          const tierConfig = TIER_CONFIG[service.tier];

          return (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className={tierConfig.color}>
                      {tierConfig.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {service.description && (
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{service.owner.team}</span>
                    {service.owner.lead && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{service.owner.lead}</span>
                      </>
                    )}
                  </div>

                  {service.dependencies.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Dependencies:</p>
                      <div className="flex flex-wrap gap-1">
                        {service.dependencies.map(dep => (
                          <Badge key={dep} variant="secondary" className="text-xs">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {service.runbookUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={service.runbookUrl} target="_blank" rel="noopener noreferrer">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Runbook
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {service.repositoryUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={service.repositoryUrl} target="_blank" rel="noopener noreferrer">
                        <Server className="h-4 w-4 mr-2" />
                        Repository
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
