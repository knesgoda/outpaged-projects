
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck,
  UserX,
  Calendar,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { useTeamMembers } from "@/hooks/useTeamMembers";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  initials: string;
  status: "active" | "inactive" | "pending";
  phone?: string;
  location?: string;
  joinDate: string;
  lastActive: string;
  projectsCount: number;
  tasksCompleted: number;
  skills: string[];
  bio?: string;
}

export default function TeamDirectory() {
  const { members, loading, error, refetch, updateMemberStatus } = useTeamMembers();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = filterDepartment === "all" || member.department === filterDepartment;
    const matchesStatus = filterStatus === "all" || member.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const departments = Array.from(new Set(members.map(m => m.department)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading team members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Directory</h1>
            <p className="text-muted-foreground">
              Manage your team members and their profiles
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center space-y-2">
              <p className="text-destructive">Error loading team members</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={refetch} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Directory</h1>
          <p className="text-muted-foreground">
            Manage your team members and their profiles
          </p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setIsInviteDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <UserCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{members.filter(m => m.status === "active").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{members.filter(m => m.status === "pending").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted/10 rounded-lg">
                <UserX className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{members.filter(m => m.status === "inactive").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onStatusChange={updateMemberStatus}
          />
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center space-y-2">
              <Users className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No team members found</p>
              <p className="text-sm text-muted-foreground">
                {members.length === 0 
                  ? "Start by inviting team members to your organization"
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onMemberAdded={refetch}
      />
    </div>
  );
}
