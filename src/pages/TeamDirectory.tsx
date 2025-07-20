import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  MoreHorizontal,
  UserCheck,
  UserX,
  Edit,
  MessageSquare
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@company.com",
    role: "Senior Designer",
    department: "Design",
    initials: "AJ",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face",
    status: "active",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    joinDate: "Jan 2023",
    lastActive: "2 hours ago",
    projectsCount: 8,
    tasksCompleted: 127,
    skills: ["UI Design", "Figma", "Prototyping", "User Research"],
    bio: "Passionate about creating intuitive user experiences with a focus on accessibility and modern design principles."
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@company.com",
    role: "Full Stack Developer",
    department: "Engineering",
    initials: "BS",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    status: "active",
    phone: "+1 (555) 234-5678",
    location: "Austin, TX",
    joinDate: "Mar 2022",
    lastActive: "Online now",
    projectsCount: 12,
    tasksCompleted: 203,
    skills: ["React", "Node.js", "TypeScript", "AWS"],
    bio: "Full-stack developer with expertise in modern web technologies and cloud infrastructure."
  },
  {
    id: "3",
    name: "Carol Davis",
    email: "carol@company.com",
    role: "Product Manager",
    department: "Product",
    initials: "CD",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    status: "active",
    location: "New York, NY",
    joinDate: "Sep 2021",
    lastActive: "1 day ago",
    projectsCount: 15,
    tasksCompleted: 89,
    skills: ["Product Strategy", "Analytics", "Agile", "Roadmapping"],
    bio: "Product manager focused on data-driven decisions and user-centric product development."
  },
  {
    id: "4",
    name: "David Wilson",
    email: "david@company.com",
    role: "DevOps Engineer",
    department: "Engineering",
    initials: "DW",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    status: "inactive",
    location: "Seattle, WA",
    joinDate: "Jun 2023",
    lastActive: "1 week ago",
    projectsCount: 6,
    tasksCompleted: 94,
    skills: ["Docker", "Kubernetes", "CI/CD", "Monitoring"],
    bio: "DevOps engineer specializing in containerization and automated deployment pipelines."
  },
  {
    id: "5",
    name: "Emma Brown",
    email: "emma@company.com",
    role: "UX Researcher",
    department: "Design",
    initials: "EB",
    status: "pending",
    location: "Remote",
    joinDate: "Dec 2024",
    lastActive: "Never",
    projectsCount: 0,
    tasksCompleted: 0,
    skills: ["User Research", "Data Analysis", "Interviews", "Surveys"],
  },
];

const statusColors = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-warning/20 text-warning",
};

export default function TeamDirectory() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleDeactivate = (memberId: string) => {
    setMembers(prev => prev.map(member => 
      member.id === memberId 
        ? { ...member, status: "inactive" as const }
        : member
    ));
  };

  const handleActivate = (memberId: string) => {
    setMembers(prev => prev.map(member => 
      member.id === memberId 
        ? { ...member, status: "active" as const }
        : member
    ));
  };

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
        <Button className="bg-gradient-primary hover:opacity-90">
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
          <Card 
            key={member.id} 
            className="hover:shadow-medium transition-shadow cursor-pointer group"
            onClick={() => navigate(`/team/${member.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {member.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {member.role}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="w-8 h-8 opacity-50 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-50" align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/team/${member.id}`);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {member.status === "active" ? (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeactivate(member.id);
                        }}
                        className="text-warning"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(member.id);
                        }}
                        className="text-success"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Activate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Status and Department */}
              <div className="flex items-center gap-2">
                <Badge className={statusColors[member.status]} variant="secondary">
                  {member.status}
                </Badge>
                <Badge variant="outline">{member.department}</Badge>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{member.location}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <div className="font-semibold text-foreground">{member.projectsCount}</div>
                  <div className="text-xs text-muted-foreground">Projects</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-foreground">{member.tasksCompleted}</div>
                  <div className="text-xs text-muted-foreground">Tasks Done</div>
                </div>
              </div>

              {/* Skills Preview */}
              {member.skills && member.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {member.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {member.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{member.skills.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Last Active */}
              <div className="text-xs text-muted-foreground">
                Last active: {member.lastActive}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center space-y-2">
              <Users className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No team members found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}