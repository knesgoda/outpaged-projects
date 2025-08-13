import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from '@/components/ui/responsive-dialog';
import {
  Rocket,
  FolderKanban,
  CheckSquare,
  Calendar,
  Clock,
  Trophy,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNavigate } from 'react-router-dom';

const stepIcons = {
  welcome: Rocket,
  'create-project': FolderKanban,
  'add-tasks': CheckSquare,
  'explore-kanban': Calendar,
  'time-tracking': Clock,
  complete: Trophy,
};

const stepColors = {
  welcome: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'create-project': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'add-tasks': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'explore-kanban': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'time-tracking': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  complete: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

export function OnboardingFlow() {
  const {
    isOnboardingActive,
    currentStep,
    onboardingSteps,
    getCurrentStep,
    getProgress,
    completeStep,
    skipOnboarding,
    completeOnboarding,
    createSampleProject,
  } = useOnboarding();

  const navigate = useNavigate();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const currentStepData = getCurrentStep();

  if (!isOnboardingActive || !currentStepData) {
    return null;
  }

  const handleCreateSampleProject = async () => {
    setIsCreatingProject(true);
    try {
      const project = await createSampleProject();
      if (project) {
        completeStep('create-project');
      }
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleNavigateToKanban = () => {
    navigate('/dashboard/board');
    completeStep('explore-kanban');
  };

  const handleNavigateToTasks = () => {
    navigate('/dashboard/tasks');
    completeStep('add-tasks');
  };

  const handleTryTimeTracking = () => {
    navigate('/dashboard/board');
    completeStep('time-tracking');
  };

  const handleFinishOnboarding = () => {
    completeOnboarding();
    navigate('/dashboard');
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Welcome to ProjectFlow! 🎉</h2>
              <p className="text-muted-foreground">
                We're excited to help you manage your projects more effectively. 
                Let's take a quick tour to get you started!
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center space-y-2">
                <FolderKanban className="w-8 h-8 text-primary" />
                <span>Project Management</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Calendar className="w-8 h-8 text-primary" />
                <span>Kanban Boards</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Clock className="w-8 h-8 text-primary" />
                <span>Time Tracking</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Target className="w-8 h-8 text-primary" />
                <span>Sprint Planning</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Users className="w-8 h-8 text-primary" />
                <span>Team Collaboration</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Sparkles className="w-8 h-8 text-primary" />
                <span>Analytics</span>
              </div>
            </div>
            <Button 
              onClick={() => completeStep('welcome')} 
              className="w-full"
              size="lg"
            >
              Let's Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 'create-project':
        return (
          <div className="text-center space-y-6">
            <FolderKanban className="w-16 h-16 mx-auto text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Create Your First Project</h2>
              <p className="text-muted-foreground">
                Projects are the foundation of your workflow. They help organize tasks, 
                track progress, and collaborate with your team.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2">
              <h3 className="font-medium">We'll create a sample project with:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• A project called "My First Project"</li>
                <li>• 4 sample tasks with different statuses</li>
                <li>• Different priority levels to explore</li>
                <li>• Ready-to-use project structure</li>
              </ul>
            </div>
            <Button 
              onClick={handleCreateSampleProject}
              disabled={isCreatingProject}
              className="w-full"
              size="lg"
            >
              {isCreatingProject ? 'Creating Project...' : 'Create Sample Project'}
              <FolderKanban className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 'add-tasks':
        return (
          <div className="text-center space-y-6">
            <CheckSquare className="w-16 h-16 mx-auto text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Explore Your Tasks</h2>
              <p className="text-muted-foreground">
                Great! Your sample project is ready. Tasks are the building blocks 
                of your project. Let's explore the task management features.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2">
              <h3 className="font-medium">In the Tasks view, you can:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View all tasks across projects</li>
                <li>• Filter by status, priority, and assignee</li>
                <li>• Create, edit, and delete tasks</li>
                <li>• Add descriptions, attachments, and due dates</li>
              </ul>
            </div>
            <Button 
              onClick={handleNavigateToTasks}
              className="w-full"
              size="lg"
            >
              Explore Tasks
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 'explore-kanban':
        return (
          <div className="text-center space-y-6">
            <Calendar className="w-16 h-16 mx-auto text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Discover the Kanban Board</h2>
              <p className="text-muted-foreground">
                The Kanban board provides a visual way to track your workflow. 
                Drag and drop tasks between columns to update their status.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2">
              <h3 className="font-medium">On the Kanban board, you can:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Drag tasks between To Do, In Progress, and Done</li>
                <li>• See task details like priority and assignee</li>
                <li>• Add new tasks directly to any column</li>
                <li>• Get a visual overview of project progress</li>
              </ul>
            </div>
            <Button 
              onClick={handleNavigateToKanban}
              className="w-full"
              size="lg"
            >
              View Kanban Board
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 'time-tracking':
        return (
          <div className="text-center space-y-6">
            <Clock className="w-16 h-16 mx-auto text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Try Time Tracking</h2>
              <p className="text-muted-foreground">
                Track time spent on tasks to improve productivity and project estimation. 
                Click on any task to start tracking time!
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2">
              <h3 className="font-medium">Time tracking features:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Start/stop timers for any task</li>
                <li>• View time logs and analytics</li>
                <li>• Export time reports</li>
                <li>• Set daily/weekly time goals</li>
              </ul>
            </div>
            <Button 
              onClick={handleTryTimeTracking}
              className="w-full"
              size="lg"
            >
              Try Time Tracking
              <Clock className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Congratulations! 🎉</h2>
              <p className="text-muted-foreground">
                You've completed the onboarding tour. You're now ready to manage 
                your projects like a pro with ProjectFlow!
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2">
              <h3 className="font-medium">What's next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create your real projects and invite team members</li>
                <li>• Explore advanced features like roadmaps and analytics</li>
                <li>• Customize your workspace in Settings</li>
                <li>• Check out the Help section for tips and tricks</li>
              </ul>
            </div>
            <Button 
              onClick={handleFinishOnboarding}
              className="w-full"
              size="lg"
            >
              Start Managing Projects
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const Icon = stepIcons[currentStepData.id as keyof typeof stepIcons] || CheckSquare;

  return (
    <Dialog open={isOnboardingActive} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl md:max-h-[90vh] h-[90svh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Badge 
                className={stepColors[currentStepData.id as keyof typeof stepColors]}
              >
                Step {currentStep + 1} of {onboardingSteps.length}
              </Badge>
              <span>{currentStepData.title}</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipOnboarding}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="w-full" />
        </div>

        <Separator />

        {/* Step Content */}
        <div className="py-4">
          {renderStepContent()}
        </div>

        <Separator />

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={skipOnboarding}
            className="text-muted-foreground"
          >
            Skip Tutorial
          </Button>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  // Could implement going back if needed
                }}
                disabled
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
            
            {/* Steps indicator */}
            <div className="flex gap-1">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}