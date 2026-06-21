export type UserRole = 'super_admin' | 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  logoUrl: string | null;
  season: string;
  status: 'upcoming' | 'active' | 'finished';
  accent: string;
  createdBy: string;
  createdAt: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished';
export type MatchStage = 'group' | 'round_of_16' | 'quarter' | 'semi' | 'final';

export interface Match {
  id: string;
  tournamentId: string;
  externalId: string | null;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  stage: MatchStage;
  groupName: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  currentMinute?: number | null;
  createdAt: string;
}

export interface ScoringRules {
  pointsExactScore: number;
  pointsWinner: number;
  pointsGoal: number;
  pointsGoalDiff: number;
}

export type QuinielaAccess = 'public' | 'code';

export interface Quiniela {
  id: string;
  tournamentId: string;
  name: string;
  description: string;
  deadline: string | null;
  accessType: QuinielaAccess;
  inviteCode: string | null;
  scoringRules: ScoringRules;
  prize: number | null;
  entryFee: number | null;
  createdBy: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  quinielaId: string;
  userId: string;
  totalPoints: number;
  paid: boolean;
  joinedAt: string;
  user?: User;
}

export interface Prediction {
  id: string;
  participantId: string;
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsEarned: number;
  updatedAt: string;
}

export interface StandingEntry {
  userId: string;
  displayName: string;
  totalPoints: number;
  position: number;
}

export interface CreateTournamentDTO {
  name: string;
  logoUrl?: string;
  season: string;
  accent?: string;
  createdBy?: string;
}

export interface CreateQuinielaDTO {
  tournamentId: string;
  name: string;
  description?: string;
  deadline?: string | null;
  accessType: QuinielaAccess;
  scoringRules: ScoringRules;
  prize?: number | null;
  entryFee?: number | null;
  createdBy?: string;
}

export interface MatchInput {
  externalId?: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  stage: MatchStage;
  groupName?: string;
  status?: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  currentMinute?: number | null;
}
