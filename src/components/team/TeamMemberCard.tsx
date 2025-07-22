
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Mail, 
  Phone, 
  MapPin,
  MoreHorizontal,
  UserCheck,
  UserX,
  Edit,
  MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TeamMember } from "@/pages/TeamDirectory";

interface TeamMemberCardProps {
  member: TeamMember;
  onStatusChange: (memberId: string, status: 'active' | 'inactive') => void;
}

const statusColors = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-warning/20 text-warning",
};

export function TeamMemberCard({ member, onStatusChange }: TeamMemberCardProps) {
  const navigate = useNavigate();

  return (
    <Card 
      className="hover:shadow-medium transition-shadow cursor-pointer group"
      onClick={() => navigate(`/dashboard/team/${member.id}`)}
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
                navigate(`/dashboard/team/${member.id}`);
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
                    onStatusChange(member.id, 'inactive');
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
                    onStatusChange(member.id, 'active');
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
          {member.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="truncate">{member.email}</span>
            </div>
          )}
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
  );
}
