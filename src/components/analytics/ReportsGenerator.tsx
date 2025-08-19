import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Send, Calendar, Filter, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDays, format } from 'date-fns';

interface Report {
  id: string;
  name: string;
  type: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  metrics: string[];
  filters: Record<string, any>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
  createdAt: Date;
  lastGenerated?: Date;
}

interface ReportsGeneratorProps {
  projectId?: string;
}

const REPORT_TYPES = [
  { value: 'performance', label: 'Team Performance Report' },
  { value: 'velocity', label: 'Velocity Report' },
  { value: 'burndown', label: 'Sprint Burndown Report' },
  { value: 'time-tracking', label: 'Time Tracking Report' },
  { value: 'quality', label: 'Quality Metrics Report' },
  { value: 'custom', label: 'Custom Report' }
];

const AVAILABLE_METRICS = [
  'Task Completion Rate',
  'Average Resolution Time',
  'Team Velocity',
  'Bug Fix Rate',
  'Story Points Completed',
  'Time Spent by Category',
  'Sprint Progress',
  'Team Utilization',
  'Quality Score',
  'Customer Satisfaction'
];

export function ReportsGenerator({ projectId }: ReportsGeneratorProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    name: '',
    type: '',
    dateRange: {
      from: new Date(),
      to: addDays(new Date(), 30)
    },
    metrics: [] as string[],
    filters: {},
    schedule: {
      frequency: 'monthly' as const,
      recipients: ['']
    }
  });
  const [generateInProgress, setGenerateInProgress] = useState<string | null>(null);
  const { toast } = useToast();

  const createReport = async () => {
    if (!newReport.name || !newReport.type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const report: Report = {
      id: Date.now().toString(),
      ...newReport,
      createdAt: new Date()
    };

    setReports(prev => [...prev, report]);
    setShowCreateDialog(false);
    setNewReport({
      name: '',
      type: '',
      dateRange: {
        from: new Date(),
        to: addDays(new Date(), 30)
      },
      metrics: [],
      filters: {},
      schedule: {
        frequency: 'monthly',
        recipients: ['']
      }
    });

    toast({
      title: "Success",
      description: "Report template created successfully"
    });
  };

  const generateReport = async (reportId: string) => {
    setGenerateInProgress(reportId);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, lastGenerated: new Date() }
          : report
      ));

      toast({
        title: "Success",
        description: "Report generated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setGenerateInProgress(null);
    }
  };

  const downloadReport = (reportId: string) => {
    // In a real implementation, this would download the actual report
    toast({
      title: "Download Started",
      description: "Your report is being downloaded"
    });
  };

  const scheduleReport = (reportId: string) => {
    toast({
      title: "Report Scheduled",
      description: "Report has been scheduled for automatic generation"
    });
  };

  const toggleMetric = (metric: string) => {
    setNewReport(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Reports Generator</h2>
          <p className="text-muted-foreground">Create and manage automated reports</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reportName">Report Name</Label>
                  <Input
                    id="reportName"
                    value={newReport.name}
                    onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter report name"
                  />
                </div>
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={newReport.type} onValueChange={(value) => setNewReport(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Date Range</Label>
                <DatePickerWithRange
                  dateRange={newReport.dateRange}
                  onDateRangeChange={(range) => 
                    setNewReport(prev => ({ 
                      ...prev, 
                      dateRange: {
                        from: range?.from || new Date(),
                        to: range?.to || addDays(new Date(), 30)
                      }
                    }))
                  }
                />
              </div>

              <div>
                <Label>Metrics to Include</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AVAILABLE_METRICS.map(metric => (
                    <div key={metric} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric}
                        checked={newReport.metrics.includes(metric)}
                        onCheckedChange={() => toggleMetric(metric)}
                      />
                      <Label htmlFor={metric} className="text-sm">{metric}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Schedule (Optional)</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select 
                      value={newReport.schedule.frequency} 
                      onValueChange={(value: any) => 
                        setNewReport(prev => ({ 
                          ...prev, 
                          schedule: { ...prev.schedule, frequency: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="recipients">Email Recipients</Label>
                    <Input
                      id="recipients"
                      value={newReport.schedule.recipients[0]}
                      onChange={(e) => 
                        setNewReport(prev => ({ 
                          ...prev, 
                          schedule: { ...prev.schedule, recipients: [e.target.value] }
                        }))
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={createReport} className="w-full">
                Create Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {reports.length > 0 ? (
          reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      {report.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {REPORT_TYPES.find(t => t.value === report.type)?.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReport(report.id)}
                      disabled={generateInProgress === report.id}
                    >
                      {generateInProgress === report.id ? (
                        "Generating..."
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                    {report.lastGenerated && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scheduleReport(report.id)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(report.dateRange.from, 'MMM dd')} - {format(report.dateRange.to, 'MMM dd, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Filter className="w-4 h-4" />
                    {report.metrics.length} metrics
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {report.metrics.slice(0, 3).map(metric => (
                    <Badge key={metric} variant="secondary">
                      {metric}
                    </Badge>
                  ))}
                  {report.metrics.length > 3 && (
                    <Badge variant="outline">
                      +{report.metrics.length - 3} more
                    </Badge>
                  )}
                </div>
                
                {report.lastGenerated && (
                  <p className="text-sm text-muted-foreground">
                    Last generated: {format(report.lastGenerated, 'MMM dd, yyyy HH:mm')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reports Created</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first automated report to track team performance and project metrics.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Create Your First Report
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}