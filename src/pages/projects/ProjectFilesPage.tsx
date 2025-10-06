import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectId } from "@/hooks/useProjectId";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectsLite } from "@/hooks/useProjectsLite";
import {
  useDeleteFile,
  useFiles,
  useRenameFile,
  useSignedFileUrl,
  useUploadFile,
} from "@/hooks/useFiles";
import { useToast } from "@/hooks/use-toast";
import { setBreadcrumbLabel } from "@/state/breadcrumbs";
import type { ProjectFile } from "@/types";
import {
  Download,
  File as FileIcon,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { formatBytes, MAX_FILE_SIZE } from "@/pages/files/utils";

export default function ProjectFilesPage() {
  const projectId = useProjectId() ?? "";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [renameTarget, setRenameTarget] = useState<ProjectFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const { data: projects = [] } = useProjectsLite();

  const projectName = useMemo(() => {
    return projects.find((project) => project.id === projectId)?.name ?? projectId;
  }, [projects, projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: files = [], isLoading, isError } = useFiles({
    projectId: projectId || undefined,
    search: debouncedSearch,
  });

  const uploadMutation = useUploadFile();
  const renameMutation = useRenameFile();
  const deleteMutation = useDeleteFile();
  const signedUrlMutation = useSignedFileUrl();

  useEffect(() => {
    document.title = `Projects / ${projectName} / Files`;
  }, [projectName]);

  useEffect(() => {
    if (projectId) {
      const path = `/projects/${projectId}`;
      setBreadcrumbLabel(path, projectName);
      return () => setBreadcrumbLabel(path, null);
    }
  }, [projectId, projectName]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum size is 50 MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }
    if (!file.type) {
      toast({
        title: "Unknown file type",
        description: "The selected file has no MIME type.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }
    try {
      await uploadMutation.mutateAsync({ projectId, file });
    } finally {
      event.target.value = "";
    }
  };

  const handlePreview = async (file: ProjectFile) => {
    try {
      const url = await signedUrlMutation.mutateAsync({ file, expiresIn: 900 });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyLink = async (file: ProjectFile) => {
    try {
      const url = await signedUrlMutation.mutateAsync({ file, expiresIn: 900 });
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const openRename = (file: ProjectFile) => {
    setRenameTarget(file);
    setRenameValue(file.title ?? "");
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const value = renameValue.trim();
    if (!value) {
      toast({
        title: "Name required",
        description: "Enter a new file name.",
        variant: "destructive",
      });
      return;
    }
    await renameMutation.mutateAsync({ id: renameTarget.id, title: value });
    setRenameTarget(null);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (!projectId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Project not found</AlertTitle>
        <AlertDescription>The project id is missing from the URL.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Files</h1>
          <p className="text-muted-foreground">{projectName}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search files"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="md:w-80"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load files</AlertTitle>
          <AlertDescription>Try refreshing the page.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && files.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No files yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Upload project assets to share with your team.
            </p>
          </CardContent>
        </Card>
      )}

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{projectName} files</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{file.title ?? file.path}</p>
                          <p className="text-xs text-muted-foreground">{file.path}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatBytes(file.size_bytes)}</TableCell>
                    <TableCell>{file.mime_type ?? "Unknown"}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(file.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>{file.uploaded_by.slice(0, 8)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handlePreview(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openRename(file)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleCopyLink(file)}>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Copy link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setDeleteTarget(file)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">New name</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={renameMutation.isPending}>
              {renameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the file and revoke existing links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={executeDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
