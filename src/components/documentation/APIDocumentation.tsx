
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Copy, ExternalLink, Code, Book, Zap, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  response: {
    status: number;
    example: any;
  };
  authentication: boolean;
}

const apiEndpoints: APIEndpoint[] = [
  {
    method: 'GET',
    path: '/api/projects',
    description: 'Get all projects for the authenticated user',
    parameters: [
      { name: 'page', type: 'number', required: false, description: 'Page number for pagination' },
      { name: 'limit', type: 'number', required: false, description: 'Number of items per page' },
      { name: 'status', type: 'string', required: false, description: 'Filter by project status' }
    ],
    response: {
      status: 200,
      example: {
        data: [
          {
            id: 'proj_123',
            name: 'Project Alpha',
            description: 'A sample project',
            status: 'active',
            created_at: '2024-01-15T10:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 45,
          pages: 3
        }
      }
    },
    authentication: true
  },
  {
    method: 'POST',
    path: '/api/projects',
    description: 'Create a new project',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Project name' },
      { name: 'description', type: 'string', required: false, description: 'Project description' },
      { name: 'start_date', type: 'string', required: false, description: 'Project start date (ISO 8601)' },
      { name: 'end_date', type: 'string', required: false, description: 'Project end date (ISO 8601)' }
    ],
    response: {
      status: 201,
      example: {
        id: 'proj_124',
        name: 'New Project',
        description: 'A newly created project',
        status: 'planning',
        owner_id: 'user_123',
        created_at: '2024-01-22T15:30:00Z'
      }
    },
    authentication: true
  },
  {
    method: 'GET',
    path: '/api/tasks',
    description: 'Get tasks with optional filtering',
    parameters: [
      { name: 'project_id', type: 'string', required: false, description: 'Filter tasks by project' },
      { name: 'assignee_id', type: 'string', required: false, description: 'Filter tasks by assignee' },
      { name: 'status', type: 'string', required: false, description: 'Filter by task status' },
      { name: 'priority', type: 'string', required: false, description: 'Filter by task priority' }
    ],
    response: {
      status: 200,
      example: {
        data: [
          {
            id: 'task_456',
            title: 'Implement user authentication',
            description: 'Add login and registration functionality',
            status: 'in_progress',
            priority: 'high',
            project_id: 'proj_123',
            assignee_id: 'user_456',
            created_at: '2024-01-20T09:00:00Z'
          }
        ]
      }
    },
    authentication: true
  },
  {
    method: 'POST',
    path: '/api/webhooks',
    description: 'Register a new webhook endpoint',
    parameters: [
      { name: 'url', type: 'string', required: true, description: 'Webhook endpoint URL' },
      { name: 'events', type: 'array', required: true, description: 'Array of event types to subscribe to' },
      { name: 'secret', type: 'string', required: false, description: 'Webhook secret for verification' }
    ],
    response: {
      status: 201,
      example: {
        id: 'webhook_789',
        url: 'https://api.example.com/webhook',
        events: ['task.created', 'task.updated'],
        secret: 'whsec_...',
        created_at: '2024-01-22T16:00:00Z'
      }
    },
    authentication: true
  }
];

const codeExamples = {
  javascript: `
// Initialize the API client
const API_BASE = 'https://api.outpaged.com';
const API_KEY = 'your-api-key';

// Get all projects
async function getProjects() {
  const response = await fetch(\`\${API_BASE}/api/projects\`, {
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
}

// Create a new task
async function createTask(taskData) {
  const response = await fetch(\`\${API_BASE}/api/tasks\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });
  
  return await response.json();
}
`,
  python: `
import requests
import json

class OutPagedAPI:
    def __init__(self, api_key):
        self.base_url = 'https://api.outpaged.com'
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def get_projects(self, page=1, limit=20):
        """Get all projects with pagination"""
        params = {'page': page, 'limit': limit}
        response = requests.get(
            f'{self.base_url}/api/projects',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def create_task(self, task_data):
        """Create a new task"""
        response = requests.post(
            f'{self.base_url}/api/tasks',
            headers=self.headers,
            json=task_data
        )
        return response.json()

# Usage
api = OutPagedAPI('your-api-key')
projects = api.get_projects()
print(projects)
`,
  curl: `
# Get all projects
curl -X GET "https://api.outpaged.com/api/projects" \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json"

# Create a new project
curl -X POST "https://api.outpaged.com/api/projects" \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "New Project",
    "description": "Project created via API",
    "start_date": "2024-02-01"
  }'

# Get tasks for a specific project
curl -X GET "https://api.outpaged.com/api/tasks?project_id=proj_123" \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json"
`
};

export function APIDocumentation() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredEndpoints = apiEndpoints.filter(endpoint =>
    endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'The code has been copied to your clipboard.'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground">Complete reference for the OutPaged API</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <Shield className="h-3 w-3 mr-1" />
            v1.0.0
          </Badge>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            API Status
          </Button>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Code Examples</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Endpoints List */}
            <Card>
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
                <CardDescription>Browse available API endpoints</CardDescription>
                <Input
                  placeholder="Search endpoints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-4"
                />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {filteredEndpoints.map((endpoint, index) => (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                          selectedEndpoint === endpoint ? 'bg-muted border-primary' : ''
                        }`}
                        onClick={() => setSelectedEndpoint(endpoint)}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getMethodColor(endpoint.method)}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {endpoint.path}
                          </code>
                          {endpoint.authentication && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              <Shield className="h-3 w-3 mr-1" />
                              Auth
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {endpoint.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Endpoint Details */}
            <Card>
              <CardHeader>
                <CardTitle>Endpoint Details</CardTitle>
                <CardDescription>
                  {selectedEndpoint ? 'Detailed information about the selected endpoint' : 'Select an endpoint to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEndpoint ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getMethodColor(selectedEndpoint.method)}>
                            {selectedEndpoint.method}
                          </Badge>
                          <code className="text-lg bg-muted px-3 py-1 rounded">
                            {selectedEndpoint.path}
                          </code>
                        </div>
                        <p className="text-muted-foreground">{selectedEndpoint.description}</p>
                      </div>

                      {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Parameters</h4>
                          <div className="space-y-3">
                            {selectedEndpoint.parameters.map((param, index) => (
                              <div key={index} className="border rounded p-3">
                                <div className="flex items-center space-x-2 mb-1">
                                  <code className="bg-muted px-2 py-1 rounded text-sm">
                                    {param.name}
                                  </code>
                                  <Badge variant="outline">{param.type}</Badge>
                                  {param.required && (
                                    <Badge variant="destructive">Required</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {param.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-3">Response</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {selectedEndpoint.response.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">Success</span>
                          </div>
                          <div className="relative">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 z-10"
                              onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.response.example, null, 2))}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                              <code>
                                {JSON.stringify(selectedEndpoint.response.example, null, 2)}
                              </code>
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-4" />
                    <p>Select an endpoint to view its details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>Ready-to-use code snippets for different programming languages</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="javascript" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>
                {Object.entries(codeExamples).map(([lang, code]) => (
                  <TabsContent key={lang} value={lang}>
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 z-10"
                        onClick={() => copyToClipboard(code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{code}</code>
                      </pre>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>How to authenticate with the OutPaged API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">API Key Authentication</h3>
                <p className="text-muted-foreground mb-4">
                  The OutPaged API uses API key authentication. Include your API key in the Authorization header:
                </p>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard('Authorization: Bearer your-api-key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
                    <code>Authorization: Bearer your-api-key</code>
                  </pre>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Getting Your API Key</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Navigate to Settings → API Keys in your dashboard</li>
                  <li>Click "Generate New API Key"</li>
                  <li>Copy the key and store it securely</li>
                  <li>Use the key in your API requests</li>
                </ol>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Rate Limiting</h3>
                <p className="text-muted-foreground mb-4">
                  API requests are rate limited to ensure fair usage:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>1000 requests per hour for authenticated users</li>
                  <li>Rate limit headers are included in all responses</li>
                  <li>Contact support for higher limits if needed</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Set up webhooks to receive real-time notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Available Events</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { event: 'task.created', description: 'A new task is created' },
                    { event: 'task.updated', description: 'A task is modified' },
                    { event: 'task.completed', description: 'A task is marked as complete' },
                    { event: 'project.created', description: 'A new project is created' },
                    { event: 'user.invited', description: 'A user is invited to the team' },
                    { event: 'comment.added', description: 'A comment is added to a task' }
                  ].map((item, index) => (
                    <div key={index} className="border rounded p-3">
                      <code className="bg-muted px-2 py-1 rounded text-sm">{item.event}</code>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Webhook Payload Example</h3>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard(JSON.stringify({
                      event: 'task.created',
                      timestamp: '2024-01-22T15:30:00Z',
                      data: {
                        id: 'task_789',
                        title: 'New task created',
                        project_id: 'proj_123',
                        assignee_id: 'user_456'
                      }
                    }, null, 2))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    <code>
                      {JSON.stringify({
                        event: 'task.created',
                        timestamp: '2024-01-22T15:30:00Z',
                        data: {
                          id: 'task_789',
                          title: 'New task created',
                          project_id: 'proj_123',
                          assignee_id: 'user_456'
                        }
                      }, null, 2)}
                    </code>
                  </pre>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Webhook Security</h3>
                <p className="text-muted-foreground mb-4">
                  All webhook payloads include a signature header for verification:
                </p>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard('X-Webhook-Signature: sha256=...')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
                    <code>X-Webhook-Signature: sha256=...</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
