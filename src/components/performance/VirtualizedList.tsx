import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Card } from '@/components/ui/card';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  className?: string;
  height?: string;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize = 100,
  className = '',
  height = '600px'
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5, // Render 5 extra items above and below viewport
  });

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Example usage component
export function VirtualizedTaskList() {
  // Mock data - in real app, this would come from props or state
  const mockTasks = Array.from({ length: 10000 }, (_, i) => ({
    id: `task-${i}`,
    title: `Task ${i + 1}`,
    status: ['todo', 'in_progress', 'done'][i % 3],
    priority: ['low', 'medium', 'high'][i % 3],
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Virtualized Task List</h2>
        <p className="text-muted-foreground">
          Efficiently rendering {mockTasks.length.toLocaleString()} tasks
        </p>
      </div>

      <VirtualizedList
        items={mockTasks}
        estimateSize={80}
        height="600px"
        renderItem={(task) => (
          <Card className="p-4 mb-2 mx-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{task.title}</h3>
                <p className="text-sm text-muted-foreground">ID: {task.id}</p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 text-xs rounded-full bg-primary/10">
                  {task.status}
                </span>
                <span className="px-2 py-1 text-xs rounded-full bg-secondary/10">
                  {task.priority}
                </span>
              </div>
            </div>
          </Card>
        )}
      />
    </div>
  );
}
