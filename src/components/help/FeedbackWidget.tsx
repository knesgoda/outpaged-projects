import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSubmitFeedback } from "@/hooks/useFeedback";
import { uploadHelpScreenshot } from "@/services/storage";
import { requireUserId } from "@/services/session";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function FeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"bug" | "idea" | "question">("idea");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const submitFeedback = useSubmitFeedback();

  const isSubmitting = submitFeedback.isPending || uploading;

  const isValid = useMemo(() => message.trim().length >= 10, [message]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.size > MAX_FILE_SIZE) {
      setError("Screenshot must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setError(null);
    setScreenshot(file ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || isSubmitting) {
      return;
    }

    try {
      setError(null);
      setSuccess(false);
      let screenshotUrl: string | undefined;

      if (screenshot) {
        setUploading(true);
        const userId = await requireUserId();
        const { publicUrl } = await uploadHelpScreenshot(screenshot, userId);
        screenshotUrl = publicUrl;
      }

      await submitFeedback.mutateAsync();

      setSuccess(true);
      setMessage("");
      setScreenshot(null);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to send feedback right now.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setMessage("");
    setScreenshot(null);
    setError(null);
    setSuccess(false);
    setType("idea");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 shadow-lg"
          aria-label="Leave feedback"
        >
          <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" aria-label="Submit feedback">
        <DialogHeader>
          <DialogTitle>Share feedback</DialogTitle>
          <DialogDescription>Tell us what is working well or what needs attention.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="feedback-type">Type</Label>
            <Select value={type} onValueChange={(value: typeof type) => setType(value)}>
              <SelectTrigger id="feedback-type">
                <SelectValue placeholder="Choose type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              placeholder="Let us know what happened or what you would like to see."
              required
            />
            <p className="text-xs text-muted-foreground">Include reproduction steps when reporting bugs.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-screenshot">Screenshot (optional)</Label>
            <Input id="feedback-screenshot" type="file" accept="image/*" onChange={handleFileChange} />
            <p className="text-xs text-muted-foreground">PNG or JPG up to 5 MB.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Thank you for the feedback!
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {(submitFeedback.isPending || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Send feedback
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>
              Clear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
