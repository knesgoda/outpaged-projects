import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

const STORAGE_KEY = "outpaged.appearance";

type AppearancePrefs = {
  density: "comfortable" | "compact";
  sidebarPinned: boolean;
};

const DEFAULT_PREFS: AppearancePrefs = {
  density: "comfortable",
  sidebarPinned: true,
};

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppearancePrefs;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch (error) {
      console.warn("Unable to load appearance prefs", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    document.documentElement.dataset.density = prefs.density;
    document.body.dataset.sidebarPinned = prefs.sidebarPinned ? "true" : "false";
  }, [prefs]);

  const updateDensity = (density: AppearancePrefs["density"]) => {
    setPrefs((prev) => ({ ...prev, density }));
  };

  const toggleSidebarPinned = (checked: boolean) => {
    setPrefs((prev) => ({ ...prev, sidebarPinned: checked }));
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Appearance</h2>
        <p className="text-muted-foreground">Fine tune the interface to match your preferences.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose light, dark, or match your system.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            { label: "System", value: "system" },
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
          ].map((option) => (
            <Button
              key={option.value}
              variant={theme === option.value ? "default" : "outline"}
              onClick={() => setTheme(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Layout</CardTitle>
          <CardDescription>Adjust density and sidebar defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Density</p>
              <p className="text-sm text-muted-foreground">Compact mode fits more rows on screen.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={prefs.density === "comfortable" ? "default" : "outline"}
                onClick={() => updateDensity("comfortable")}
              >
                Comfortable
              </Button>
              <Button
                variant={prefs.density === "compact" ? "default" : "outline"}
                onClick={() => updateDensity("compact")}
              >
                Compact
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Pin sidebar</p>
              <p className="text-sm text-muted-foreground">Keep navigation open when you reload.</p>
            </div>
            <Switch checked={prefs.sidebarPinned} onCheckedChange={toggleSidebarPinned} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
