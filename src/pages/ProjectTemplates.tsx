import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Users,
  Star,
  Clock,
  CheckCircle,
  Layout,
  Briefcase,
  Code,
  Palette,
  Zap,
  Target,
  ArrowRight
} from 'lucide-react';

// Template categories and data
const templateCategories = [
  { id: 'software', name: 'Software Development', icon: Code, color: 'bg-blue-500' },
  { id: 'design', name: 'Design Projects', icon: Palette, color: 'bg-purple-500' },
  { id: 'marketing', name: 'Marketing Campaigns', icon: Target, color: 'bg-green-500' },
  { id: 'business', name: 'Business Operations', icon: Briefcase, color: 'bg-orange-500' },
];

const projectTemplates = [
  {
    id: 1,
    name: 'Website Development',
    description: 'Complete template for building modern websites with design, development, and testing phases',
    category: 'software',
    rating: 4.8,
    users: 1240,
    estimatedDuration: '8-12 weeks',
    tasks: 45,
    tags: ['React', 'TypeScript', 'Design System'],
    features: ['Responsive Design', 'SEO Optimization', 'Performance Testing', 'CI/CD Pipeline'],
    complexity: 'intermediate'
  },
  {
    id: 2,
    name: 'Mobile App Launch',
    description: 'End-to-end mobile application development from concept to app store deployment',
    category: 'software',
    rating: 4.9,
    users: 856,
    estimatedDuration: '12-16 weeks',
    tasks: 62,
    tags: ['React Native', 'API Integration', 'Testing'],
    features: ['Cross-platform', 'Push Notifications', 'Analytics', 'Store Submission'],
    complexity: 'advanced'
  },
  {
    id: 3,
    name: 'Brand Identity Design',
    description: 'Comprehensive brand development including logo, guidelines, and marketing materials',
    category: 'design',
    rating: 4.7,
    users: 623,
    estimatedDuration: '4-6 weeks',
    tasks: 28,
    tags: ['Branding', 'Logo Design', 'Style Guide'],
    features: ['Logo Variations', 'Color Palette', 'Typography', 'Brand Guidelines'],
    complexity: 'beginner'
  },
  {
    id: 4,
    name: 'Product Launch Campaign',
    description: 'Multi-channel marketing campaign template for successful product launches',
    category: 'marketing',
    rating: 4.6,
    users: 492,
    estimatedDuration: '6-8 weeks',
    tasks: 38,
    tags: ['Marketing', 'Social Media', 'Content'],
    features: ['Social Media Strategy', 'Content Calendar', 'Email Campaigns', 'Analytics'],
    complexity: 'intermediate'
  },
  {
    id: 5,
    name: 'Agile Software Development',
    description: 'Complete agile development framework with sprints, ceremonies, and deliverables',
    category: 'software',
    rating: 4.9,
    users: 1890,
    estimatedDuration: 'Ongoing',
    tasks: 72,
    tags: ['Agile', 'Scrum', 'Sprint Planning'],
    features: ['Sprint Planning', 'Daily Standups', 'Retrospectives', 'Backlog Management'],
    complexity: 'advanced'
  },
  {
    id: 6,
    name: 'Startup Operations Setup',
    description: 'Essential business processes and systems for new startup operations',
    category: 'business',
    rating: 4.5,
    users: 324,
    estimatedDuration: '3-4 weeks',
    tasks: 31,
    tags: ['Operations', 'Legal', 'Finance'],
    features: ['Legal Setup', 'Financial Planning', 'Team Structure', 'Process Documentation'],
    complexity: 'intermediate'
  }
];

const customTemplates = [
  {
    id: 'custom-1',
    name: 'E-commerce Platform',
    description: 'Custom template for our e-commerce projects',
    tasks: 53,
    lastUsed: '2 days ago',
    createdBy: 'Alice Johnson'
  },
  {
    id: 'custom-2',
    name: 'Client Onboarding',
    description: 'Standardized client onboarding process',
    tasks: 22,
    lastUsed: '1 week ago',
    createdBy: 'Bob Smith'
  }
];

const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case 'beginner': return 'bg-green-100 text-green-800';
    case 'intermediate': return 'bg-yellow-100 text-yellow-800';
    case 'advanced': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function ProjectTemplates() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredTemplates = projectTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = (templateId: number) => {
    console.log('Using template:', templateId);
    // Implementation would create a new project from template
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Project Templates</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Jumpstart your projects with proven templates and frameworks
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Custom Template</DialogTitle>
              <DialogDescription>
                Create a reusable project template from scratch or based on an existing project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input id="template-name" placeholder="Enter template name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea id="template-description" placeholder="Describe what this template includes" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software">Software Development</SelectItem>
                    <SelectItem value="design">Design Projects</SelectItem>
                    <SelectItem value="marketing">Marketing Campaigns</SelectItem>
                    <SelectItem value="business">Business Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1 bg-gradient-primary hover:opacity-90">
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {templateCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="marketplace">Template Marketplace</TabsTrigger>
          <TabsTrigger value="custom">My Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          {/* Categories */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {templateCategories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <Card 
                  key={category.id}
                  className={`cursor-pointer transition-all hover:shadow-medium ${
                    isSelected ? 'ring-2 ring-primary shadow-medium' : ''
                  }`}
                  onClick={() => setSelectedCategory(isSelected ? 'all' : category.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-medium text-sm">{category.name}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {template.rating}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {template.users}
                        </div>
                      </div>
                    </div>
                    <Badge className={getComplexityColor(template.complexity)}>
                      {template.complexity}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {template.estimatedDuration}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="w-4 h-4" />
                      {template.tasks} tasks
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Features</Label>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {template.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          {feature}
                        </li>
                      ))}
                      {template.features.length > 3 && (
                        <li className="text-muted-foreground">
                          +{template.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  <Button 
                    className="w-full bg-gradient-primary hover:opacity-90"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    Use This Template
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {customTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">Custom</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {template.tasks} tasks
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {template.lastUsed}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-xs">{template.createdBy.charAt(0)}</AvatarFallback>
                    </Avatar>
                    Created by {template.createdBy}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Edit Template
                    </Button>
                    <Button className="flex-1 bg-gradient-primary hover:opacity-90">
                      Use Template
                    </Button>
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