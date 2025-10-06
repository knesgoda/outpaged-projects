import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useCreateTicket } from "@/hooks/useSupport";
import { uploadHelpScreenshot } from "@/services/storage";
import { requireUserId } from "@/services/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Loader2 } from "lucide-react";

type TicketFormState = {
  subject: string;
  body: string;
  priority: "low" | "normal" | "high" | "urgent";
  screenshot?: File | null;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ContactSupportPage() {
  const [form, setForm] = useState<TicketFormState>({
    subject: "",
    body: "",
    priority: "normal",
    screenshot: null,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const createTicket = useCreateTicket();

  const isSubmitting = createTicket.isPending;

  const isValid = useMemo(() => form.subject.trim().length > 3 && form.body.trim().length > 10, [form.subject, form.body]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleBodyChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, body: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.size > MAX_FILE_SIZE) {
      setErrorMessage("Screenshot must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setErrorMessage(null);
    setForm((previous) => ({ ...previous, screenshot: file ?? null }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || isSubmitting) {
      return;
    }

    try {
      setErrorMessage(null);
      let uploadedUrl: string | undefined;

      if (form.screenshot) {
        const userId = await requireUserId();
        const { publicUrl } = await uploadHelpScreenshot(form.screenshot, userId);
        uploadedUrl = publicUrl;
        setScreenshotUrl(publicUrl);
      }

      const response = await createTicket.mutateAsync({
        subject: form.subject.trim(),
        priority: form.priority,
        body: uploadedUrl ? `${form.body.trim()}\n\nScreenshot: ${uploadedUrl}` : form.body.trim(),
      });

      setCreatedTicketId(response.id);
      setForm({ subject: "", body: "", priority: form.priority, screenshot: null });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to submit your request right now.";
      setErrorMessage(message);
    }
  };

  const resetForm = () => {
    setCreatedTicketId(null);
    setScreenshotUrl(null);
    setForm({ subject: "", body: "", priority: "normal", screenshot: null });
    setErrorMessage(null);
  };

  return (
    <div className="space-y-8 p-6">
      <Helmet>
        <title>Help / Contact</title>
      </Helmet>
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Contact support</h1>
        <p className="max-w-2xl text-muted-foreground">
          Tell us what you need help with. We will create a support ticket and follow up at your workspace email.
        </p>
      </header>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Submission failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {createdTicketId ? (
        <Card className="max-w-2xl">
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" /> Ticket created
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your request was sent successfully. Keep this reference ID for future conversations.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Ticket ID</p>
              <p className="text-sm text-muted-foreground">{createdTicketId}</p>
            </div>
            {screenshotUrl && (
              <div>
                <p className="text-sm font-medium">Screenshot</p>
                <a
                  href={screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Open uploaded screenshot
                </a>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={resetForm}>
                Submit another request
              </Button>
              <Button asChild>
                <Link to="/help">Back to help</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="grid max-w-3xl gap-6">
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              value={form.subject}
              onChange={handleInputChange}
              placeholder="Give us a short summary"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(value: TicketFormState["priority"]) =>
                setForm((previous) => ({ ...previous, priority: value }))
              }
            >
              <SelectTrigger id="priority" aria-label="Ticket priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="body">Describe the issue</Label>
            <Textarea
              id="body"
              value={form.body}
              onChange={handleBodyChange}
              rows={8}
              placeholder="Share steps to reproduce, expected behavior, and any relevant context."
              required
            />
            <p className="text-xs text-muted-foreground">Please avoid sharing passwords or sensitive personal data.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="screenshot">Attach screenshot (optional)</Label>
            <Input id="screenshot" type="file" accept="image/*" onChange={handleFileChange} />
            <p className="text-xs text-muted-foreground">PNG or JPG up to 5 MB.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Submit ticket
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting && !createdTicketId}>
              Reset
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ContactSupportPage;
