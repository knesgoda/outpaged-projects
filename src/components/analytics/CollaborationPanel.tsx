import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, CheckCircle, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface CollaborationPanelProps {
  dashboardId: string;
}

export function CollaborationPanel({ dashboardId }: CollaborationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');

  const { data: comments } = useQuery({
    queryKey: ['dashboard-comments', dashboardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_comments' as any)
        .select('*, profiles(*)')
        .eq('dashboard_id', dashboardId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: shares } = useQuery({
    queryKey: ['dashboard-shares', dashboardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_shares' as any)
        .select('*, profiles(*)')
        .eq('dashboard_id', dashboardId);
      
      if (error) throw error;
      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('dashboard_comments' as any)
        .insert({
          dashboard_id: dashboardId,
          author_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-comments'] });
      setNewComment('');
      toast({ title: "Comment added" });
    },
  });

  const resolveComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('dashboard_comments' as any)
        .update({
          is_resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-comments'] });
      toast({ title: "Comment resolved" });
    },
  });

  const shareDashboard = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // In real implementation, would look up user by email
      // For now, just mock the share
      toast({ 
        title: "Dashboard shared",
        description: `Invited ${shareEmail} with ${sharePermission} permission`
      });
      setShareOpen(false);
      setShareEmail('');
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Comments Thread */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Discussion
              </CardTitle>
              <CardDescription>
                {comments?.filter((c: any) => !c.is_resolved).length || 0} open comments
              </CardDescription>
            </div>
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Dashboard</DialogTitle>
                  <DialogDescription>
                    Invite team members to collaborate on this dashboard
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="colleague@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Permission Level</Label>
                    <Select value={sharePermission} onValueChange={setSharePermission}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View Only</SelectItem>
                        <SelectItem value="comment">Can Comment</SelectItem>
                        <SelectItem value="edit">Can Edit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
                  <Button onClick={() => shareDashboard.mutate()}>Send Invite</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Comment */}
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[80px]"
              />
              <Button 
                size="sm" 
                onClick={() => addComment.mutate(newComment)}
                disabled={!newComment.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Comment
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4 pt-4 border-t">
            {comments?.map((comment: any) => (
              <div key={comment.id} className={`flex gap-3 ${comment.is_resolved ? 'opacity-50' : ''}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {comment.profiles?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.profiles?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                    </span>
                    {comment.is_resolved && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{comment.content}</p>
                  {!comment.is_resolved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => resolveComment.mutate(comment.id)}
                    >
                      Mark as resolved
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {!comments?.length && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No comments yet. Start the discussion!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shared With */}
      <Card>
        <CardHeader>
          <CardTitle>Shared With</CardTitle>
          <CardDescription>
            {shares?.length || 0} team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {shares?.map((share: any) => (
              <div key={share.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {share.profiles?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">
                      {share.profiles?.full_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {share.permission_level}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!shares?.length && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Dashboard not shared yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
