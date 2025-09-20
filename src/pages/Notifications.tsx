import { useState } from "react";
import { AdvancedNotificationCenter } from "@/components/notifications/AdvancedNotificationCenter";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { enableOutpagedBrand } from "@/lib/featureFlags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/outpaged/StatusChip";
import { Check } from "lucide-react";

export default function Notifications() {
  if (enableOutpagedBrand) {
    return <OutpagedNotifications />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Notifications & Activity</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AdvancedNotificationCenter />
          <ActivityFeed showTitle={true} />
        </div>
      </div>
    </div>
  );
}

function OutpagedNotifications() {
  const notifications = [
    { title: 'You were assigned to UI Story', actor: 'Maria Chen', time: '15 m ago' },
    { title: 'Marketing campaign has been scheduled', actor: 'Team Updates', time: '25 m ago' },
  ];

  const [preferences, setPreferences] = useState({
    email: true,
    inApp: true,
    slack: true,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]">
          Notifications
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Inbox & Preferences</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-none shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[hsl(var(--foreground))]">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.title}
                className="rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-4 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{notification.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{notification.actor} • {notification.time}</p>
                  </div>
                  <StatusChip variant="accent">New</StatusChip>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[hsl(var(--foreground))]">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                { key: 'email', label: 'Email' },
                { key: 'inApp', label: 'In-app' },
                { key: 'slack', label: 'Slack' },
              ] as const
            ).map((channel) => (
              <PreferenceToggle
                key={channel.key}
                label={channel.label}
                description="Alerts and updates"
                checked={preferences[channel.key]}
                onToggle={(checked) =>
                  setPreferences((prev) => ({ ...prev, [channel.key]: checked }))
                }
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}

function PreferenceToggle({ label, description, checked, onToggle }: PreferenceToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-3 text-left transition hover:border-[hsl(var(--accent))]/50"
    >
      <div>
        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{label}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
      <span
        className={
          checked
            ? "grid h-7 w-7 place-items-center rounded-lg bg-[hsl(var(--accent))] text-white shadow-soft"
            : "grid h-7 w-7 place-items-center rounded-lg border border-[hsl(var(--chip-neutral))] text-[hsl(var(--muted-foreground))]"
        }
      >
        {checked && <Check className="h-4 w-4" />}
      </span>
    </button>
  );
}