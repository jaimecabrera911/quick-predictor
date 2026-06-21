import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jnieivinbwlbboyrvwtx.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWVpdmluYndsYmJveXJ2d3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODM2MDcsImV4cCI6MjA5NzU1OTYwN30.u_Fx597Y0umj0BSqloCfp5x0bsuTF0SQD428n0HbsGE';

function genId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SupabaseRepository implements IDataRepository {
  private sb: SupabaseClient;
  private currentUser: User | null = null;

  constructor() {
    this.sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async init(): Promise<void> {
    const { data } = await this.sb.auth.getSession();
    if (data.session?.user) {
      const u = data.session.user;
      const { data: row } = await this.sb.from('users').select('role, display_name').eq('id', u.id).maybeSingle();
      this.currentUser = {
        id: u.id,
        email: u.email ?? '',
        displayName: row?.display_name ?? u.user_metadata?.['display_name'] ?? u.email ?? '',
        avatarUrl: u.user_metadata?.['avatar_url'] ?? null,
        role: row?.role ?? 'user',
        createdAt: u.created_at ?? new Date().toISOString(),
      };
    }
    await this.seedDemoJapanTunisiaPrediction();
  }

  private isJapanTunisiaMatch(homeTeam: string, awayTeam: string): boolean {
    const isJapan = (name: string) => /japan|japón|japon/i.test(name);
    const isTunisia = (name: string) => /tunis|túnez|tunez/i.test(name);
    return (
      (isJapan(homeTeam) && isTunisia(awayTeam)) ||
      (isTunisia(homeTeam) && isJapan(awayTeam))
    );
  }

  private japanTunisiaScores(homeTeam: string): { home: number; away: number } {
    const isJapan = (name: string) => /japan|japón|japon/i.test(name);
    if (isJapan(homeTeam)) return { home: 2, away: 0 };
    return { home: 0, away: 2 };
  }

  /** Seed: demo@quinielapp.com pronóstico Japón 2–0 Túnez (idempotente). */
  private async seedDemoJapanTunisiaPrediction(): Promise<void> {
    try {
      const { data: demoUser } = await this.sb
        .from('users')
        .select('id')
        .eq('email', 'demo@quinielapp.com')
        .maybeSingle();
      if (!demoUser) return;

      const { data: matches } = await this.sb.from('matches').select('id, home_team, away_team, tournament_id');
      const match = (matches ?? []).find((m) => this.isJapanTunisiaMatch(m.home_team, m.away_team));
      if (!match) return;

      const { data: participants } = await this.sb
        .from('participants')
        .select('id')
        .eq('user_id', demoUser.id);
      if (!participants?.length) return;

      const scores = this.japanTunisiaScores(match.home_team);

      for (const participant of participants) {
        const { data: existing } = await this.sb
          .from('predictions')
          .select('id, points_earned')
          .eq('participant_id', participant.id)
          .eq('match_id', match.id)
          .maybeSingle();

        await this.sb.from('predictions').upsert(
          {
            id: existing?.id ?? genId(),
            participant_id: participant.id,
            match_id: match.id,
            predicted_home_score: scores.home,
            predicted_away_score: scores.away,
            points_earned: existing?.points_earned ?? 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'participant_id,match_id' },
        );
      }

      if (match.tournament_id) {
        await this.recalculateScoresForTournament(match.tournament_id);
      }
    } catch (e: any) {
      console.warn('[seed] demo Japan–Tunisia prediction:', e.message);
    }
  }

  private async seedDemoUsers(): Promise<void> {
    const demos = [
      { email: 'demo@quinielapp.com', password: 'demo1234', displayName: 'Jugador Demo', role: 'user' as const },
      { email: 'admin@quinielapp.com', password: 'admin1234', displayName: 'Admin Demo', role: 'super_admin' as const },
      { email: 'admin@quickpredictor.com', password: 'Qwerty.1234*', displayName: 'Admin', role: 'super_admin' as const },
    ];
    for (const d of demos) {
      try {
        const { data: existing } = await this.sb.from('users').select('id').eq('email', d.email).maybeSingle();
        if (existing) continue;

        const { data: authData, error: authErr } = await this.sb.auth.signUp({
          email: d.email,
          password: d.password,
          options: { data: { display_name: d.displayName } },
        });
        if (authErr) {
          console.log(`[seed] signup error for ${d.email}:`, authErr.message);
          continue;
        }
        if (authData.user) {
          await this.sb.from('users').insert({
            id: authData.user.id,
            email: d.email,
            display_name: d.displayName,
            role: d.role,
            created_at: new Date().toISOString(),
          });
          console.log(`[seed] created user: ${d.email}`);
        }
      } catch (e: any) {
        console.log(`[seed] error for ${d.email}:`, e.message);
      }
    }
    try { await this.sb.auth.signOut(); } catch {}
  }

  // ─── Auth ──────────────────────────────────────────────

  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error?.message?.includes('Invalid login credentials')) {
      const knownAdmins = ['admin@quinielapp.com', 'admin@quickpredictor.com'];
      const role = knownAdmins.includes(email) ? 'super_admin' : 'user';
      const displayName = role === 'super_admin' ? 'Admin' : email.split('@')[0];
      const { error: signUpErr } = await this.sb.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (signUpErr) throw error;
      const { data: retryData, error: retryErr } = await this.sb.auth.signInWithPassword({ email, password });
      if (retryErr) throw error;
      const u = retryData.user;
      await this.sb.from('users').insert({
        id: u.id,
        email: u.email ?? '',
        display_name: displayName,
        role,
        created_at: new Date().toISOString(),
      }).maybeSingle();
      const user: User = {
        id: u.id,
        email: u.email ?? '',
        displayName,
        avatarUrl: null,
        role,
        createdAt: u.created_at ?? new Date().toISOString(),
      };
      this.currentUser = user;
      return user;
    }
    if (error) throw error;
    const u = data.user;
    const { data: row } = await this.sb.from('users').select('role, display_name').eq('id', u.id).maybeSingle();
    const displayName = row?.display_name ?? u.user_metadata?.['display_name'] ?? u.email ?? '';
    const role = row?.role ?? 'user';
    if (!row) {
      await this.sb.from('users').insert({
        id: u.id,
        email: u.email ?? '',
        display_name: displayName,
        role,
        created_at: u.created_at ?? new Date().toISOString(),
      });
    }
    const user: User = {
      id: u.id,
      email: u.email ?? '',
      displayName,
      avatarUrl: u.user_metadata?.['avatar_url'] ?? null,
      role,
      createdAt: u.created_at ?? new Date().toISOString(),
    };
    this.currentUser = user;
    return user;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    const u = data.user!;
    const user: User = {
      id: u.id,
      email: u.email ?? '',
      displayName,
      avatarUrl: null,
      role: 'user',
      createdAt: u.created_at ?? new Date().toISOString(),
    };
    this.currentUser = user;
    await this.ensureUserRow(user);
    return user;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
    this.currentUser = null;
  }

  async getSession(): Promise<User | null> {
    if (this.currentUser) return this.currentUser;
    const { data } = await this.sb.auth.getSession();
    if (!data.session?.user) return null;
    const u = data.session.user;
    this.currentUser = {
      id: u.id,
      email: u.email ?? '',
      displayName: u.user_metadata?.['display_name'] ?? u.email ?? '',
      avatarUrl: u.user_metadata?.['avatar_url'] ?? null,
      role: 'user',
      createdAt: u.created_at ?? new Date().toISOString(),
    };
    return this.currentUser;
  }

  private async ensureUserRow(user: User): Promise<void> {
    await this.sb.from('users').upsert({
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      role: user.role,
      created_at: user.createdAt,
    }, { onConflict: 'id' });
  }

  // ─── Tournaments ───────────────────────────────────────

  async getTournaments(): Promise<Tournament[]> {
    const { data, error } = await this.sb.from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(this.mapTournament);
  }

  async getTournamentById(id: string): Promise<Tournament | null> {
    const { data, error } = await this.sb.from('tournaments').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this.mapTournament(data);
  }

  async createTournament(data: CreateTournamentDTO): Promise<Tournament> {
    const id = genId();
    const createdBy = data.createdBy ?? 'system';
    if (createdBy !== 'system') {
      await this.sb.from('users').upsert({
        id: createdBy,
        email: this.currentUser?.email ?? '',
        display_name: this.currentUser?.displayName ?? '',
        role: this.currentUser?.role ?? 'user',
        created_at: this.currentUser?.createdAt ?? new Date().toISOString(),
      }, { onConflict: 'id' });
    }
    const row = {
      id,
      name: data.name,
      logo_url: data.logoUrl ?? null,
      season: data.season,
      status: 'upcoming' as const,
      accent: data.accent ?? 'green',
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
    const { error } = await this.sb.from('tournaments').insert(row);
    if (error) throw error;
    return this.mapTournament(row);
  }

  async updateTournamentStatus(id: string, status: 'active' | 'finished'): Promise<Tournament> {
    const { data, error } = await this.sb.from('tournaments').update({ status }).eq('id', id).select().single();
    if (error) throw error;
    return this.mapTournament(data);
  }

  // ─── Matches ───────────────────────────────────────────

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    const { data, error } = await this.sb.from('matches').select('*').eq('tournament_id', tournamentId).order('match_date');
    if (error) throw error;
    return (data ?? []).map(this.mapMatch);
  }

  async importMatches(tournamentId: string, matches: MatchInput[]): Promise<void> {
    const { data: existing, error: fetchError } = await this.sb
      .from('matches')
      .select('id, external_id')
      .eq('tournament_id', tournamentId);
    if (fetchError) throw fetchError;

    const existingByExtId = new Map(
      (existing ?? []).map((m) => [m.external_id, m.id])
    );

    const incomingExtIds = new Set<string>();
    const rows = matches.map((m) => {
      if (m.externalId) incomingExtIds.add(m.externalId);
      const existingId = m.externalId ? existingByExtId.get(m.externalId) : undefined;
      return {
        id: existingId ?? genId(),
        tournament_id: tournamentId,
        external_id: m.externalId ?? null,
        home_team: m.homeTeam,
        away_team: m.awayTeam,
        match_date: m.matchDate,
        stage: m.stage,
        group_name: m.groupName ?? null,
        status: m.status ?? 'scheduled',
        home_score: m.homeScore ?? null,
        away_score: m.awayScore ?? null,
        current_minute: m.currentMinute ?? null,
        created_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await this.sb.from('matches').upsert(rows, { onConflict: 'id' });
    if (upsertError) throw upsertError;

    const staleIds = (existing ?? [])
      .filter((m) => m.external_id && !incomingExtIds.has(m.external_id))
      .map((m) => m.id);
    if (staleIds.length > 0) {
      await this.sb.from('matches').delete().in('id', staleIds);
    }

    const { data: postUpsert } = await this.sb
      .from('matches')
      .select('id, external_id')
      .eq('tournament_id', tournamentId)
      .not('external_id', 'is', null);
    if (postUpsert && postUpsert.length > 0) {
      const seen = new Map<string, string[]>();
      for (const row of postUpsert) {
        if (!row.external_id) continue;
        const ids = seen.get(row.external_id) ?? [];
        ids.push(row.id);
        seen.set(row.external_id, ids);
      }
      const dupIds: string[] = [];
      for (const ids of seen.values()) {
        if (ids.length > 1) {
          dupIds.push(...ids.slice(1));
        }
      }
      if (dupIds.length > 0) {
        await this.sb.from('matches').delete().in('id', dupIds);
      }
    }

    await this.recalculateScoresForTournament(tournamentId);
  }

  private async recalculateScoresForTournament(tournamentId: string): Promise<void> {
    const { data: quinielas, error: qErr } = await this.sb
      .from('quinielas')
      .select('*')
      .eq('tournament_id', tournamentId);
    if (qErr) throw qErr;

    const { data: matches, error: mErr } = await this.sb
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId);
    if (mErr) throw mErr;

    const matchesMap = new Map((matches ?? []).map((m) => [m.id, m]));

    for (const q of quinielas ?? []) {
      const scoringRules = {
        pointsExactScore: q.points_exact_score,
        pointsWinner: q.points_winner,
        pointsGoal: q.points_goal,
        pointsGoalDiff: q.points_goal_diff,
      };

      const { data: participants } = await this.sb
        .from('participants')
        .select('*')
        .eq('quiniela_id', q.id);

      for (const p of participants ?? []) {
        const { data: predictions } = await this.sb
          .from('predictions')
          .select('*')
          .eq('participant_id', p.id);

        let participantTotalPoints = 0;

        for (const pred of predictions ?? []) {
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
              match.away_score,
            );
          }

          await this.sb.from('predictions').update({ points_earned: points }).eq('id', pred.id);
          participantTotalPoints += points;
        }

        await this.sb
          .from('participants')
          .update({ total_points: participantTotalPoints })
          .eq('id', p.id);
      }
    }
  }

  async updateMatchScore(matchId: string, homeScore: number, awayScore: number): Promise<void> {
    const { data: match, error: fetchError } = await this.sb
      .from('matches')
      .select('tournament_id')
      .eq('id', matchId)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await this.sb.from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
      .eq('id', matchId);
    if (error) throw error;

    if (match?.tournament_id) {
      await this.recalculateScoresForTournament(match.tournament_id);
    }
  }

  // ─── Quinielas ─────────────────────────────────────────

  async getQuinielas(): Promise<Quiniela[]> {
    const { data, error } = await this.sb.from('quinielas').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(this.mapQuiniela);
  }

  async getQuinielaById(id: string): Promise<Quiniela | null> {
    const { data, error } = await this.sb.from('quinielas').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this.mapQuiniela(data);
  }

  async createQuiniela(dto: CreateQuinielaDTO): Promise<Quiniela> {
    const id = genId();
    const inviteCode = dto.accessType === 'code' ? genId().slice(0, 8).toUpperCase() : null;
    const row = {
      id,
      tournament_id: dto.tournamentId,
      name: dto.name,
      description: dto.description ?? '',
      deadline: dto.deadline ?? null,
      access_type: dto.accessType,
      invite_code: inviteCode,
      points_exact_score: dto.scoringRules.pointsExactScore,
      points_winner: dto.scoringRules.pointsWinner,
      points_goal: dto.scoringRules.pointsGoal,
      points_goal_diff: dto.scoringRules.pointsGoalDiff,
      prize: dto.prize ?? null,
      entry_fee: dto.entryFee ?? null,
      created_by: dto.createdBy ?? 'system',
      created_at: new Date().toISOString(),
    };
    const { error } = await this.sb.from('quinielas').insert(row);
    if (error) throw error;

    if (dto.createdBy) {
      await this.sb.from('participants').insert({
        id: genId(),
        quiniela_id: id,
        user_id: dto.createdBy,
        total_points: 0,
        paid: 0,
        joined_at: new Date().toISOString(),
      });
    }

    return this.mapQuiniela(row);
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
    const { data, error } = await this.sb.from('quinielas').update({
      name,
      description,
      deadline,
      points_exact_score: scoringRules.pointsExactScore,
      points_winner: scoringRules.pointsWinner,
      points_goal: scoringRules.pointsGoal,
      points_goal_diff: scoringRules.pointsGoalDiff,
      prize,
      entry_fee: entryFee,
    }).eq('id', id).select().single();
    if (error) throw error;
    return this.mapQuiniela(data);
  }

  async deleteQuiniela(id: string): Promise<void> {
    const { data: parts } = await this.sb.from('participants').select('id').eq('quiniela_id', id);
    if (parts?.length) {
      const pIds = parts.map((p) => p.id);
      await this.sb.from('predictions').delete().in('participant_id', pIds);
    }
    await this.sb.from('participants').delete().eq('quiniela_id', id);
    await this.sb.from('quinielas').delete().eq('id', id);
  }

  async joinQuiniela(code: string, userId: string): Promise<Quiniela | null> {
    const { data: q } = await this.sb.from('quinielas').select('*').eq('invite_code', code).single();
    if (!q) return null;

    const { data: existing } = await this.sb.from('participants')
      .select('id')
      .eq('quiniela_id', q.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await this.sb.from('participants').insert({
        id: genId(),
        quiniela_id: q.id,
        user_id: userId,
        total_points: 0,
        paid: 0,
        joined_at: new Date().toISOString(),
      });
    }
    return this.mapQuiniela(q);
  }

  async leaveQuiniela(quinielaId: string, userId: string): Promise<void> {
    const { data: p } = await this.sb.from('participants')
      .select('id')
      .eq('quiniela_id', quinielaId)
      .eq('user_id', userId)
      .maybeSingle();
    if (p) {
      await this.sb.from('predictions').delete().eq('participant_id', p.id);
      await this.sb.from('participants').delete().eq('id', p.id);
    }
  }

  async setParticipantPaid(participantId: string, paid: boolean): Promise<void> {
    await this.sb.from('participants').update({ paid: paid ? 1 : 0 }).eq('id', participantId);
  }

  // ─── Participants & Standings ──────────────────────────

  async getParticipants(quinielaId: string): Promise<Participant[]> {
    const { data, error } = await this.sb
      .from('participants')
      .select('*, users:user_id ( id, email, display_name, avatar_url )')
      .eq('quiniela_id', quinielaId)
      .order('total_points', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      quinielaId: r.quiniela_id,
      userId: r.user_id,
      totalPoints: r.total_points,
      paid: r.paid === 1,
      joinedAt: r.joined_at,
      user: r.users ? {
        id: r.users.id,
        email: r.users.email,
        displayName: r.users.display_name,
        avatarUrl: r.users.avatar_url,
        role: 'user' as const,
        createdAt: '',
      } : undefined,
    }));
  }

  async getStandings(quinielaId: string): Promise<StandingEntry[]> {
    const { data, error } = await this.sb
      .from('participants')
      .select('user_id, total_points, users:user_id ( display_name )')
      .eq('quiniela_id', quinielaId)
      .order('total_points', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any, i) => ({
      userId: r.user_id,
      displayName: r.users?.display_name ?? '',
      totalPoints: r.total_points,
      position: i + 1,
    }));
  }

  // ─── Predictions ───────────────────────────────────────

  async getPredictions(quinielaId: string, participantId: string): Promise<Prediction[]> {
    const { data: part } = await this.sb.from('participants').select('id').eq('quiniela_id', quinielaId).eq('id', participantId).single();
    if (!part) return [];
    const { data, error } = await this.sb.from('predictions').select('*').eq('participant_id', part.id);
    if (error) throw error;
    return (data ?? []).map(this.mapPrediction);
  }

  async savePrediction(participantId: string, matchId: string, homeScore: number, awayScore: number): Promise<void> {
    const { data: existing, error: fetchError } = await this.sb
      .from('predictions')
      .select('id, points_earned')
      .eq('participant_id', participantId)
      .eq('match_id', matchId)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const { error } = await this.sb.from('predictions').upsert(
      {
        id: existing?.id ?? genId(),
        participant_id: participantId,
        match_id: matchId,
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
        points_earned: existing?.points_earned ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'participant_id,match_id' },
    );
    if (error) throw error;
  }

  // ─── Misc ──────────────────────────────────────────────

  async resetDatabase(): Promise<void> {
    await this.sb.from('predictions').delete().neq('id', '__none__');
    await this.sb.from('participants').delete().neq('id', '__none__');
    await this.sb.from('quinielas').delete().neq('id', '__none__');
    await this.sb.from('matches').delete().neq('id', '__none__');
    await this.sb.from('tournaments').delete().neq('id', '__none__');
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
    const sameGoalDiff = Math.abs(predictedHome - predictedAway) === Math.abs(actualHome - actualAway);
    const anyTeamGoal = predictedHome === actualHome || predictedAway === actualAway;

    if (exactMatch) total += rules.pointsExactScore;
    if (correctWinner) total += rules.pointsWinner;
    if (sameGoalDiff) total += rules.pointsGoalDiff;
    if (anyTeamGoal) total += rules.pointsGoal;

    return total;
  }

  // ─── Mappers ───────────────────────────────────────────

  private mapTournament(r: any): Tournament {
    return {
      id: r.id,
      name: r.name,
      logoUrl: r.logo_url,
      season: r.season,
      status: r.status,
      accent: r.accent,
      createdBy: r.created_by,
      createdAt: r.created_at,
    };
  }

  private mapMatch(r: any): Match {
    return {
      id: r.id,
      tournamentId: r.tournament_id,
      externalId: r.external_id,
      homeTeam: r.home_team,
      awayTeam: r.away_team,
      matchDate: r.match_date,
      stage: r.stage,
      groupName: r.group_name,
      status: r.status,
      homeScore: r.home_score,
      awayScore: r.away_score,
      currentMinute: r.current_minute,
      createdAt: r.created_at,
    };
  }

  private mapQuiniela(r: any): Quiniela {
    return {
      id: r.id,
      tournamentId: r.tournament_id,
      name: r.name,
      description: r.description || '',
      deadline: r.deadline || null,
      accessType: r.access_type,
      inviteCode: r.invite_code,
      scoringRules: {
        pointsExactScore: r.points_exact_score,
        pointsWinner: r.points_winner,
        pointsGoal: r.points_goal,
        pointsGoalDiff: r.points_goal_diff,
      },
      prize: r.prize ?? null,
      entryFee: r.entry_fee ?? null,
      createdBy: r.created_by,
      createdAt: r.created_at,
    };
  }

  private mapPrediction(r: any): Prediction {
    return {
      id: r.id,
      participantId: r.participant_id,
      matchId: r.match_id,
      predictedHomeScore: r.predicted_home_score,
      predictedAwayScore: r.predicted_away_score,
      pointsEarned: r.points_earned,
      updatedAt: r.updated_at,
    };
  }
}
