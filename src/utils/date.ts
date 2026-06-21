/**
 * Parse a match date string from the API.
 * The API returns ISO 8601 with offsets like "2026-07-19T14:00:00-05:00".
 * Dates without a timezone offset (no + or - after the time) are treated as UTC.
 */
export function parseMatchDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const trimmed = dateStr.trim();
  const hasOffset = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
  return hasOffset ? new Date(trimmed) : new Date(trimmed + 'Z');
}

/**
 * Check if a match has already started (based on current time).
 */
export function isMatchStarted(matchDate: string): boolean {
  return Date.now() >= parseMatchDate(matchDate).getTime();
}

/**
 * Format a match date for display in the user's local timezone.
 * Returns something like "19 jul. 14:00".
 */
export function formatMatchDateTime(dateStr: string): string {
  const d = parseMatchDate(dateStr);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get the local date string (YYYY-MM-DD) for a match, useful for grouping by day.
 */
export function getMatchLocalDateString(dateStr: string): string {
  const d = parseMatchDate(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get today's date string in YYYY-MM-DD format (local timezone).
 */
export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type MatchDayStatus = 'scheduled' | 'live' | 'finished';

/**
 * Matches shown in the "today" section: kickoff today, live now, or recently
 * started overnight games still in progress (e.g. 23:00 kickoff, now past midnight).
 */
export function isMatchInTodaySection(
  matchDate: string,
  status: MatchDayStatus,
): boolean {
  if (getMatchLocalDateString(matchDate) === getTodayDateString()) return true;
  if (status === 'live') return true;
  if (status !== 'finished' && isMatchStarted(matchDate)) {
    const hoursSinceKickoff =
      (Date.now() - parseMatchDate(matchDate).getTime()) / (1000 * 60 * 60);
    return hoursSinceKickoff <= 24;
  }
  return false;
}

/**
 * Sort comparison function for match dates (ascending).
 */
export function compareMatchDatesAsc(a: string, b: string): number {
  return parseMatchDate(a).getTime() - parseMatchDate(b).getTime();
}
