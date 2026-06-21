import * as SQLite from 'expo-sqlite';
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

export class SQLiteRepository implements IDataRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('quinielapp.db');

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('super_admin','admin','user')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES ('demo-user-1', 'demo@quinielapp.com', 'Jugador Demo', 'user');
      INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES ('admin-user-1', 'admin@quinielapp.com', 'Admin Demo', 'super_admin');

      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo_url TEXT,
        season TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','active','finished')),
        accent TEXT NOT NULL DEFAULT 'green',
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL REFERENCES tournaments(id),
        external_id TEXT,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        match_date TEXT NOT NULL,
        stage TEXT NOT NULL CHECK(stage IN ('group','round_of_16','quarter','semi','final')),
        group_name TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','live','finished')),
        home_score INTEGER,
        away_score INTEGER,
        current_minute INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS quinielas (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL REFERENCES tournaments(id),
        name TEXT NOT NULL,
        description TEXT,
        deadline TEXT,
        access_type TEXT NOT NULL CHECK(access_type IN ('public','code')),
        invite_code TEXT UNIQUE,
        points_exact_score INTEGER NOT NULL DEFAULT 5,
        points_winner INTEGER NOT NULL DEFAULT 2,
        points_goal INTEGER NOT NULL DEFAULT 2,
        points_goal_diff INTEGER NOT NULL DEFAULT 1,
        prize REAL,
        entry_fee REAL,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        quiniela_id TEXT NOT NULL REFERENCES quinielas(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        total_points REAL NOT NULL DEFAULT 0,
        paid INTEGER NOT NULL DEFAULT 0,
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(quiniela_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS predictions (
        id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL REFERENCES participants(id),
        match_id TEXT NOT NULL REFERENCES matches(id),
        predicted_home_score INTEGER NOT NULL,
        predicted_away_score INTEGER NOT NULL,
        points_earned REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(participant_id, match_id)
      );
    `);

    try {
      await this.db.execAsync('ALTER TABLE quinielas ADD COLUMN description TEXT;');
    } catch {
      // Column may already exist
    }

    try {
      await this.db.execAsync('ALTER TABLE quinielas ADD COLUMN deadline TEXT;');
    } catch {
      // Column may already exist
    }

    try {
      await this.db.execAsync('ALTER TABLE matches ADD COLUMN current_minute INTEGER;');
    } catch {
      // Column may already exist
    }

    try {
      await this.db.execAsync('ALTER TABLE quinielas ADD COLUMN prize REAL;');
    } catch {
      // Column may already exist
    }

    try {
      await this.db.execAsync('ALTER TABLE quinielas ADD COLUMN entry_fee REAL;');
    } catch {
      // Column may already exist
    }

    try {
      await this.db.execAsync('ALTER TABLE participants ADD COLUMN paid INTEGER NOT NULL DEFAULT 0;');
    } catch {
      // Column may already exist
    }
  }

  private requireDb(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  private genId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async signIn(email: string, _password: string): Promise<User> {
    const db = this.requireDb();
    const user = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM users WHERE email = ?',
      email
    );
    if (!user) throw new Error('User not found');
    return this.mapUser(user);
  }

  async signUp(email: string, _password: string, displayName: string): Promise<User> {
    const db = this.requireDb();
    const id = this.genId();
    await db.runAsync(
      `INSERT INTO users (id, email, display_name, role) VALUES (?, ?, ?, 'user')`,
      id,
      email,
      displayName
    );
    const user = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM users WHERE id = ?',
      id
    );
    return this.mapUser(user!);
  }

  async signOut(): Promise<void> {}

  async getSession(): Promise<User | null> {
    return null;
  }

  async getTournaments(): Promise<Tournament[]> {
    const db = this.requireDb();
    const rows = await db.getAllAsync<Record<string, any>>(
      'SELECT * FROM tournaments ORDER BY created_at DESC'
    );
    return rows.map(this.mapTournament);
  }

  async getTournamentById(id: string): Promise<Tournament | null> {
    const db = this.requireDb();
    const row = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM tournaments WHERE id = ?',
      id
    );
    return row ? this.mapTournament(row) : null;
  }

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    const db = this.requireDb();
    const rows = await db.getAllAsync<Record<string, any>>(
      'SELECT * FROM matches WHERE tournament_id = ? ORDER BY match_date ASC',
      tournamentId
    );
    return rows.map(this.mapMatch);
  }

  async getQuinielas(): Promise<Quiniela[]> {
    const db = this.requireDb();
    const rows = await db.getAllAsync<Record<string, any>>(
      'SELECT * FROM quinielas ORDER BY created_at DESC'
    );
    return rows.map(this.mapQuiniela);
  }

  async getQuinielaById(id: string): Promise<Quiniela | null> {
    const db = this.requireDb();
    const row = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM quinielas WHERE id = ?',
      id
    );
    return row ? this.mapQuiniela(row) : null;
  }

  async createQuiniela(data: CreateQuinielaDTO): Promise<Quiniela> {
    const db = this.requireDb();
    const id = this.genId();
    const inviteCode = data.accessType === 'code' ? this.genId().slice(0, 8).toUpperCase() : null;
    await db.runAsync(
      `INSERT INTO quinielas (id, tournament_id, name, description, deadline, access_type, invite_code, points_exact_score, points_winner, points_goal, points_goal_diff, prize, entry_fee, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.tournamentId,
      data.name,
      data.description || '',
      data.deadline || null,
      data.accessType,
      inviteCode,
      data.scoringRules.pointsExactScore,
      data.scoringRules.pointsWinner,
      data.scoringRules.pointsGoal,
      data.scoringRules.pointsGoalDiff,
      data.prize ?? null,
      data.entryFee ?? null,
      data.createdBy || 'system'
    );

    if (data.createdBy) {
      const participantId = this.genId();
      await db.runAsync(
        'INSERT INTO participants (id, quiniela_id, user_id, paid) VALUES (?, ?, ?, 0)',
        participantId,
        id,
        data.createdBy
      );
    }

    const row = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM quinielas WHERE id = ?',
      id
    );
    return this.mapQuiniela(row!);
  }

  async joinQuiniela(code: string, userId: string): Promise<Quiniela | null> {
    const db = this.requireDb();
    const quiniela = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM quinielas WHERE invite_code = ?',
      code
    );
    if (!quiniela) return null;

    const existingParticipant = await db.getFirstAsync<Record<string, any>>(
      'SELECT id FROM participants WHERE quiniela_id = ? AND user_id = ?',
      quiniela.id,
      userId
    );
    if (existingParticipant) return this.mapQuiniela(quiniela);

    const participantId = this.genId();
    await db.runAsync(
      'INSERT INTO participants (id, quiniela_id, user_id, paid) VALUES (?, ?, ?, 0)',
      participantId,
      quiniela.id,
      userId
    );
    return this.mapQuiniela(quiniela);
  }

  async getParticipants(quinielaId: string): Promise<Participant[]> {
    const db = this.requireDb();
    const rows = await db.getAllAsync<Record<string, any>>(
      `SELECT p.*, u.display_name, u.email, u.avatar_url
       FROM participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.quiniela_id = ?
       ORDER BY p.total_points DESC`,
      quinielaId
    );
    return rows.map((r) => ({
      id: r.id,
      quinielaId: r.quiniela_id,
      userId: r.user_id,
      totalPoints: r.total_points,
      paid: r.paid === 1,
      joinedAt: r.joined_at,
      user: {
        id: r.user_id,
        email: r.email,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        role: 'user',
        createdAt: '',
      },
    }));
  }

  async getStandings(quinielaId: string): Promise<StandingEntry[]> {
    const db = this.requireDb();
    const rows = await db.getAllAsync<Record<string, any>>(
      `SELECT p.user_id, u.display_name, p.total_points
       FROM participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.quiniela_id = ?
       ORDER BY p.total_points DESC`,
      quinielaId
    );
    return rows.map((r, i) => ({
      userId: r.user_id,
      displayName: r.display_name,
      totalPoints: r.total_points,
      position: i + 1,
    }));
  }

  async getPredictions(quinielaId: string, participantId: string): Promise<Prediction[]> {
    const db = this.requireDb();
    const rows = await db.getAllAsync<Record<string, any>>(
      `SELECT pr.* FROM predictions pr
       JOIN matches m ON m.id = pr.match_id
       JOIN participants p ON p.id = pr.participant_id
       WHERE p.quiniela_id = ? AND pr.participant_id = ?
       ORDER BY m.match_date ASC`,
      quinielaId,
      participantId
    );
    return rows.map((r) => ({
      id: r.id,
      participantId: r.participant_id,
      matchId: r.match_id,
      predictedHomeScore: r.predicted_home_score,
      predictedAwayScore: r.predicted_away_score,
      pointsEarned: r.points_earned,
      updatedAt: r.updated_at,
    }));
  }

  async savePrediction(
    participantId: string,
    matchId: string,
    homeScore: number,
    awayScore: number
  ): Promise<void> {
    const db = this.requireDb();
    const id = this.genId();
    await db.runAsync(
      `INSERT OR REPLACE INTO predictions (id, participant_id, match_id, predicted_home_score, predicted_away_score, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      id,
      participantId,
      matchId,
      homeScore,
      awayScore
    );
  }

  async createTournament(data: CreateTournamentDTO): Promise<Tournament> {
    const db = this.requireDb();
    const id = this.genId();
    await db.runAsync(
      `INSERT INTO tournaments (id, name, logo_url, season, accent, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.logoUrl ?? null,
      data.season,
      data.accent ?? 'green',
      data.createdBy ?? 'system'
    );
    const row = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM tournaments WHERE id = ?',
      id
    );
    return this.mapTournament(row!);
  }

  async importMatches(tournamentId: string, matches: MatchInput[]): Promise<void> {
    const db = this.requireDb();
    
    // Get existing matches for this tournament to preserve their IDs, status, scores
    const existing = await db.getAllAsync<Record<string, any>>(
      'SELECT id, external_id, home_team, away_team, status, home_score, away_score, current_minute, created_at FROM matches WHERE tournament_id = ?',
      tournamentId
    );
    
    // Process incoming matches using upsert
    for (const m of matches) {
      const matchExtId = m.externalId ?? null;
      let prev = matchExtId ? existing.find(x => x.external_id === matchExtId) : null;
      if (!prev) {
        prev = existing.find(x => x.home_team === m.homeTeam && x.away_team === m.awayTeam) ?? null;
      }
      
      const status = m.status !== undefined ? m.status : (prev ? prev.status : 'scheduled');
      const homeScore = m.homeScore !== undefined ? m.homeScore : (prev ? prev.home_score : null);
      const awayScore = m.awayScore !== undefined ? m.awayScore : (prev ? prev.away_score : null);
      const currentMinute = m.currentMinute !== undefined ? m.currentMinute : (prev ? prev.current_minute : null);
      const createdAt = prev ? prev.created_at : new Date().toISOString();
      
      if (prev) {
        await db.runAsync(
          `UPDATE matches 
           SET home_team = ?, away_team = ?, match_date = ?, stage = ?, group_name = ?, status = ?, home_score = ?, away_score = ?, current_minute = ? 
           WHERE id = ?`,
          m.homeTeam,
          m.awayTeam,
          m.matchDate,
          m.stage,
          m.groupName ?? null,
          status,
          homeScore,
          awayScore,
          currentMinute,
          prev.id
        );
      } else {
        const id = this.genId();
        await db.runAsync(
          `INSERT INTO matches (id, tournament_id, external_id, home_team, away_team, match_date, stage, group_name, status, home_score, away_score, current_minute, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          tournamentId,
          matchExtId,
          m.homeTeam,
          m.awayTeam,
          m.matchDate,
          m.stage,
          m.groupName ?? null,
          status,
          homeScore,
          awayScore,
          currentMinute,
          createdAt
        );
      }
    }

    // Clean up matches in database that are no longer in the incoming matches, if they don't have predictions
    const incomingExtIds = new Set(matches.map(m => m.externalId).filter(Boolean));
    const incomingHomeAway = new Set(matches.map(m => `${m.homeTeam}|||${m.awayTeam}`));
    
    const toDelete = existing.filter(x => {
      const extMatch = x.external_id && incomingExtIds.has(x.external_id);
      const homeAwayMatch = incomingHomeAway.has(`${x.home_team}|||${x.away_team}`);
      return !extMatch && !homeAwayMatch;
    });
    
    for (const x of toDelete) {
      try {
        await db.runAsync('DELETE FROM matches WHERE id = ?', x.id);
      } catch (err) {
        console.warn(`Could not delete orphaned match ${x.id} (probably has predictions):`, err);
      }
    }

    // Recalculate scores for this tournament
    await this.recalculateScoresForTournament(tournamentId);
  }

  async resetDatabase(): Promise<void> {
    const db = this.requireDb();
    await db.execAsync(`
      DROP TABLE IF EXISTS predictions;
      DROP TABLE IF EXISTS participants;
      DROP TABLE IF EXISTS quinielas;
      DROP TABLE IF EXISTS matches;
      DROP TABLE IF EXISTS tournaments;
      DROP TABLE IF EXISTS users;
    `);
    await this.init();
  }

  async updateTournamentStatus(id: string, status: 'active' | 'finished'): Promise<Tournament> {
    const db = this.requireDb();
    await db.runAsync(`UPDATE tournaments SET status = ? WHERE id = ?`, status, id);
    const row = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM tournaments WHERE id = ?',
      id
    );
    if (!row) throw new Error('Tournament not found');
    return this.mapTournament(row);
  }

  async updateMatchScore(
    matchId: string,
    homeScore: number,
    awayScore: number
  ): Promise<void> {
    const db = this.requireDb();
    
    // Get the tournament ID first
    const match = await db.getFirstAsync<{ tournament_id: string }>(
      'SELECT tournament_id FROM matches WHERE id = ?',
      matchId
    );
    
    await db.runAsync(
      `UPDATE matches SET home_score = ?, away_score = ?, status = 'finished' WHERE id = ?`,
      homeScore,
      awayScore,
      matchId
    );

    if (match) {
      await this.recalculateScoresForTournament(match.tournament_id);
    }
  }

  private async recalculateScoresForTournament(tournamentId: string): Promise<void> {
    const db = this.requireDb();
    
    // 1. Get all quinielas for this tournament
    const quinielas = await db.getAllAsync<Record<string, any>>(
      'SELECT * FROM quinielas WHERE tournament_id = ?',
      tournamentId
    );
    
    // 2. Get all matches for this tournament
    const matches = await db.getAllAsync<Record<string, any>>(
      'SELECT * FROM matches WHERE tournament_id = ?',
      tournamentId
    );
    const matchesMap = new Map(matches.map(m => [m.id, m]));
    
    for (const q of quinielas) {
      const scoringRules = {
        pointsExactScore: q.points_exact_score,
        pointsWinner: q.points_winner,
        pointsGoal: q.points_goal,
        pointsGoalDiff: q.points_goal_diff,
      };
      
      // 3. Get all participants for this quiniela
      const participants = await db.getAllAsync<Record<string, any>>(
        'SELECT * FROM participants WHERE quiniela_id = ?',
        q.id
      );
      
      for (const p of participants) {
        // 4. Get predictions for this participant
        const predictions = await db.getAllAsync<Record<string, any>>(
          'SELECT * FROM predictions WHERE participant_id = ?',
          p.id
        );
        
        let participantTotalPoints = 0;
        
        for (const pred of predictions) {
          const match = matchesMap.get(pred.match_id);
          let points = 0;
          
          if (
            match &&
            (match.status === 'finished' || match.status === 'live') &&
            match.home_score !== null &&
            match.away_score !== null
          ) {
            points = this.calculatePoints(
              scoringRules,
              pred.predicted_home_score,
              pred.predicted_away_score,
              match.home_score,
              match.away_score
            );
          }
          
          // Update prediction points
          await db.runAsync(
            'UPDATE predictions SET points_earned = ? WHERE id = ?',
            points,
            pred.id
          );
          
          participantTotalPoints += points;
        }
        
        // Update participant total points
        await db.runAsync(
          'UPDATE participants SET total_points = ? WHERE id = ?',
          participantTotalPoints,
          p.id
        );
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

  async updateQuiniela(
    id: string,
    name: string,
    description: string,
    deadline: string | null,
    scoringRules: ScoringRules,
    prize: number | null,
    entryFee: number | null
  ): Promise<Quiniela> {
    const db = this.requireDb();
    await db.runAsync(
      `UPDATE quinielas 
       SET name = ?, description = ?, deadline = ?, 
           points_exact_score = ?, points_winner = ?, points_goal = ?, points_goal_diff = ?,
           prize = ?, entry_fee = ?
       WHERE id = ?`,
      name,
      description,
      deadline,
      scoringRules.pointsExactScore,
      scoringRules.pointsWinner,
      scoringRules.pointsGoal,
      scoringRules.pointsGoalDiff,
      prize,
      entryFee,
      id
    );
    const row = await db.getFirstAsync<Record<string, any>>(
      'SELECT * FROM quinielas WHERE id = ?',
      id
    );
    if (!row) throw new Error('Quiniela no encontrada');
    return this.mapQuiniela(row);
  }

  async deleteQuiniela(id: string): Promise<void> {
    const db = this.requireDb();
    // Delete predictions for all participants of this quiniela
    await db.runAsync(
      `DELETE FROM predictions WHERE participant_id IN (
        SELECT id FROM participants WHERE quiniela_id = ?
      )`,
      id
    );
    // Delete participants
    await db.runAsync('DELETE FROM participants WHERE quiniela_id = ?', id);
    // Delete quiniela
    await db.runAsync('DELETE FROM quinielas WHERE id = ?', id);
  }

  async leaveQuiniela(quinielaId: string, userId: string): Promise<void> {
    const db = this.requireDb();
    const participant = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM participants WHERE quiniela_id = ? AND user_id = ?',
      quinielaId,
      userId
    );
    if (participant) {
      await db.runAsync('DELETE FROM predictions WHERE participant_id = ?', participant.id);
      await db.runAsync('DELETE FROM participants WHERE id = ?', participant.id);
    }
  }

  async setParticipantPaid(participantId: string, paid: boolean): Promise<void> {
    const db = this.requireDb();
    await db.runAsync(
      'UPDATE participants SET paid = ? WHERE id = ?',
      paid ? 1 : 0,
      participantId
    );
  }

  private mapUser(row: Record<string, any>): User {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      role: row.role,
      createdAt: row.created_at,
    };
  }

  private mapTournament(row: Record<string, any>): Tournament {
    return {
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      season: row.season,
      status: row.status,
      accent: row.accent,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }

  private mapMatch(row: Record<string, any>): Match {
    return {
      id: row.id,
      tournamentId: row.tournament_id,
      externalId: row.external_id,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      matchDate: row.match_date,
      stage: row.stage,
      groupName: row.group_name,
      status: row.status,
      homeScore: row.home_score,
      awayScore: row.away_score,
      currentMinute: row.current_minute !== undefined ? row.current_minute : null,
      createdAt: row.created_at,
    };
  }

  private mapQuiniela(row: Record<string, any>): Quiniela {
    return {
      id: row.id,
      tournamentId: row.tournament_id,
      name: row.name,
      description: row.description || '',
      deadline: row.deadline || null,
      accessType: row.access_type,
      inviteCode: row.invite_code,
      scoringRules: {
        pointsExactScore: row.points_exact_score,
        pointsWinner: row.points_winner,
        pointsGoal: row.points_goal,
        pointsGoalDiff: row.points_goal_diff,
      },
      prize: row.prize ?? null,
      entryFee: row.entry_fee ?? null,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }
}
