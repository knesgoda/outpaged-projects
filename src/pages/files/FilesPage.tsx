import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Download,
  Edit2,
  Eye,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  MoreVertical,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useDeleteFileMutation,
  useFiles,
  useRenameFileMutation,
  useSignedUrlMutation,
  useUploadFileMutation,
} from "@/hooks/useFiles";
import { useProjectList } from "@/hooks/useProjectsLite";
import type { ProjectFile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { usePageMetadata, type BreadcrumbLinkItem } from "@/state/breadcrumbs";

const ALL_PROJECTS = "all";

type UploadTracker = Record<string, { name: string; progress: number }>;

type PreviewState = {
  file: ProjectFile;
  url: string;
};

type FilesViewProps = {
  heading: string;
  description: string;
  breadcrumbs: BreadcrumbLinkItem[];
  documentTitle: string;
  enableProjectFilter?: boolean;
  fixedProjectId?: string;
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getFileType(file: ProjectFile) {
  if (file.mime_type) {
    if (file.mime_type.startsWith("image/")) return "Image";
    if (file.mime_type.startsWith("video/")) return "Video";
    if (file.mime_type.startsWith("audio/")) return "Audio";
    if (file.mime_type === "application/pdf") return "PDF";
    if (file.mime_type.includes("zip")) return "Archive";
    if (file.mime_type.startsWith("text/")) return "Text";
    if (file.mime_type.includes("json")) return "JSON";
    if (file.mime_type.includes("spreadsheet")) return "Spreadsheet";
    if (file.mime_type.includes("presentation")) return "Presentation";
  }
  const name = file.title ?? file.path.split("/").pop() ?? "";
  const extension = name.split(".").pop()?.toLowerCase();
  if (!extension) return "File";
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension)) return "Image";
  if (["mp4", "mov", "avi", "mkv"].includes(extension)) return "Video";
  if (["mp3", "wav", "flac", "aac"].includes(extension)) return "Audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "Archive";
  if (extension === "pdf") return "PDF";
  if (["doc", "docx", "txt", "md"].includes(extension)) return "Document";
  if (["xls", "xlsx", "csv"].includes(extension)) return "Spreadsheet";
  if (["ppt", "pptx"].includes(extension)) return "Presentation";
  if (["js", "ts", "tsx", "json", "py", "java", "rb"].includes(extension)) return "Code";
  return "File";
}

function getFileIcon(file: ProjectFile) {
  const type = getFileType(file);
  switch (type) {
    case "Image":
      return <ImageIcon className="h-4 w-4" />;
    case "Video":
    case "Archive":
      return <FileArchive className="h-4 w-4" />;
    case "Audio":
      return <FileAudio className="h-4 w-4" />;
    case "PDF":
    case "Document":
    case "Presentation":
    case "Spreadsheet":
      return <FileText className="h-4 w-4" />;
    case "Code":
      return <FileCode className="h-4 w-4" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
}

function resolveName(file: ProjectFile) {
  return file.title?.trim() || file.path.split("/").pop() || "Untitled";
}

export function FilesView({
  heading,
  description,
  breadcrumbs,
  documentTitle,
  enableProjectFilter = false,
  fixedProjectId,
}: FilesViewProps) {
  const { data: projects = [], isLoading: loadingProjects } = useProjectList({ enabled: enableProjectFilter });
  const [selectedProject, setSelectedProject] = useState<string>(
    enableProjectFilter ? ALL_PROJECTS : fixedProjectId ?? ALL_PROJECTS
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [uploadTracker, setUploadTracker] = useState<UploadTracker>({});
  const uploadTimers = useRef<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!enableProjectFilter && fixedProjectId) {
      setSelectedProject(fixedProjectId);
    }
  }, [enableProjectFilter, fixedProjectId]);

  const projectId = enableProjectFilter
    ? selectedProject === ALL_PROJECTS
      ? undefined
      : selectedProject
    : fixedProjectId;

  usePageMetadata({ breadcrumbs, title: heading, documentTitle });

  const filesQuery = useFiles({ projectId, q: debouncedSearch || undefined });
  const uploadMutation = useUploadFileMutation();
  const renameMutation = useRenameFileMutation();
  const deleteMutation = useDeleteFileMutation();
  const signedUrlMutation = useSignedUrlMutation();

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [search]);

  useEffect(() => () => {
    Object.values(uploadTimers.current).forEach((timer) => window.clearInterval(timer));
  }, []);

  const availableProjects = useMemo(() => {
    if (!enableProjectFilter) return [];
    return [{ id: ALL_PROJECTS, name: "All projects" }, ...projects];
  }, [enableProjectFilter, projects]);

  const startFakeProgress = (id: string, name: string) => {
    setUploadTracker((prev) => ({ ...prev, [id]: { name, progress: 5 } }));
    const timer = window.setInterval(() => {
      setUploadTracker((prev) => {
        const current = prev[id];
        if (!current) return prev;
        const nextProgress = Math.min(current.progress + 10, 90);
        return { ...prev, [id]: { ...current, progress: nextProgress } };
      });
    }, 300);
    uploadTimers.current[id] = timer;
  };

  const clearFakeProgress = (id: string, immediate = false) => {
    const timer = uploadTimers.current[id];
    if (timer) {
      window.clearInterval(timer);
      delete uploadTimers.current[id];
    }
    if (immediate) {
      setUploadTracker((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setUploadTracker((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, progress: 100 } };
    });
    window.setTimeout(() => {
      setUploadTracker((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 600);
  };

  const handleUploadClick = () => {
    if (!projectId) {
      toast({
        title: "Select a project",
        description: "Choose a project before uploading.",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFilesChosen = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !projectId) return;
    const files = Array.from(event.target.files);
    event.target.value = "";

    files.forEach((file) => {
      const tempId = `${file.name}-${Date.now()}`;
      startFakeProgress(tempId, file.name);
      uploadMutation.mutate(
        { projectId, file },
        {
          onSettled: () => {
            clearFakeProgress(tempId);
          },
          onError: () => {
            clearFakeProgress(tempId, true);
          },
        }
      );
    });
  };

  const beginRename = (file: ProjectFile) => {
    setEditingId(file.id);
    setEditingTitle(resolveName(file));
  };

  const confirmRename = () => {
    const id = editingId;
    const title = editingTitle.trim();
    if (!id || !title) {
      setEditingId(null);
      return;
    }
    renameMutation.mutate(
      { id, title },
      {
        onSuccess: () => {
          setEditingId(null);
        },
      }
    );
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleDelete = (file: ProjectFile) => {
    deleteMutation.mutate({ id: file.id, projectId: file.project_id });
  };

  const handlePreview = (file: ProjectFile) => {
    signedUrlMutation.mutate(
      { file, expiresIn: 300 },
      {
        onSuccess: (url) => {
          if (file.mime_type?.startsWith("image/")) {
            setPreview({ file, url });
          } else {
            window.open(url, "_blank", "noopener");
          }
        },
      }
    );
  };

  const handleCopyLink = (file: ProjectFile) => {
    signedUrlMutation.mutate(
      { file, expiresIn: 600 },
      {
        onSuccess: async (url) => {
          try {
            await navigator.clipboard.writeText(url);
            toast({ title: "Link copied" });
          } catch (error) {
            console.error("Clipboard error", error);
            toast({
              title: "Copy failed",
              description: "Unable to copy to clipboard.",
              variant: "destructive",
            });
          }
        },
      }
    );
  };

  const renderRows = () => {
    if (filesQuery.isLoading) {
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell colSpan={6}>
            <Skeleton className="h-10 w-full" />
          </TableCell>
        </TableRow>
      ));
    }

    if (filesQuery.error) {
      return null;
    }

    const files = filesQuery.data ?? [];
    if (files.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6}>
            <Card className="border-dashed bg-muted/40">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">No files yet</p>
                  <p className="text-sm text-muted-foreground">Upload a file to get started.</p>
                </div>
                <Button onClick={handleUploadClick} disabled={!projectId}>
                  Upload file
                </Button>
              </CardContent>
            </Card>
          </TableCell>
        </TableRow>
      );
    }

    return files.map((file) => {
      const isEditing = editingId === file.id;
      return (
        <TableRow key={file.id}>
          <TableCell>
            <div className="flex items-center gap-3">
              <span className="rounded-md border bg-muted px-2 py-1 text-muted-foreground">
                {getFileIcon(file)}
              </span>
              <div className="space-y-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      className="h-8 w-60"
                      autoFocus
                    />
                    <Button size="sm" onClick={confirmRename} disabled={renameMutation.isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelRename}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="font-medium">{resolveName(file)}</p>
                )}
                <p className="text-xs text-muted-foreground">{file.path}</p>
              </div>
            </div>
          </TableCell>
          <TableCell>{formatFileSize(file.size_bytes)}</TableCell>
          <TableCell>
            <Badge variant="secondary">{getFileType(file)}</Badge>
          </TableCell>
          <TableCell>{new Date(file.created_at).toLocaleString()}</TableCell>
          <TableCell>{file.uploaded_by || "Unknown"}</TableCell>
          <TableCell className="w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handlePreview(file);
                  }}
                >
                  {file.mime_type?.startsWith("image/") ? (
                    <Eye className="mr-2 h-4 w-4" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {file.mime_type?.startsWith("image/") ? "Preview" : "Download"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    beginRename(file);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleCopyLink(file);
                  }}
                >
                  <Link2 className="mr-2 h-4 w-4" /> Copy link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleDelete(file);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="file" className="hidden" ref={fileInputRef} onChange={handleFilesChosen} multiple />
          <Button onClick={handleUploadClick} disabled={!projectId || uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files"
            className="h-8 border-0 p-0 focus-visible:ring-0"
          />
        </div>
        {enableProjectFilter && (
          <Select value={selectedProject} onValueChange={setSelectedProject} disabled={loadingProjects}>
            <SelectTrigger className="h-8 w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name || "Untitled"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filesQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load files</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            Something went wrong.
            <Button onClick={() => filesQuery.refetch()}>Retry</Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead className="w-0">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows()}</TableBody>
            </Table>
            {Object.entries(uploadTracker).length > 0 && (
              <div className="space-y-3 border-t p-4">
                {Object.entries(uploadTracker).map(([id, item]) => (
                  <div key={id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Uploading {item.name}</span>
                      <span className="text-muted-foreground">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview ? resolveName(preview.file) : "Preview"}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="flex items-center justify-center bg-muted/40 p-4">
              <img
                src={preview.url}
                alt={resolveName(preview.file)}
                className="max-h-[70vh] w-auto rounded-md border object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FilesPage() {
  return (
    <FilesView
      heading="Files"
      description="Manage project files and keep access secure."
      breadcrumbs={[
        { label: "Files", href: "/files" },
      ]}
      documentTitle="Files | Outpaged"
      enableProjectFilter
    />
  );
}
