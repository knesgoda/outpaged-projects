import React, { useRef, useState } from 'react';
import { Upload, X, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({ 
  onFileUpload, 
  accept = "*/*", 
  maxSizeMB = 10,
  disabled = false,
  className 
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    try {
      await onFileUpload(file);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer transition-colors",
        isDragOver && "border-primary bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center gap-2">
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        
        <div>
          <p className="font-medium">
            {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-sm text-muted-foreground">
            Max file size: {maxSizeMB}MB
          </p>
        </div>
      </div>
    </div>
  );
}

interface UploadedFileProps {
  fileName: string;
  fileSize: number;
  onRemove: () => void;
  onDownload?: () => void;
  className?: string;
}

export function UploadedFile({ 
  fileName, 
  fileSize, 
  onRemove, 
  onDownload,
  className 
}: UploadedFileProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 border rounded-lg bg-background",
      className
    )}>
      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
      </div>
      
      <div className="flex items-center gap-1">
        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="h-8 w-8 p-0"
          >
            <Upload className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}