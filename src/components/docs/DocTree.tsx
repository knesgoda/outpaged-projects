import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocPage } from "@/types";

interface DocTreeProps {
  docs: DocPage[];
  activeId?: string;
  onSelect?: (doc: DocPage) => void;
  onCreate?: (parentId?: string | null) => void;
}

type DocNode = DocPage & { children: DocNode[] };

function buildTree(docs: DocPage[]): DocNode[] {
  const map = new Map<string, DocNode>();
  const roots: DocNode[] = [];

  docs.forEach((doc) => {
    map.set(doc.id, { ...doc, children: [] });
  });

  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (items: DocNode[]) => {
    items.sort((a, b) => a.title.localeCompare(b.title));
    items.forEach((child) => sortNodes(child.children));
  };

  sortNodes(roots);
  return roots;
}

export function DocTree({ docs, activeId, onSelect, onCreate }: DocTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set<string>());

  const tree = useMemo(() => buildTree(docs), [docs]);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      let current = docs.find((doc) => doc.id === activeId);
      while (current?.parent_id) {
        next.add(current.parent_id);
        current = docs.find((doc) => doc.id === current?.parent_id);
      }
      return next;
    });
  }, [activeId, docs]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderNode = (node: DocNode, depth: number) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const isActive = node.id === activeId;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${
            isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
          }`}
        >
          <button
            type="button"
            onClick={() => (hasChildren ? toggle(node.id) : onSelect?.(node))}
            className="flex flex-1 items-center gap-2 text-left"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <span className="w-4" />
            )}
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span onClick={() => onSelect?.(node)} className="truncate">
              {node.title || "Untitled"}
            </span>
          </button>
          {onCreate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onCreate(node.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l border-muted-foreground/20 pl-3">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Pages</h2>
        {onCreate && (
          <Button size="sm" variant="outline" onClick={() => onCreate(null)}>
            <Plus className="mr-1 h-4 w-4" />
            New
          </Button>
        )}
      </div>
      <div className="space-y-1">
        {tree.length === 0 ? (
          <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
            No docs yet.
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
}
