import { useMemo, useState } from "react";
import type { DocPage } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";

type DocTreeProps = {
  docs: DocPage[];
  selectedId?: string | null;
  onSelect?: (docId: string) => void;
  emptyState?: React.ReactNode;
};

type DocNode = DocPage & { children: DocNode[] };

function buildTree(docs: DocPage[]): DocNode[] {
  const map = new Map<string, DocNode>();
  const roots: DocNode[] = [];

  docs.forEach((doc) => {
    map.set(doc.id, { ...doc, children: [] });
  });

  map.forEach((node) => {
    const parentId = node.parent_id ?? undefined;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: DocNode[]) => {
    nodes.sort((a, b) => a.title.localeCompare(b.title));
    nodes.forEach((child) => sortNodes(child.children));
  };

  sortNodes(roots);

  return roots;
}

export function DocTree({ docs, selectedId, onSelect, emptyState }: DocTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildTree(docs), [docs]);

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (id: string) => {
    onSelect?.(id);
  };

  if (!tree.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {emptyState ?? "No docs yet."}
      </div>
    );
  }

  const renderNode = (node: DocNode) => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <li key={node.id}>
        <div className="flex items-center gap-1 py-1">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => toggle(node.id)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <span className="flex h-6 w-6 items-center justify-center text-muted-foreground">
              <FileText className="h-4 w-4" />
            </span>
          )}
          <button
            type="button"
            onClick={() => handleSelect(node.id)}
            className={cn(
              "flex-1 rounded px-2 py-1 text-left text-sm transition",
              isSelected
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {node.title}
          </button>
        </div>
        {hasChildren && !isCollapsed ? (
          <ul className="ml-4 border-l border-border/60 pl-2">
            {node.children.map((child) => renderNode(child))}
          </ul>
        ) : null}
      </li>
    );
  };

  return <ul className="space-y-1">{tree.map((node) => renderNode(node))}</ul>;
}
