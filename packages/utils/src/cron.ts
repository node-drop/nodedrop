/**
 * @nodedrop/utils - Cron and Schedule Utilities
 * 
 * Shared utilities for cron expression parsing, validation, and schedule conversion.
 * Works in both browser and Node.js environments.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Represents a parsed cron expression with individual field values
 */
export interface ParsedCronExpression {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

/**
 * Represents the next scheduled execution time
 */
export interface NextExecution {
  timestamp: Date;
  iso: string;
  relative: string;
  cronExpression: string;
}

/**
 * Result of cron expression validation
 */
export interface CronValidationResult {
  valid: boolean;
  errors: string[];
  parsed?: ParsedCronExpression;
}

/**
 * Schedule mode types supported by the schedule trigger
 */
export type ScheduleMode = 'simple' | 'datetime' | 'cron';

/**
 * Simple schedule interval options
 */
export type SimpleInterval = 
  | 'minute' | '2minutes' | '5minutes' | '10minutes' | '15minutes' | '30minutes'
  | 'hour' | '2hours' | '3hours' | '6hours' | '12hours'
  | 'day' | 'week' | 'month';

/**
 * Repeat interval options for datetime schedules
 */
export type RepeatInterval = 'hour' | 'day' | 'week' | 'month';

/**
 * Schedule settings input for conversion
 */
export interface ScheduleSettings {
  scheduleMode?: ScheduleMode;
  cronExpression?: string;
  // Simple mode settings
  interval?: SimpleInterval;
  timeOfDay?: string;
  dayOfWeek?: string;
  dayOfMonth?: number;
  weekdaysOnly?: boolean;
  // Datetime mode settings
  startDate?: string;
  repeat?: boolean;
  repeatInterval?: RepeatInterval;
}

/**
 * Converted schedule settings with cron expression
 */
export interface ConvertedScheduleSettings extends ScheduleSettings {
  cronExpression: string;
}

// ============================================================================
// Cron Expression Validation
// ============================================================================

/**
 * Valid ranges for each cron field
 */
const CRON_FIELD_RANGES = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 6 },
} as const;

/**
 * Validates a single cron field part
 */
function validateCronFieldPart(
  part: string,
  fieldName: keyof typeof CRON_FIELD_RANGES
): string | null {
  const { min, max } = CRON_FIELD_RANGES[fieldName];

  // Wildcard is always valid
  if (part === '*') return null;

  // Step values (e.g., */5, 1-10/2)
  if (part.includes('/')) {
    const [range, step] = part.split('/');
    const stepNum = parseInt(step, 10);
    
    if (isNaN(stepNum) || stepNum < 1) {
      return `Invalid step value "${step}" in ${fieldName}`;
    }
    
    // Validate the range part
    if (range !== '*') {
      const rangeError = validateCronFieldPart(range, fieldName);
      if (rangeError) return rangeError;
    }
    
    return null;
  }

  // Range (e.g., 1-5)
  if (part.includes('-')) {
    const [start, end] = part.split('-').map(Number);
    
    if (isNaN(start) || isNaN(end)) {
      return `Invalid range "${part}" in ${fieldName}`;
    }
    
    if (start < min || start > max || end < min || end > max) {
      return `Range "${part}" out of bounds (${min}-${max}) in ${fieldName}`;
    }
    
    if (start > end) {
      return `Invalid range "${part}" - start greater than end in ${fieldName}`;
    }
    
    return null;
  }

  // List (e.g., 1,3,5)
  if (part.includes(',')) {
    const values = part.split(',');
    for (const value of values) {
      const error = validateCronFieldPart(value.trim(), fieldName);
      if (error) return error;
    }
    return null;
  }

  // Single value
  const value = parseInt(part, 10);
  if (isNaN(value)) {
    return `Invalid value "${part}" in ${fieldName}`;
  }
  
  if (value < min || value > max) {
    return `Value ${value} out of bounds (${min}-${max}) in ${fieldName}`;
  }

  return null;
}

/**
 * Validates a cron expression and returns detailed validation result
 * 
 * @param cronExpression - The cron expression to validate (5 parts: minute hour day month weekday)
 * @returns Validation result with errors and parsed expression if valid
 */
export function validateCronExpression(cronExpression: string): CronValidationResult {
  const errors: string[] = [];
  
  if (!cronExpression || typeof cronExpression !== 'string') {
    return { valid: false, errors: ['Cron expression is required'] };
  }

  const trimmed = cronExpression.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length !== 5) {
    return { 
      valid: false, 
      errors: [`Cron expression must have exactly 5 parts (got ${parts.length})`] 
    };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const fieldNames: (keyof typeof CRON_FIELD_RANGES)[] = [
    'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'
  ];

  parts.forEach((part, index) => {
    const error = validateCronFieldPart(part, fieldNames[index]);
    if (error) errors.push(error);
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    parsed: { minute, hour, dayOfMonth, month, dayOfWeek },
  };
}

/**
 * Simple validation check - returns true if cron expression is valid
 */
export function isValidCronExpression(cronExpression: string): boolean {
  return validateCronExpression(cronExpression).valid;
}

// ============================================================================
// Cron Expression Matching
// ============================================================================

/**
 * Check if a value matches a cron field part
 */
function matchesCronPart(
  value: number,
  part: string,
  min: number,
  max: number
): boolean {
  // Wildcard
  if (part === '*') return true;

  // Step values (e.g., */5)
  if (part.includes('/')) {
    const [range, step] = part.split('/');
    const stepNum = parseInt(step, 10);
    
    if (range === '*') {
      return value % stepNum === 0;
    }
    
    // Range with step (e.g., 0-30/5)
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      if (value < start || value > end) return false;
      return (value - start) % stepNum === 0;
    }
    
    return false;
  }

  // Range (e.g., 1-5)
  if (part.includes('-')) {
    const [start, end] = part.split('-').map(Number);
    return value >= start && value <= end;
  }

  // List (e.g., 1,3,5)
  if (part.includes(',')) {
    const values = part.split(',').map(Number);
    return values.includes(value);
  }

  // Exact match
  return value === parseInt(part, 10);
}

/**
 * Check if a date matches a cron expression
 */
export function matchesCronExpression(date: Date, cronExpression: string): boolean {
  const validation = validateCronExpression(cronExpression);
  if (!validation.valid || !validation.parsed) return false;

  const { minute, hour, dayOfMonth, month, dayOfWeek } = validation.parsed;

  const dateMinute = date.getMinutes();
  const dateHour = date.getHours();
  const dateDay = date.getDate();
  const dateMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
  const dateWeekday = date.getDay();

  return (
    matchesCronPart(dateMinute, minute, 0, 59) &&
    matchesCronPart(dateHour, hour, 0, 23) &&
    matchesCronPart(dateDay, dayOfMonth, 1, 31) &&
    matchesCronPart(dateMonth, month, 1, 12) &&
    matchesCronPart(dateWeekday, dayOfWeek, 0, 6)
  );
}

// ============================================================================
// Next Execution Time Calculation
// ============================================================================

/**
 * Get relative time string (e.g., "in 5 minutes", "in 2 hours")
 */
function getRelativeTime(date: Date, from: Date = new Date()): string {
  const diff = date.getTime() - from.getTime();

  if (diff < 0) return 'now';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `in ${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `in ${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Calculate the next N execution times for a cron expression
 * 
 * @param cronExpression - Valid cron expression
 * @param count - Number of execution times to calculate (default: 10)
 * @param fromDate - Starting date for calculation (default: now)
 * @returns Array of next execution times
 */
export function getNextExecutionTimes(
  cronExpression: string,
  count: number = 10,
  fromDate: Date = new Date()
): NextExecution[] {
  const validation = validateCronExpression(cronExpression);
  if (!validation.valid) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  const executions: NextExecution[] = [];
  let currentTime = new Date(fromDate);

  // Maximum iterations to prevent infinite loops
  const maxIterations = count * 1000;

  for (let i = 0; i < maxIterations && executions.length < count; i++) {
    currentTime = new Date(currentTime.getTime() + 60000); // Add 1 minute

    if (matchesCronExpression(currentTime, cronExpression)) {
      executions.push({
        timestamp: new Date(currentTime),
        iso: currentTime.toISOString(),
        relative: getRelativeTime(currentTime, fromDate),
        cronExpression,
      });
    }
  }

  return executions;
}

// ============================================================================
// Cron Expression Description
// ============================================================================

/**
 * Get a human-readable description of a cron expression
 */
export function describeCronExpression(cronExpression: string): string {
  const validation = validateCronExpression(cronExpression);
  if (!validation.valid || !validation.parsed) return cronExpression;

  const { minute, hour, dayOfMonth, month, dayOfWeek } = validation.parsed;

  // Common patterns - exact matches
  const commonPatterns: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/10 * * * *': 'Every 10 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Every hour',
    '0 */2 * * *': 'Every 2 hours',
    '0 */3 * * *': 'Every 3 hours',
    '0 */6 * * *': 'Every 6 hours',
    '0 */12 * * *': 'Every 12 hours',
    '0 0 * * *': 'Daily at midnight',
    '0 9 * * *': 'Daily at 9:00 AM',
    '0 0 * * 0': 'Weekly on Sunday at midnight',
    '0 0 * * 1': 'Weekly on Monday at midnight',
    '0 0 1 * *': 'Monthly on the 1st at midnight',
    '0 9 * * 1-5': 'Weekdays at 9:00 AM',
  };

  const normalized = cronExpression.trim();
  if (commonPatterns[normalized]) {
    return commonPatterns[normalized];
  }

  // Build description dynamically
  const parts: string[] = [];

  // Minute description
  if (minute === '*') {
    parts.push('Every minute');
  } else if (minute.startsWith('*/')) {
    parts.push(`Every ${minute.slice(2)} minutes`);
  } else {
    parts.push(`At minute ${minute}`);
  }

  // Hour description
  if (hour !== '*') {
    if (hour.startsWith('*/')) {
      parts.push(`every ${hour.slice(2)} hours`);
    } else {
      const hourNum = parseInt(hour, 10);
      if (!isNaN(hourNum)) {
        const period = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
        parts.push(`at ${displayHour}:00 ${period}`);
      } else {
        parts.push(`at hour ${hour}`);
      }
    }
  }

  // Day of month description
  if (dayOfMonth !== '*') {
    parts.push(`on day ${dayOfMonth}`);
  }

  // Month description
  if (month !== '*') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNum = parseInt(month, 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      parts.push(`in ${months[monthNum - 1]}`);
    } else {
      parts.push(`in month ${month}`);
    }
  }

  // Day of week description
  if (dayOfWeek !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (dayOfWeek.includes('-')) {
      const [start, end] = dayOfWeek.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start >= 0 && end <= 6) {
        parts.push(`${days[start]}-${days[end]}`);
      } else {
        parts.push(`on weekday ${dayOfWeek}`);
      }
    } else {
      const dayNum = parseInt(dayOfWeek, 10);
      if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
        parts.push(`on ${days[dayNum]}`);
      } else {
        parts.push(`on weekday ${dayOfWeek}`);
      }
    }
  }

  return parts.join(', ');
}

// ============================================================================
// Schedule Conversion Utilities
// ============================================================================

/**
 * Convert simple schedule settings to cron expression
 * 
 * @param interval - The schedule interval (minute, hour, day, week, month, etc.)
 * @param timeOfDay - Time of day in HH:MM format (for day/week/month intervals)
 * @param dayOfWeek - Day of week (0-6, for week interval)
 * @param dayOfMonth - Day of month (1-31, for month interval)
 * @param weekdaysOnly - If true, only run on weekdays (for day interval)
 * @returns Cron expression string
 */
export function convertSimpleToCron(
  interval: SimpleInterval | string,
  timeOfDay?: string,
  dayOfWeek?: string,
  dayOfMonth?: number,
  weekdaysOnly?: boolean
): string {
  const [hour, minute] = timeOfDay ? timeOfDay.split(':') : ['0', '0'];

  switch (interval) {
    case 'minute': return '* * * * *';
    case '2minutes': return '*/2 * * * *';
    case '5minutes': return '*/5 * * * *';
    case '10minutes': return '*/10 * * * *';
    case '15minutes': return '*/15 * * * *';
    case '30minutes': return '*/30 * * * *';
    case 'hour': return '0 * * * *';
    case '2hours': return '0 */2 * * *';
    case '3hours': return '0 */3 * * *';
    case '6hours': return '0 */6 * * *';
    case '12hours': return '0 */12 * * *';
    case 'day':
      // If weekdays only, run Monday-Friday (1-5)
      return weekdaysOnly
        ? `${minute} ${hour} * * 1-5`
        : `${minute} ${hour} * * *`;
    case 'week': return `${minute} ${hour} * * ${dayOfWeek || '1'}`;
    case 'month': return `${minute} ${hour} ${dayOfMonth || 1} * *`;
    default: return '0 0 * * *';
  }
}

/**
 * Convert datetime schedule settings to cron expression
 * 
 * @param startDate - ISO date string for the start date/time
 * @param repeat - Whether to repeat the schedule
 * @param repeatInterval - Interval for repeating (hour, day, week, month)
 * @returns Cron expression string
 */
export function convertDateTimeToCron(
  startDate: string,
  repeat: boolean,
  repeatInterval?: RepeatInterval | string
): string {
  if (!startDate) return '0 0 * * *';

  const date = new Date(startDate);
  
  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return '0 0 * * *';
  }

  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  if (!repeat) {
    // One-time execution at specific date/time
    return `${minute} ${hour} ${day} ${month} *`;
  }

  switch (repeatInterval) {
    case 'hour': return `${minute} * * * *`;
    case 'day': return `${minute} ${hour} * * *`;
    case 'week': return `${minute} ${hour} * * ${dayOfWeek}`;
    case 'month': return `${minute} ${hour} ${day} * *`;
    default: return `${minute} ${hour} * * *`;
  }
}

/**
 * Convert schedule trigger settings to proper cron expression
 * Handles simple, datetime, and cron schedule modes
 * 
 * @param settings - Schedule settings object
 * @returns Settings object with cronExpression populated
 */
export function convertScheduleSettings<T extends ScheduleSettings>(settings: T): T & { cronExpression: string } {
  if (!settings.scheduleMode) {
    return {
      ...settings,
      cronExpression: settings.cronExpression || '0 0 * * *',
    };
  }

  const scheduleMode = settings.scheduleMode;

  if (scheduleMode === 'simple') {
    const convertedCron = convertSimpleToCron(
      settings.interval || 'hour',
      settings.timeOfDay,
      settings.dayOfWeek,
      settings.dayOfMonth,
      settings.weekdaysOnly
    );
    return {
      ...settings,
      cronExpression: convertedCron,
    };
  }
  
  if (scheduleMode === 'datetime') {
    const convertedCron = convertDateTimeToCron(
      settings.startDate || '',
      settings.repeat || false,
      settings.repeatInterval
    );
    return {
      ...settings,
      cronExpression: convertedCron,
    };
  }

  // For 'cron' mode, return as-is with existing cronExpression or default
  return {
    ...settings,
    cronExpression: settings.cronExpression || '0 0 * * *',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a cron expression into its component parts
 * 
 * @param cronExpression - The cron expression to parse
 * @returns Parsed cron expression or null if invalid
 */
export function parseCronExpression(cronExpression: string): ParsedCronExpression | null {
  const validation = validateCronExpression(cronExpression);
  return validation.parsed || null;
}

/**
 * Create a cron expression from individual parts
 * 
 * @param minute - Minute field (0-59, *, or pattern)
 * @param hour - Hour field (0-23, *, or pattern)
 * @param dayOfMonth - Day of month field (1-31, *, or pattern)
 * @param month - Month field (1-12, *, or pattern)
 * @param dayOfWeek - Day of week field (0-6, *, or pattern)
 * @returns Cron expression string
 */
export function createCronExpression(
  minute: string | number = '*',
  hour: string | number = '*',
  dayOfMonth: string | number = '*',
  month: string | number = '*',
  dayOfWeek: string | number = '*'
): string {
  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}
