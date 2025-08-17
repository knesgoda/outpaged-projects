import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Upload, 
  Download, 
  Share2, 
  Archive, 
  Clock, 
  User, 
  FolderPlus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface DocumentVersion {
  id: string;
  version: number;
  created_at: string;
  created_by: string;
  file_size: number;
  file_path: string;
  changes_summary?: string;
}

interface Document {
  id: string;
  name: string;
  description?: string;
  file_type: string;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  current_version: number;
  is_template: boolean;
  category: 'document' | 'template' | 'wiki';
  tags: string[];
  shared_with: string[];
  versions: DocumentVersion[];
}

interface DocumentManagerProps {
  projectId?: string;
}

export function DocumentManager({ projectId }: DocumentManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'document' | 'template' | 'wiki'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, projectId]);

  const loadDocuments = async () => {
    try {
      // For demo purposes, using localStorage
      const savedDocs = localStorage.getItem(`documents_${projectId || 'global'}`);
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      } else {
        // Initialize with some demo templates
        const demoTemplates: Document[] = [
          {
            id: '1',
            name: 'Project Requirements Template',
            description: 'Standard template for documenting project requirements',
            file_type: 'markdown',
            project_id: projectId || 'global',
            created_by: user?.id || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            current_version: 1,
            is_template: true,
            category: 'template',
            tags: ['requirements', 'template'],
            shared_with: [],
            versions: [{
              id: '1-v1',
              version: 1,
              created_at: new Date().toISOString(),
              created_by: user?.id || '',
              file_size: 2048,
              file_path: '/templates/requirements.md',
              changes_summary: 'Initial template creation'
            }]
          },
          {
            id: '2',
            name: 'Sprint Planning Guide',
            description: 'How to conduct effective sprint planning sessions',
            file_type: 'markdown',
            project_id: projectId || 'global',
            created_by: user?.id || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            current_version: 1,
            is_template: false,
            category: 'wiki',
            tags: ['sprint', 'planning', 'guide'],
            shared_with: [],
            versions: [{
              id: '2-v1',
              version: 1,
              created_at: new Date().toISOString(),
              created_by: user?.id || '',
              file_size: 4096,
              file_path: '/wiki/sprint-planning.md',
              changes_summary: 'Initial guide creation'
            }]
          }
        ];
        setDocuments(demoTemplates);
        localStorage.setItem(`documents_${projectId || 'global'}`, JSON.stringify(demoTemplates));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    
    try {
      // For demo purposes, we'll simulate file upload
      const newDocument: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        description: '',
        file_type: file.type,
        project_id: projectId || 'global',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_version: 1,
        is_template: false,
        category: 'document',
        tags: [],
        shared_with: [],
        versions: [{
          id: crypto.randomUUID(),
          version: 1,
          created_at: new Date().toISOString(),
          created_by: user.id,
          file_size: file.size,
          file_path: `/documents/${file.name}`,
          changes_summary: 'Initial upload'
        }]
      };

      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);
      localStorage.setItem(`documents_${projectId || 'global'}`, JSON.stringify(updatedDocuments));

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully.`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const createNewVersion = (docId: string, changes: string) => {
    const updatedDocuments = documents.map(doc => {
      if (doc.id === docId) {
        const newVersion: DocumentVersion = {
          id: crypto.randomUUID(),
          version: doc.current_version + 1,
          created_at: new Date().toISOString(),
          created_by: user?.id || '',
          file_size: doc.versions[doc.versions.length - 1]?.file_size || 0,
          file_path: doc.versions[doc.versions.length - 1]?.file_path || '',
          changes_summary: changes
        };

        return {
          ...doc,
          current_version: newVersion.version,
          updated_at: new Date().toISOString(),
          versions: [...doc.versions, newVersion]
        };
      }
      return doc;
    });

    setDocuments(updatedDocuments);
    localStorage.setItem(`documents_${projectId || 'global'}`, JSON.stringify(updatedDocuments));
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Document Management</h2>
          <p className="text-muted-foreground">Manage documents, templates, and knowledge base</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label htmlFor="file-upload" className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </label>
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <FolderPlus className="w-4 h-4" />
                New Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Document</DialogTitle>
                <DialogDescription>
                  Start a new document or create a template
                </DialogDescription>
              </DialogHeader>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Document creation coming soon!</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="template">Templates</SelectItem>
            <SelectItem value="wiki">Wiki/Knowledge Base</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
        <TabsList>
          <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
          <TabsTrigger value="document">
            Documents ({documents.filter(d => d.category === 'document').length})
          </TabsTrigger>
          <TabsTrigger value="template">
            Templates ({documents.filter(d => d.category === 'template').length})
          </TabsTrigger>
          <TabsTrigger value="wiki">
            Wiki ({documents.filter(d => d.category === 'wiki').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Documents Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery ? 'No documents match your search criteria.' : 'Upload your first document to get started.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary mt-1" />
                        <div className="flex-1">
                          <CardTitle className="text-lg">{doc.name}</CardTitle>
                          {doc.description && (
                            <CardDescription className="mt-1">{doc.description}</CardDescription>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Created by you
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(doc.updated_at).toLocaleDateString()}
                            </span>
                            <span>v{doc.current_version}</span>
                            <span>{formatFileSize(doc.versions[doc.versions.length - 1]?.file_size || 0)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={doc.is_template ? 'secondary' : 'outline'}>
                          {doc.category}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem className="gap-2">
                              <Eye className="w-4 h-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Download className="w-4 h-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Share2 className="w-4 h-4" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {doc.versions.length > 1 && (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium">Version History:</p>
                          <div className="mt-1 space-y-1">
                            {doc.versions.slice(-3).reverse().map((version) => (
                              <div key={version.id} className="flex items-center justify-between">
                                <span>v{version.version} - {version.changes_summary}</span>
                                <span>{new Date(version.created_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}