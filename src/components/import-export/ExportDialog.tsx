import { useState } from 'react';
import { useImportExport } from '@/hooks/useImportExport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { exportAllData, exportTasks, exportTimeEntries, isExporting } = useImportExport();
  const [exportType, setExportType] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [projectId, setProjectId] = useState('');

  const handleExport = async () => {
    switch (exportType) {
      case 'all':
        await exportAllData();
        break;
      case 'tasks':
        await exportTasks(projectId || undefined);
        break;
      case 'timeEntries':
        await exportTimeEntries(
          dateRange.from?.toISOString(),
          dateRange.to?.toISOString()
        );
        break;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Choose what data you want to export and in which format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type */}
          <div className="space-y-3">
            <Label className="text-base font-medium">What to export</Label>
            <RadioGroup value={exportType} onValueChange={setExportType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Complete backup (All data)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tasks" id="tasks" />
                <Label htmlFor="tasks" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tasks only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="timeEntries" id="timeEntries" />
                <Label htmlFor="timeEntries" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Time entries only
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Options */}
          {exportType === 'tasks' && (
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID (optional)</Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Leave empty for all projects"
              />
            </div>
          )}

          {exportType === 'timeEntries' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Date Range (optional)</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PPP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PPP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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
          )}

          {/* Export Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}