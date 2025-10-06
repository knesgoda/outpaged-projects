import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyProfile, useUpdateMyProfile, useUploadAvatar } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";

type FormState = {
  full_name: string;
};

const DEFAULT_STATE: FormState = {
  full_name: "",
};

export default function ProfileSettings() {
  const { data: profile, isLoading, error } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const uploadAvatar = useUploadAvatar();
  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFormState({ full_name: profile.full_name ?? "" });
  }, [profile]);

  const initials = useMemo(() => {
    if (formState.full_name.trim()) {
      return formState.full_name
        .trim()
        .split(" ")
        .map((part) => part[0]?.toUpperCase())
        .join("");
    }
    return "U";
  }, [formState.full_name]);

  const avatarPreview = uploadAvatar.data ?? profile?.avatar_url ?? undefined;

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ full_name: event.target.value });
    if (formError) {
      setFormError(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = formState.full_name.trim();

    if (trimmed.length < 2 || trimmed.length > 60) {
      setFormError("Name must be 2 to 60 characters.");
      return;
    }

    setFormError(null);
    updateProfile.mutate({ full_name: trimmed });
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file);
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">Update your name and profile photo.</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive">Unable to load your profile.</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {isLoading ? (
              <Skeleton className="h-24 w-24 rounded-full" />
            ) : (
              <Avatar className="h-24 w-24">
                {avatarPreview ? <AvatarImage src={avatarPreview} alt={formState.full_name || "User avatar"} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Upload a square image under 5 MB.</p>
              <Input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadAvatar.isPending} />
              {uploadAvatar.isPending && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={formState.full_name}
              onChange={handleInputChange}
              placeholder="Add your name"
              autoComplete="name"
            />
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

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
