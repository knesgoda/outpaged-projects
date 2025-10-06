import { supabase } from "@/integrations/supabase/client";
import type { LinkedResource } from "@/types";
import { addLinkedResource } from "@/services/linkedResources";

type CreateTaskFromEmailInput = {
  projectId: string;
  subject: string;
  from: string;
  messageId: string;
  link?: string;
};

type CreateTaskFromEmailResult = {
  taskId: string;
  linkedResource: LinkedResource;
};

const buildTaskDescription = (input: CreateTaskFromEmailInput) => {
  const lines = [
    `Email from: ${input.from}`,
    `Message ID: ${input.messageId}`,
  ];

  if (input.link) {
    lines.push(`Link: ${input.link}`);
  }

  return lines.join("\n");
};

export async function createTaskFromEmail(
  input: CreateTaskFromEmailInput
): Promise<CreateTaskFromEmailResult> {
  if (!input.projectId) {
    throw new Error("Project is required to create a task from email");
  }

  const subject = input.subject?.trim();
  if (!subject) {
    throw new Error("Subject is required");
  }

  const from = input.from?.trim();
  if (!from) {
    throw new Error("Sender is required");
  }

  const messageId = input.messageId?.trim();
  if (!messageId) {
    throw new Error("Message ID is required");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message || "Unable to resolve current user");
  }

  if (!user?.id) {
    throw new Error("You must be signed in to create tasks");
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title: subject,
      description: buildTaskDescription(input),
      project_id: input.projectId,
      reporter_id: user.id,
    })
    .select("id")
    .single();

  if (taskError) {
    throw new Error(taskError.message || "Failed to create task from email");
  }

  const linkedResource = await addLinkedResource({
    provider: "gmail",
    external_type: "email",
    external_id: messageId,
    url: input.link ?? null,
    title: subject,
    metadata: {
      from,
      messageId,
    },
    entity_type: "task",
    entity_id: task.id,
    project_id: input.projectId,
  });

  return {
    taskId: task.id,
    linkedResource,
  };
}
