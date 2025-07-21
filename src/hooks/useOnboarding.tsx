import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  completed: boolean;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to ProjectFlow',
      description: 'Let\'s get you started with your first project',
      component: 'welcome',
      completed: false,
    },
    {
      id: 'create-project',
      title: 'Create Your First Project',
      description: 'Projects help organize your work and team collaboration',
      component: 'create-project',
      completed: false,
    },
    {
      id: 'add-tasks',
      title: 'Add Some Tasks',
      description: 'Tasks are the building blocks of your project',
      component: 'add-tasks',
      completed: false,
    },
    {
      id: 'explore-kanban',
      title: 'Explore the Kanban Board',
      description: 'Visualize your workflow and track progress',
      component: 'explore-kanban',
      completed: false,
    },
    {
      id: 'time-tracking',
      title: 'Try Time Tracking',
      description: 'Track time spent on tasks to improve productivity',
      component: 'time-tracking',
      completed: false,
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Explore more features and start being productive',
      component: 'complete',
      completed: false,
    },
  ];

  // Check if user needs onboarding
  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      // Check if user has any projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      // Check if onboarding was completed before
      const onboardingCompleted = localStorage.getItem(`onboarding_completed_${user.id}`);
      
      const shouldShowOnboarding = !onboardingCompleted && (!projects || projects.length === 0);
      setIsOnboardingActive(shouldShowOnboarding);

      // Load completed steps
      const saved = localStorage.getItem(`onboarding_steps_${user.id}`);
      if (saved) {
        setCompletedSteps(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  // Start onboarding
  const startOnboarding = () => {
    setIsOnboardingActive(true);
    setCurrentStep(0);
    setCompletedSteps([]);
  };

  // Complete a step
  const completeStep = (stepId: string) => {
    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    
    if (user) {
      localStorage.setItem(`onboarding_steps_${user.id}`, JSON.stringify(newCompleted));
    }

    // Move to next step
    const currentStepIndex = onboardingSteps.findIndex(step => step.id === stepId);
    if (currentStepIndex < onboardingSteps.length - 1) {
      setCurrentStep(currentStepIndex + 1);
    }
  };

  // Skip onboarding
  const skipOnboarding = () => {
    setIsOnboardingActive(false);
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
    toast({
      title: "Onboarding Skipped",
      description: "You can restart the tutorial anytime from Settings",
    });
  };

  // Complete onboarding
  const completeOnboarding = () => {
    setIsOnboardingActive(false);
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
    toast({
      title: "Welcome aboard! 🎉",
      description: "You've completed the onboarding. Happy project managing!",
    });
  };

  // Restart onboarding (from settings)
  const restartOnboarding = () => {
    if (user) {
      localStorage.removeItem(`onboarding_completed_${user.id}`);
      localStorage.removeItem(`onboarding_steps_${user.id}`);
    }
    setCompletedSteps([]);
    setCurrentStep(0);
    setIsOnboardingActive(true);
  };

  // Create sample project with demo data
  const createSampleProject = async () => {
    if (!user) return null;

    try {
      // Create sample project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: 'My First Project',
          description: 'A sample project to help you get started with ProjectFlow',
          status: 'planning',
          owner_id: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create sample tasks
      const sampleTasks = [
        {
          title: 'Plan project scope',
          description: 'Define what we want to achieve with this project',
          status: 'todo' as const,
          priority: 'high' as const,
          project_id: project.id,
          reporter_id: user.id,
        },
        {
          title: 'Set up development environment',
          description: 'Install necessary tools and configure workspace',
          status: 'in_progress' as const,
          priority: 'medium' as const,
          project_id: project.id,
          reporter_id: user.id,
        },
        {
          title: 'Design user interface',
          description: 'Create mockups and wireframes for the application',
          status: 'todo' as const,
          priority: 'medium' as const,
          project_id: project.id,
          reporter_id: user.id,
        },
        {
          title: 'Write project documentation',
          description: 'Document the project requirements and specifications',
          status: 'done' as const,
          priority: 'low' as const,
          project_id: project.id,
          reporter_id: user.id,
        },
      ];

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(sampleTasks);

      if (tasksError) throw tasksError;

      toast({
        title: "Sample Project Created! 🎯",
        description: "We've created a project with sample tasks to help you get started",
      });

      return project;
    } catch (error: any) {
      console.error('Error creating sample project:', error);
      toast({
        title: "Error",
        description: "Failed to create sample project. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Get current step data
  const getCurrentStep = () => {
    return onboardingSteps[currentStep];
  };

  // Calculate progress
  const getProgress = () => {
    return Math.round((completedSteps.length / onboardingSteps.length) * 100);
  };

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  return {
    isOnboardingActive,
    currentStep,
    completedSteps,
    onboardingSteps: onboardingSteps.map(step => ({
      ...step,
      completed: completedSteps.includes(step.id),
    })),
    getCurrentStep,
    getProgress,
    startOnboarding,
    completeStep,
    skipOnboarding,
    completeOnboarding,
    restartOnboarding,
    createSampleProject,
  };
}