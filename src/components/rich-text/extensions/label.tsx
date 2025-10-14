import { Node, mergeAttributes } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export type LabelChipSuggestion = {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
};

export interface LabelChipOptions {
  fetchSuggestions: (query: string) => Promise<LabelChipSuggestion[]>;
  onSelect?: (item: LabelChipSuggestion, editor: Editor) => void;
}

interface LabelSuggestionListProps {
  items: LabelChipSuggestion[];
  command: (item: LabelChipSuggestion) => void;
  onClose: () => void;
}

interface LabelSuggestionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const LabelSuggestionList = forwardRef<LabelSuggestionListHandle, LabelSuggestionListProps>(
  function LabelSuggestionList({ items, command, onClose }, ref) {
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
      <div className="max-h-64 w-72 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
        {items.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No labels found</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectItem(index)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span
                    className="inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color ?? "var(--primary)" }}
                    aria-hidden
                  />
                  <div className="flex-1 truncate">
                    <div className="font-medium text-foreground">{item.name}</div>
                    {item.description && (
                      <div className="truncate text-xs text-muted-foreground">{item.description}</div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

export function createLabelChipExtension(options: LabelChipOptions) {
  return Node.create({
    name: "labelChip",
    group: "inline",
    atom: true,
    inline: true,
    selectable: false,
    draggable: false,
    addAttributes() {
      return {
        id: { default: null },
        name: { default: "" },
        color: { default: null },
        description: { default: null },
      };
    },
    parseHTML() {
      return [
        {
          tag: "span[data-label-id]",
          getAttrs: (dom) => {
            if (!(dom instanceof HTMLElement)) return false;
            return {
              id: dom.dataset.labelId ?? null,
              name: dom.dataset.labelName ?? dom.textContent ?? "",
              color: dom.dataset.labelColor ?? null,
              description: dom.dataset.labelDescription ?? null,
            } satisfies Partial<LabelChipSuggestion>;
          },
        },
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          class:
            "label-chip inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-1.5 py-0.5 text-xs text-foreground",
          "data-label": "true",
          "data-label-id": HTMLAttributes.id,
          "data-label-name": HTMLAttributes.name,
          "data-label-color": HTMLAttributes.color,
          "data-label-description": HTMLAttributes.description,
          style: HTMLAttributes.color ? `--chip-color: ${HTMLAttributes.color}` : undefined,
        }),
        [
          "span",
          {
            class: "h-2 w-2 rounded-full",
            style: HTMLAttributes.color ? `background-color: ${HTMLAttributes.color}` : undefined,
          },
          "",
        ],
        `#${HTMLAttributes.name}`,
      ];
    },
    addProseMirrorPlugins() {
      const suggestion = Suggestion({
        char: "#",
        allowSpaces: true,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: "labelChip",
                attrs: props,
              },
              { type: "text", text: " " },
            ])
            .run();
          options.onSelect?.(props as LabelChipSuggestion, editor);
        },
        items: async ({ query }) => {
          try {
            const suggestions = await options.fetchSuggestions(query);
            return suggestions.slice(0, 20);
          } catch (error) {
            console.error("label:suggestions", error);
            return [];
          }
        },
        render: () => {
          let component: ReactRenderer<LabelSuggestionListProps> | null = null;
          let popup: TippyInstance[] = [];

          return {
            onStart: (props) => {
              component = new ReactRenderer(LabelSuggestionList, {
                editor: props.editor,
                props: {
                  items: props.items as LabelChipSuggestion[],
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
                showOnCreate: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "light-border",
                interactive: true,
              });
            },
            onUpdate(props) {
              component?.updateProps({
                items: props.items as LabelChipSuggestion[],
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
              const ref = component?.ref as LabelSuggestionListHandle | undefined;
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
