/**
 * Timezone-aware datetime helpers. Pass user's preferred timezone (from
 * useUserPreferences) so dates render consistently across the app.
 */

export function formatDateTime(
  value: string | Date | null | undefined,
  opts: { timezone?: string; locale?: string; dateOnly?: boolean; timeOnly?: boolean } = {},
): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const { timezone, locale = 'en', dateOnly, timeOnly } = opts;

  if (dateOnly) {
    return d.toLocaleDateString(locale, { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  if (timeOnly) {
    return d.toLocaleTimeString(locale, { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString(locale, {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Common IANA timezones for the dropdown picker. */
export const COMMON_TIMEZONES = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain',
  'Asia/Baghdad', 'Asia/Amman', 'Asia/Beirut', 'Asia/Damascus',
  'Africa/Cairo', 'Africa/Khartoum', 'Africa/Casablanca', 'Africa/Tunis',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Istanbul',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Singapore',
  'Asia/Hong_Kong', 'Asia/Tokyo', 'Australia/Sydney', 'UTC',
];
