import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const notificationIcons = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertCircle,
};

const notificationColors = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
};

export default function Notifications() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') {
      return !notification.read;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your team and project activities
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={() => markAllAsRead()}
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4">
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilter('all')}
          className="flex items-center gap-2"
        >
          <Bell className="h-4 w-4" />
          All Notifications
          <Badge variant="secondary" className="ml-1">
            {notifications.length}
          </Badge>
        </Button>
        
        <Button
          variant={filter === 'unread' ? 'default' : 'ghost'}
          onClick={() => setFilter('unread')}
          className="flex items-center gap-2"
        >
          <Bell className="h-4 w-4" />
          Unread
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-1">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {filter === 'all' ? 'All Notifications' : 'Unread Notifications'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-sm">
                {filter === 'unread' 
                  ? 'All caught up! You have no unread notifications.'
                  : 'When you receive notifications, they will appear here.'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {filteredNotifications.map((notification, index) => {
                  const IconComponent = notificationIcons[notification.type as keyof typeof notificationIcons];
                  const iconColor = notificationColors[notification.type as keyof typeof notificationColors];
                  
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-muted/30 transition-colors cursor-pointer",
                        !notification.read && "bg-primary/5 border-l-4 border-l-primary"
                      )}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn("mt-1", iconColor)}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={cn(
                              "text-sm font-medium",
                              !notification.read && "font-semibold"
                            )}>
                              {notification.title}
                            </h4>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          {(notification.related_task_id || notification.related_project_id) && (
                            <div className="flex items-center gap-2">
                              {notification.related_task_id && (
                                <Badge variant="outline" className="text-xs">
                                  Task: {notification.related_task_id.slice(0, 8)}...
                                </Badge>
                              )}
                              {notification.related_project_id && (
                                <Badge variant="outline" className="text-xs">
                                  Project: {notification.related_project_id.slice(0, 8)}...
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}