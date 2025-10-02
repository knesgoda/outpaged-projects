import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { AdvancedDocumentEditor } from "@/components/documents/AdvancedDocumentEditor";
import { DocumentTemplateSelector } from "@/components/documents/DocumentTemplateSelector";
import { MeetingNotesEditor } from "@/components/documents/MeetingNotesEditor";
import { RealTimeCollaboration } from "@/components/collaboration/RealTimeCollaboration";
import { useSearchParams } from "react-router-dom";
import { FileText, FileCode, Calendar, Library, Users } from "lucide-react";

export default function Documents() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project") || "";
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents & Knowledge</h1>
        <p className="text-muted-foreground">
          Create and manage project documentation, RFCs, and meeting notes
        </p>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">
            <Library className="h-4 w-4 mr-2" />
            Document Library
          </TabsTrigger>
          <TabsTrigger value="editor">
            <FileText className="h-4 w-4 mr-2" />
            Document Editor
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileCode className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="meeting">
            <Calendar className="h-4 w-4 mr-2" />
            Meeting Notes
          </TabsTrigger>
          <TabsTrigger value="collaboration">
            <Users className="h-4 w-4 mr-2" />
            Collaboration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentManager projectId={projectId} />
        </TabsContent>

        <TabsContent value="editor">
          <AdvancedDocumentEditor />
        </TabsContent>

        <TabsContent value="templates">
          <DocumentTemplateSelector onSelectTemplate={setSelectedTemplate} />
        </TabsContent>

        <TabsContent value="meeting">
          <MeetingNotesEditor />
        </TabsContent>

        <TabsContent value="collaboration">
          <RealTimeCollaboration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
