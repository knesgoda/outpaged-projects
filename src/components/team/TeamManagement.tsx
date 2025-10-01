import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Shield } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string;
  team_type: 'design' | 'mobile_dev' | 'backend_dev' | 'ai' | 'marketing' | 'operations' | 'custom';
  created_at: string;
  member_count?: number;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'lead' | 'member';
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

export function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamType, setNewTeamType] = useState<Team['team_type']>('custom');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive",
      });
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          user_id,
          role,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch team members",
        variant: "destructive",
      });
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: newTeamName,
          description: newTeamDescription,
          team_type: newTeamType,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team created successfully",
      });

      setNewTeamName("");
      setNewTeamDescription("");
      setNewTeamType('custom');
      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team deleted successfully",
      });

      fetchTeams();
      if (selectedTeam === teamId) {
        setSelectedTeam(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTeamTypeColor = (type: Team['team_type']) => {
    const colors = {
      design: 'bg-purple-500',
      mobile_dev: 'bg-blue-500',
      backend_dev: 'bg-green-500',
      ai: 'bg-pink-500',
      marketing: 'bg-orange-500',
      operations: 'bg-yellow-500',
      custom: 'bg-gray-500',
    };
    return colors[type];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">
            Create and manage teams across Design, Dev, Marketing, Operations, and more
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Team
            </CardTitle>
            <CardDescription>
              Set up a new team with specific roles and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="e.g., Design Team, Backend Squad"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-description">Description</Label>
              <Input
                id="team-description"
                placeholder="Brief description of team responsibilities"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-type">Team Type</Label>
              <Select value={newTeamType} onValueChange={(value: Team['team_type']) => setNewTeamType(value)}>
                <SelectTrigger id="team-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="mobile_dev">Mobile Development</SelectItem>
                  <SelectItem value="backend_dev">Backend Development</SelectItem>
                  <SelectItem value="ai">AI / Machine Learning</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={createTeam} disabled={loading} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Existing Teams
            </CardTitle>
            <CardDescription>
              View and manage all teams in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No teams yet. Create your first team to get started.
                </p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedTeam(team.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getTeamTypeColor(team.team_type)}`} />
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-muted-foreground">{team.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {team.member_count || 0} members
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTeam(team.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Team Members & Permissions
            </CardTitle>
            <CardDescription>
              Manage team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No members in this team yet. Add members to get started.
                </p>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {member.profiles.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.profiles.full_name}</p>
                        <Badge variant={member.role === 'lead' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
