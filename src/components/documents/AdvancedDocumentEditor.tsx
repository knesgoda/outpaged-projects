import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Save,
  Users,
  CheckCircle2,
  Clock,
  AtSign,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LinkedResourcesPanel } from "@/components/linked/LinkedResourcesPanel";
import { CommentsSystemWithMentions } from "@/components/comments/CommentsSystemWithMentions";

interface DocumentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'task-chip' | 'field-binding' | 'table';
  content: string;
  metadata?: any;
}

interface Document {
  id: string;
  title: string;
  type: 'prd' | 'rfc' | 'postmortem' | 'meeting' | 'general';
  blocks: DocumentBlock[];
  status: 'draft' | 'review' | 'approved';
  approvers?: { id: string; name: string; approved: boolean }[];
  version: number;
}

export function AdvancedDocumentEditor() {
  const [document, setDocument] = useState<Document>({
    id: '1',
    title: 'Product Requirements Document',
    type: 'prd',
    status: 'draft',
    version: 1,
    blocks: [
      { id: 'b1', type: 'heading', content: '# Product Requirements Document' },
      { id: 'b2', type: 'paragraph', content: 'Overview of the new feature...' },
      { id: 'b3', type: 'task-chip', content: '@TASK-123', metadata: { taskId: '123', taskTitle: 'Implement OAuth' } },
      { id: 'b4', type: 'field-binding', content: '{{task.assignee}}', metadata: { field: 'assignee', value: 'Alice Johnson' } },
    ],
    approvers: [
      { id: '1', name: 'Bob Smith', approved: false },
      { id: '2', name: 'Carol Davis', approved: false },
    ]
  });

  const [currentBlock, setCurrentBlock] = useState('');
  const [isEditing, setIsEditing] = useState(true);

  const handleAddBlock = (type: DocumentBlock['type']) => {
    const newBlock: DocumentBlock = {
      id: `b${Date.now()}`,
      type,
      content: type === 'heading' ? '# ' : 
               type === 'task-chip' ? '@TASK-' : 
               type === 'field-binding' ? '{{task.}}' : '',
    };

    setDocument(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));
  };

  const handleBlockChange = (blockId: string, content: string) => {
    setDocument(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === blockId ? { ...block, content } : block
      )
    }));
  };

  const handleSave = () => {
    toast({
      title: "Document Saved",
      description: `Version ${document.version} saved successfully`,
    });
  };

  const handleRequestApproval = () => {
    setDocument(prev => ({ ...prev, status: 'review' }));
    toast({
      title: "Approval Requested",
      description: "Approvers have been notified",
    });
  };

  const handleApprove = (approverId: string) => {
    setDocument(prev => ({
      ...prev,
      approvers: prev.approvers?.map(a => 
        a.id === approverId ? { ...a, approved: true } : a
      )
    }));
    
    // Check if all approved
    const allApproved = document.approvers?.every(a => a.id === approverId || a.approved);
    if (allApproved) {
      setDocument(prev => ({ ...prev, status: 'approved' }));
      toast({
        title: "Document Approved",
        description: "All approvers have signed off",
      });
    }
  };

  const renderBlock = (block: DocumentBlock) => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="text-2xl font-bold mb-4">
            {isEditing ? (
              <Input
                value={block.content.replace(/^#+\s*/, '')}
                onChange={(e) => handleBlockChange(block.id, `# ${e.target.value}`)}
                className="text-2xl font-bold"
              />
            ) : (
              block.content.replace(/^#+\s*/, '')
            )}
          </div>
        );

      case 'paragraph':
        return (
          <div className="mb-4">
            {isEditing ? (
              <Textarea
                value={block.content}
                onChange={(e) => handleBlockChange(block.id, e.target.value)}
                className="min-h-[100px]"
              />
            ) : (
              <p>{block.content}</p>
            )}
          </div>
        );

      case 'task-chip':
        return (
          <div className="mb-4 inline-flex">
            <Badge 
              variant="outline" 
              className="gap-2 cursor-pointer hover:bg-accent"
            >
              <AtSign className="h-3 w-3" />
              {block.content}
              {block.metadata?.taskTitle && (
                <span className="text-xs">- {block.metadata.taskTitle}</span>
              )}
            </Badge>
          </div>
        );

      case 'field-binding':
        return (
          <div className="mb-4 inline-flex">
            <Badge variant="secondary" className="gap-2">
              <LinkIcon className="h-3 w-3" />
              {block.metadata?.value || block.content}
            </Badge>
          </div>
        );

      default:
        return <p>{block.content}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {document.title}
              </CardTitle>
              <CardDescription>
                Version {document.version} • {document.type.toUpperCase()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  document.status === 'approved' ? 'default' : 
                  document.status === 'review' ? 'secondary' : 
                  'outline'
                }
              >
                {document.status === 'draft' && <Clock className="h-3 w-3 mr-1" />}
                {document.status === 'review' && <Users className="h-3 w-3 mr-1" />}
                {document.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {document.status}
              </Badge>
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Toolbar */}
      {isEditing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => handleAddBlock('heading')} 
                variant="outline" 
                size="sm"
              >
                Heading
              </Button>
              <Button 
                onClick={() => handleAddBlock('paragraph')} 
                variant="outline" 
                size="sm"
              >
                Paragraph
              </Button>
              <Button 
                onClick={() => handleAddBlock('task-chip')} 
                variant="outline" 
                size="sm"
              >
                <AtSign className="h-4 w-4 mr-2" />
                Task Chip
              </Button>
              <Button 
                onClick={() => handleAddBlock('field-binding')} 
                variant="outline" 
                size="sm"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Field Binding
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {document.blocks.map(block => (
              <div key={block.id}>
                {renderBlock(block)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval Section */}
      {document.status !== 'draft' && document.approvers && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {document.approvers.map(approver => (
                <div 
                  key={approver.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{approver.name}</span>
                  </div>
                  {approver.approved ? (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  ) : (
                    <Button 
                      onClick={() => handleApprove(approver.id)}
                      size="sm"
                      variant="outline"
                    >
                      Approve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {document.status === 'draft' && (
        <div className="flex justify-end">
          <Button onClick={handleRequestApproval}>
            <Users className="h-4 w-4 mr-2" />
            Request Approval
          </Button>
        </div>
      )}

codex/implement-integrations-with-google-and-github
      <LinkedResourcesPanel entityType="doc" entityId={document.id} projectId={null} />
      <CommentsSystemWithMentions
        entityType="doc"
        entityId={document.id}
        title="Document comments"
      />
    </div>
  );
}
