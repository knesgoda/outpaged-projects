import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Clock, Activity, Eye, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { useSecurityMonitoring, useSecurityAlerts } from '@/hooks/useSecurityMonitoring';
import { AdminGuard } from './AdminGuard';
import { format } from 'date-fns';

export function SecurityDashboard() {
  const { metrics, isLoading, loadMetrics } = useSecurityMonitoring();
  const { alerts, acknowledgeAlert, clearAllAlerts } = useSecurityAlerts();
  
  // Critical security issues that need manual fix in Supabase dashboard
  const criticalIssues = [
    {
      id: 'leaked-password',
      title: 'Leaked Password Protection Disabled',
      description: 'Password breach detection is not enabled in Supabase Auth settings',
      action: 'Enable in Auth Settings',
      link: 'https://supabase.com/dashboard/project/aoubfejqyifdefyrbjip/auth/providers',
      severity: 'warning'
    },
    {
      id: 'postgres-upgrade', 
      title: 'Postgres Security Patches Available',
      description: 'Database version has security patches available',
      action: 'Upgrade Database',
      link: 'https://supabase.com/dashboard/project/aoubfejqyifdefyrbjip/settings/general',
      severity: 'warning'
    }
  ];

  const getSecurityLevelColor = (score: number) => {
    if (score <= 2) return 'text-green-500';
    if (score <= 5) return 'text-yellow-500';
    if (score <= 8) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSecurityLevelText = (score: number) => {
    if (score <= 2) return 'Low Risk';
    if (score <= 5) return 'Medium Risk';
    if (score <= 8) return 'High Risk';
    return 'Critical Risk';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Security Dashboard</h2>
          </div>
          <Button onClick={loadMetrics} variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Critical Security Issues Alert */}
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="w-5 h-5" />
              Security Issues Requiring Manual Action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
              The following security issues require manual configuration in your Supabase dashboard:
            </p>
            {criticalIssues.map((issue) => (
              <Alert key={issue.id} className="border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-yellow-800 dark:text-yellow-200">{issue.title}</strong>
                      <p className="text-sm mt-1 text-yellow-700 dark:text-yellow-300">{issue.description}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="ml-4">
                      <a href={issue.link} target="_blank" rel="noopener noreferrer">
                        {issue.action}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <strong className="text-blue-800 dark:text-blue-200">Database Security: Fixed</strong>
                <p className="text-sm mt-1 text-blue-700 dark:text-blue-300">
                  Critical RLS policies and customer data protection have been implemented successfully.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              All security events logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.failedAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Security violations detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Actions</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{metrics.successfulActions}</div>
            <p className="text-xs text-muted-foreground">
              Authorized operations completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSecurityLevelColor(metrics.suspiciousActivity)}`}>
              {getSecurityLevelText(metrics.suspiciousActivity)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current threat assessment
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Security Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {metrics.recentEvents.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No security events recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.recentEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        event.success ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{event.action}</span>
                          <Badge variant={event.success ? 'default' : 'destructive'} className="text-xs">
                            {event.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Resource: {event.resource_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
                        </p>
                        {event.error_message && (
                          <p className="text-xs text-red-500 mt-1">
                            {event.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Security Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Security Alerts
              </div>
              {alerts.length > 0 && (
                <Button onClick={clearAllAlerts} variant="outline" size="sm">
                  Clear All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {alerts.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No security alerts
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-3 border rounded-lg ${
                        alert.acknowledged ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={
                                alert.type === 'error' ? 'destructive' : 
                                alert.type === 'warning' ? 'secondary' : 'default'
                              }
                              className="text-xs"
                            >
                              {alert.type}
                            </Badge>
                            <span className="font-medium text-sm">{alert.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(alert.timestamp, 'MMM d, HH:mm:ss')}
                          </p>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            onClick={() => acknowledgeAlert(alert.id)}
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Security Recommendations */}
      {metrics.suspiciousActivity > 5 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" />
              Security Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-red-600 dark:text-red-400">
              <li>High suspicious activity detected - consider reviewing recent actions</li>
              <li>Enable two-factor authentication for enhanced security</li>
              <li>Review and update your password regularly</li>
              <li>Monitor your account for unauthorized access</li>
            </ul>
          </CardContent>
        </Card>
      )}
      </div>
    </AdminGuard>
  );
}