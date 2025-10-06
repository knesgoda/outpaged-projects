import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type LogoUploaderProps = {
  logoUrl?: string | null;
  uploading?: boolean;
  onUpload: (file: File) => void;
};

export function LogoUploader({ logoUrl, uploading = false, onUpload }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
      event.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand logo</CardTitle>
        <CardDescription>Used on navigation and email footers.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-20 w-20 overflow-hidden rounded-md border bg-muted">
          {logoUrl ? (
            <img src={logoUrl} alt="Brand logo" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No logo
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="workspace-logo">Upload a square image (PNG or SVG).</Label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id="workspace-logo"
              type="file"
              accept="image/png,image/svg+xml,image/jpeg"
              className="hidden"
              onChange={handleChange}
            />
            <Button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading" : logoUrl ? "Replace logo" : "Upload logo"}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(logoUrl ?? "", "_blank")}
              >
                Preview
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
