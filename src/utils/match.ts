import type { Match } from '@/db/types';
import type { BSDEvent } from '@/services/types';

/**
 * Resolves placeholder names like "W85" or "L85" (Winner or Loser of Match 85)
 * in a list of database Match objects.
 */
export function resolveMatchPlaceholders(matches: Match[]): Match[] {
  // Sort a copy of matches chronologically to map indices correctly
  const sorted = [...matches].sort((a, b) => {
    const da = new Date(a.matchDate).getTime();
    const db = new Date(b.matchDate).getTime();
    if (da !== db) return da - db;

    const extA = parseInt(a.externalId || '0', 10);
    const extB = parseInt(b.externalId || '0', 10);
    if (!isNaN(extA) && !isNaN(extB)) return extA - extB;

    return (a.externalId || '').localeCompare(b.externalId || '');
  });

  const getWinner = (m: Match): string | null => {
    if (m.status !== 'finished') return null;
    if (m.homeScore === null || m.awayScore === null) return null;
    if (m.homeScore > m.awayScore) return m.homeTeam;
    if (m.awayScore > m.homeScore) return m.awayTeam;
    return null;
  };

  const getLoser = (m: Match): string | null => {
    if (m.status !== 'finished') return null;
    if (m.homeScore === null || m.awayScore === null) return null;
    if (m.homeScore > m.awayScore) return m.awayTeam;
    if (m.awayScore > m.homeScore) return m.homeTeam;
    return null;
  };

  let resolvedMatches = matches.map((m) => ({ ...m }));

  // Up to 6 passes to resolve nested/cascading placeholders (e.g., Final depends on Semis)
  for (let pass = 0; pass < 6; pass++) {
    // Refresh sorted list based on current resolved states
    const currentSorted = [...resolvedMatches].sort((a, b) => {
      const da = new Date(a.matchDate).getTime();
      const db = new Date(b.matchDate).getTime();
      if (da !== db) return da - db;

      const extA = parseInt(a.externalId || '0', 10);
      const extB = parseInt(b.externalId || '0', 10);
      if (!isNaN(extA) && !isNaN(extB)) return extA - extB;

      return (a.externalId || '').localeCompare(b.externalId || '');
    });

    let changes = false;

    resolvedMatches = resolvedMatches.map((m) => {
      let homeTeam = m.homeTeam;
      let awayTeam = m.awayTeam;

      // Handle homeTeam placeholders
      const homeMatchW = homeTeam.match(/^W(\d+)$/i);
      const homeMatchL = homeTeam.match(/^L(\d+)$/i);
      if (homeMatchW) {
        const idx = parseInt(homeMatchW[1], 10) - 1;
        const targetMatch = currentSorted[idx];
        if (targetMatch) {
          const winnerName = getWinner(targetMatch);
          if (winnerName && !winnerName.match(/^[WL]\d+$/i)) {
            homeTeam = winnerName;
            changes = true;
          }
        }
      } else if (homeMatchL) {
        const idx = parseInt(homeMatchL[1], 10) - 1;
        const targetMatch = currentSorted[idx];
        if (targetMatch) {
          const loserName = getLoser(targetMatch);
          if (loserName && !loserName.match(/^[WL]\d+$/i)) {
            homeTeam = loserName;
            changes = true;
          }
        }
      }

      // Handle awayTeam placeholders
      const awayMatchW = awayTeam.match(/^W(\d+)$/i);
      const awayMatchL = awayTeam.match(/^L(\d+)$/i);
      if (awayMatchW) {
        const idx = parseInt(awayMatchW[1], 10) - 1;
        const targetMatch = currentSorted[idx];
        if (targetMatch) {
          const winnerName = getWinner(targetMatch);
          if (winnerName && !winnerName.match(/^[WL]\d+$/i)) {
            awayTeam = winnerName;
            changes = true;
          }
        }
      } else if (awayMatchL) {
        const idx = parseInt(awayMatchL[1], 10) - 1;
        const targetMatch = currentSorted[idx];
        if (targetMatch) {
          const loserName = getLoser(targetMatch);
          if (loserName && !loserName.match(/^[WL]\d+$/i)) {
            awayTeam = loserName;
            changes = true;
          }
        }
      }

      return {
        ...m,
        homeTeam,
        awayTeam,
      };
    });

    if (!changes) break;
  }

  return resolvedMatches;
}

/**
 * Resolves placeholder names like "W85" or "L85" (Winner or Loser of Match 85)
 * in a list of BSDEvent objects from the sports API.
 */
export function resolveEventPlaceholders(events: BSDEvent[]): BSDEvent[] {
  // Sort a copy chronologically
  const sorted = [...events].sort((a, b) => {
    const da = new Date(a.event_date).getTime();
    const db = new Date(b.event_date).getTime();
    if (da !== db) return da - db;
    return a.id - b.id;
  });

  const getWinner = (e: BSDEvent): string | null => {
    // check finished status or non-null scores
    const isFinished = e.status === 'finished' || e.status === 'aet' || e.home_score !== null;
    if (!isFinished) return null;
    if (e.home_score === null || e.away_score === null) return null;
    if (e.home_score > e.away_score) return e.home_team;
    if (e.away_score > e.home_score) return e.away_team;
    return null;
  };

  const getLoser = (e: BSDEvent): string | null => {
    const isFinished = e.status === 'finished' || e.status === 'aet' || e.home_score !== null;
    if (!isFinished) return null;
    if (e.home_score === null || e.away_score === null) return null;
    if (e.home_score > e.away_score) return e.away_team;
    if (e.away_score > e.home_score) return e.home_team;
    return null;
  };

  let resolvedEvents = events.map((e) => ({ ...e }));

  for (let pass = 0; pass < 6; pass++) {
    const currentSorted = [...resolvedEvents].sort((a, b) => {
      const da = new Date(a.event_date).getTime();
      const db = new Date(b.event_date).getTime();
      if (da !== db) return da - db;
      return a.id - b.id;
    });

    let changes = false;

    resolvedEvents = resolvedEvents.map((e) => {
      let home_team = e.home_team;
      let away_team = e.away_team;

      // Handle home_team placeholders
      const homeMatchW = home_team.match(/^W(\d+)$/i);
      const homeMatchL = home_team.match(/^L(\d+)$/i);
      if (homeMatchW) {
        const idx = parseInt(homeMatchW[1], 10) - 1;
        const targetEvent = currentSorted[idx];
        if (targetEvent) {
          const winnerName = getWinner(targetEvent);
          if (winnerName && !winnerName.match(/^[WL]\d+$/i)) {
            home_team = winnerName;
            changes = true;
          }
        }
      } else if (homeMatchL) {
        const idx = parseInt(homeMatchL[1], 10) - 1;
        const targetEvent = currentSorted[idx];
        if (targetEvent) {
          const loserName = getLoser(targetEvent);
          if (loserName && !loserName.match(/^[WL]\d+$/i)) {
            home_team = loserName;
            changes = true;
          }
        }
      }

      // Handle away_team placeholders
      const awayMatchW = away_team.match(/^W(\d+)$/i);
      const awayMatchL = away_team.match(/^L(\d+)$/i);
      if (awayMatchW) {
        const idx = parseInt(awayMatchW[1], 10) - 1;
        const targetEvent = currentSorted[idx];
        if (targetEvent) {
          const winnerName = getWinner(targetEvent);
          if (winnerName && !winnerName.match(/^[WL]\d+$/i)) {
            away_team = winnerName;
            changes = true;
          }
        }
      } else if (awayMatchL) {
        const idx = parseInt(awayMatchL[1], 10) - 1;
        const targetEvent = currentSorted[idx];
        if (targetEvent) {
          const loserName = getLoser(targetEvent);
          if (loserName && !loserName.match(/^[WL]\d+$/i)) {
            away_team = loserName;
            changes = true;
          }
        }
      }

      return {
        ...e,
        home_team,
        away_team,
      };
    });

    if (!changes) break;
  }

  return resolvedEvents;
}
