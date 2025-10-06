import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyProfile, useUpdateMyProfile, useUploadAvatar } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
];

type FormState = {
  full_name: string;
  title: string;
  department: string;
  timezone: string;
  capacity_hours_per_week: string;
};

const DEFAULT_STATE: FormState = {
  full_name: "",
  title: "",
  department: "",
  timezone: "UTC",
  capacity_hours_per_week: "40",
};

export default function ProfileSettings() {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const uploadAvatar = useUploadAvatar();

  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFormState({
      full_name: profile.full_name ?? "",
      title: profile.title ?? "",
      department: profile.department ?? "",
      timezone: profile.timezone ?? "UTC",
      capacity_hours_per_week: profile.capacity_hours_per_week?.toString() ?? "40",
    });
  }, [profile]);

  const initials = useMemo(() => {
    if (formState.full_name) {
      return formState.full_name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join("");
    }
    return "U";
  }, [formState.full_name]);

  const handleInputChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      full_name: formState.full_name.trim() || null,
      title: formState.title.trim() || null,
      department: formState.department.trim() || null,
      timezone: formState.timezone,
      capacity_hours_per_week: formState.capacity_hours_per_week
        ? Number(formState.capacity_hours_per_week)
        : null,
    };

    updateProfile.mutate(payload);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file);
  };

  const avatarPreview = uploadAvatar.isSuccess ? uploadAvatar.data : profile?.avatar_url ?? undefined;

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">Update your personal details and photo.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {isLoading ? (
              <Skeleton className="h-24 w-24 rounded-full" />
            ) : (
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview} alt={formState.full_name || "User avatar"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Upload a square image at least 256px.</p>
              <Input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadAvatar.isPending} />
              {uploadAvatar.isPending && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={formState.full_name}
                onChange={handleInputChange("full_name")}
                placeholder="Add your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formState.title}
                onChange={handleInputChange("title")}
                placeholder="Product Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formState.department}
                onChange={handleInputChange("department")}
                placeholder="Operations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (hours per week)</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={80}
                step={1}
                value={formState.capacity_hours_per_week}
                onChange={handleInputChange("capacity_hours_per_week")}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={formState.timezone}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
