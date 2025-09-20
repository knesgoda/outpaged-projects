import { useMemo, useState } from "react";
import { FileText, PenSquare, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOperations } from "./OperationsProvider";

export function DocsWorkspacePanel() {
  const { docTemplates, documents, saveDocument, requestDocApproval, respondToDocApproval } = useOperations();
  const [docDraft, setDocDraft] = useState({ title: "", templateId: docTemplates[0]?.id ?? "" });
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [chipDraft, setChipDraft] = useState({ itemId: "", status: "", assignee: "" });
  const [boundDraft, setBoundDraft] = useState({ field: "", value: "" });
  const [approvalDraft, setApprovalDraft] = useState({ reviewer: "" });

  const selectedDoc = useMemo(() => documents.find((doc) => doc.id === selectedDocId) ?? documents[0] ?? null, [documents, selectedDocId]);

  const templateContent = docTemplates.find((template) => template.id === docDraft.templateId)?.content ?? "";

  const handleCreateDoc = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!docDraft.title) return;
    const doc = saveDocument({
      title: docDraft.title,
      templateId: docDraft.templateId,
      content: templateContent,
      changes: [],
      chips: [],
      boundFields: [],
      requiredApprovers: [],
    });
    setSelectedDocId(doc.id);
    setDocDraft({ title: "", templateId: docTemplates[0]?.id ?? "" });
  };

  const handleContentChange = (content: string) => {
    if (!selectedDoc) return;
    saveDocument({
      id: selectedDoc.id,
      title: selectedDoc.title,
      templateId: selectedDoc.templateId,
      content,
      changes: [
        ...selectedDoc.changes,
        {
          id: `${Date.now()}`,
          type: "insert",
          content,
          author: "operations",
          timestamp: new Date().toISOString(),
        },
      ],
    });
  };

  const handleAddChip = () => {
    if (!selectedDoc || !chipDraft.itemId || !chipDraft.status) return;
    saveDocument({
      id: selectedDoc.id,
      title: selectedDoc.title,
      chips: [...selectedDoc.chips, { ...chipDraft }],
    });
    setChipDraft({ itemId: "", status: "", assignee: "" });
  };

  const handleAddBoundField = () => {
    if (!selectedDoc || !boundDraft.field) return;
    saveDocument({
      id: selectedDoc.id,
      title: selectedDoc.title,
      boundFields: [...selectedDoc.boundFields, { field: boundDraft.field, itemId: boundDraft.field, value: boundDraft.value }],
    });
    setBoundDraft({ field: "", value: "" });
  };

  const handleRequestApproval = () => {
    if (!selectedDoc || !approvalDraft.reviewer) return;
    saveDocument({
      id: selectedDoc.id,
      title: selectedDoc.title,
      requiredApprovers: Array.from(new Set([...(selectedDoc.requiredApprovers ?? []), approvalDraft.reviewer])),
    });
    requestDocApproval(selectedDoc.id, approvalDraft.reviewer);
    setApprovalDraft({ reviewer: "" });
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Docs workspace</CardTitle>
        <CardDescription>
          Draft PRDs and RFCs with live chips, field bindings, tracked changes, and structured approvals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateDoc} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={docDraft.title}
              onChange={(event) => setDocDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Payments API RFC"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="doc-template">Template</Label>
            <select
              id="doc-template"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={docDraft.templateId}
              onChange={(event) => setDocDraft((prev) => ({ ...prev, templateId: event.target.value }))}
            >
              {docTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-5 flex items-end justify-end">
            <Button type="submit">
              Create doc
            </Button>
          </div>
        </form>

        {documents.length === 0 ? (
          <div className="text-sm text-muted-foreground border rounded-lg p-6">
            No documents yet. Create a PRD or RFC to start collaborating.
          </div>
        ) : (
          <Tabs value={selectedDoc?.id ?? documents[0].id} onValueChange={setSelectedDocId}>
            <TabsList className="flex-wrap">
              {documents.map((doc) => (
                <TabsTrigger key={doc.id} value={doc.id} className="text-left">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{doc.title}</span>
                    <Badge variant={doc.status === "final" ? "secondary" : "outline"}>{doc.status}</Badge>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {documents.map((doc) => (
              <TabsContent key={doc.id} value={doc.id} className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PenSquare className="h-4 w-4" /> Body
                    </div>
                    <Textarea
                      value={doc.content}
                      onChange={(event) => handleContentChange(event.target.value)}
                      rows={12}
                    />
                    <div className="text-xs text-muted-foreground">
                      Autosaved {new Date(doc.autosavedAt).toLocaleTimeString()} • {doc.changes.length} tracked change(s)
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-4 text-sm">
                    <div>
                      <Label>Status chips</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={chipDraft.itemId}
                          onChange={(event) => setChipDraft((prev) => ({ ...prev, itemId: event.target.value }))}
                          placeholder="Item ID"
                        />
                        <Input
                          value={chipDraft.status}
                          onChange={(event) => setChipDraft((prev) => ({ ...prev, status: event.target.value }))}
                          placeholder="Status"
                        />
                        <Input
                          value={chipDraft.assignee}
                          onChange={(event) => setChipDraft((prev) => ({ ...prev, assignee: event.target.value }))}
                          placeholder="Assignee"
                        />
                        <Button type="button" onClick={handleAddChip}>
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {doc.chips.map((chip) => (
                          <Badge key={chip.itemId} variant="outline">
                            {chip.itemId} • {chip.status} • {chip.assignee}
                          </Badge>
                        ))}
                        {doc.chips.length === 0 && <Badge variant="outline">No chips</Badge>}
                      </div>
                    </div>

                    <div>
                      <Label>Bound fields</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={boundDraft.field}
                          onChange={(event) => setBoundDraft((prev) => ({ ...prev, field: event.target.value }))}
                          placeholder="Field"
                        />
                        <Input
                          value={boundDraft.value}
                          onChange={(event) => setBoundDraft((prev) => ({ ...prev, value: event.target.value }))}
                          placeholder="Value"
                        />
                        <Button type="button" onClick={handleAddBoundField}>
                          Bind
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {doc.boundFields.map((field) => (
                          <Badge key={field.field} variant="secondary">
                            {field.field}: {field.value}
                          </Badge>
                        ))}
                        {doc.boundFields.length === 0 && <Badge variant="outline">No bound fields</Badge>}
                      </div>
                    </div>

                    <div>
                      <Label>Approvals</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={approvalDraft.reviewer}
                          onChange={(event) => setApprovalDraft({ reviewer: event.target.value })}
                          placeholder="Reviewer email"
                        />
                        <Button type="button" onClick={handleRequestApproval}>
                          <UserPlus className="h-4 w-4 mr-1" /> Request
                        </Button>
                      </div>
                      <div className="space-y-1 mt-2 text-xs">
                        {doc.approvals.length === 0 && <p className="text-muted-foreground">No approvals requested.</p>}
                        {doc.approvals.map((approval) => (
                          <div key={approval.id} className="flex items-center justify-between">
                            <span>{approval.reviewer}</span>
                            <div className="flex gap-2">
                              <Badge variant="outline">{approval.status}</Badge>
                              {approval.status === "pending" && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => respondToDocApproval(approval.id, "approved")}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => respondToDocApproval(approval.id, "rejected")}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
