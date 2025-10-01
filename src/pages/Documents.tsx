import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentTemplates } from "@/components/docs/DocumentTemplates";

export default function Documents() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents & Tools</h1>
        <p className="text-muted-foreground">
          Templates, saved filters, and productivity tools
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Document Templates</TabsTrigger>
          <TabsTrigger value="filters">Saved Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <DocumentTemplates />
        </TabsContent>

        <TabsContent value="filters">
          <div className="text-center py-12 text-muted-foreground">
            <p>Saved Filters feature coming soon</p>
            <p className="text-sm mt-2">Save and share your favorite search filters</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
