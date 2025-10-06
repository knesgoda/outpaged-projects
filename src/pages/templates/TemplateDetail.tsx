import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TemplateDetail() {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();

  useEffect(() => {
    if (templateId) {
      document.title = `Templates / ${templateId}`;
    }
  }, [templateId]);

  if (!templateId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Template not found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Template detail</h1>
          <p className="text-sm text-muted-foreground">Review and apply this template.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/templates/${templateId}/edit`)}>
            Edit
          </Button>
          <Button onClick={() => navigate(`/templates/${templateId}/apply`)}>Apply</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Template details will appear here.
        </CardContent>
      </Card>
    </div>
  );
}
