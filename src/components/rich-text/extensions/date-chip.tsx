import { Node, mergeAttributes } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import type { Editor } from "@tiptap/react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

export type DateChipSuggestion = {
  id: string;
  label: string;
  value: string;
  description?: string;
};

export interface DateChipOptions {
  fetchSuggestions?: (query: string) => Promise<DateChipSuggestion[]>;
  onSelect?: (item: DateChipSuggestion, editor: Editor) => void;
}

interface DateSuggestionListProps {
  items: DateChipSuggestion[];
  command: (item: DateChipSuggestion) => void;
  onClose: () => void;
}

interface DateSuggestionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

function defaultDateSuggestions(query: string): DateChipSuggestion[] {
  const base: DateChipSuggestion[] = [
    { id: "today", label: "Today", value: format(new Date(), "yyyy-MM-dd"), description: format(new Date(), "EEE, MMM d") },
    {
      id: "tomorrow",
      label: "Tomorrow",
      value: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      description: format(addDays(new Date(), 1), "EEE, MMM d"),
    },
    {
      id: "next_week",
      label: "Next Week",
      value: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      description: format(addDays(new Date(), 7), "EEE, MMM d"),
    },
  ];

  if (!query) return base;
  return base.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
}

const DateSuggestionList = forwardRef<DateSuggestionListHandle, DateSuggestionListProps>(function DateSuggestionList(
  { items, command, onClose },
  ref
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    command(item);
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + items.length) % Math.max(items.length, 1));
      return true;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % Math.max(items.length, 1));
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectItem(selectedIndex);
      return true;
    }
    return false;
  };

  useImperativeHandle(ref, () => ({ onKeyDown: handleKeyDown }), [handleKeyDown]);

  return (
    <div className="max-h-60 w-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
      {items.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">No dates</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectItem(index)}
                className={cn(
                  "flex w-full flex-col gap-1 px-3 py-2 text-left text-sm",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description ?? item.value}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export function createDateChipExtension(options: DateChipOptions = {}) {
  return Node.create({
    name: "dateChip",
    group: "inline",
    inline: true,
    atom: true,
    selectable: false,
    draggable: false,
    addAttributes() {
      return {
        id: { default: null },
        label: { default: "" },
        value: { default: "" },
        description: { default: null },
      };
    },
    parseHTML() {
      return [
        {
          tag: "span[data-date-id]",
          getAttrs: (dom) => {
            if (!(dom instanceof HTMLElement)) return false;
            return {
              id: dom.dataset.dateId ?? null,
              label: dom.dataset.dateLabel ?? dom.textContent ?? "",
              value: dom.dataset.dateValue ?? "",
              description: dom.dataset.dateDescription ?? null,
            };
          },
        },
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          class:
            "date-chip inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-xs text-primary",
          "data-date": "true",
          "data-date-id": HTMLAttributes.id,
          "data-date-label": HTMLAttributes.label,
          "data-date-value": HTMLAttributes.value,
          "data-date-description": HTMLAttributes.description,
        }),
        HTMLAttributes.label || HTMLAttributes.value,
      ];
    },
    addProseMirrorPlugins() {
      const suggestion = Suggestion({
        char: "&",
        allowSpaces: true,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: "dateChip", attrs: props },
              { type: "text", text: " " },
            ])
            .run();
          options.onSelect?.(props as DateChipSuggestion, editor);
        },
        items: async ({ query }) => {
          if (options.fetchSuggestions) {
            try {
              const suggestions = await options.fetchSuggestions(query);
              return suggestions.slice(0, 20);
            } catch (error) {
              console.error("date:suggestions", error);
              return [];
            }
          }
          return defaultDateSuggestions(query);
        },
        render: () => {
          let component: ReactRenderer<DateSuggestionListProps> | null = null;
          let popup: TippyInstance[] = [];

          return {
            onStart: (props) => {
              component = new ReactRenderer(DateSuggestionList, {
                editor: props.editor,
                props: {
                  items: props.items as DateChipSuggestion[],
                  command: (item) => {
                    props.command(item);
                    options.onSelect?.(item, props.editor);
                  },
                  onClose: () => popup.forEach((instance) => instance.destroy()),
                },
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                trigger: "manual",
                showOnCreate: true,
                placement: "bottom-start",
                theme: "light-border",
                interactive: true,
              });
            },
            onUpdate(props) {
              component?.updateProps({
                items: props.items as DateChipSuggestion[],
                command: (item) => {
                  props.command(item);
                  options.onSelect?.(item, props.editor);
                },
                onClose: () => popup.forEach((instance) => instance.destroy()),
              });

              if (!props.clientRect) return;

              popup.forEach((instance) => {
                instance.setProps({
                  getReferenceClientRect: props.clientRect,
                });
              });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup.forEach((instance) => instance.hide());
                return true;
              }
              const ref = component?.ref as DateSuggestionListHandle | undefined;
              const handled = ref?.onKeyDown(props.event) ?? false;
              if (handled) return true;
              return false;
            },
            onExit() {
              popup.forEach((instance) => instance.destroy());
              component?.destroy();
            },
          };
        },
      });

      return [suggestion];
    },
  });
}
