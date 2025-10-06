
import React, { useState, useEffect } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Settings, Users, FileText, BarChart, Calendar, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSecurity } from '@/components/security/SecurityProvider';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
  keywords?: string[];
  permission?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = useSecurity();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      icon: <BarChart className="h-4 w-4" />,
      action: () => navigate('/dashboard'),
      group: 'Navigation',
      keywords: ['home', 'overview']
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects',
      icon: <FileText className="h-4 w-4" />,
      action: () => navigate('/dashboard/projects'),
      group: 'Navigation',
      keywords: ['work', 'portfolio']
    },
    {
      id: 'nav-tasks',
      title: 'Go to Tasks',
      icon: <Search className="h-4 w-4" />,
      action: () => navigate('/dashboard/tasks'),
      group: 'Navigation',
      keywords: ['todo', 'work items']
    },
    {
      id: 'nav-board',
      title: 'Go to Kanban Board',
      icon: <Calendar className="h-4 w-4" />,
      action: () => navigate('/dashboard/board'),
      group: 'Navigation',
      keywords: ['kanban', 'agile', 'scrum']
    },
    {
      id: 'nav-team',
      title: 'Go to Team Directory',
      icon: <Users className="h-4 w-4" />,
      action: () => navigate('/dashboard/team'),
      group: 'Navigation',
      keywords: ['people', 'members', 'colleagues']
    },
    {
      id: 'nav-reports',
      title: 'Go to Reports',
      icon: <BarChart className="h-4 w-4" />,
      action: () => navigate('/reports'),
      group: 'Navigation',
      keywords: ['analytics', 'metrics', 'insights']
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      icon: <Settings className="h-4 w-4" />,
      action: () => navigate('/dashboard/settings'),
      group: 'Navigation',
      keywords: ['preferences', 'configuration']
    },

    // Quick Actions
    {
      id: 'create-project',
      title: 'Create New Project',
      description: 'Start a new project',
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        navigate('/dashboard/projects');
        // Trigger project creation dialog
      },
      group: 'Quick Actions',
      keywords: ['new', 'add'],
      permission: 'write:projects'
    },
    {
      id: 'create-task',
      title: 'Create New Task',
      description: 'Add a new task',
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        navigate('/dashboard/tasks');
        // Trigger task creation dialog
      },
      group: 'Quick Actions',
      keywords: ['new', 'add', 'todo'],
      permission: 'write:tasks'
    },
    {
      id: 'invite-member',
      title: 'Invite Team Member',
      description: 'Send an invitation to join the team',
      icon: <Users className="h-4 w-4" />,
      action: () => {
        navigate('/dashboard/team');
        // Trigger invite dialog
      },
      group: 'Quick Actions',
      keywords: ['invite', 'add', 'member'],
      permission: 'write:team'
    },

    // System Commands
    {
      id: 'search-global',
      title: 'Global Search',
      description: 'Search across all content',
      icon: <Search className="h-4 w-4" />,
      action: () => navigate('/dashboard/search'),
      group: 'System',
      keywords: ['find', 'lookup']
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: <Zap className="h-4 w-4" />,
      action: () => {
        // Show keyboard shortcuts modal
        console.log('Show keyboard shortcuts');
      },
      group: 'System',
      keywords: ['help', 'hotkeys']
    }
  ];

  const filteredCommands = commands.filter(command => 
    !command.permission || hasPermission(command.permission)
  );

  const handleSelect = (command: CommandItem) => {
    setOpen(false);
    command.action();
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {['Navigation', 'Quick Actions', 'System'].map((group) => {
            const groupCommands = filteredCommands.filter(cmd => cmd.group === group);
            if (groupCommands.length === 0) return null;
            
            return (
              <CommandGroup key={group} heading={group}>
                {groupCommands.map((command) => (
                  <CommandItem
                    key={command.id}
                    onSelect={() => handleSelect(command)}
                    className="flex items-center space-x-2 p-2"
                  >
                    {command.icon}
                    <div className="flex-1">
                      <div className="font-medium">{command.title}</div>
                      {command.description && (
                        <div className="text-sm text-muted-foreground">
                          {command.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
