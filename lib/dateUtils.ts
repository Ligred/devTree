/**
 * dateUtils.ts — locale-aware date formatting utilities.
 *
 * Use these helpers throughout the app instead of ad-hoc `toLocaleDateString`
 * calls so that date presentation is consistent and easy to change globally.
 *
 * All functions accept either a `Date` object or an ISO/YYYY-MM-DD string.
 * YYYY-MM-DD strings are parsed as **local** midnight (not UTC) to avoid
 * off-by-one-day bugs in timezones west of UTC.
 */

/**
 * Parse a `YYYY-MM-DD` string as local midnight.
 * `new Date("2025-01-15")` is UTC midnight → local Jan 14 in UTC-5 zones.
 * This helper avoids that pitfall.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Short locale date — suitable for chart axis labels.
 * Examples: "Feb 15", "15 feb.", depending on locale.
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Medium locale date — suitable for cards and tooltips where the year matters.
 * Examples: "Feb 15, 2025", "15 févr. 2025".
 */
export function formatDateMedium(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Long locale date — suitable for detailed tooltips and labels.
 * Examples: "February 15, 2025", "15 February 2025".
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
