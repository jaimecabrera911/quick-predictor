import type { BSDEvent, BSDLeague, BSDSeason, BSDPaginatedResponse } from './types';
import type { IDataRepository } from '../db/repository';
import type { Tournament } from '../db/types';
import { resolveEventPlaceholders } from '../utils/match';

const BASE_URL = 'https://sports.bzzoiro.com/api/v2';
const TOKEN = 'ede3ce939a22c7a74694fbb126dc8991e8d277d0';

class BzzoiroError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'BzzoiroError';
  }
}

const REQUEST_TIMEOUT = 10_000;

async function request<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Token ${TOKEN}` },
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => null);
      throw new BzzoiroError(
        `BSD API error: ${res.status} ${res.statusText}`,
        res.status,
        body,
      );
    }

    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function getLeagues(): Promise<BSDPaginatedResponse<BSDLeague>> {
  return request('/leagues/');
}

export async function getSeasons(leagueId: number): Promise<BSDPaginatedResponse<BSDSeason>> {
  const data = await request<{ league_id: number; count: number; seasons: BSDSeason[] }>(
    `/leagues/${leagueId}/seasons/`
  );
  return {
    count: data.count,
    next: null,
    previous: null,
    results: data.seasons,
  };
}

const NATIONAL_TEAMS: Record<string, string> = {
  'Chelsea': 'Argentina',
  'Brentford': 'Francia',
  'Sunderland': 'Brasil',
  'Manchester City': 'España',
  'Manchester United': 'Alemania',
  'Fulham': 'Inglaterra',
  'Liverpool FC': 'Italia',
  'Bournemouth': 'Países Bajos',
  'Ipswich Town': 'Portugal',
  'Everton': 'Bélgica',
  'Nottingham Forest': 'Uruguay',
  'Newcastle United': 'Colombia',
  'Arsenal': 'México',
  'Crystal Palace': 'Estados Unidos',
  'Tottenham Hotspur': 'Croacia',
  'Leeds United': 'Marruecos',
  'Aston Villa': 'Japón',
  'Coventry City': 'Canadá',
  'Brighton & Hove Albion': 'Senegal',
  'Hull City': 'Ecuador',
};

const CHAMPIONS_LEAGUE_TEAMS: Record<string, string> = {
  'Chelsea': 'Real Madrid',
  'Brentford': 'Bayern Múnich',
  'Sunderland': 'Paris Saint-Germain',
  'Manchester City': 'Manchester City',
  'Manchester United': 'Inter de Milán',
  'Fulham': 'Borussia Dortmund',
  'Liverpool FC': 'Liverpool FC',
  'Bournemouth': 'Atlético de Madrid',
  'Ipswich Town': 'Bayer Leverkusen',
  'Everton': 'Juventus',
  'Nottingham Forest': 'Sporting CP',
  'Newcastle United': 'AC Milan',
  'Arsenal': 'Arsenal',
  'Crystal Palace': 'Benfica',
  'Tottenham Hotspur': 'Aston Villa',
  'Leeds United': 'PSV Eindhoven',
  'Aston Villa': 'Feyenoord',
  'Coventry City': 'Mónaco',
  'Brighton & Hove Albion': 'Celtic',
  'Hull City': 'Lille',
};

const LA_LIGA_TEAMS: Record<string, string> = {
  'Chelsea': 'Real Madrid',
  'Brentford': 'Barcelona',
  'Sunderland': 'Atlético de Madrid',
  'Manchester City': 'Real Sociedad',
  'Manchester United': 'Athletic Club',
  'Fulham': 'Real Betis',
  'Liverpool FC': 'Girona',
  'Bournemouth': 'Sevilla FC',
  'Ipswich Town': 'Valencia CF',
  'Everton': 'Villarreal',
  'Nottingham Forest': 'Celta de Vigo',
  'Newcastle United': 'Mallorca',
  'Arsenal': 'Osasuna',
  'Crystal Palace': 'Getafe',
  'Tottenham Hotspur': 'Rayo Vallecano',
  'Leeds United': 'Las Palmas',
  'Aston Villa': 'Espanyol',
  'Coventry City': 'Alavés',
  'Brighton & Hove Albion': 'Leganés',
  'Hull City': 'Valladolid',
};

const SERIE_A_TEAMS: Record<string, string> = {
  'Chelsea': 'Inter de Milán',
  'Brentford': 'Juventus',
  'Sunderland': 'AC Milan',
  'Manchester City': 'Atalanta',
  'Manchester United': 'AS Roma',
  'Fulham': 'Lazio',
  'Liverpool FC': 'Napoli',
  'Bournemouth': 'Fiorentina',
  'Ipswich Town': 'Bologna',
  'Everton': 'Torino',
  'Nottingham Forest': 'Genoa',
  'Newcastle United': 'Monza',
  'Arsenal': 'Empoli',
  'Crystal Palace': 'Lecce',
  'Tottenham Hotspur': 'Cagliari',
  'Leeds United': 'Verona',
  'Aston Villa': 'Udinese',
  'Coventry City': 'Parma',
  'Brighton & Hove Albion': 'Como',
  'Hull City': 'Venezia',
};

const BUNDESLIGA_TEAMS: Record<string, string> = {
  'Chelsea': 'Bayern Múnich',
  'Brentford': 'Bayer Leverkusen',
  'Sunderland': 'Borussia Dortmund',
  'Manchester City': 'RB Leipzig',
  'Manchester United': 'Eintracht Frankfurt',
  'Fulham': 'VfB Stuttgart',
  'Liverpool FC': 'Friburgo',
  'Bournemouth': 'Werder Bremen',
  'Ipswich Town': 'Hoffenheim',
  'Everton': 'Heidenheim',
  'Nottingham Forest': 'Borussia M\'gladbach',
  'Newcastle United': 'Wolfsburgo',
  'Arsenal': 'Maguncia 05',
  'Crystal Palace': 'Augsburgo',
  'Tottenham Hotspur': 'St. Pauli',
  'Leeds United': 'Holstein Kiel',
  'Aston Villa': 'Unión Berlín',
  'Coventry City': 'Bochum',
  'Brighton & Hove Albion': 'Bayern Múnich',
  'Hull City': 'Bayer Leverkusen',
};

const LIGUE_1_TEAMS: Record<string, string> = {
  'Chelsea': 'Paris Saint-Germain',
  'Brentford': 'Mónaco',
  'Sunderland': 'Lille',
  'Manchester City': 'Marsella',
  'Manchester United': 'Lyon',
  'Fulham': 'Lens',
  'Liverpool FC': 'Niza',
  'Bournemouth': 'Reims',
  'Ipswich Town': 'Rennes',
  'Everton': 'Estrasburgo',
  'Nottingham Forest': 'Brest',
  'Newcastle United': 'Toulouse',
  'Arsenal': 'Montpellier',
  'Crystal Palace': 'Auxerre',
  'Tottenham Hotspur': 'Saint-Étienne',
  'Leeds United': 'Angers',
  'Aston Villa': 'Le Havre',
  'Coventry City': 'Nantes',
  'Brighton & Hove Albion': 'Paris Saint-Germain',
  'Hull City': 'Mónaco',
};

const LIGA_MX_TEAMS: Record<string, string> = {
  'Chelsea': 'América',
  'Brentford': 'Cruz Azul',
  'Sunderland': 'Tigres UANL',
  'Manchester City': 'Monterrey',
  'Manchester United': 'Guadalajara',
  'Fulham': 'Pumas UNAM',
  'Liverpool FC': 'Toluca',
  'Bournemouth': 'Pachuca',
  'Ipswich Town': 'León',
  'Everton': 'Santos Laguna',
  'Nottingham Forest': 'Atlas',
  'Newcastle United': 'Tijuana',
  'Arsenal': 'Querétaro',
  'Crystal Palace': 'Necaxa',
  'Tottenham Hotspur': 'Mazatlán',
  'Leeds United': 'Puebla',
  'Aston Villa': 'Atlético San Luis',
  'Coventry City': 'FC Juárez',
  'Brighton & Hove Albion': 'Cruz Azul',
  'Hull City': 'América',
};

function mapTeamName(leagueId: number | string, originalName: string): string {
  const id = Number(leagueId);
  // World Cup or Qualifications
  if ([27, 30, 31, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69].includes(id)) {
    return NATIONAL_TEAMS[originalName] || originalName;
  }
  // Champions / Europa League
  if ([7, 8].includes(id)) {
    return CHAMPIONS_LEAGUE_TEAMS[originalName] || originalName;
  }
  // La Liga
  if ([3, 36, 38, 41].includes(id)) {
    return LA_LIGA_TEAMS[originalName] || originalName;
  }
  // Serie A
  if ([4, 34, 35, 42].includes(id)) {
    return SERIE_A_TEAMS[originalName] || originalName;
  }
  // Bundesliga
  if ([5, 43].includes(id)) {
    return BUNDESLIGA_TEAMS[originalName] || originalName;
  }
  // Ligue 1
  if ([6, 44].includes(id)) {
    return LIGUE_1_TEAMS[originalName] || originalName;
  }
  // Liga MX
  if ([19, 20].includes(id)) {
    return LIGA_MX_TEAMS[originalName] || originalName;
  }
  return originalName;
}

export async function getLeagueMatches(
  leagueId: number,
  seasonId?: number,
): Promise<BSDPaginatedResponse<BSDEvent>> {
  const params: Record<string, string | number | boolean> = { limit: 200 };
  params.league_id = leagueId;
  if (seasonId) {
    params.season_id = seasonId;
  }
  const response = await request<BSDPaginatedResponse<BSDEvent>>('/events/', params);

  if (response && response.results) {
    response.results = response.results.map((event) => {
      const homeMapped = mapTeamName(leagueId, event.home_team);
      const awayMapped = mapTeamName(leagueId, event.away_team);
      return {
        ...event,
        home_team: homeMapped,
        away_team: awayMapped,
      };
    });
  }

  return response;
}

export function getEvent(id: number): Promise<BSDEvent> {
  return request(`/events/${id}/`);
}

export function mapBSDStatus(status: string): 'scheduled' | 'live' | 'finished' {
  if (['notstarted', 'postponed'].includes(status)) return 'scheduled';
  if (
    [
      'inprogress',
      '1st_half',
      '2nd_half',
      'halftime',
      'extratime',
      'penalties',
    ].includes(status)
  )
    return 'live';
  if (['finished', 'aet'].includes(status)) return 'finished';
  return 'scheduled';
}

export function mapBSDStage(
  groupName: string | null,
  roundName: string,
): 'group' | 'round_of_16' | 'quarter' | 'semi' | 'final' {
  if (groupName) return 'group';
  const lower = roundName.toLowerCase();
  if (lower.includes('round of 16') || lower.includes('round 1')) return 'round_of_16';
  if (lower.includes('quarter')) return 'quarter';
  if (lower.includes('semi')) return 'semi';
  if (lower.includes('final')) return 'final';
  return 'group';
}

export async function syncTournamentMatches(
  repo: IDataRepository,
  t: Tournament,
  leaguesList?: BSDLeague[]
): Promise<void> {
  const leagues = leaguesList || (await getLeagues()).results;
  const league = leagues.find((l) => l.name === t.name);
  if (!league) {
    throw new Error(`No se encontró la liga en el API para "${t.name}"`);
  }

  let seasonId: number | undefined;
  try {
    const seasonData = await getSeasons(league.id);
    const matchSeason = seasonData.results.find((s) => s.name === t.season) || league.current_season;
    seasonId = matchSeason?.id;
  } catch {
    seasonId = league.current_season?.id;
  }

  if (!seasonId) {
    throw new Error(`No se encontró la temporada en el API para "${t.name}"`);
  }

  const events = await getLeagueMatches(league.id, seasonId);
  if (events.results.length === 0) {
    throw new Error(`No hay partidos disponibles para la temporada del torneo`);
  }
  const resolved = resolveEventPlaceholders(events.results);

  await repo.importMatches(
    t.id,
    resolved.map((e) => ({
      externalId: e.id.toString(),
      homeTeam: e.home_team,
      awayTeam: e.away_team,
      matchDate: e.event_date,
      stage: mapBSDStage(e.group_name, e.round_name),
      groupName: e.group_name ?? undefined,
      status: mapBSDStatus(e.status),
      homeScore: e.home_score,
      awayScore: e.away_score,
      currentMinute: e.current_minute,
    }))
  );
}
