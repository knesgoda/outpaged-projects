import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/ui/file-upload';
import { ExportDialog } from '@/components/import-export/ExportDialog';
import { ImportDialog } from '@/components/import-export/ImportDialog';
import { ProjectCodeGenerator } from '@/components/admin/ProjectCodeGenerator';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Clock, 
  Mail,
  Upload,
  Download,
  Save,
  Settings as SettingsIcon,
  BookOpen,
  RotateCcw,
  Code
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { getMyProfile, updateMyProfile, uploadMyAvatar } from '@/services/profile';
import { useProfileState } from '@/state/profile';

export default function Settings() {
  const { user } = useAuth();
  const { restartOnboarding } = useOnboarding();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const { setProfile, error: profileError } = useProfileState();
  const [isLoading, setIsLoading] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    full_name: '',
    avatar_url: '',
  });

  // Load profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const data = await getMyProfile();
        if (data) {
          setProfileData({
            full_name: data.full_name ?? '',
            avatar_url: data.avatar_url ?? '',
          });
        }
        setProfile(data ?? null);
      } catch (error) {
        console.error('Failed to load profile', error);
      }
    };

    fetchProfile();
  }, [user?.id, toast, setProfile]);

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

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    const currentName = profileData.full_name.trim();
    try {
      const publicUrl = await uploadMyAvatar(file);
      setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
      setProfile(prev => {
        const updated_at = new Date().toISOString();
        if (prev) {
          return { ...prev, avatar_url: publicUrl, updated_at };
        }
        if (!user?.id) {
          return prev;
        }
        return {
          id: user.id,
          full_name: currentName ? currentName : null,
          avatar_url: publicUrl,
          updated_at,
        };
      });
      toast({ title: 'Avatar updated', description: 'Profile picture saved.' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Could not update profile picture.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = profileData.full_name.trim();
    if (trimmedName.length > 0 && (trimmedName.length < 2 || trimmedName.length > 60)) {
      toast({
        title: 'Invalid name',
        description: 'Name must be between 2 and 60 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const updated = await updateMyProfile({
        full_name: trimmedName || null,
      });
      setProfileData(prev => ({ ...prev, full_name: updated.full_name ?? '' }));
      setProfile(prev => {
        if (!prev) {
          return updated;
        }
        return { ...prev, full_name: updated.full_name ?? prev.full_name };
      });
      toast({ title: 'Profile updated', description: 'Your profile has been saved.' });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to update profile. Please try again.',
        variant: 'destructive',
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
            {profileError ? (
              <p className="text-sm text-muted-foreground">
                Profile data is unavailable. You can still update your info below.
              </p>
            ) : null}
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
                  onFileUpload={handleAvatarUpload}
                  accept="image/*"
                  maxSizeMB={2}
                  disabled={uploading}
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

      {/* Import/Export Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Data Management</h2>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Import/Export
            </CardTitle>
            <CardDescription>
              Backup your data or import from external sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setExportDialog(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setImportDialog(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Tools - Only show for admins */}
        {isAdmin && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Tools
              </CardTitle>
              <CardDescription>
                Administrative tools and system management features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectCodeGenerator />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help & Onboarding Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Help & Learning</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Restart Onboarding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Tutorial
              </CardTitle>
              <CardDescription>
                Restart the onboarding tutorial to learn the features again
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  restartOnboarding();
                  toast({
                    title: "Tutorial Restarted",
                    description: "The onboarding tutorial will begin shortly.",
                  });
                }}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart Onboarding
              </Button>
            </CardContent>
          </Card>

          {/* Help Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Help Resources
              </CardTitle>
              <CardDescription>
                Get help and learn more about ProjectFlow features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                📚 User Guide
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                🎥 Video Tutorials
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                💬 Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Import/Export Dialogs */}
      <ExportDialog 
        isOpen={exportDialog} 
        onClose={() => setExportDialog(false)} 
      />
      <ImportDialog 
        isOpen={importDialog} 
        onClose={() => setImportDialog(false)} 
        onSuccess={() => {
          toast({
            title: "Import Successful",
            description: "Your data has been imported successfully",
          });
        }}
      />
    </div>
  );
}