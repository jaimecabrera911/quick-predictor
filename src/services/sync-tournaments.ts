import type { IDataRepository } from '@/db/repository';
import type { Tournament } from '@/db/types';
import { getLeagues, syncTournamentMatches } from './bzzoiro';

async function getActiveTournamentsForUser(
  repo: IDataRepository,
  userId: string,
): Promise<Tournament[]> {
  const allQ = await repo.getQuinielas();
  const allP = [];
  for (const q of allQ) {
    const p = await repo.getParticipants(q.id);
    allP.push(...p);
  }
  const myParticipations = allP.filter((p) => p.userId === userId);
  const myQIds = new Set(myParticipations.map((p) => p.quinielaId));
  const myQuinielas = allQ.filter((q) => myQIds.has(q.id) || q.createdBy === userId);

  const uniqueActiveTournaments = new Map<string, Tournament>();
  for (const q of myQuinielas) {
    const t = await repo.getTournamentById(q.tournamentId);
    if (t && t.status === 'active') {
      uniqueActiveTournaments.set(t.id, t);
    }
  }

  return Array.from(uniqueActiveTournaments.values());
}

export async function syncActiveTournamentsForUser(
  repo: IDataRepository,
  userId: string,
): Promise<void> {
  const tournaments = await getActiveTournamentsForUser(repo, userId);
  if (tournaments.length === 0) return;

  const leaguesData = await getLeagues();
  await Promise.all(
    tournaments.map(async (t) => {
      try {
        await syncTournamentMatches(repo, t, leaguesData.results);
      } catch (e) {
        console.warn(`Failed to sync tournament ${t.name}:`, e);
      }
    }),
  );
}
