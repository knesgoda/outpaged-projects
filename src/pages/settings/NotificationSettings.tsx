import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const STORAGE_KEY = "outpaged.notifications";

type NotificationPrefs = {
  productUpdates: boolean;
  taskAssigned: boolean;
  comments: boolean;
  reminders: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  productUpdates: true,
  taskAssigned: true,
  comments: true,
  reminders: false,
};

export default function NotificationSettings() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as NotificationPrefs;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch (error) {
      console.warn("Unable to load notification prefs", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const toggle = (key: keyof NotificationPrefs) => (checked: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: checked }));
  };

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    toast({ title: "Preferences reset", description: "Notification defaults restored." });
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground">Choose when Outpaged sends you email updates.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Email alerts</CardTitle>
          <CardDescription>These apply to both email and push if enabled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Task assignments</p>
              <p className="text-sm text-muted-foreground">Get an email when someone assigns you work.</p>
            </div>
            <Switch checked={prefs.taskAssigned} onCheckedChange={toggle("taskAssigned")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Comment mentions</p>
              <p className="text-sm text-muted-foreground">Stay in the loop when teammates tag you.</p>
            </div>
            <Switch checked={prefs.comments} onCheckedChange={toggle("comments")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reminders</p>
              <p className="text-sm text-muted-foreground">Daily nudges for overdue items.</p>
            </div>
            <Switch checked={prefs.reminders} onCheckedChange={toggle("reminders")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Product updates</p>
              <p className="text-sm text-muted-foreground">Hear about launches and improvements.</p>
            </div>
            <Switch checked={prefs.productUpdates} onCheckedChange={toggle("productUpdates")} />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleReset}>
              Reset to defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
