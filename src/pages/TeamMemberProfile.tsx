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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { EditProfileDialog } from "@/components/team/EditProfileDialog";

const mockProjects: any[] = [];
const mockRecentActivity: any[] = [];

export default function TeamMemberProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!username) return;
      
      try {
        setLoading(true);
        
        // Fetch profile data by username
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
          
        if (error) {
          console.error('Error fetching member profile:', error);
          return;
        }
        
        if (profile) {
          // Transform profile data to TeamMember format
          const getInitials = (name: string) => {
            if (!name) return 'U';
            return name.split(' ')
              .filter(n => n.length > 0)
              .map(n => n[0].toUpperCase())
              .join('')
              .slice(0, 2);
          };

          const memberData: TeamMember = {
            id: profile.user_id,
            username: profile.username || 'user',
            name: profile.full_name || 'Unknown User',
            role: profile.role || 'developer',
            email: 'N/A', // Email not available in profiles table
            avatar: profile.avatar_url || '',
            initials: getInitials(profile.full_name || ''),
            status: 'active',
            department: profile.role === 'project_manager' ? 'Management' : 'Development',
            location: 'N/A',
            phone: '',
            joinDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown',
            lastActive: 'Recently',
            projectsCount: 0,
            tasksCompleted: 0,
            bio: '',
            skills: []
          };
          
          setMember(memberData);
        }
      } catch (error) {
        console.error('Error fetching member data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMemberData();
  }, [username]);

  const handleMessage = () => {
    if (!member) return;
    
    // For now, show a toast with the action
    toast({
      title: "Message Feature",
      description: `Starting a conversation with ${member.name}`,
    });
    
    // TODO: Implement actual messaging functionality
    // This could navigate to a messaging interface or open a chat dialog
  };

  const handleEditProfile = () => {
    if (!member) return;
    setShowEditDialog(true);
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    if (!member) return;
    
    // Update the member data with the new profile information
    const updatedMember: TeamMember = {
      ...member,
      name: updatedProfile.full_name || member.name,
      role: updatedProfile.role || member.role,
      avatar: updatedProfile.avatar_url || member.avatar,
      initials: getInitials(updatedProfile.full_name || member.name),
    };
    
    setMember(updatedMember);
    
    toast({
      title: "Profile Updated",
      description: "Profile information has been successfully updated.",
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0].toUpperCase())
      .join('')
      .slice(0, 2);
  };

  // Check if the current user is viewing their own profile
  const isOwnProfile = user?.id === member?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading member profile...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Member not found</p>
          <Button onClick={() => navigate("/dashboard/team")}>
            Back to Team Directory
          </Button>
        </div>
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
          onClick={() => navigate("/dashboard/team")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Team Member Profile</h1>
          <p className="text-muted-foreground">View and manage team member details</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOwnProfile && (
            <Button variant="outline" onClick={handleMessage}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
          )}
          {isOwnProfile && (
            <Button className="bg-gradient-primary hover:opacity-90" onClick={handleEditProfile}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
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

      {/* Edit Profile Dialog */}
      {member && isOwnProfile && (
        <EditProfileDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          profile={{
            user_id: member.id,
            full_name: member.name,
            avatar_url: member.avatar,
            role: member.role,
          }}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}