/**
 * DateTime Helper
 * 
 * Simple DateTime helper compatible with Luxon-like API.
 * Provides basic date/time functionality for expressions.
 */

interface DateTimeResult {
  toISO: () => string;
  toISODate: () => string;
  toFormat?: (format: string) => string;
}

interface Duration {
  days?: number;
  hours?: number;
  minutes?: number;
}

function formatDate(d: Date, format: string): string {
  return format
    .replace('yyyy', d.getFullYear().toString())
    .replace('MM', (d.getMonth() + 1).toString().padStart(2, '0'))
    .replace('dd', d.getDate().toString().padStart(2, '0'))
    .replace('HH', d.getHours().toString().padStart(2, '0'))
    .replace('mm', d.getMinutes().toString().padStart(2, '0'))
    .replace('ss', d.getSeconds().toString().padStart(2, '0'));
}

function applyDuration(d: Date, duration: Duration, subtract = false): Date {
  const result = new Date(d);
  const multiplier = subtract ? -1 : 1;
  if (duration.days) result.setDate(result.getDate() + duration.days * multiplier);
  if (duration.hours) result.setHours(result.getHours() + duration.hours * multiplier);
  if (duration.minutes) result.setMinutes(result.getMinutes() + duration.minutes * multiplier);
  return result;
}

export const DateTime = {
  now: (): DateTimeResult & {
    plus: (duration: Duration) => DateTimeResult;
    minus: (duration: Duration) => DateTimeResult;
    toFormat: (format: string) => string;
  } => {
    const d = new Date();
    return {
      toISO: () => d.toISOString(),
      toISODate: () => d.toISOString().split('T')[0],
      toFormat: (format: string) => formatDate(d, format),
      plus: (duration: Duration) => {
        const newDate = applyDuration(d, duration);
        return {
          toISO: () => newDate.toISOString(),
          toISODate: () => newDate.toISOString().split('T')[0],
        };
      },
      minus: (duration: Duration) => {
        const newDate = applyDuration(d, duration, true);
        return {
          toISO: () => newDate.toISOString(),
          toISODate: () => newDate.toISOString().split('T')[0],
        };
      },
    };
  },

  fromISO: (isoString: string): DateTimeResult & { toFormat: (format: string) => string } => {
    const d = new Date(isoString);
    return {
      toISO: () => d.toISOString(),
      toISODate: () => d.toISOString().split('T')[0],
      toFormat: (format: string) => formatDate(d, format),
    };
  },
};
