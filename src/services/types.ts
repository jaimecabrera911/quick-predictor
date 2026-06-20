export interface BSDLeague {
  id: number;
  name: string;
  country: string;
  is_women: boolean;
  current_season?: BSDSeason;
}

export interface BSDSeason {
  id: number;
  name: string;
  year: number | null;
}

export interface BSDEvent {
  id: number;
  home_team: string;
  away_team: string;
  event_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  current_minute: number | null;
  group_name: string | null;
  round_name: string;
  round_number: number | null;
  league: { id: number; name: string };
  season: { id: number; name: string } | null;
}

export interface BSDPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
