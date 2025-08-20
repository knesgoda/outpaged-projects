import { z } from 'zod';
import { validatePasswordStrength } from './security';
import { supabase } from '@/integrations/supabase/client';

// Base validation schemas
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .transform(email => email.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .refine((password) => {
    const validation = validatePasswordStrength(password);
    return validation.isValid;
  }, 'Password does not meet security requirements');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
  .transform(name => name.trim());

// Task validation schemas
export const taskTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title is too long')
  .transform(title => title.trim());

export const taskDescriptionSchema = z
  .string()
  .max(5000, 'Description is too long')
  .optional()
  .transform(desc => desc?.trim());

// Comment validation schemas
export const commentContentSchema = z
  .string()
  .min(1, 'Comment cannot be empty')
  .max(2000, 'Comment is too long')
  .transform(content => content.trim());

// Project validation schemas
export const projectNameSchema = z
  .string()
  .min(1, 'Project name is required')
  .max(100, 'Project name is too long')
  .transform(name => name.trim());

export const projectCodeSchema = z
  .string()
  .min(2, 'Project code must be at least 2 characters')
  .max(10, 'Project code is too long')
  .regex(/^[A-Z0-9]+$/, 'Project code must contain only uppercase letters and numbers')
  .transform(code => code.toUpperCase().trim());

// User profile validation schemas
export const profileUpdateSchema = z.object({
  full_name: nameSchema.optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

// Authentication schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: nameSchema.optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Task creation/update schemas
export const taskCreateSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  project_id: z.string().uuid('Invalid project ID'),
  assignee_id: z.string().uuid('Invalid assignee ID').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  task_type: z.enum(['feature_request', 'bug', 'improvement', 'documentation']).optional(),
  story_points: z.number().int().min(1).max(100).optional(),
  due_date: z.date().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  id: z.string().uuid('Invalid task ID'),
});

// Project creation/update schemas
export const projectCreateSchema = z.object({
  name: projectNameSchema,
  description: z.string().max(1000, 'Description is too long').optional(),
  code: projectCodeSchema.optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  id: z.string().uuid('Invalid project ID'),
});

// Comment schemas
export const commentCreateSchema = z.object({
  content: commentContentSchema,
  task_id: z.string().uuid('Invalid task ID'),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB
  allowedTypes: z.array(z.string()).default([
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
}).refine((data) => {
  return data.file.size <= data.maxSize;
}, 'File size exceeds maximum allowed size')
.refine((data) => {
  return data.allowedTypes.includes(data.file.type);
}, 'File type not allowed');

// Search validation
export const searchQuerySchema = z
  .string()
  .min(1, 'Search query is required')
  .max(100, 'Search query is too long')
  .transform(query => query.trim());

// Security validation utilities
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => err.message)
      };
    }
    return {
      success: false,
      errors: ['Validation failed']
    };
  }
}

// Async validation for unique constraints
export async function validateUniqueEmail(email: string): Promise<boolean> {
  // In a real app, this would check against the database
  // For now, we'll simulate the check
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate database check
      resolve(true);
    }, 100);
  });
}

export async function validateUniqueProjectCode(code: string, projectId?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('code', code.toUpperCase())
      .neq('id', projectId || '')
      .maybeSingle();

    if (error) {
      console.error('Error validating project code:', error);
      return false;
    }

    return !data; // Return true if no existing project found
  } catch (error) {
    console.error('Error validating project code:', error);
    return false;
  }
}