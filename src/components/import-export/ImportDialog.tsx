import { useState, useRef } from 'react';
import { useImportExport, ImportOptions } from '@/hooks/useImportExport';
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
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const { importFromCSV, isImporting } = useImportExport();
  const [importType, setImportType] = useState<'tasks' | 'projects'>('tasks');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    const options: ImportOptions = {
      type: importType,
      file: selectedFile,
    };

    const success = await importFromCSV(options);
    if (success) {
      setSelectedFile(null);
      onSuccess?.();
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import data into your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Importing will add new records to your database. Make sure to backup your data first.
            </AlertDescription>
          </Alert>

          {/* Import Type */}
          <div className="space-y-3">
            <Label className="text-base font-medium">What to import</Label>
            <RadioGroup value={importType} onValueChange={(value: any) => setImportType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tasks" id="tasks" />
                <Label htmlFor="tasks" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tasks
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="projects" id="projects" />
                <Label htmlFor="projects" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Projects
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label className="text-base font-medium">CSV File</Label>
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={handleFileSelect}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                {selectedFile ? selectedFile.name : "Click to select a CSV file"}
              </p>
              <p className="text-xs text-muted-foreground">
                or drag and drop
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Expected Format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Expected CSV format for {importType}:</Label>
            <div className="bg-muted/50 p-3 rounded-md text-xs font-mono">
              {importType === 'tasks' && (
                <>title,description,status,priority,story_points,due_date</>
              )}
              {importType === 'projects' && (
                <>name,description,status,start_date,end_date</>
              )}
            </div>
          </div>

          {/* Import Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!selectedFile || isImporting}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}