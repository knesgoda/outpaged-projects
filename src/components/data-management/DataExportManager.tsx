
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, FileText, Database, Settings, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AdminGuard } from '@/components/security/AdminGuard';

interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileSize?: string;
}

const exportFormats = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
  { value: 'xlsx', label: 'Excel', description: 'Microsoft Excel format' },
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
  { value: 'pdf', label: 'PDF', description: 'Portable Document Format' }
];

const dataTypes = [
  { id: 'projects', label: 'Projects', description: 'All project data including details and settings' },
  { id: 'tasks', label: 'Tasks', description: 'Task information, assignments, and status' },
  { id: 'users', label: 'Users', description: 'User profiles and team information' },
  { id: 'time-entries', label: 'Time Entries', description: 'Time tracking data and logs' },
  { id: 'comments', label: 'Comments', description: 'Comments and discussions' },
  { id: 'attachments', label: 'Attachments', description: 'File attachments and documents' }
];

export function DataExportManager() {
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([
    {
      id: '1',
      type: 'Full Export',
      format: 'xlsx',
      status: 'completed',
      progress: 100,
      createdAt: '2024-01-20T10:00:00Z',
      completedAt: '2024-01-20T10:05:00Z',
      downloadUrl: '/exports/full-export-20240120.xlsx',
      fileSize: '2.4 MB'
    },
    {
      id: '2',
      type: 'Tasks Only',
      format: 'csv',
      status: 'processing',
      progress: 65,
      createdAt: '2024-01-22T14:30:00Z'
    }
  ]);
  const { toast } = useToast();

  const handleDataTypeToggle = (dataTypeId: string) => {
    setSelectedDataTypes(prev => 
      prev.includes(dataTypeId)
        ? prev.filter(id => id !== dataTypeId)
        : [...prev, dataTypeId]
    );
  };

  const handleStartExport = async () => {
    if (selectedDataTypes.length === 0) {
      toast({
        title: 'No data selected',
        description: 'Please select at least one data type to export.',
        variant: 'destructive'
      });
      return;
    }

    const newJob: ExportJob = {
      id: Date.now().toString(),
      type: selectedDataTypes.length === dataTypes.length ? 'Full Export' : 'Partial Export',
      format: exportFormat,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString()
    };

    setExportJobs(prev => [newJob, ...prev]);

    // Simulate export process
    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id ? { ...job, status: 'processing' } : job
      ));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportJobs(prev => prev.map(job => {
          if (job.id === newJob.id && job.status === 'processing') {
            const newProgress = Math.min(job.progress + Math.random() * 20, 100);
            if (newProgress >= 100) {
              clearInterval(progressInterval);
              return {
                ...job,
                status: 'completed',
                progress: 100,
                completedAt: new Date().toISOString(),
                downloadUrl: `/exports/export-${job.id}.${job.format}`,
                fileSize: `${(Math.random() * 5 + 0.5).toFixed(1)} MB`
              };
            }
            return { ...job, progress: newProgress };
          }
          return job;
        }));
      }, 1000);
    }, 2000);

    toast({
      title: 'Export started',
      description: 'Your data export has been queued and will be processed shortly.'
    });

    // Reset form
    setSelectedDataTypes([]);
    setExportFormat('csv');
    setDateRange({});
  };

  const handleDownload = (job: ExportJob) => {
    if (job.downloadUrl) {
      // In a real application, this would trigger the actual download
      toast({
        title: 'Download started',
        description: `Downloading ${job.type} (${job.fileSize})`
      });
    }
  };

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Settings className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Export Manager</h1>
          <p className="text-muted-foreground">Export your data in various formats for backup or analysis</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Export Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Export</CardTitle>
              <CardDescription>Configure your data export settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Data Types</Label>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  {dataTypes.map((dataType) => (
                    <div key={dataType.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={dataType.id}
                        checked={selectedDataTypes.includes(dataType.id)}
                        onCheckedChange={() => handleDataTypeToggle(dataType.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={dataType.id} className="font-medium">
                          {dataType.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {dataType.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="format">Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        <div>
                          <div className="font-medium">{format.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {format.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date Range (Optional)</Label>
                <div className="flex space-x-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {dateRange.from ? format(dateRange.from, 'PPP') : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {dateRange.to ? format(dateRange.to, 'PPP') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button onClick={handleStartExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Start Export
              </Button>
            </CardContent>
          </Card>

          {/* Export History */}
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>Recent export jobs and downloads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exportJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <div className="font-medium">{job.type}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(job.createdAt), 'PPp')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <Badge variant="outline">{job.format.toUpperCase()}</Badge>
                      </div>
                    </div>

                    {job.status === 'processing' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Processing...</span>
                          <span>{Math.round(job.progress)}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    )}

                    {job.status === 'completed' && job.downloadUrl && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Ready for download • {job.fileSize}
                        </div>
                        <Button size="sm" onClick={() => handleDownload(job)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {exportJobs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2" />
                    <p>No export jobs yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
