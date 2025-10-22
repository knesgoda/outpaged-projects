/**
 * OPQL Query Evaluator
 * 
 * Evaluates OPQL queries against task data
 */

import { parseOPQL, type OPQLQuery, type OPQLCondition } from './parser';
import type { TaskWithDetails } from '@/types/tasks';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Function implementations
const OPQL_FUNCTIONS: Record<string, () => any> = {
  'me()': () => {
    // In a real implementation, get current user ID from auth context
    return 'current-user-id';
  },
  'startOfWeek()': () => startOfWeek(new Date()).toISOString(),
  'endOfWeek()': () => endOfWeek(new Date()).toISOString(),
  'startOfMonth()': () => startOfMonth(new Date()).toISOString(),
  'endOfMonth()': () => endOfMonth(new Date()).toISOString(),
  'today()': () => new Date().toISOString().split('T')[0],
  'now()': () => new Date().toISOString(),
  'yesterday()': () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  },
  'tomorrow()': () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },
};

/**
 * Get field value from task
 */
function getFieldValue(task: TaskWithDetails, field: string): any {
  // Build human-readable key
  const key = task.project?.code && task.ticket_number
    ? `${task.project.code}-${task.ticket_number}`
    : task.id;

  const fieldMap: Record<string, any> = {
    'key': key,
    'title': task.title,
    'type': task.task_type,
    'status': task.status,
    'statusCategory': task.derived?.statusCategory,
    'priority': task.priority,
    'assignee': task.assignees?.map(a => a.id),
    'owner': task.owner_id,
    'reporter': task.reporter_id || task.created_by,
    'watcher': task.watchers?.map(w => w.user_id),
    'label': task.tagNames,
    'component': task.components?.map(c => c.name),
    'project': task.project_id,
    'epic': task.parent_id,
    'parent': task.parent_id,
    'sprint': task.sprint_id,
    'startDate': task.start_date,
    'dueDate': task.due_date,
    'created': task.created_at,
    'updated': task.updated_at,
    'estimate': task.estimated_hours,
    'timeTracked': task.actual_hours,
    'points': task.story_points,
    'blocked': task.blocked,
    'environment': task.environment,
    'area': task.area,
    'affectsVersion': task.versions?.filter(v => v.type === 'affects').map(v => v.version),
    'fixVersion': task.versions?.filter(v => v.type === 'fixes').map(v => v.version),
    'has:attachment': task.files && task.files.length > 0,
    'has:subtasks': task.subitems && task.subitems.length > 0,
    'has:watchers': task.watchers && task.watchers.length > 0,
    'archived': task.archived,
    'securityLevel': task.security_level,
  };
  
  return fieldMap[field];
}

/**
 * Resolve value (handle functions)
 */
function resolveValue(value: string | any[]): any {
  if (typeof value === 'string') {
    // Check if it's a function
    if (OPQL_FUNCTIONS[value]) {
      return OPQL_FUNCTIONS[value]();
    }
    return value;
  }
  
  // Array of values
  if (Array.isArray(value)) {
    return value.map(v => resolveValue(v));
  }
  
  return value;
}

/**
 * Evaluate single condition
 */
function evaluateCondition(task: TaskWithDetails, condition: OPQLCondition): boolean {
  const fieldValue = getFieldValue(task, condition.field);
  const conditionValue = resolveValue(condition.value);
  
  switch (condition.operator) {
    case '=':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(conditionValue);
      }
      return fieldValue == conditionValue;
    
    case '!=':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(conditionValue);
      }
      return fieldValue != conditionValue;
    
    case 'in':
      if (!Array.isArray(conditionValue)) return false;
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => conditionValue.includes(v));
      }
      return conditionValue.includes(fieldValue);
    
    case 'not in':
      if (!Array.isArray(conditionValue)) return false;
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some(v => conditionValue.includes(v));
      }
      return !conditionValue.includes(fieldValue);
    
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => 
          String(v).toLowerCase().includes(String(conditionValue).toLowerCase())
        );
      }
      return String(fieldValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());
    
    case '~': // Regex match
      try {
        const regex = new RegExp(conditionValue, 'i');
        return regex.test(String(fieldValue || ''));
      } catch {
        return false;
      }
    
    case '!~': // Regex not match
      try {
        const regex = new RegExp(conditionValue, 'i');
        return !regex.test(String(fieldValue || ''));
      } catch {
        return true;
      }
    
    case '>':
      return Number(fieldValue) > Number(conditionValue);
    
    case '>=':
      return Number(fieldValue) >= Number(conditionValue);
    
    case '<':
      return Number(fieldValue) < Number(conditionValue);
    
    case '<=':
      return Number(fieldValue) <= Number(conditionValue);
    
    case 'is':
      if (conditionValue === 'empty' || conditionValue === 'null') {
        return fieldValue == null || fieldValue === '' || 
          (Array.isArray(fieldValue) && fieldValue.length === 0);
      }
      return fieldValue === conditionValue;
    
    case 'is not':
      if (conditionValue === 'empty' || conditionValue === 'null') {
        return fieldValue != null && fieldValue !== '' && 
          !(Array.isArray(fieldValue) && fieldValue.length === 0);
      }
      return fieldValue !== conditionValue;
    
    case 'before':
      if (!fieldValue || !conditionValue) return false;
      return new Date(fieldValue) < new Date(conditionValue);
    
    case 'after':
      if (!fieldValue || !conditionValue) return false;
      return new Date(fieldValue) > new Date(conditionValue);
    
    case 'between':
      if (!Array.isArray(conditionValue) || conditionValue.length !== 2) return false;
      if (!fieldValue) return false;
      const date = new Date(fieldValue);
      const start = new Date(conditionValue[0]);
      const end = new Date(conditionValue[1]);
      return date >= start && date <= end;
    
    default:
      console.warn(`Unknown operator: ${condition.operator}`);
      return false;
  }
}

/**
 * Evaluate full query against tasks
 */
function evaluateConditions(task: TaskWithDetails, query: OPQLQuery): boolean {
  if (query.conditions.length === 0) return true;
  
  let result = evaluateCondition(task, query.conditions[0]);
  
  for (let i = 1; i < query.conditions.length; i++) {
    const operator = query.logicalOperators[i - 1];
    const conditionResult = evaluateCondition(task, query.conditions[i]);
    
    if (operator === 'AND') {
      result = result && conditionResult;
    } else if (operator === 'OR') {
      result = result || conditionResult;
    }
  }
  
  return result;
}

/**
 * Main evaluation function
 */
export function evaluateOPQL(tasks: TaskWithDetails[], query: string, currentUserId?: string): TaskWithDetails[] {
  try {
    // Update me() function with actual user ID
    if (currentUserId) {
      OPQL_FUNCTIONS['me()'] = () => currentUserId;
    }
    
    const parsed = parseOPQL(query);
    return tasks.filter(task => evaluateConditions(task, parsed));
  } catch (error) {
    console.error('OPQL evaluation error:', error);
    return tasks; // Return all tasks on error
  }
}

/**
 * Validate OPQL query syntax
 */
export function validateOPQL(query: string): { valid: boolean; error?: string } {
  try {
    parseOPQL(query);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid query'
    };
  }
}
