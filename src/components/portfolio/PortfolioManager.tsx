import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderOpen, BarChart3, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDomainClient } from "@/domain/client";
import {
  createPortfolio as createPortfolioService,
  listPortfolios,
  type CreatePortfolioInput,
  type PortfolioOverview,
} from "@/services/projects/portfolios";

const PORTFOLIOS_QUERY_KEY = ["portfolios"] as const;

const getPortfolioProgress = (portfolio: PortfolioOverview) => {
  if (!portfolio.item_count) return 0;
  const value = Math.round(
    (portfolio.completed_item_count / portfolio.item_count) * 100,
  );
  return Number.isFinite(value) ? value : 0;
};

export const PortfolioManager = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({ name: "", description: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const domainClient = useDomainClient();

  const {
    data: portfoliosData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: PORTFOLIOS_QUERY_KEY,
    queryFn: () => listPortfolios({}, { client: domainClient }),
  });

  useEffect(() => {
    if (isError) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch portfolios";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }, [isError, error, toast]);

  const portfolios = useMemo<PortfolioOverview[]>(
    () => portfoliosData ?? [],
    [portfoliosData],
  );

  const createMutation = useMutation({
    mutationFn: (input: CreatePortfolioInput) =>
      createPortfolioService(input, { client: domainClient }),
    onSuccess: () => {
      toast({
        title: "Portfolio created",
        description: "Your portfolio has been created successfully.",
      });
      setNewPortfolio({ name: "", description: "" });
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: PORTFOLIOS_QUERY_KEY });
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create portfolio";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const handleCreatePortfolio = () => {
    if (!newPortfolio.name.trim()) {
      return;
    }

    createMutation.mutate({
      name: newPortfolio.name,
      description: newPortfolio.description || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-2 bg-muted rounded w-full"></div>
              <div className="flex gap-4">
                <div className="h-8 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Management</h2>
          <p className="text-muted-foreground">
            Manage multiple projects and track portfolio performance
          </p>
        </div>
        
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="portfolio-name">Portfolio Name</Label>
                <Input
                  id="portfolio-name"
                  placeholder="Enter portfolio name"
                  value={newPortfolio.name}
                  onChange={(e) =>
                    setNewPortfolio({ ...newPortfolio, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="portfolio-description">Description</Label>
                <Textarea
                  id="portfolio-description"
                  placeholder="Portfolio description"
                  value={newPortfolio.description}
                  onChange={(e) =>
                    setNewPortfolio({ ...newPortfolio, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreatePortfolio}
                  disabled={!newPortfolio.name.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Portfolio"}
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {portfolios.length === 0 ? (
        <Card className="p-8 text-center">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No portfolios yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a portfolio to start grouping projects and tracking strategic progress.
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first portfolio
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {portfolios.map(portfolio => {
            const progress = getPortfolioProgress(portfolio);

            return (
              <Card key={portfolio.id} className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold leading-tight">
                      {portfolio.name}
                    </h3>
                    {portfolio.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {portfolio.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={portfolio.status === "active" ? "default" : "secondary"}>
                    {portfolio.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      <span>Projects</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {portfolio.project_count}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FolderOpen className="h-4 w-4" />
                      <span>Items</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {portfolio.item_count}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>Completed</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {portfolio.completed_item_count}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">
                    {portfolio.completed_item_count} of {portfolio.item_count} tracked work items complete
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};