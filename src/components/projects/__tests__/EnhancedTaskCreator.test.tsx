import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InlineCustomFieldWizard } from "../InlineCustomFieldWizard";
import { __testing__ } from "../EnhancedTaskCreator";

const { autosaveKey, computeValidationIssues, buildDraftPayload } = __testing__;

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const upsertCustomFieldDefinition = jest.fn(async () => ({ id: "cf-1", name: "Customer impact" }));

jest.mock("@/services/customFields", () => ({
  // @ts-ignore - test mock
  upsertCustomFieldDefinition: () => upsertCustomFieldDefinition(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("EnhancedTaskCreator helpers", () => {
  const baseForm = {
    title: "Sample",
    description: "",
    taskType: "task",
    priority: "medium",
    status: "todo",
    dueDate: "",
    startDate: "",
    storyPoints: "",
    sprintId: "",
    teamId: "",
    estimatedHours: "",
    actualHours: "",
    remainingHours: "",
    templateId: "",
  } as const;
  const baseSpecial = {
    fixVersion: "",
    release: "",
    environment: "",
    stepsToReproduce: "",
  } as const;

  it("flags missing steps to reproduce for bug tasks", () => {
    const issues = computeValidationIssues({
      form: { ...baseForm, taskType: "bug" },
      visibleCustomFields: [],
      customFieldValues: {},
      specialFieldValues: { ...baseSpecial, stepsToReproduce: "" },
    });
    expect(issues).toContain("Steps to Reproduce are required for bugs");
  });

  it("flags required custom fields without values", () => {
    const issues = computeValidationIssues({
      form: { ...baseForm, title: "Custom" },
      visibleCustomFields: [{ id: "cf-1", name: "Customer", isRequired: true }],
      customFieldValues: { "cf-1": "" },
      specialFieldValues: baseSpecial,
    });
    expect(issues).toContain("Customer is required");
  });

  it("serializes draft payloads consistently", () => {
    const payload = buildDraftPayload({
      form: baseForm,
      assigneeIds: ["user-1"],
      watcherIds: ["user-2"],
      customFieldValues: { foo: "bar" },
      specialFieldValues: baseSpecial,
      relationship: { relationship_type: "blocks", target_task_id: "task-1" },
      linkedIssues: [{ id: "issue-1" }],
    });
    expect(payload).toMatchObject({
      form: baseForm,
      assigneeIds: ["user-1"],
      watcherIds: ["user-2"],
      customFieldValues: { foo: "bar" },
    });
    expect(autosaveKey("project-123")).toBe("enhanced-task-creator:project-123");
  });
});

describe("InlineCustomFieldWizard", () => {
  beforeEach(() => {
    upsertCustomFieldDefinition.mockClear();
  });

  it("creates a custom field from the wizard", async () => {
    const handleOpenChange = jest.fn();
    render(
      <InlineCustomFieldWizard
        open
        onOpenChange={handleOpenChange}
        projectId="project-1"
        workspaceId="workspace-1"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Field name/i), { target: { value: "Customer impact" } });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Create field/i }));

    await waitFor(() => {
      expect(upsertCustomFieldDefinition).toHaveBeenCalled();
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
