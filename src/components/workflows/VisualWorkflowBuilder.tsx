// Stub version until database schema is properly configured
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VisualWorkflowBuilderProps {
  templateId?: string;
  onSave?: (definition: any) => void;
}

export function VisualWorkflowBuilder({ templateId, onSave }: VisualWorkflowBuilderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual Workflow Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Workflow builder is currently unavailable. Database schema needs to be updated with required columns.
        </p>
        {templateId && <p className="text-sm mt-2">Template ID: {templateId}</p>}
      </CardContent>
    </Card>
  );
}
