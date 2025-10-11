import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBoardShortcuts } from "@/hooks/useBoardShortcuts";

const ShortcutHarness = ({
  enabled = true,
  handlers,
}: {
  enabled?: boolean;
  handlers: Parameters<typeof useBoardShortcuts>[0];
}) => {
  useBoardShortcuts({ ...handlers, enabled });
  return <div data-testid="shortcut-target" />;
};

describe("useBoardShortcuts", () => {
  it("invokes handlers for mapped keys", async () => {
    const user = userEvent.setup();
    const onNewItem = jest.fn();
    const onFocusFilters = jest.fn();
    const onFocusSearch = jest.fn();
    const onCycleView = jest.fn();
    const onOpenQuickActions = jest.fn();

    render(
      <ShortcutHarness
        handlers={{
          onNewItem,
          onFocusFilters,
          onFocusSearch,
          onCycleView,
          onOpenQuickActions,
        }}
      />
    );

    await user.keyboard("n");
    await user.keyboard("f");
    await user.keyboard("/");
    await user.keyboard("v");
    await user.keyboard(";");

    expect(onNewItem).toHaveBeenCalled();
    expect(onFocusFilters).toHaveBeenCalled();
    expect(onFocusSearch).toHaveBeenCalled();
    expect(onCycleView).toHaveBeenCalled();
    expect(onOpenQuickActions).toHaveBeenCalled();
  });

  it("does not fire when disabled", async () => {
    const user = userEvent.setup();
    const onNewItem = jest.fn();

    render(
      <ShortcutHarness
        enabled={false}
        handlers={{ onNewItem }}
      />
    );

    await user.keyboard("n");
    expect(onNewItem).not.toHaveBeenCalled();
  });

  it("ignores shortcuts when typing in inputs", async () => {
    const user = userEvent.setup();
    const onFocusSearch = jest.fn();

    render(
      <div>
        <ShortcutHarness handlers={{ onFocusSearch }} />
        <input data-testid="input" />
      </div>
    );

    const input = document.querySelector("input") as HTMLInputElement;
    input.focus();
    await user.keyboard("/");
    expect(onFocusSearch).not.toHaveBeenCalled();
  });
});

