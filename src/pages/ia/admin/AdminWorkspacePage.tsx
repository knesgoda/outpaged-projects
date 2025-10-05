import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { PageTemplate } from "../PageTemplate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceBranding } from "@/state/workspaceBranding";
import { upsertWorkspaceSettings } from "@/services/settings";
import { uploadPublicImage } from "@/services/storage";
import { requireUserId } from "@/services/utils";

export default function AdminWorkspacePage() {
  const { toast } = useToast();
  const { settings, setSettings } = useWorkspaceBranding();
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBrandName(settings?.brand_name ?? "");
    setLogoUrl(settings?.brand_logo_url ?? null);
  }, [settings]);

  const handleNameSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSavingName(true);
      const updated = await upsertWorkspaceSettings({
        brand_name: brandName.trim() || null,
      });
      setSettings(updated);
      toast({ title: "Workspace updated", description: "Brand name saved." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const owner = settings?.owner ?? (await requireUserId());
      const { publicUrl } = await uploadPublicImage("branding", file, `branding/${owner}`);
      const updated = await upsertWorkspaceSettings({ brand_logo_url: publicUrl });
      setSettings(updated);
      setLogoUrl(publicUrl);
      toast({ title: "Logo updated", description: "New logo is live." });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <PageTemplate
      title="Workspace"
      description="Manage workspace branding and company identity."
    >
      <div className="space-y-8">
        <form className="space-y-4" onSubmit={handleNameSave}>
          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand name</Label>
            <Input
              id="brand-name"
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder="OutPaged"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={savingName}>
              {savingName ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName || "Workspace logo"} className="h-full w-full object-contain" />
              ) : (
                <span className="text-sm text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Upload PNG, JPG, or SVG up to 2 MB.</p>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload logo"}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        setUploading(true);
                        const updated = await upsertWorkspaceSettings({ brand_logo_url: null });
                        setSettings(updated);
                        setLogoUrl(null);
                        toast({ title: "Logo removed" });
                      } catch (error) {
                        toast({
                          title: "Remove failed",
                          description: error instanceof Error ? error.message : "Try again later.",
                          variant: "destructive",
                        });
                      } finally {
                        setUploading(false);
                      }
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
