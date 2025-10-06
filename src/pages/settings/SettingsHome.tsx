import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AtSign, Shield, Bell, Palette, Link as LinkIcon, UserCircle2 } from "lucide-react";

const sections = [
  {
    title: "Profile",
    description: "Edit your info and avatar.",
    to: "/settings/profile",
    icon: <UserCircle2 className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Account",
    description: "Review login details.",
    to: "/settings/account",
    icon: <AtSign className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Security",
    description: "Manage passwords and MFA.",
    to: "/settings/security",
    icon: <Shield className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Notifications",
    description: "Choose what you hear about.",
    to: "/settings/notifications",
    icon: <Bell className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Appearance",
    description: "Pick theme and layout.",
    to: "/settings/appearance",
    icon: <Palette className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Connections",
    description: "Link external tools.",
    to: "/settings/connections",
    icon: <LinkIcon className="h-5 w-5" aria-hidden="true" />,
  },
];

export default function SettingsHome() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">Quickly jump into the settings you use most.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.to}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
              {section.icon}
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to={section.to}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
