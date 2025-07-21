import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  UserPlus, 
  MessageSquare,
  Calendar,
  Filter,
  Archive,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const notificationIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
  mention: MessageSquare,
  assignment: UserPlus,
  deadline: Calendar,
};

const notificationColors = {
  info: "bg-blue-500/10 text-blue-600 border-blue-200",
  success: "bg-green-500/10 text-green-600 border-green-200",
  warning: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  error: "bg-red-500/10 text-red-600 border-red-200",
  mention: "bg-purple-500/10 text-purple-600 border-purple-200",
  assignment: "bg-orange-500/10 text-orange-600 border-orange-200",
  deadline: "bg-pink-500/10 text-pink-600 border-pink-200",
};

export function AdvancedNotificationCenter() {
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'tasks'>('all');
  const [showArchived, setShowArchived] = useState(false);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'mentions' && !notification.message.includes('@')) return false;
    if (filter === 'tasks' && !notification.related_task_id) return false;
    if (!showArchived && notification.read) return false;
    return true;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const today = new Date();
    const notificationDate = new Date(notification.created_at);
    const diffInDays = Math.floor((today.getTime() - notificationDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let group = 'Today';
    if (diffInDays === 1) group = 'Yesterday';
    else if (diffInDays > 1 && diffInDays <= 7) group = 'This Week';
    else if (diffInDays > 7) group = 'Older';
    
    if (!groups[group]) groups[group] = [];
    groups[group].push(notification);
    return groups;
  }, {} as Record<string, typeof notifications>);

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead()}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark All Read
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Mentions
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            <ScrollArea className="h-[600px] pr-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No notifications
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {filter === 'unread' 
                      ? "You're all caught up!" 
                      : "You don't have any notifications yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
                    <div key={group}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                        {group}
                      </h4>
                      <div className="space-y-2">
                        {groupNotifications.map((notification) => {
                          const IconComponent = notificationIcons[notification.type as keyof typeof notificationIcons] || Info;
                          const colorClass = notificationColors[notification.type as keyof typeof notificationColors] || notificationColors.info;
                          
                          return (
                            <div
                              key={notification.id}
                              className={cn(
                                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                                !notification.read 
                                  ? "bg-accent/50 border-accent" 
                                  : "bg-background border-border hover:bg-accent/20"
                              )}
                              onClick={() => handleNotificationClick(notification.id)}
                            >
                              <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border",
                                colorClass
                              )}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h5 className={cn(
                                      "text-sm font-medium truncate",
                                      !notification.read && "font-semibold"
                                    )}>
                                      {notification.title}
                                    </h5>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {notification.message}
                                    </p>
                                  </div>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-1 flex-shrink-0" />
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                  </span>
                                  {notification.related_task_id && (
                                    <Badge variant="outline" className="text-xs">
                                      Task
                                    </Badge>
                                  )}
                                  {notification.related_project_id && (
                                    <Badge variant="outline" className="text-xs">
                                      Project
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {group !== 'Older' && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}