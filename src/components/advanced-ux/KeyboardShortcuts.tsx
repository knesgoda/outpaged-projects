
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
  mac?: string;
  windows?: string;
}

const shortcuts: Shortcut[] = [
  // Global shortcuts
  { key: 'Cmd/Ctrl + K', description: 'Open command palette', category: 'Global' },
  { key: 'Cmd/Ctrl + Shift + N', description: 'Create new project', category: 'Global' },
  { key: 'Cmd/Ctrl + Shift + T', description: 'Create new task', category: 'Global' },
  { key: 'Cmd/Ctrl + /', description: 'Show keyboard shortcuts', category: 'Global' },
  { key: 'Esc', description: 'Close dialogs/modals', category: 'Global' },

  // Navigation
  { key: 'G + D', description: 'Go to Dashboard', category: 'Navigation' },
  { key: 'G + P', description: 'Go to Projects', category: 'Navigation' },
  { key: 'G + T', description: 'Go to Tasks', category: 'Navigation' },
  { key: 'G + B', description: 'Go to Kanban Board', category: 'Navigation' },
  { key: 'G + E', description: 'Go to Team Directory', category: 'Navigation' },
  { key: 'G + R', description: 'Go to Reports', category: 'Navigation' },
  { key: 'G + S', description: 'Go to Settings', category: 'Navigation' },

  // Task Management
  { key: 'N', description: 'Create new task (in task view)', category: 'Tasks' },
  { key: 'E', description: 'Edit selected task', category: 'Tasks' },
  { key: 'Delete', description: 'Delete selected task', category: 'Tasks' },
  { key: 'Space', description: 'Mark task as complete', category: 'Tasks' },
  { key: 'A', description: 'Assign task to me', category: 'Tasks' },

  // Kanban Board
  { key: 'J/K', description: 'Navigate between tasks', category: 'Kanban' },
  { key: 'H/L', description: 'Move task between columns', category: 'Kanban' },
  { key: 'Enter', description: 'Open task details', category: 'Kanban' },
  { key: 'F', description: 'Toggle filters', category: 'Kanban' },

  // General
  { key: 'Cmd/Ctrl + S', description: 'Save current form', category: 'General' },
  { key: 'Cmd/Ctrl + Enter', description: 'Submit form', category: 'General' },
  { key: 'Tab', description: 'Navigate to next element', category: 'General' },
  { key: 'Shift + Tab', description: 'Navigate to previous element', category: 'General' }
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
      
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  const formatKey = (key: string) => {
    return key.split(' + ').map((part, index) => (
      <React.Fragment key={part}>
        {index > 0 && <span className="mx-1">+</span>}
        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">
          {part}
        </Badge>
      </React.Fragment>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5" />
            <span>Keyboard Shortcuts</span>
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and work more efficiently
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3">{category}</h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(shortcut => shortcut.category === category)
                  .map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center space-x-1">
                        {formatKey(shortcut.key)}
                      </div>
                    </div>
                  ))}
              </div>
              {category !== categories[categories.length - 1] && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Press <Badge variant="outline" className="mx-1">Cmd/Ctrl + K</Badge> 
            to open the command palette for quick access to all features.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
