import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WipOverrideDialog } from "../WipOverrideDialog";

describe("WipOverrideDialog", () => {
  const basePending = {
    task: {
      id: "task-1",
      title: "Sample task",
      status: "in_progress",
      priority: "medium",
      hierarchy_level: "task",
      task_type: "task",
      tags: [],
    },
    reason: "column" as const,
    limit: 2,
  };

  function Harness({
    requireReason = false,
    onConfirm,
    onCancel,
    canOverride = true,
  }: {
    requireReason?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    canOverride?: boolean;
  }) {
    const [reason, setReason] = useState("");

    return (
      <WipOverrideDialog
        open
        pending={{ ...basePending, requireReason }}
        columnName="In Progress"
        reason={reason}
        onReasonChange={setReason}
        onConfirm={onConfirm}
        onCancel={onCancel}
        canOverride={canOverride}
      />
    );
  }

  it("disables override when justification required and missing", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<Harness requireReason onConfirm={onConfirm} onCancel={onCancel} />);

    const confirmButton = screen.getByRole("button", { name: /override limit/i });
    expect(confirmButton).toBeDisabled();

    const textarea = screen.getByLabelText(/provide a justification/i);
    await user.type(textarea, "Need to expedite critical fix");

    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("renders contextual messaging when override allowed", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<Harness onConfirm={onConfirm} onCancel={onCancel} />);

    expect(
      screen.getByText(/In Progress is currently over capacity/i)
    ).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: /override limit/i });
    expect(confirmButton).toBeEnabled();

    confirmButton.click();
    expect(onConfirm).toHaveBeenCalled();
  });

  it("notifies when override dismissed", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<Harness requireReason onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables confirmation when user lacks permission", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <Harness onConfirm={onConfirm} onCancel={onCancel} canOverride={false} />
    );

    const confirmButton = screen.getByRole("button", { name: /override limit/i });
    expect(confirmButton).toBeDisabled();
    expect(
      screen.getByText(/do not have permission to approve WIP overrides/i)
    ).toBeInTheDocument();
  });
});
