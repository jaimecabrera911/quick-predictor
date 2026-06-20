import type {
  User,
  Tournament,
  Match,
  Quiniela,
  Participant,
  Prediction,
  StandingEntry,
  CreateTournamentDTO,
  CreateQuinielaDTO,
  MatchInput,
  ScoringRules,
} from './types';

export interface IDataRepository {
  init(): Promise<void>;

  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string, displayName: string): Promise<User>;
  signOut(): Promise<void>;
  getSession(): Promise<User | null>;

  getTournaments(): Promise<Tournament[]>;
  getTournamentById(id: string): Promise<Tournament | null>;
  getMatchesByTournament(tournamentId: string): Promise<Match[]>;

  getQuinielas(): Promise<Quiniela[]>;
  getQuinielaById(id: string): Promise<Quiniela | null>;
  createQuiniela(data: CreateQuinielaDTO): Promise<Quiniela>;
  updateQuiniela(
    id: string,
    name: string,
    description: string,
    deadline: string | null,
    scoringRules: ScoringRules
  ): Promise<Quiniela>;
  deleteQuiniela(id: string): Promise<void>;
  joinQuiniela(code: string, userId: string): Promise<Quiniela | null>;
  leaveQuiniela(quinielaId: string, userId: string): Promise<void>;

  getParticipants(quinielaId: string): Promise<Participant[]>;
  getStandings(quinielaId: string): Promise<StandingEntry[]>;

  getPredictions(quinielaId: string, participantId: string): Promise<Prediction[]>;
  savePrediction(
    participantId: string,
    matchId: string,
    homeScore: number,
    awayScore: number
  ): Promise<void>;

  createTournament(data: CreateTournamentDTO): Promise<Tournament>;
  importMatches(tournamentId: string, matches: MatchInput[]): Promise<void>;
  updateTournamentStatus(id: string, status: 'active' | 'finished'): Promise<Tournament>;
  updateMatchScore(matchId: string, homeScore: number, awayScore: number): Promise<void>;
  resetDatabase(): Promise<void>;

  calculatePoints(
    rules: ScoringRules,
    predictedHome: number,
    predictedAway: number,
    actualHome: number,
    actualAway: number
  ): number;
}
