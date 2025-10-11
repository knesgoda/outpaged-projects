import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsSectionProps {
  id: string;
  title: string;
  description: string;
  actionSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsSection({ id, title, description, actionSlot, children }: SettingsSectionProps) {
  return (
    <section id={id} className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {actionSlot ? <div className="shrink-0">{actionSlot}</div> : null}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </section>
  );
}
