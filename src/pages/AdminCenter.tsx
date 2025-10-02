import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { UserManagement } from "@/components/admin/UserManagement";
import { WorkflowGovernance } from "@/components/admin/WorkflowGovernance";
import { DataRetentionManager } from "@/components/admin/DataRetentionManager";
import { AdminGuard } from "@/components/security/AdminGuard";
import { LayoutDashboard, Users, GitBranch, Database } from "lucide-react";

export default function AdminCenter() {
  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Admin Center</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive admin console for workspace management and governance
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="workflows">
              <GitBranch className="h-4 w-4 mr-2" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="retention">
              <Database className="h-4 w-4 mr-2" />
              Data & Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="workflows">
            <WorkflowGovernance />
          </TabsContent>

          <TabsContent value="retention">
            <DataRetentionManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
