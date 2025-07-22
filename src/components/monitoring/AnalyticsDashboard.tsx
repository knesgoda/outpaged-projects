
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Users, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AdminGuard } from '@/components/security/AdminGuard';

interface AnalyticsData {
  userActivity: Array<{ date: string; active_users: number; page_views: number }>;
  systemHealth: Array<{ metric: string; value: number; status: 'good' | 'warning' | 'critical' }>;
  performance: Array<{ page: string; load_time: number; bounce_rate: number }>;
  errors: Array<{ error: string; count: number; last_seen: string }>;
}

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userActivity: [],
    systemHealth: [],
    performance: [],
    errors: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Mock data for demonstration
        const mockData: AnalyticsData = {
          userActivity: [
            { date: '2024-01-01', active_users: 45, page_views: 320 },
            { date: '2024-01-02', active_users: 52, page_views: 387 },
            { date: '2024-01-03', active_users: 48, page_views: 295 },
            { date: '2024-01-04', active_users: 61, page_views: 421 },
            { date: '2024-01-05', active_users: 55, page_views: 378 },
          ],
          systemHealth: [
            { metric: 'CPU Usage', value: 45, status: 'good' },
            { metric: 'Memory Usage', value: 67, status: 'warning' },
            { metric: 'Disk Usage', value: 23, status: 'good' },
            { metric: 'API Response Time', value: 89, status: 'critical' },
          ],
          performance: [
            { page: 'Dashboard', load_time: 1.2, bounce_rate: 15 },
            { page: 'Projects', load_time: 0.8, bounce_rate: 12 },
            { page: 'Tasks', load_time: 1.5, bounce_rate: 18 },
            { page: 'Reports', load_time: 2.1, bounce_rate: 25 },
          ],
          errors: [
            { error: 'API Timeout', count: 23, last_seen: '2024-01-05T10:30:00Z' },
            { error: 'Database Connection', count: 5, last_seen: '2024-01-05T09:15:00Z' },
            { error: 'Authentication Error', count: 12, last_seen: '2024-01-05T11:45:00Z' },
          ]
        };
        
        setAnalyticsData(mockData);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">55</div>
              <p className="text-xs text-muted-foreground">
                +12% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,801</div>
              <p className="text-xs text-muted-foreground">
                +8% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.4s</div>
              <p className="text-xs text-muted-foreground">
                -5% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">User Activity</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
            <TabsTrigger value="errors">Error Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Over Time</CardTitle>
                <CardDescription>Daily active users and page views</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="active_users" stroke="#8884d8" name="Active Users" />
                    <Line type="monotone" dataKey="page_views" stroke="#82ca9d" name="Page Views" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Page Performance</CardTitle>
                <CardDescription>Load times and bounce rates by page</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="page" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="load_time" fill="#8884d8" name="Load Time (s)" />
                    <Bar dataKey="bounce_rate" fill="#82ca9d" name="Bounce Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health Metrics</CardTitle>
                <CardDescription>Current system performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.systemHealth.map((metric) => (
                    <div key={metric.metric} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(metric.status)}
                        <span className="font-medium">{metric.metric}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold">{metric.value}%</span>
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              metric.status === 'good' ? 'bg-green-500' :
                              metric.status === 'warning' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${metric.value}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Monitoring</CardTitle>
                <CardDescription>Recent errors and their frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.errors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <div>
                          <span className="font-medium">{error.error}</span>
                          <p className="text-sm text-muted-foreground">
                            Last seen: {new Date(error.last_seen).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-red-500">{error.count}</span>
                        <p className="text-sm text-muted-foreground">occurrences</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
