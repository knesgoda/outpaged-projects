import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Lightbulb, 
  AlertCircle, 
  Calendar,
  FileCode
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: any;
  type: 'prd' | 'rfc' | 'postmortem' | 'meeting' | 'general';
  sections: string[];
}

interface DocumentTemplateSelectorProps {
  onSelectTemplate: (template: Template) => void;
}

export function DocumentTemplateSelector({ onSelectTemplate }: DocumentTemplateSelectorProps) {
  const templates: Template[] = [
    {
      id: 'prd',
      name: 'Product Requirements Document',
      description: 'Define product features and requirements',
      icon: FileText,
      type: 'prd',
      sections: [
        'Overview',
        'Problem Statement',
        'Goals & Success Metrics',
        'User Stories',
        'Requirements',
        'Technical Considerations',
        'Timeline',
        'Dependencies'
      ]
    },
    {
      id: 'rfc',
      name: 'Request for Comments',
      description: 'Technical design and architecture proposals',
      icon: FileCode,
      type: 'rfc',
      sections: [
        'Summary',
        'Motivation',
        'Proposed Solution',
        'Alternatives Considered',
        'Technical Details',
        'Security Considerations',
        'Testing Plan',
        'Rollout Plan'
      ]
    },
    {
      id: 'postmortem',
      name: 'Incident Postmortem',
      description: 'Document incidents and learnings',
      icon: AlertCircle,
      type: 'postmortem',
      sections: [
        'Incident Summary',
        'Timeline',
        'Impact',
        'Root Cause Analysis',
        'What Went Well',
        'What Went Wrong',
        'Action Items',
        'Lessons Learned'
      ]
    },
    {
      id: 'meeting',
      name: 'Meeting Notes',
      description: 'Capture meeting discussions and decisions',
      icon: Calendar,
      type: 'meeting',
      sections: [
        'Meeting Details',
        'Attendees',
        'Agenda',
        'Discussion Notes',
        'Decisions',
        'Action Items',
        'Next Steps'
      ]
    },
    {
      id: 'general',
      name: 'Blank Document',
      description: 'Start with an empty document',
      icon: Lightbulb,
      type: 'general',
      sections: []
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose a Template</h2>
        <p className="text-muted-foreground">
          Start with a pre-built template or create a blank document
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {template.sections.length > 0 && (
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold mb-2">Includes:</p>
                    <ul className="space-y-1">
                      {template.sections.slice(0, 4).map((section, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          {section}
                        </li>
                      ))}
                      {template.sections.length > 4 && (
                        <li className="text-xs">+{template.sections.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
