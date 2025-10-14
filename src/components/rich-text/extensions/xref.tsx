import { Node, mergeAttributes } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Editor } from "@tiptap/react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export type CrossReferenceSuggestion = {
  id: string;
  type: "task" | "project" | "doc" | "file" | "comment";
  title: string;
  subtitle?: string;
  icon?: string;
  url?: string;
};

export interface CrossReferenceExtensionOptions {
  fetchSuggestions: (query: string) => Promise<CrossReferenceSuggestion[]>;
  onSelect?: (item: CrossReferenceSuggestion, editor: Editor) => void;
}

interface XrefListProps {
  items: CrossReferenceSuggestion[];
  command: (item: CrossReferenceSuggestion) => void;
  onClose: () => void;
}

interface XrefListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const XrefList = forwardRef<XrefListHandle, XrefListProps>(function XrefList({ items, command, onClose }, ref) {
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
      const next = (selectedIndex - 1 + items.length) % Math.max(items.length, 1);
      setSelectedIndex(next);
      return true;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (selectedIndex + 1) % Math.max(items.length, 1);
      setSelectedIndex(next);
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
        <div className="p-3 text-sm text-muted-foreground">No matches found</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item, index) => (
            <li key={`${item.type}:${item.id}`}>
              <button
                type="button"
                onClick={() => selectItem(index)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Badge variant="outline" className="mt-0.5 text-xs capitalize">
                  {item.type}
                </Badge>
                <div className="flex-1 truncate">
                  <div className="font-medium text-foreground">{item.title}</div>
                  {item.subtitle && (
                    <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export function createCrossReferenceExtension(options: CrossReferenceExtensionOptions) {
  return Node.create({
    name: "xref",
    group: "inline",
    inline: true,
    atom: true,
    selectable: false,
    draggable: false,
    addAttributes() {
      return {
        id: { default: null },
        type: { default: "task" },
        title: { default: "" },
        subtitle: { default: null },
        url: { default: null },
      };
    },
    parseHTML() {
      return [
        {
          tag: "span[data-xref-id]",
          getAttrs: (dom) => {
            if (!(dom instanceof HTMLElement)) return false;
            return {
              id: dom.dataset.xrefId ?? null,
              type: dom.dataset.xrefType ?? "task",
              title: dom.dataset.xrefTitle ?? dom.textContent ?? "",
              subtitle: dom.dataset.xrefSubtitle ?? null,
              url: dom.dataset.xrefUrl ?? null,
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
            "xref-chip inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-xs text-primary",
          "data-xref": "true",
          "data-xref-id": HTMLAttributes.id,
          "data-xref-type": HTMLAttributes.type,
          "data-xref-title": HTMLAttributes.title,
          "data-xref-subtitle": HTMLAttributes.subtitle,
          "data-xref-url": HTMLAttributes.url,
        }),
        `${HTMLAttributes.title}`,
      ];
    },
    addProseMirrorPlugins() {
      const suggestion = Suggestion({
        char: "[",
        allowSpaces: true,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange({ from: range.from - 1, to: range.to })
            .insertContent([
              {
                type: "xref",
                attrs: props,
              },
              { type: "text", text: " " },
            ])
            .run();
          options.onSelect?.(props as CrossReferenceSuggestion, editor);
        },
        items: async ({ query, state, range }) => {
          const before = state.doc.textBetween(Math.max(0, range.from - 2), range.from, " ");
          if (!before.endsWith("[")) {
            return [];
          }
          try {
            const results = await options.fetchSuggestions(query);
            return results.slice(0, 20);
          } catch (error) {
            console.error("xref:suggestions", error);
            return [];
          }
        },
        render: () => {
          let component: ReactRenderer<XrefListProps> | null = null;
          let popup: TippyInstance[] = [];

          return {
            onStart: (props) => {
              component = new ReactRenderer(XrefList, {
                props: {
                  items: props.items as CrossReferenceSuggestion[],
                  command: (item) => {
                    props.command(item);
                  },
                  onClose: () => popup.forEach((instance) => instance.destroy()),
                },
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                trigger: "manual",
                interactive: true,
                placement: "bottom-start",
                theme: "light-border",
              });
            },
            onUpdate(props) {
              component?.updateProps({
                items: props.items as CrossReferenceSuggestion[],
                command: (item) => props.command(item),
                onClose: () => popup.forEach((instance) => instance.destroy()),
              });

              if (!props.clientRect) {
                return;
              }

              popup.forEach((instance) => {
                instance.setProps({ getReferenceClientRect: props.clientRect });
              });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup.forEach((instance) => instance.hide());
                return true;
              }
              const ref = component?.ref as XrefListHandle | undefined;
              return ref?.onKeyDown(props.event) ?? false;
            },
            onExit() {
              popup.forEach((instance) => instance.destroy());
              component?.destroy();
              component = null;
            },
          };
        },
      }) as unknown as SuggestionOptions<CrossReferenceSuggestion>;

      return [suggestion];
    },
  });
}
