import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit,
  MessageSquare,
  Users,
  CheckSquare,
  Clock,
  Award,
  TrendingUp,
  Activity
} from "lucide-react";
import { TeamMember } from "./TeamDirectory";

// Mock data - would come from API in real app
const mockMember: TeamMember = {
  id: "1",
  name: "Alice Johnson",
  email: "alice@company.com",
  role: "Senior Designer",
  department: "Design",
  initials: "AJ",
  avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=300&h=300&fit=crop&crop=face",
  status: "active",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  joinDate: "Jan 2023",
  lastActive: "2 hours ago",
  projectsCount: 8,
  tasksCompleted: 127,
  skills: ["UI Design", "Figma", "Prototyping", "User Research", "Design Systems", "Accessibility"],
  bio: "Passionate about creating intuitive user experiences with a focus on accessibility and modern design principles. I have over 5 years of experience in product design and love collaborating with cross-functional teams to solve complex user problems."
};

const mockProjects = [
  { id: "1", name: "Website Redesign", role: "Lead Designer", status: "In Progress", progress: 75 },
  { id: "2", name: "Mobile App", role: "UI Designer", status: "Planning", progress: 25 },
  { id: "3", name: "Design System", role: "Design Lead", status: "Completed", progress: 100 },
];

const mockRecentActivity = [
  { id: "1", action: "Completed task", item: "Homepage wireframes", time: "2 hours ago" },
  { id: "2", action: "Updated", item: "User research findings", time: "1 day ago" },
  { id: "3", action: "Commented on", item: "Mobile app designs", time: "2 days ago" },
  { id: "4", action: "Created", item: "Design system documentation", time: "3 days ago" },
];

export default function TeamMemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // In real app, fetch member data by ID
    setMember(mockMember);
  }, [memberId]);

  if (!member) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading member profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/team")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Team Member Profile</h1>
          <p className="text-muted-foreground">View and manage team member details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button className="bg-gradient-primary hover:opacity-90">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback className="text-2xl">{member.initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{member.name}</h2>
                <p className="text-lg text-muted-foreground">{member.role}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    className={member.status === "active" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}
                    variant="secondary"
                  >
                    {member.status}
                  </Badge>
                  <Badge variant="outline">{member.department}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{member.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {member.joinDate}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Last active {member.lastActive}</span>
                </div>
              </div>

              {member.bio && (
                <p className="text-muted-foreground max-w-2xl">{member.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projects</p>
                <p className="text-2xl font-bold">{member.projectsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckSquare className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">{member.tasksCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">94%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Team Rating</p>
                <p className="text-2xl font-bold">4.8</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="skills">Skills & Expertise</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Current Projects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">{project.name}</h4>
                      <p className="text-sm text-muted-foreground">{project.role}</p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={project.status === "Completed" ? "default" : "secondary"}
                        className={project.status === "Completed" ? "bg-success text-success-foreground" : ""}
                      >
                        {project.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        {project.progress}%
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockRecentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{activity.action}</span>{" "}
                        <span className="text-primary">{activity.item}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockProjects.map((project) => (
                  <div key={project.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{project.role}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{project.status}</Badge>
                        <div className="mt-2">
                          <div className="w-24 h-2 bg-muted rounded-full">
                            <div 
                              className="h-2 bg-gradient-primary rounded-full" 
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{project.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockRecentActivity.map((activity, index) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                    {index < mockRecentActivity.length - 1 && (
                      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-px h-8 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-foreground">
                      <span className="font-medium">{activity.action}</span>{" "}
                      <span className="text-primary">{activity.item}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-3">Technical Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {member.skills?.map((skill) => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-foreground mb-3">Certifications</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-warning" />
                      <span className="text-foreground">Certified UX Professional</span>
                      <Badge variant="outline" className="ml-auto">2023</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-warning" />
                      <span className="text-foreground">Figma Expert Certification</span>
                      <Badge variant="outline" className="ml-auto">2022</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}