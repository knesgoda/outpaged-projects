import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useFiles } from "@/hooks/useFiles";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectSummary } from "@/hooks/useProjectOptions";
import type { ProjectFile } from "@/types";
import { Download, Search, Upload } from "lucide-react";
import { FilesTable } from "../files/FilesPage";

const MAX_FILE_SIZE_MB = 50;

const getFileName = (file: ProjectFile) =>
  file.title?.trim() || file.path.split("/").pop() || "Untitled";

type UploadJob = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  message?: string;
};

type PreviewState = {
  file: ProjectFile;
  url: string;
};

export default function ProjectFilesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const resolvedProjectId = projectId ?? "";
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const projectQuery = useProjectSummary(resolvedProjectId);
  const projectName = projectQuery.data?.name ?? resolvedProjectId;

  useDocumentTitle(`Projects / ${projectName} / Files`);

  useEffect(() => {
    if (projectQuery.error) {
      const message =
        projectQuery.error instanceof Error
          ? projectQuery.error.message
          : "Unable to load project.";
      toast({
        title: "Project unavailable",
        description: message,
        variant: "destructive",
      });
    }
  }, [projectQuery.error, toast]);

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
  } = useFiles({ projectId: projectId ?? undefined, search: deferredSearch, enabled: Boolean(resolvedProjectId) });

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

        await uploadFile({ projectId: resolvedProjectId, file });

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
    if (!window.confirm(`Delete ${getFileName(file)}?`)) {
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

  if (!resolvedProjectId) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Missing project</AlertTitle>
        <AlertDescription>Project ID is required to view files.</AlertDescription>
      </Alert>
    );
  }

  if (projectQuery.isError) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Unable to load project</AlertTitle>
        <AlertDescription>{(projectQuery.error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!projectQuery.isLoading && projectQuery.data === null) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Project not found</AlertTitle>
        <AlertDescription>This project could not be located.</AlertDescription>
      </Alert>
    );
  }

  const breadcrumbs = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/projects">Projects</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={`/projects/${resolvedProjectId}/overview`}>
              {projectQuery.data?.name ?? resolvedProjectId}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
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
          <h1 className="text-3xl font-semibold tracking-tight">Project files</h1>
          <p className="text-sm text-muted-foreground">
            {projectQuery.isLoading
              ? "Loading project details…"
              : `Manage files for ${projectQuery.data?.name ?? "this project"}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <Button onClick={() => fileInputRef.current?.click()}>
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
        emptyHint="Upload your first file for this project."
      />

      <Drawer open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>{preview ? getFileName(preview.file) : "Preview"}</DrawerTitle>
            <DrawerDescription>
              {preview ? preview.file.mime_type ?? "Unknown type" : ""}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-6 pb-6">
            {preview ? (
              <img
                src={preview.url}
                alt={getFileName(preview.file)}
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
