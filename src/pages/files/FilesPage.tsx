import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFiles } from "@/hooks/useFiles";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectOptions, type ProjectOption } from "@/hooks/useProjectOptions";
import type { ProjectFile } from "@/types";
import {
  Download,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  ImageIcon,
  Link as LinkIcon,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BLOCKED_TYPES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
]);

const MAX_FILE_SIZE_MB = 50;

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const getDisplayName = (file: ProjectFile) => {
  if (file.title && file.title.trim().length > 0) {
    return file.title.trim();
  }
  const pathPart = file.path.split("/").pop();
  return pathPart || "Untitled";
};

const getIconForMime = (mime?: string | null) => {
  if (!mime) {
    return FileIcon;
  }
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.includes("zip") || mime.includes("compressed")) return FileArchive;
  if (mime.includes("spreadsheet") || mime.includes("excel")) return FileSpreadsheet;
  if (mime.includes("pdf")) return FileText;
  if (mime.startsWith("text/")) return FileText;
  return FileIcon;
};

const getFileExtension = (file: ProjectFile) => {
  const name = getDisplayName(file);
  const ext = name.includes(".") ? name.split(".").pop() : null;
  return ext ? ext.toUpperCase() : "";
};

type UploadJob = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  message?: string;
};

type FilesTableProps = {
  files: ProjectFile[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onRetry: () => void;
  onPreview: (file: ProjectFile) => void;
  onDownload: (file: ProjectFile) => void;
  onCopyLink: (file: ProjectFile) => void;
  onRename: (file: ProjectFile, name: string) => Promise<void>;
  onDelete: (file: ProjectFile) => Promise<void>;
  renamingId?: string | null;
  deletingId?: string | null;
  emptyHint?: string;
  showProject?: boolean;
  projectNames?: Record<string, string>;
};

type PreviewState = {
  file: ProjectFile;
  url: string;
};

export default function FilesPage() {
  useDocumentTitle("Files");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: projectOptions = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjectOptions(true);

  const projectOptionList = projectOptions as ProjectOption[];
  const projectNames = useMemo(() => {
    const entries: Record<string, string> = {};
    projectOptionList.forEach((project) => {
      entries[project.id] = project.name ?? project.id;
    });
    return entries;
  }, [projectOptionList]);

  useEffect(() => {
    if (projectsError) {
      const message = projectsError instanceof Error ? projectsError.message : "Unable to load projects.";
      toast({
        title: "Projects unavailable",
        description: message,
        variant: "destructive",
      });
    }
  }, [projectsError, toast]);

  const {
    files,
    isLoading,
    isFetching,
    error,
    uploadFile,
    renameFile,
    deleteFile,
    getSignedUrl,
    refetch,
  } = useFiles({ projectId: selectedProjectId ?? undefined, search: deferredSearch });

  const handleUploadClick = () => {
    if (!selectedProjectId) {
      toast({
        title: "Choose a project",
        description: "Select a project before uploading.",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const updateJob = (id: string, patch: Partial<UploadJob>) => {
    setUploadJobs((jobs) => jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const removeJob = (id: string) => {
    setUploadJobs((jobs) => jobs.filter((job) => job.id !== id));
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list || list.length === 0) {
      return;
    }
    if (!selectedProjectId) {
      toast({
        title: "Choose a project",
        description: "Select a project before uploading.",
      });
      event.target.value = "";
      return;
    }

    const filesArray = Array.from(list);
    for (const file of filesArray) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${MAX_FILE_SIZE_MB} MB.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.type && BLOCKED_TYPES.has(file.type)) {
        toast({
          title: "Blocked file type",
          description: `${file.name} cannot be uploaded.`,
          variant: "destructive",
        });
        continue;
      }

      const jobId = `job-${Date.now()}-${file.name}`;
      setUploadJobs((jobs) => [
        ...jobs,
        {
          id: jobId,
          name: file.name,
          progress: 10,
          status: "uploading",
        },
      ]);

      let progressTimer: number | undefined;
      try {
        progressTimer = window.setInterval(() => {
          setUploadJobs((jobs) =>
            jobs.map((job) =>
              job.id === jobId
                ? { ...job, progress: Math.min(job.progress + 15, 85) }
                : job
            )
          );
        }, 400);

        await uploadFile({ projectId: selectedProjectId, file });

        if (progressTimer) {
          window.clearInterval(progressTimer);
        }

        updateJob(jobId, { progress: 100, status: "success" });
        toast({ title: "Uploaded", description: `${file.name} is ready.` });
        setTimeout(() => removeJob(jobId), 1500);
      } catch (err: any) {
        if (progressTimer) {
          window.clearInterval(progressTimer);
        }
        const message = err?.message ?? "Upload failed.";
        updateJob(jobId, { status: "error", message });
        toast({ title: "Upload failed", description: message, variant: "destructive" });
      }
    }

    event.target.value = "";
  };

  const openPreview = async (file: ProjectFile, openInNewTab = false) => {
    try {
      const url = await getSignedUrl(file, 120);
      if (openInNewTab || !(file.mime_type || "").startsWith("image/")) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      setPreview({ file, url });
    } catch (err: any) {
      toast({
        title: "Preview unavailable",
        description: err?.message ?? "Unable to open the file.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async (file: ProjectFile) => {
    try {
      const url = await getSignedUrl(file, 300);
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Signed link copied to clipboard." });
    } catch (err: any) {
      toast({
        title: "Copy failed",
        description: err?.message ?? "Unable to copy link.",
        variant: "destructive",
      });
    }
  };

  const handleRename = async (file: ProjectFile, name: string) => {
    setRenamingId(file.id);
    try {
      await renameFile({ id: file.id, title: name });
      toast({ title: "Renamed", description: "Name updated." });
    } catch (err: any) {
      toast({
        title: "Rename failed",
        description: err?.message ?? "Unable to rename file.",
        variant: "destructive",
      });
      throw err;
    } finally {
      setRenamingId(null);
    }
  };

  const handleDelete = async (file: ProjectFile) => {
    if (!window.confirm(`Delete ${getDisplayName(file)}?`)) {
      return;
    }
    setDeletingId(file.id);
    try {
      await deleteFile(file.id);
      toast({ title: "Deleted", description: "File removed." });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message ?? "Unable to delete file.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const breadcrumbs = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Files</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          {breadcrumbs}
          <h1 className="text-3xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">
            Browse every file you can access across projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search files"
                className="w-[220px] pl-8"
                aria-label="Search files"
              />
            </div>
            <Select
              value={selectedProjectId ?? "all"}
              onValueChange={(value) =>
                setSelectedProjectId(value === "all" ? null : value)
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectOptionList.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name ?? project.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleUploadClick} disabled={projectsLoading}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            onChange={handleFileSelection}
            multiple
          />
        </div>
      </div>

      {uploadJobs.length > 0 ? (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium text-muted-foreground">Active uploads</p>
          <div className="space-y-3">
            {uploadJobs.map((job) => (
              <div key={job.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate" title={job.name}>
                    {job.name}
                  </span>
                  <span className="text-muted-foreground">
                    {job.status === "uploading"
                      ? `${job.progress}%`
                      : job.status === "success"
                        ? "Completed"
                        : job.message ?? "Failed"}
                  </span>
                </div>
                <Progress
                  value={job.status === "error" ? 100 : job.progress}
                  className={job.status === "error" ? "bg-destructive/20" : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <FilesTable
        files={files}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        onPreview={(file) => openPreview(file)}
        onDownload={(file) => openPreview(file, true)}
        onCopyLink={handleCopyLink}
        onRename={handleRename}
        onDelete={handleDelete}
        renamingId={renamingId}
        deletingId={deletingId}
        emptyHint={
          selectedProjectId
            ? "Upload your first file for this project."
            : "Select a project to manage files."
        }
        showProject={!selectedProjectId}
        projectNames={projectNames}
      />

      <Drawer open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>{preview ? getDisplayName(preview.file) : "Preview"}</DrawerTitle>
            <DrawerDescription>
              {preview ? preview.file.mime_type ?? "Unknown type" : ""}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-6 pb-6">
            {preview ? (
              <img
                src={preview.url}
                alt={getDisplayName(preview.file)}
                className="mx-auto max-h-full rounded-lg shadow"
              />
            ) : null}
          </ScrollArea>
          <DrawerFooter className="flex items-center justify-end gap-2">
            {preview ? (
              <Button variant="outline" onClick={() => openPreview(preview.file, true)}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            ) : null}
            <DrawerClose asChild>
              <Button variant="secondary">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function FilesTable({
  files,
  isLoading,
  isFetching,
  error,
  onRetry,
  onPreview,
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  renamingId,
  deletingId,
  emptyHint,
  showProject = false,
  projectNames = {},
}: FilesTableProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load files</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error.message}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    const skeletonCols = showProject ? "grid-cols-7" : "grid-cols-6";
    return (
      <div className="space-y-3 rounded-lg border bg-background p-6 shadow-sm">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={`grid ${skeletonCols} items-center gap-4`}>
            <Skeleton className="h-5 w-full col-span-2" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            {showProject ? <Skeleton className="h-5 w-full" /> : null}
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-8 w-12 justify-self-end" />
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-background p-12 text-center shadow-sm">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">No files yet</h2>
          <p className="text-sm text-muted-foreground">{emptyHint ?? "Upload your first file."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Type</TableHead>
            {showProject ? <TableHead>Project</TableHead> : null}
            <TableHead>Uploaded</TableHead>
            <TableHead>Uploader</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              onPreview={onPreview}
              onDownload={onDownload}
              onCopyLink={onCopyLink}
              onRename={onRename}
              onDelete={onDelete}
              isRenaming={renamingId === file.id}
              isDeleting={deletingId === file.id}
              showProject={showProject}
              projectName={projectNames[file.project_id] ?? file.project_id}
            />
          ))}
        </TableBody>
      </Table>
      {isFetching ? (
        <div className="border-t bg-muted/40 p-2 text-center text-xs text-muted-foreground">
          Updating…
        </div>
      ) : null}
    </div>
  );
}

type FileRowProps = {
  file: ProjectFile;
  onPreview: (file: ProjectFile) => void;
  onDownload: (file: ProjectFile) => void;
  onCopyLink: (file: ProjectFile) => void;
  onRename: (file: ProjectFile, name: string) => Promise<void>;
  onDelete: (file: ProjectFile) => Promise<void>;
  isRenaming: boolean;
  isDeleting: boolean;
  showProject?: boolean;
  projectName?: string;
};

function FileRow({
  file,
  onPreview,
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
  showProject = false,
  projectName,
}: FileRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(getDisplayName(file));
  const Icon = useMemo(() => getIconForMime(file.mime_type), [file.mime_type]);

  const handleRename = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    if (draft.trim().length === 0) {
      setDraft(getDisplayName(file));
      setIsEditing(false);
      return;
    }
    await onRename(file, draft.trim());
    setIsEditing(false);
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleRename();
                  }
                  if (event.key === "Escape") {
                    setIsEditing(false);
                    setDraft(getDisplayName(file));
                  }
                }}
                autoFocus
              />
            ) : (
              <div className="truncate font-medium" title={getDisplayName(file)}>
                {getDisplayName(file)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{file.path}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>{formatFileSize(file.size_bytes)}</TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span>{file.mime_type ?? "Unknown"}</span>
          {getFileExtension(file) ? (
            <span className="text-xs text-muted-foreground">{getFileExtension(file)}</span>
          ) : null}
        </div>
      </TableCell>
      {showProject ? (
        <TableCell className="truncate" title={projectName ?? file.project_id}>
          {projectName ?? file.project_id ?? "—"}
        </TableCell>
      ) : null}
      <TableCell>
        {file.created_at
          ? formatDistanceToNow(new Date(file.created_at), { addSuffix: true })
          : "—"}
      </TableCell>
      <TableCell className="truncate" title={file.uploaded_by}>
        {file.uploaded_by?.slice(0, 8) ?? "—"}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => onPreview(file)} className="gap-2">
              <FileText className="h-4 w-4" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDownload(file)} className="gap-2">
              <Download className="h-4 w-4" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopyLink(file)} className="gap-2">
              <LinkIcon className="h-4 w-4" /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void handleRename()}
              className="gap-2"
              disabled={isRenaming}
            >
              <Pencil className="h-4 w-4" /> {isEditing ? "Save" : "Rename"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(file)}
              className="gap-2 text-destructive"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export { FilesTable };
