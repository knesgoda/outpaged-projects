import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Edit,
  Star,
  Clock,
  User,
  Tag,
  ChevronRight,
  FileText,
  Folder,
  Hash
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WikiPage {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  views: number;
  isFavorite: boolean;
}

interface WikiCategory {
  id: string;
  name: string;
  description: string;
  pageCount: number;
  color: string;
}

export function WikiKnowledgeBase() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [newPageCategory, setNewPageCategory] = useState('');
  const [newPageTags, setNewPageTags] = useState('');

  const categories: WikiCategory[] = [
    { id: 'getting-started', name: 'Getting Started', description: 'Basic guides and tutorials', pageCount: 8, color: 'bg-blue-500/20 text-blue-700' },
    { id: 'development', name: 'Development', description: 'Technical documentation', pageCount: 15, color: 'bg-green-500/20 text-green-700' },
    { id: 'processes', name: 'Processes', description: 'Team workflows and procedures', pageCount: 12, color: 'bg-purple-500/20 text-purple-700' },
    { id: 'tools', name: 'Tools & Integrations', description: 'Software tools and how-tos', pageCount: 6, color: 'bg-orange-500/20 text-orange-700' },
    { id: 'troubleshooting', name: 'Troubleshooting', description: 'Common issues and solutions', pageCount: 9, color: 'bg-red-500/20 text-red-700' }
  ];

  const wikiPages: WikiPage[] = [
    {
      id: '1',
      title: 'Getting Started with Project Management',
      content: 'This guide covers the basics of using our project management system...',
      author: 'John Doe',
      category: 'getting-started',
      tags: ['basics', 'tutorial', 'onboarding'],
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-15T14:30:00Z',
      views: 156,
      isFavorite: true
    },
    {
      id: '2',
      title: 'Setting Up GitHub Integration',
      content: 'Learn how to connect your GitHub repositories to sync issues and commits...',
      author: 'Jane Smith',
      category: 'tools',
      tags: ['github', 'integration', 'setup'],
      createdAt: '2024-01-12T11:00:00Z',
      updatedAt: '2024-01-14T16:20:00Z',
      views: 89,
      isFavorite: false
    },
    {
      id: '3',
      title: 'Sprint Planning Best Practices',
      content: 'A comprehensive guide to effective sprint planning in agile teams...',
      author: 'Mike Johnson',
      category: 'processes',
      tags: ['agile', 'sprint', 'planning'],
      createdAt: '2024-01-08T13:15:00Z',
      updatedAt: '2024-01-13T10:45:00Z',
      views: 203,
      isFavorite: true
    },
    {
      id: '4',
      title: 'Common API Integration Issues',
      content: 'Troubleshooting guide for API integration problems and their solutions...',
      author: 'Sarah Wilson',
      category: 'troubleshooting',
      tags: ['api', 'debugging', 'integration'],
      createdAt: '2024-01-05T16:30:00Z',
      updatedAt: '2024-01-11T09:20:00Z',
      views: 127,
      isFavorite: false
    }
  ];

  const filteredPages = wikiPages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || page.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreatePage = () => {
    if (!newPageTitle || !newPageContent) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newPage: WikiPage = {
      id: Math.random().toString(36).substr(2, 9),
      title: newPageTitle,
      content: newPageContent,
      author: 'Current User',
      category: newPageCategory || 'getting-started',
      tags: newPageTags.split(',').map(tag => tag.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      isFavorite: false
    };

    toast({
      title: "Page Created",
      description: `Wiki page "${newPageTitle}" has been created successfully`,
    });

    setShowCreatePage(false);
    setNewPageTitle('');
    setNewPageContent('');
    setNewPageCategory('');
    setNewPageTags('');
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.color || 'bg-gray-500/20 text-gray-700';
  };

  if (showCreatePage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Create New Wiki Page</h2>
            <p className="text-muted-foreground">Add new documentation to the knowledge base</p>
          </div>
          <Button variant="outline" onClick={() => setShowCreatePage(false)}>
            Cancel
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title">Page Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter page title"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={newPageCategory} onValueChange={setNewPageCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Enter tags separated by commas"
                value={newPageTags}
                onChange={(e) => setNewPageTags(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Example: tutorial, api, integration
              </p>
            </div>
            
            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your page content here..."
                value={newPageContent}
                onChange={(e) => setNewPageContent(e.target.value)}
                rows={12}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supports Markdown formatting
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleCreatePage}>
                <FileText className="w-4 h-4 mr-2" />
                Create Page
              </Button>
              <Button variant="outline">
                Save as Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Base</h2>
          <p className="text-muted-foreground">Centralized documentation and guides for your team</p>
        </div>
        <Button onClick={() => setShowCreatePage(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Page
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          <div className="grid gap-4">
            {filteredPages.map((page) => (
              <Card key={page.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{page.title}</h3>
                        {page.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      </div>
                      
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {page.content.substring(0, 150)}...
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {page.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(page.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {page.views} views
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getCategoryColor(page.category)} variant="secondary">
                          <Folder className="w-3 h-3 mr-1" />
                          {getCategoryName(page.category)}
                        </Badge>
                        {page.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            <Hash className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{category.name}</h3>
                    <Badge className={category.color} variant="secondary">
                      {category.pageCount} pages
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          <div className="grid gap-4">
            {filteredPages.filter(page => page.isFavorite).map((page) => (
              <Card key={page.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{page.title}</h3>
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      </div>
                      <p className="text-muted-foreground mb-3">{page.content.substring(0, 150)}...</p>
                      <Badge className={getCategoryColor(page.category)} variant="secondary">
                        {getCategoryName(page.category)}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}