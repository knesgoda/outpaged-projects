
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Shield, 
  BarChart3, 
  Settings, 
  Download, 
  FileText, 
  Zap, 
  Users, 
  Globe, 
  Lock, 
  CheckCircle,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { useEnterpriseFeatures } from '@/hooks/useEnterpriseFeatures';
import { useToast } from '@/hooks/use-toast';
import { AdminGuard } from '@/components/security/AdminGuard';
import { AnalyticsDashboard } from '@/components/monitoring/AnalyticsDashboard';
import { WebhookManager } from '@/components/integrations/WebhookManager';
import { DataExportManager } from '@/components/data-management/DataExportManager';
import { APIDocumentation } from '@/components/documentation/APIDocumentation';

export function EnterpriseControlPanel() {
  const { 
    config, 
    metrics, 
    updateConfig, 
    exportData, 
    generateComplianceReport,
    isEnterpriseEnabled,
    securityLevel 
  } = useEnterpriseFeatures();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const handleConfigUpdate = (section: string, updates: any) => {
    updateConfig({ [section]: { ...config[section as keyof typeof config], ...updates } });
    toast({
      title: 'Configuration Updated',
      description: `${section} settings have been updated successfully.`
    });
  };

  const handleExportData = async (format: 'json' | 'csv' | 'xlsx') => {
    try {
      await exportData(format);
      toast({
        title: 'Export Initiated',
        description: `Your data export in ${format.toUpperCase()} format has been started.`
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting your data. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleGenerateComplianceReport = async () => {
    try {
      const report = await generateComplianceReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_report_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Compliance Report Generated',
        description: 'Your compliance report has been generated and downloaded.'
      });
    } catch (error) {
      toast({
        title: 'Report Generation Failed',
        description: 'There was an error generating the compliance report.',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
    );
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enterprise Control Panel</h1>
            <p className="text-muted-foreground">Manage enterprise features and configurations</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-gradient-primary text-primary-foreground border-0">
              <Shield className="h-3 w-3 mr-1" />
              Enterprise
            </Badge>
            <Badge variant="outline" className={securityLevel === 'enterprise' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
              Security Level: {securityLevel}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="documentation">Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>System Status</span>
                </CardTitle>
                <CardDescription>Current system health and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{metrics.systemUptime}%</div>
                    <div className="text-sm text-muted-foreground">System Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.activeProjects}</div>
                    <div className="text-sm text-muted-foreground">Active Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.apiCalls.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">API Calls Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Data Export</span>
                  </CardTitle>
                  <CardDescription>Export system data in various formats</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={() => handleExportData('json')} variant="outline" className="w-full">
                    Export as JSON
                  </Button>
                  <Button onClick={() => handleExportData('csv')} variant="outline" className="w-full">
                    Export as CSV
                  </Button>
                  <Button onClick={() => handleExportData('xlsx')} variant="outline" className="w-full">
                    Export as Excel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Compliance</span>
                  </CardTitle>
                  <CardDescription>Generate compliance reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">GDPR Compliant</span>
                    {getStatusIcon(config.compliance.gdprCompliant)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SOC 2 Compliant</span>
                    {getStatusIcon(config.compliance.soc2Compliant)}
                  </div>
                  <Button onClick={handleGenerateComplianceReport} variant="outline" className="w-full">
                    Generate Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Performance</span>
                  </CardTitle>
                  <CardDescription>System performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cache Hit Rate</span>
                      <span>94%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CDN Performance</span>
                      <span>98%</span>
                    </div>
                    <Progress value={98} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Configuration</span>
                </CardTitle>
                <CardDescription>Manage security settings and policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sso-enabled" className="text-base font-medium">Single Sign-On (SSO)</Label>
                    <p className="text-sm text-muted-foreground">Enable SSO authentication</p>
                  </div>
                  <Switch
                    id="sso-enabled"
                    checked={config.security.ssoEnabled}
                    onCheckedChange={(checked) => handleConfigUpdate('security', { ssoEnabled: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="mfa-required" className="text-base font-medium">Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require MFA for all users</p>
                  </div>
                  <Switch
                    id="mfa-required"
                    checked={config.security.mfaRequired}
                    onCheckedChange={(checked) => handleConfigUpdate('security', { mfaRequired: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="audit-logging" className="text-base font-medium">Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">Log all user actions for security auditing</p>
                  </div>
                  <Switch
                    id="audit-logging"
                    checked={config.security.auditLogging}
                    onCheckedChange={(checked) => handleConfigUpdate('security', { auditLogging: checked })}
                  />
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Encryption Level</Label>
                  <p className="text-sm text-muted-foreground mb-3">Current encryption level: {config.security.encryptionLevel}</p>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Lock className="h-3 w-3 mr-1" />
                    AES-256 Encryption Active
                  </Badge>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Security Events (Last 24h)</h4>
                  <div className="text-2xl font-bold text-green-600">{metrics.securityEvents}</div>
                  <p className="text-sm text-muted-foreground">No critical security events detected</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <WebhookManager />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Performance Optimization</span>
                </CardTitle>
                <CardDescription>Configure performance settings and optimizations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="caching-enabled" className="text-base font-medium">Content Caching</Label>
                    <p className="text-sm text-muted-foreground">Enable intelligent content caching</p>
                  </div>
                  <Switch
                    id="caching-enabled"
                    checked={config.performance.cachingEnabled}
                    onCheckedChange={(checked) => handleConfigUpdate('performance', { cachingEnabled: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="cdn-enabled" className="text-base font-medium">CDN Acceleration</Label>
                    <p className="text-sm text-muted-foreground">Use global CDN for faster content delivery</p>
                  </div>
                  <Switch
                    id="cdn-enabled"
                    checked={config.performance.cdnEnabled}
                    onCheckedChange={(checked) => handleConfigUpdate('performance', { cdnEnabled: checked })}
                  />
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Optimization Level</Label>
                  <p className="text-sm text-muted-foreground mb-3">Current level: {config.performance.optimizationLevel}</p>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    <Zap className="h-3 w-3 mr-1" />
                    Enterprise Optimization Active
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Data Processed</h4>
                    <div className="text-2xl font-bold">{metrics.dataProcessed} GB</div>
                    <p className="text-sm text-muted-foreground">Last 24 hours</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Cache Hit Rate</h4>
                    <div className="text-2xl font-bold text-green-600">94%</div>
                    <p className="text-sm text-muted-foreground">Optimization active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Compliance Management</span>
                </CardTitle>
                <CardDescription>Manage compliance settings and generate reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">GDPR Compliance</h3>
                      {getStatusIcon(config.compliance.gdprCompliant)}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Data retention policies</li>
                      <li>✓ User consent management</li>
                      <li>✓ Right to be forgotten</li>
                      <li>✓ Data portability</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">SOC 2 Compliance</h3>
                      {getStatusIcon(config.compliance.soc2Compliant)}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Security controls</li>
                      <li>✓ Availability monitoring</li>
                      <li>✓ Processing integrity</li>
                      <li>✓ Confidentiality measures</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">HIPAA Compliance</h3>
                      {getStatusIcon(config.compliance.hipaaCompliant)}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>⚠ PHI encryption</li>
                      <li>⚠ Access controls</li>
                      <li>⚠ Audit trails</li>
                      <li>⚠ Risk assessments</li>
                    </ul>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">Data Retention Settings</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Analytics data retention</span>
                    <Badge variant="outline">{config.analytics.dataRetentionDays} days</Badge>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button onClick={handleGenerateComplianceReport}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Compliance Report
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Audit Logs
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Export Audit Logs</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will export all audit logs for the selected time period. The export may contain sensitive information.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleExportData('csv')}>
                          Export Logs
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentation">
            <APIDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
