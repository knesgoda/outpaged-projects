import React, { useState, useEffect } from "react";
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
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, FolderOpen, BarChart3, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Portfolio {
  id: string;
  name: string;
  description: string;
  created_at: string;
  project_count?: number;
  total_tasks?: number;
  completed_tasks?: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
}

export const PortfolioManager = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({ name: "", description: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      // For now, just return empty until the migration is applied
      setPortfolios([]);
    } catch (error: any) {
      console.error("Error fetching portfolios:", error);
      toast({
        title: "Error",
        description: "Failed to fetch portfolios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async () => {
    if (!newPortfolio.name.trim()) return;

    try {
      // For now, just show success message until the migration is applied
      toast({
        title: "Info",
        description: "Portfolio feature will be available after database migration",
      });

      setNewPortfolio({ name: "", description: "" });
      setIsCreating(false);
    } catch (error: any) {
      console.error("Error creating portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to create portfolio",
        variant: "destructive",
      });
    }
  };

  const getPortfolioProgress = (portfolio: Portfolio) => {
    if (!portfolio.total_tasks) return 0;
    return Math.round((portfolio.completed_tasks || 0) / portfolio.total_tasks * 100);
  };

  if (loading) {
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
                <Button onClick={createPortfolio} disabled={!newPortfolio.name.trim()}>
                  Create Portfolio
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-8 text-center">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Portfolio Feature Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Portfolio management will be available after the database migration is applied.
        </p>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Preview Create Portfolio
        </Button>
      </Card>
    </div>
  );
};