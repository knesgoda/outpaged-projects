import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Zap, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Activity,
  Clock
} from "lucide-react";
import { useAutomation } from "@/hooks/useAutomation";
import { AutomationRuleBuilder } from "./AutomationRuleBuilder";
import { format } from "date-fns";

interface AutomationDashboardProps {
  projectId: string;
}

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({ projectId }) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const { 
    rules, 
    loading, 
    fetchAutomationRules, 
    updateAutomationRule, 
    deleteAutomationRule 
  } = useAutomation(projectId);

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    await updateAutomationRule(ruleId, { is_active: isActive });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm("Are you sure you want to delete this automation rule?")) {
      await deleteAutomationRule(ruleId);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Play className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Pause className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  if (loading) {
    return <div>Loading automation rules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Automation</h1>
        </div>

        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
            </DialogHeader>
            <AutomationRuleBuilder
              projectId={projectId}
              onClose={() => setShowBuilder(false)}
              onSave={() => fetchAutomationRules(projectId)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Automation Rules</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first automation rule to streamline your workflow.
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    {getStatusBadge(rule.is_active)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                    />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Rule
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Rule
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {rule.description && (
                  <p className="text-muted-foreground">{rule.description}</p>
                )}
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span>Executions: {rule.execution_count}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Created: {format(new Date(rule.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  
                  {rule.last_executed_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Last run: {format(new Date(rule.last_executed_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};