import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Eye, Edit3 } from "lucide-react";

interface CollaborationCursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
  isEditing: boolean;
}

export function RealTimeCollaboration() {
  const [activeCursors, setActiveCursors] = useState<CollaborationCursor[]>([
    {
      userId: '1',
      userName: 'Alice Johnson',
      color: '#3b82f6',
      position: { x: 0, y: 0 },
      isEditing: true
    },
    {
      userId: '2',
      userName: 'Bob Smith',
      color: '#10b981',
      position: { x: 0, y: 0 },
      isEditing: false
    }
  ]);

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Collaborators
        </CardTitle>
        <CardDescription>
          See who's currently viewing or editing this document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeCursors.map((cursor) => (
            <div 
              key={cursor.userId} 
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <Avatar 
                className="h-8 w-8" 
                style={{ borderColor: cursor.color, borderWidth: 2 }}
              >
                <AvatarFallback style={{ backgroundColor: cursor.color, color: 'white' }}>
                  {getUserInitials(cursor.userName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className="font-medium">{cursor.userName}</p>
                <p className="text-sm text-muted-foreground">
                  {cursor.isEditing ? 'Editing' : 'Viewing'}
                </p>
              </div>

              {cursor.isEditing ? (
                <Badge variant="default" className="gap-1">
                  <Edit3 className="h-3 w-3" />
                  Editing
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Eye className="h-3 w-3" />
                  Viewing
                </Badge>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Changes are saved automatically. You'll see others' cursors and 
            edits in real-time when multiple people are working on the same document.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
