import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a project code from a project name
 */
export function generateProjectCode(projectName: string): string {
  // Clean the project name
  const cleaned = projectName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Split into words
  const words = cleaned.split(' ').filter(word => word.length > 0);

  if (words.length === 0) {
    return 'PROJ';
  }

  // Strategy 1: Use first letters of each word (up to 4 words)
  if (words.length <= 4) {
    const code = words.map(word => word[0]).join('');
    if (code.length >= 2 && code.length <= 10) {
      return code;
    }
  }

  // Strategy 2: Use first word if it's 2-10 characters
  const firstWord = words[0];
  if (firstWord.length >= 2 && firstWord.length <= 10) {
    return firstWord.substring(0, 10);
  }

  // Strategy 3: Use first 3-4 letters of first word + first letter of second word
  if (words.length >= 2) {
    const firstPart = firstWord.substring(0, 3);
    const secondPart = words[1][0];
    return (firstPart + secondPart).substring(0, 10);
  }

  // Fallback: Use first 4 characters of first word, pad if needed
  const fallback = firstWord.substring(0, 4);
  return fallback.length >= 2 ? fallback : fallback + 'X';
}

/**
 * Ensures a project code is unique by appending numbers if needed
 */
export async function ensureUniqueProjectCode(baseCode: string, excludeProjectId?: string): Promise<string> {
  let code = baseCode;
  let counter = 1;

  while (true) {
    // Check if code exists
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('code', code)
      .neq('id', excludeProjectId || '')
      .maybeSingle();

    if (error) {
      console.error('Error checking code uniqueness:', error);
      break;
    }

    if (!data) {
      // Code is unique
      return code;
    }

    // Code exists, try with number suffix
    counter++;
    const suffix = counter.toString();
    const maxLength = 10 - suffix.length;
    code = baseCode.substring(0, maxLength) + suffix;

    // Safety check to prevent infinite loop
    if (counter > 999) {
      break;
    }
  }

  return code;
}

/**
 * Auto-generates codes for projects that don't have them
 */
export async function generateCodesForExistingProjects(): Promise<void> {
  try {
    // Fetch projects without codes
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, code')
      .or('code.is.null,code.eq.""');

    if (error) {
      console.error('Error fetching projects without codes:', error);
      return;
    }

    if (!projects || projects.length === 0) {
      console.log('No projects need code generation');
      return;
    }

    console.log(`Generating codes for ${projects.length} projects...`);

    // Generate unique codes for each project
    for (const project of projects) {
      const baseCode = generateProjectCode(project.name);
      const uniqueCode = await ensureUniqueProjectCode(baseCode, project.id);

      // Update the project with the generated code
      const { error: updateError } = await supabase
        .from('projects')
        .update({ code: uniqueCode })
        .eq('id', project.id);

      if (updateError) {
        console.error(`Error updating project ${project.name} with code ${uniqueCode}:`, updateError);
      } else {
        console.log(`Generated code "${uniqueCode}" for project "${project.name}"`);
      }
    }

    console.log('Code generation completed');
  } catch (error) {
    console.error('Error in generateCodesForExistingProjects:', error);
  }
}