import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/ui/file-upload';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Clock, 
  Mail,
  Upload,
  Save,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    full_name: '',
    avatar_url: '',
    role: 'developer' as 'developer' | 'admin' | 'project_manager' | 'designer' | 'qa' | 'viewer' | 'super_admin',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    task_assignments: true,
    project_updates: true,
    comments: true,
    time_reminders: false,
  });

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: 'system',
    compact_mode: false,
    show_avatars: true,
  });

  // Time tracking preferences
  const [timeSettings, setTimeSettings] = useState({
    auto_start_timer: false,
    default_break_duration: 15,
    work_hours_start: '09:00',
    work_hours_end: '17:00',
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Update your profile information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profileData.avatar_url} />
                <AvatarFallback>
                  {profileData.full_name?.charAt(0) || user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label className="text-sm">Profile Picture</Label>
                <FileUpload
                  onFileUpload={async (file) => {
                    // Handle avatar upload
                    toast({ title: "Feature coming soon", description: "Avatar upload will be implemented" });
                  }}
                  accept="image/*"
                  maxSizeMB={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={profileData.role}
                onValueChange={(value) => setProfileData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="manager">Project Manager</SelectItem>
                  <SelectItem value="qa">QA Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveProfile} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure when and how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Time Tracking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Tracking
            </CardTitle>
            <CardDescription>
              Configure time tracking preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-start timer on task assignment</Label>
              <Switch
                checked={timeSettings.auto_start_timer}
                onCheckedChange={(checked) => 
                  setTimeSettings(prev => ({ ...prev, auto_start_timer: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Work Hours</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="time"
                    value={timeSettings.work_hours_start}
                    onChange={(e) => setTimeSettings(prev => ({ 
                      ...prev, 
                      work_hours_start: e.target.value 
                    }))}
                  />
                  <Label className="text-xs text-muted-foreground">Start</Label>
                </div>
                <div>
                  <Input
                    type="time"
                    value={timeSettings.work_hours_end}
                    onChange={(e) => setTimeSettings(prev => ({ 
                      ...prev, 
                      work_hours_end: e.target.value 
                    }))}
                  />
                  <Label className="text-xs text-muted-foreground">End</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}