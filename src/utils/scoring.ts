import type { MatchStatus } from '@/db/types';

/** Match has a score we can use to compute prediction points (live or finished). */
export function matchHasScoreForScoring(
  status: MatchStatus,
  homeScore: number | null,
  awayScore: number | null,
): boolean {
  return (status === 'finished' || status === 'live') && homeScore !== null && awayScore !== null;
}
