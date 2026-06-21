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
import type { IDataRepository } from './repository';

const STORAGE_KEY = 'quinielapp_data';
const SESSION_KEY = 'quinielapp_session';

function loadSnapshot(): {
  users: User[];
  tournaments: Tournament[];
  matches: Match[];
  quinielas: Quiniela[];
  participants: Participant[];
  predictions: Prediction[];
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return null;
}

function saveSnapshot(data: {
  users: User[];
  tournaments: Tournament[];
  matches: Match[];
  quinielas: Quiniela[];
  participants: Participant[];
  predictions: Prediction[];
}): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { }
}

function loadSessionUserId(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

function saveSessionUserId(id: string | null): void {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch { }
}

export class WebRepository implements IDataRepository {
  private ready = false;

  async init(): Promise<void> {
    const snap = loadSnapshot();
    if (snap) {
      this.users = snap.users;
      this.tournaments = snap.tournaments;
      this.matches = snap.matches;
      this.quinielas = snap.quinielas;
      this.participants = snap.participants;
      this.predictions = snap.predictions;
    }

    if (!this.users.some((u) => u.email === 'demo@quinielapp.com')) {
      this.users.push({
        id: 'demo-user-1',
        email: 'demo@quinielapp.com',
        displayName: 'Jugador Demo',
        avatarUrl: null,
        role: 'user',
        createdAt: new Date().toISOString(),
      });
    }
    if (!this.users.some((u) => u.email === 'admin@quinielapp.com')) {
      this.users.push({
        id: 'admin-user-1',
        email: 'admin@quinielapp.com',
        displayName: 'Admin Demo',
        avatarUrl: null,
        role: 'super_admin',
        createdAt: new Date().toISOString(),
      });
    }

    this.persist();
    this.ready = true;
  }

  private requireReady(): void {
    if (!this.ready) throw new Error('Database not initialized');
  }

  private genId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private persist(): void {
    saveSnapshot({
      users: this.users,
      tournaments: this.tournaments,
      matches: this.matches,
      quinielas: this.quinielas,
      participants: this.participants,
      predictions: this.predictions,
    });
  }

  private users: User[] = [];
  private tournaments: Tournament[] = [];
  private matches: Match[] = [];
  private quinielas: Quiniela[] = [];
  private participants: Participant[] = [];
  private predictions: Prediction[] = [];

  async signIn(email: string, _password: string): Promise<User> {
    this.requireReady();
    const user = this.users.find((u) => u.email === email);
    if (!user) throw new Error('User not found');
    saveSessionUserId(user.id);
    return user;
  }

  async signUp(email: string, _password: string, displayName: string): Promise<User> {
    this.requireReady();
    const user: User = {
      id: this.genId(),
      email,
      displayName,
      avatarUrl: null,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    this.persist();
    return user;
  }

  async signOut(): Promise<void> {
    saveSessionUserId(null);
  }

  async getSession(): Promise<User | null> {
    this.requireReady();
    const id = loadSessionUserId();
    if (!id) return null;
    return this.users.find((u) => u.id === id) ?? null;
  }

  async getTournaments(): Promise<Tournament[]> {
    return this.tournaments;
  }

  async getTournamentById(id: string): Promise<Tournament | null> {
    return this.tournaments.find((t) => t.id === id) ?? null;
  }

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    return this.matches.filter((m) => m.tournamentId === tournamentId);
  }

  async getQuinielas(): Promise<Quiniela[]> {
    return this.quinielas;
  }

  async getQuinielaById(id: string): Promise<Quiniela | null> {
    return this.quinielas.find((q) => q.id === id) ?? null;
  }

  async createQuiniela(data: CreateQuinielaDTO): Promise<Quiniela> {
    const q: Quiniela = {
      id: this.genId(),
      tournamentId: data.tournamentId,
      name: data.name,
      description: data.description ?? '',
      deadline: data.deadline ?? null,
      accessType: data.accessType,
      inviteCode: data.accessType === 'code' ? this.genId().slice(0, 8).toUpperCase() : null,
      scoringRules: data.scoringRules,
      prize: data.prize ?? null,
      entryFee: data.entryFee ?? null,
      createdBy: data.createdBy ?? 'system',
      createdAt: new Date().toISOString(),
    };
    this.quinielas.push(q);
    
    if (data.createdBy) {
      this.participants.push({
        id: this.genId(),
        quinielaId: q.id,
        userId: data.createdBy,
        totalPoints: 0,
        paid: false,
        joinedAt: new Date().toISOString(),
      });
    }

    this.persist();
    return q;
  }

  async updateQuiniela(
    id: string,
    name: string,
    description: string,
    deadline: string | null,
    scoringRules: ScoringRules,
    prize: number | null,
    entryFee: number | null
  ): Promise<Quiniela> {
    const idx = this.quinielas.findIndex((q) => q.id === id);
    if (idx === -1) throw new Error('Quiniela no encontrada');
    this.quinielas[idx] = {
      ...this.quinielas[idx],
      name,
      description,
      deadline,
      scoringRules,
      prize,
      entryFee,
    };
    this.persist();
    return this.quinielas[idx];
  }

  async deleteQuiniela(id: string): Promise<void> {
    // Get participant IDs
    const pIds = new Set(
      this.participants.filter((p) => p.quinielaId === id).map((p) => p.id)
    );
    // Delete predictions
    this.predictions = this.predictions.filter((p) => !pIds.has(p.participantId));
    // Delete participants
    this.participants = this.participants.filter((p) => p.quinielaId !== id);
    // Delete quiniela
    this.quinielas = this.quinielas.filter((q) => q.id !== id);
    this.persist();
  }

  async joinQuiniela(code: string, userId: string): Promise<Quiniela | null> {
    const q = this.quinielas.find((x) => x.inviteCode === code);
    if (!q) return null;
    const exists = this.participants.some((p) => p.quinielaId === q.id && p.userId === userId);
    if (!exists) {
      this.participants.push({
        id: this.genId(),
        quinielaId: q.id,
        userId,
        totalPoints: 0,
        paid: false,
        joinedAt: new Date().toISOString(),
      });
      this.persist();
    }
    return q;
  }

  async leaveQuiniela(quinielaId: string, userId: string): Promise<void> {
    const participant = this.participants.find(
      (p) => p.quinielaId === quinielaId && p.userId === userId
    );
    if (participant) {
      this.predictions = this.predictions.filter((p) => p.participantId !== participant.id);
      this.participants = this.participants.filter((p) => p.id !== participant.id);
      this.persist();
    }
  }

  async setParticipantPaid(participantId: string, paid: boolean): Promise<void> {
    const p = this.participants.find((x) => x.id === participantId);
    if (p) {
      p.paid = paid;
      this.persist();
    }
  }

  async getParticipants(quinielaId: string): Promise<Participant[]> {
    return this.participants
      .filter((p) => p.quinielaId === quinielaId)
      .map((p) => ({
        ...p,
        user: this.users.find((u) => u.id === p.userId),
      }));
  }

  async getStandings(quinielaId: string): Promise<StandingEntry[]> {
    return this.participants
      .filter((p) => p.quinielaId === quinielaId)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((p, i) => ({
        userId: p.userId,
        displayName: this.users.find((u) => u.id === p.userId)?.displayName ?? 'Unknown',
        totalPoints: p.totalPoints,
        position: i + 1,
      }));
  }

  async getPredictions(quinielaId: string, participantId: string): Promise<Prediction[]> {
    const p = this.participants.find((x) => x.id === participantId);
    if (!p || p.quinielaId !== quinielaId) return [];
    return this.predictions.filter((pr) => pr.participantId === participantId);
  }

  async savePrediction(
    participantId: string,
    matchId: string,
    homeScore: number,
    awayScore: number
  ): Promise<void> {
    const existing = this.predictions.find(
      (p) => p.participantId === participantId && p.matchId === matchId
    );
    if (existing) {
      existing.predictedHomeScore = homeScore;
      existing.predictedAwayScore = awayScore;
      existing.updatedAt = new Date().toISOString();
    } else {
      this.predictions.push({
        id: this.genId(),
        participantId,
        matchId,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
        pointsEarned: 0,
        updatedAt: new Date().toISOString(),
      });
    }
    this.persist();
  }

  async createTournament(data: CreateTournamentDTO): Promise<Tournament> {
    const t: Tournament = {
      id: this.genId(),
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      season: data.season,
      status: 'upcoming',
      accent: data.accent ?? 'green',
      createdBy: data.createdBy ?? 'system',
      createdAt: new Date().toISOString(),
    };
    this.tournaments.push(t);
    this.persist();
    return t;
  }

  async importMatches(tournamentId: string, matches: MatchInput[]): Promise<void> {
    const existingMatches = this.matches.filter((m) => m.tournamentId === tournamentId);
    const otherMatches = this.matches.filter((m) => m.tournamentId !== tournamentId);
    
    const newMatches: Match[] = [];
    for (const m of matches) {
      const matchExtId = m.externalId ?? null;
      let prev = matchExtId ? existingMatches.find((x) => x.externalId === matchExtId) : null;
      if (!prev) {
        prev = existingMatches.find((x) => x.homeTeam === m.homeTeam && x.awayTeam === m.awayTeam) ?? null;
      }
      
      newMatches.push({
        id: prev ? prev.id : this.genId(),
        tournamentId,
        externalId: matchExtId,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        matchDate: m.matchDate,
        stage: m.stage,
        groupName: m.groupName ?? null,
        status: m.status !== undefined ? m.status : (prev ? prev.status : 'scheduled'),
        homeScore: m.homeScore !== undefined ? m.homeScore : (prev ? prev.homeScore : null),
        awayScore: m.awayScore !== undefined ? m.awayScore : (prev ? prev.awayScore : null),
        currentMinute: m.currentMinute !== undefined ? m.currentMinute : (prev ? prev.currentMinute : null),
        createdAt: prev ? prev.createdAt : new Date().toISOString(),
      });
    }
    this.matches = [...otherMatches, ...newMatches];
    this.recalculateScoresForTournament(tournamentId);
    this.persist();
  }

  async resetDatabase(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
    this.users = [];
    this.tournaments = [];
    this.matches = [];
    this.quinielas = [];
    this.participants = [];
    this.predictions = [];
    this.ready = false;
    await this.init();
  }

  async updateTournamentStatus(id: string, status: 'active' | 'finished'): Promise<Tournament> {
    const tournament = this.tournaments.find((t) => t.id === id);
    if (!tournament) throw new Error('Tournament not found');
    tournament.status = status;
    this.persist();
    return tournament;
  }

  async updateMatchScore(matchId: string, homeScore: number, awayScore: number): Promise<void> {
    const match = this.matches.find((m) => m.id === matchId);
    if (match) {
      match.homeScore = homeScore;
      match.awayScore = awayScore;
      match.status = 'finished';
      this.recalculateScoresForTournament(match.tournamentId);
      this.persist();
    }
  }

  private recalculateScoresForTournament(tournamentId: string): void {
    const tournamentMatches = this.matches.filter((m) => m.tournamentId === tournamentId);
    const matchesMap = new Map(tournamentMatches.map((m) => [m.id, m]));
    
    const tournamentQuinielas = this.quinielas.filter((q) => q.tournamentId === tournamentId);
    
    for (const q of tournamentQuinielas) {
      const participants = this.participants.filter((p) => p.quinielaId === q.id);
      
      for (const p of participants) {
        const predictions = this.predictions.filter((pred) => pred.participantId === p.id);
        let total = 0;
        
        for (const pred of predictions) {
          const match = matchesMap.get(pred.matchId);
          let points = 0;
          
          if (match && match.status === 'finished' && match.homeScore !== null && match.awayScore !== null) {
            points = this.calculatePoints(
              q.scoringRules,
              pred.predictedHomeScore,
              pred.predictedAwayScore,
              match.homeScore,
              match.awayScore
            );
          }
          
          pred.pointsEarned = points;
          total += points;
        }
        
        p.totalPoints = total;
      }
    }
  }

  calculatePoints(
    rules: ScoringRules,
    predictedHome: number,
    predictedAway: number,
    actualHome: number,
    actualAway: number
  ): number {
    let total = 0;

    const exactMatch = predictedHome === actualHome && predictedAway === actualAway;
    const correctWinner =
      (predictedHome > predictedAway && actualHome > actualAway) ||
      (predictedHome < predictedAway && actualHome < actualAway) ||
      (predictedHome === predictedAway && actualHome === actualAway);
    const sameGoalDiff =
      (predictedHome - predictedAway) === (actualHome - actualAway);
    const anyTeamGoal =
      predictedHome === actualHome || predictedAway === actualAway;

    if (exactMatch) total += rules.pointsExactScore;
    if (correctWinner) total += rules.pointsWinner;
    if (sameGoalDiff) total += rules.pointsGoalDiff;
    if (anyTeamGoal) total += rules.pointsGoal;

    return total;
  }
}
