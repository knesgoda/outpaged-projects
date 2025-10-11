import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
  sections: { id: string; label: string }[];
  activeSection: string;
  onSectionSelect: (id: string) => void;
}

export function SettingsSidebar({ sections, activeSection, onSectionSelect }: SettingsSidebarProps) {
  return (
    <nav className="sticky top-24 space-y-2">
      {sections.map(section => {
        const isActive = section.id === activeSection;
        return (
          <Button
            key={section.id}
            variant="ghost"
            className={cn(
              "w-full justify-start text-sm font-medium",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onSectionSelect(section.id)}
          >
            {section.label}
          </Button>
        );
      })}
    </nav>
  );
}
