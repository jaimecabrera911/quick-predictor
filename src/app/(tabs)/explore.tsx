import { useState, useCallback, useRef } from 'react';
import { ScrollView, View, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Platform, Share, Keyboard, InteractionManager, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { StadiumCard } from '@/components/ui/stadium-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NeonScoreInput } from '@/components/ui/neon-score-input';
import { Typography } from '@/constants/typography';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
  Palette as originalPalette,
  BorderRadius,
  NeonAccent,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/db/context';
import { resolveMatchPlaceholders } from '@/utils/match';
import type { Quiniela, Match, Prediction, Participant, StandingEntry, Tournament, User } from '@/db/types';
import { syncTournamentMatches, syncActiveTournamentsForUser } from '@/services';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { getTeamLogo, getLeagueLogo } from '@/utils/logos';
import { parseMatchDate, formatMatchDateTime, isMatchStarted, getMatchLocalDateString, getTodayDateString, compareMatchDatesAsc, isMatchInTodaySection } from '@/utils/date';
import { matchHasScoreForScoring } from '@/utils/scoring';

export default function PredictionsScreen() {
  const theme = useTheme();
  const Palette = {
    ...originalPalette,
    neonGreen: theme.neonGreen,
    neonOrange: theme.neonOrange,
    neonPurple: theme.neonPurple,
    neonYellow: theme.neonYellow,
    neonPink: theme.neonPink,
    neonCyan: theme.neonCyan,
    neonBlue: theme.neonBlue,
  };
  const auth = useAuth();
  const repo = useRepository();

  type QuinielaWithDetails = Quiniela & {
    matches: Match[];
    standings: StandingEntry[];
    participantId: string | null;
    predictions: Prediction[];
    accent: string;
    allPredictions: { participant: Participant; predictions: Prediction[] }[];
  };
  const [quinielas, setQuinielas] = useState<QuinielaWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedQuiniela, setExpandedQuiniela] = useState<string | null>(null);
  const hasInitializedExpansion = useRef(false);
  type PredictionModalState = {
    matchId: string;
    quinielaId: string;
    participantId: string | null;
    homeTeam: string;
    awayTeam: string;
    stage: string;
    groupName?: string;
    matchDate: string;
    accent: NeonAccent;
    initialHome: number | null;
    initialAway: number | null;
    isBlocked: boolean;
  };
  const [predictionModal, setPredictionModal] = useState<PredictionModalState | null>(null);
  const predictingMatchRef = useRef<string | null>(null);
  const pendingReloadRef = useRef(false);
  predictingMatchRef.current = predictionModal?.matchId ?? null;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [matchPages, setMatchPages] = useState<Record<string, number>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, { standings?: boolean; matches?: boolean }>>({});
  const [expandedStandingUser, setExpandedStandingUser] = useState<string | null>(null);
  const [expandedOtherPreds, setExpandedOtherPreds] = useState<Record<string, boolean>>({});
  const [expandedTodayMatches, setExpandedTodayMatches] = useState<boolean>(true);
  const [matchPageSizes, setMatchPageSizes] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    if (!auth.user) return;
    try {
      const allQ = await repo.getQuinielas();
      const allP = [];
      for (const q of allQ) {
        const p = await repo.getParticipants(q.id);
        allP.push(...p);
      }
      const myParticipations = allP.filter((p) => p.userId === auth.user!.id);
      const myQIds = new Set(myParticipations.map((p) => p.quinielaId));
      const myQuinielas = allQ.filter((q) => myQIds.has(q.id) || q.createdBy === auth.user!.id);

      const withDetails = await Promise.all(
        myQuinielas.map(async (q) => {
          const tournament = await repo.getTournamentById(q.tournamentId);
          const rawMatches = tournament ? await repo.getMatchesByTournament(tournament.id) : [];
          const matches = resolveMatchPlaceholders(rawMatches);
          const standings = await repo.getStandings(q.id);
          const participant = myParticipations.find((p) => p.quinielaId === q.id);
          const predictions = participant
            ? await repo.getPredictions(q.id, participant.id)
            : [];

          const participants = await repo.getParticipants(q.id);
          const allPreds = await Promise.all(
            participants.map(async (p) => {
              const preds = await repo.getPredictions(q.id, p.id);
              return { participant: p, predictions: preds };
            })
          );

          return {
            ...q,
            matches,
            standings,
            participantId: participant?.id ?? null,
            predictions,
            accent: tournament?.accent ?? 'purple',
            allPredictions: allPreds,
          };
        }),
      );
      if (predictingMatchRef.current) {
        pendingReloadRef.current = true;
        return;
      }
      setQuinielas(withDetails);
      if (withDetails.length > 0 && !hasInitializedExpansion.current) {
        setExpandedQuiniela(withDetails[0].id);
        hasInitializedExpansion.current = true;
      }
    } catch { } finally {
      if (!predictingMatchRef.current) {
        setLoading(false);
      }
    }
  }, [repo, auth.user?.id]);

  const syncAndLoad = useCallback(async () => {
    if (!auth.user || predictingMatchRef.current) return;
    try {
      await syncActiveTournamentsForUser(repo, auth.user.id);
    } catch (e) {
      console.warn('Failed sync of active tournaments:', e);
    }
    if (predictingMatchRef.current) {
      pendingReloadRef.current = true;
      return;
    }
    await loadData();
  }, [repo, auth.user?.id, loadData]);

  const closePrediction = useCallback(() => {
    Keyboard.dismiss();
    setPredictionModal(null);
    setMessage(null);
    setSaving(false);
    if (pendingReloadRef.current) {
      pendingReloadRef.current = false;
      void syncAndLoad();
    }
  }, [syncAndLoad]);

  useFocusEffect(
    useCallback(() => {
      if (predictingMatchRef.current) return;
      syncAndLoad();

      const intervalId = setInterval(async () => {
        if (predictingMatchRef.current) return;
        await syncAndLoad();
      }, 5 * 60 * 1000);

      return () => clearInterval(intervalId);
    }, [syncAndLoad])
  );

  const handleRefresh = useCallback(async () => {
    if (predictingMatchRef.current) return;
    setRefreshing(true);
    try {
      await syncAndLoad();
    } finally {
      setRefreshing(false);
    }
  }, [syncAndLoad]);

  const toggleQuinielaExpansion = useCallback(async (qId: string | null) => {
    setExpandedQuiniela(qId);
    if (!qId) return;

    const quiniela = quinielas.find((q) => q.id === qId);
    if (quiniela) {
      try {
        const tournament = await repo.getTournamentById(quiniela.tournamentId);
        if (tournament && tournament.status === 'active') {
          await syncTournamentMatches(repo, tournament);
          await loadData();
        }
      } catch (e) {
        console.warn('Failed background sync of tournament:', e);
      }
    }
  }, [quinielas, repo, loadData]);

  const openPrediction = useCallback((
    quiniela: QuinielaWithDetails,
    match: Match,
    prediction?: Prediction,
  ) => {
    const isBlocked =
      match.status === 'finished' ||
      match.status === 'live' ||
      isMatchStarted(match.matchDate);

    InteractionManager.runAfterInteractions(() => {
      setPredictionModal({
        matchId: match.id,
        quinielaId: quiniela.id,
        participantId: quiniela.participantId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        stage: match.stage,
        groupName: match.groupName ?? undefined,
        matchDate: match.matchDate,
        accent: (quiniela.accent || 'purple') as NeonAccent,
        initialHome: prediction?.predictedHomeScore ?? null,
        initialAway: prediction?.predictedAwayScore ?? null,
        isBlocked,
      });
      setMessage(null);
    });
  }, []);

  const handleSavePrediction = useCallback(async (homeScore: number, awayScore: number) => {
    if (!predictionModal?.participantId) return;
    if (predictionModal.isBlocked) {
      setMessage('El partido ya ha comenzado o finalizado');
      return;
    }
    const { matchId, quinielaId, participantId } = predictionModal;
    setSaving(true);
    setMessage(null);
    try {
      await repo.savePrediction(participantId, matchId, homeScore, awayScore);
      setMessage('Pronóstico guardado');
      setQuinielas((prev) =>
        prev.map((q) => {
          if (q.id !== quinielaId) return q;
          const existing = q.predictions.findIndex((p) => p.matchId === matchId);
          const newPred: Prediction = {
            id: existing >= 0 ? q.predictions[existing].id : '',
            participantId: participantId!,
            matchId,
            predictedHomeScore: homeScore,
            predictedAwayScore: awayScore,
            pointsEarned: existing >= 0 ? q.predictions[existing].pointsEarned : 0,
            updatedAt: new Date().toISOString(),
          };
          const predictions = existing >= 0
            ? q.predictions.map((p, i) => i === existing ? newPred : p)
            : [...q.predictions, newPred];

          const allPredictions = q.allPredictions
            ? q.allPredictions.map((ap) => {
                if (ap.participant.userId !== auth.user!.id) return ap;
                const idx = ap.predictions.findIndex((p) => p.matchId === matchId);
                const newPreds = [...ap.predictions];
                if (idx >= 0) {
                  newPreds[idx] = newPred;
                } else {
                  newPreds.push(newPred);
                }
                return { ...ap, predictions: newPreds };
              })
            : [];

          return { ...q, predictions, allPredictions };
        }),
      );
      setTimeout(() => {
        closePrediction();
      }, 1000);
    } catch (e: any) {
      setMessage(e.message);
      setSaving(false);
    }
  }, [predictionModal, repo, auth.user, closePrediction]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Palette.neonPurple}
              colors={[Palette.neonPurple]}
            />
          }
        >
          <View style={styles.hero}>
            <ThemedText style={[Typography.small, { color: Palette.neonPurple, letterSpacing: 4 }]}>
              MIS PRONÓSTICOS
            </ThemedText>
            <ThemedText style={[Typography.display1, { color: theme.text }]}>
              Resumen
            </ThemedText>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Palette.neonPurple} style={{ marginTop: Spacing.six }} />
          ) : quinielas.length === 0 ? (
            <View style={styles.section}>
              <ThemedText style={[Typography.body, { color: theme.textMuted, textAlign: 'center' }]}>
                No tienes quinielas activas
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: theme.textMuted, textAlign: 'center', marginTop: Spacing.two }]}>
                Crea o únete a una quiniela desde la pestaña TORNEOS
              </ThemedText>
            </View>
          ) : (
            <View style={styles.section}>
              {quinielas.map((q) => {
                const isExpanded = expandedQuiniela === q.id;
                const myPredictions = q.predictions;
                const totalMatches = q.matches.length;
                const predictedCount = myPredictions.length;
                const myStanding = q.standings.find((s) => s.userId === auth.user?.id);
                const position = myStanding?.position ?? '-';
                const points = myStanding?.totalPoints ?? 0;

                return (
                  <View key={q.id}>
                    <Pressable
                      onPress={() => toggleQuinielaExpansion(isExpanded ? null : q.id)}
                      style={({ pressed }) => ({
                        backgroundColor: Palette.neonPurple + '08',
                        borderRadius: BorderRadius.md,
                        borderWidth: 1,
                        borderColor: Palette.neonPurple + '15',
                        padding: Spacing.four,
                        opacity: pressed ? 0.95 : 1,
                        marginBottom: isExpanded ? Spacing.three : 0,
                      })}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flex: 1 }}>
                          <Image
                            source={{ uri: getLeagueLogo(q.name) }}
                            style={{ width: 36, height: 36, borderRadius: 6 }}
                            contentFit="contain"
                          />
                          <View style={{ flex: 1, gap: Spacing.half }}>
                            <ThemedText style={[Typography.headline, { color: theme.text }]}>
                              {q.name}
                            </ThemedText>
                            {q.description ? (
                              <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                {q.description}
                              </ThemedText>
                            ) : null}
                          <View style={{ flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.one }}>
                            <View>
                              <ThemedText style={[Typography.caption, { color: Palette.neonPurple }]}>
                                #{position}
                              </ThemedText>
                              <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                Posición
                              </ThemedText>
                            </View>
                            <View>
                              <ThemedText style={[Typography.caption, { color: Palette.neonCyan }]}>
                                {points} pts
                              </ThemedText>
                              <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                Puntos
                              </ThemedText>
                            </View>
                            <View>
                              <ThemedText style={[Typography.caption, { color: Palette.neonYellow }]}>
                                {predictedCount}/{totalMatches}
                              </ThemedText>
                              <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                Pronosticados
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      </View>
                      <ThemedText style={[Typography.small, { color: Palette.neonPurple, fontWeight: '700', fontSize: 10 }]}>
                          {isExpanded ? 'MINIMIZAR [−]' : 'EXPANDIR [+]'}
                      </ThemedText>
                      </View>
                    </Pressable>

                    {isExpanded && (() => {
                      const isStandingsCollapsed = collapsedSections[q.id]?.standings ?? false;
                      const isMatchesCollapsed = collapsedSections[q.id]?.matches ?? false;
                      
                      // Ordenar por fecha cronológica de forma explícita
                      const sortedMatches = [...q.matches].sort(
                        (a, b) => compareMatchDatesAsc(a.matchDate, b.matchDate)
                      );

                      const page = matchPages[q.id] ?? 1;
                      const pageSize = matchPageSizes[q.id] ?? 5; // Valor por defecto: 5 elementos por página
                      const totalMatches = sortedMatches.length;
                      const totalPages = pageSize === -1 ? 1 : Math.ceil(totalMatches / pageSize);
                      const paginatedMatches = pageSize === -1 
                        ? sortedMatches 
                        : sortedMatches.slice((page - 1) * pageSize, page * pageSize);

                      return (
                        <View style={{ marginTop: 0, marginBottom: Spacing.five }}>
                          {q.standings.length > 0 && (
                            <View style={{ marginBottom: Spacing.three }}>
                              <Pressable 
                                onPress={() => setCollapsedSections(prev => ({ ...prev, [q.id]: { ...prev[q.id], standings: !isStandingsCollapsed } }))}
                                style={({ pressed }) => ({
                                  flexDirection: 'row', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  marginBottom: Spacing.two,
                                  backgroundColor: Palette.neonCyan + '0A',
                                  paddingVertical: Spacing.two,
                                  paddingHorizontal: Spacing.three,
                                  borderRadius: BorderRadius.sm,
                                  borderWidth: 1,
                                  borderColor: Palette.neonCyan + '20',
                                  opacity: pressed ? 0.8 : 1,
                                })}
                              >
                                <ThemedText style={[Typography.small, { color: Palette.neonCyan, letterSpacing: 1, fontWeight: '700' }]}>
                                  CLASIFICACIÓN
                                </ThemedText>
                                <ThemedText style={[Typography.small, { color: Palette.neonCyan, fontWeight: '700', fontSize: 10 }]}>
                                  {isStandingsCollapsed ? 'EXPANDIR [+]' : 'MINIMIZAR [−]'}
                                </ThemedText>
                              </Pressable>
                              
                              {!isStandingsCollapsed && q.standings.map((s) => {
                                const isExpanded = expandedStandingUser === s.userId;
                                const userPreds = q.allPredictions?.find(ap => ap.participant.userId === s.userId);
                                const activePredictions = (userPreds?.predictions || [])
                                  .filter(p => {
                                    const m = q.matches.find(mx => mx.id === p.matchId);
                                    return m && (m.status === 'finished' || m.status === 'live');
                                  })
                                  .sort((a, b) => compareMatchDatesAsc(q.matches.find(mx => mx.id === a.matchId)?.matchDate ?? '', q.matches.find(mx => mx.id === b.matchId)?.matchDate ?? ''));

                                return (
                                  <View key={s.userId} style={{ marginBottom: Spacing.one }}>
                                    <Pressable
                                      onPress={() => setExpandedStandingUser(isExpanded ? null : s.userId)}
                                      style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: Spacing.two,
                                        paddingHorizontal: Spacing.three,
                                        backgroundColor: s.userId === auth.user?.id ? Palette.neonPurple + '10' : 'transparent',
                                        borderRadius: BorderRadius.sm,
                                        opacity: pressed ? 0.8 : 1,
                                      })}
                                    >
                                      <ThemedText style={[Typography.body, { color: theme.textMuted, width: 30, textAlign: 'center', fontWeight: '700' }]}>
                                        {s.position}
                                      </ThemedText>
                                      <ThemedText style={[Typography.body, { color: theme.text, flex: 1, fontWeight: s.userId === auth.user?.id ? '700' : '400' }]}>
                                        {s.displayName}
                                      </ThemedText>
                                      <ThemedText style={[Typography.body, { color: Palette.neonCyan, fontWeight: '700' }]}>
                                        {s.totalPoints} pts
                                      </ThemedText>
                                      <ThemedText style={[Typography.small, { color: theme.textMuted, fontSize: 10, marginLeft: Spacing.two }]}>
                                        {isExpanded ? '−' : '+'}
                                      </ThemedText>
                                    </Pressable>

                                    {isExpanded && (
                                      <View style={{ marginTop: Spacing.one, paddingLeft: Spacing.three, gap: Spacing.two }}>
                                        {activePredictions.length === 0 ? (
                                          <ThemedText style={[Typography.caption, { color: theme.textMuted, fontStyle: 'italic', paddingLeft: Spacing.three }]}>
                                            Sin pronósticos en partidos jugados
                                          </ThemedText>
                                        ) : activePredictions.map((pred) => {
                                          const match = q.matches.find(mx => mx.id === pred.matchId);
                                          if (!match) return null;
                                          const matchDate = parseMatchDate(match.matchDate);
                                          const isFinished = match.status === 'finished';
                                          const isLive = match.status === 'live';
                                          const hasScoring = matchHasScoreForScoring(match.status, match.homeScore, match.awayScore);
                                          const pointsHighlight = hasScoring && pred.pointsEarned > 0;
                                          const pointsColor = isLive ? Palette.neonPink : Palette.neonGreen;
                                          return (
                                            <View key={pred.id} style={{ 
                                              backgroundColor: Palette.surface + '30',
                                              borderRadius: BorderRadius.md,
                                              borderWidth: 1,
                                              borderColor: '#2A2A4A' + '60',
                                              padding: Spacing.three,
                                              gap: Spacing.two,
                                            }}>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three }}>
                                                <Image source={{ uri: getTeamLogo(match.homeTeam) }} style={{ width: 18, height: 18, borderRadius: 3 }} contentFit="contain" />
                                                <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                                                  {match.homeTeam}
                                                </ThemedText>
                                                <ThemedText style={[Typography.small, { color: theme.textMuted }]}>vs</ThemedText>
                                                <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                                                  {match.awayTeam}
                                                </ThemedText>
                                                <Image source={{ uri: getTeamLogo(match.awayTeam) }} style={{ width: 18, height: 18, borderRadius: 3 }} contentFit="contain" />
                                              </View>

                                              <ThemedText style={[Typography.small, { color: theme.textMuted, textAlign: 'center', fontSize: 9 }]}>
                                                {formatMatchDateTime(match.matchDate)}
                                              </ThemedText>

                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                                                <View style={{ 
                                                  flex: 1, 
                                                  backgroundColor: Palette.neonCyan + '12',
                                                  borderRadius: BorderRadius.sm,
                                                  borderWidth: 1,
                                                  borderColor: Palette.neonCyan + '30',
                                                  paddingVertical: Spacing.one,
                                                  paddingHorizontal: Spacing.two,
                                                  alignItems: 'center',
                                                }}>
                                                  <ThemedText style={[Typography.small, { color: Palette.neonCyan, fontSize: 9, letterSpacing: 1, marginBottom: 2 }]}>
                                                    TU PRONÓSTICO
                                                  </ThemedText>
                                                  <ThemedText style={[Typography.scoreSmall, { color: Palette.neonCyan, fontWeight: '700', fontSize: 20, letterSpacing: 3 }]}>
                                                    {pred.predictedHomeScore} – {pred.predictedAwayScore}
                                                  </ThemedText>
                                                </View>

                                                <ThemedText style={[Typography.small, { color: theme.textMuted, fontSize: 14, fontWeight: '300' }]}>
                                                  <MaterialIcons name="arrow-forward" size={14} color={theme.textMuted} />
                                                </ThemedText>

                                                <View style={{ 
                                                  flex: 1,
                                                  backgroundColor: isLive ? Palette.neonPink + '12' : Palette.neonGreen + '12',
                                                  borderRadius: BorderRadius.sm,
                                                  borderWidth: 1,
                                                  borderColor: isLive ? Palette.neonPink + '30' : Palette.neonGreen + '30',
                                                  paddingVertical: Spacing.one,
                                                  paddingHorizontal: Spacing.two,
                                                  alignItems: 'center',
                                                }}>
                                                  <ThemedText style={[Typography.small, { color: isLive ? Palette.neonPink : Palette.neonGreen, fontSize: 9, letterSpacing: 1, marginBottom: 2 }]}>
                                                    {isLive ? 'EN VIVO' : 'MARCADOR REAL'}
                                                  </ThemedText>
                                                  {match.homeScore !== null ? (
                                                    <ThemedText style={[Typography.scoreSmall, { color: isLive ? Palette.neonPink : Palette.neonGreen, fontWeight: '700', fontSize: 20, letterSpacing: 3 }]}>
                                                      {match.homeScore} – {match.awayScore}
                                                    </ThemedText>
                                                  ) : (
                                                    <ThemedText style={[Typography.small, { color: Palette.neonPink, fontSize: 12 }]}>
                                                      – : –
                                                    </ThemedText>
                                                  )}
                                                </View>

                                                <View style={{ 
                                                  backgroundColor: pointsHighlight ? pointsColor + '20' : theme.textMuted + '15',
                                                  borderRadius: BorderRadius.sm,
                                                  borderWidth: 1,
                                                  borderColor: pointsHighlight ? pointsColor + '40' : 'transparent',
                                                  paddingVertical: Spacing.one,
                                                  paddingHorizontal: Spacing.two,
                                                  alignItems: 'center',
                                                  minWidth: 50,
                                                }}>
                                                  <ThemedText style={[Typography.small, { color: theme.textMuted, fontSize: 8, letterSpacing: 0.5, marginBottom: 1 }]}>
                                                    PTS{isLive ? ' · VIVO' : ''}
                                                  </ThemedText>
                                                  <ThemedText style={[Typography.body, { color: hasScoring ? pointsColor : theme.textMuted, fontWeight: '700', fontSize: 16 }]}>
                                                    {hasScoring ? `+${pred.pointsEarned}` : '–'}
                                                  </ThemedText>
                                                </View>
                                              </View>
                                            </View>
                                          );
                                        })}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}

                          {(() => {
                            const todayStr = getTodayDateString();
                            const todayMatches = q.matches
                              .filter((m) => isMatchInTodaySection(m.matchDate, m.status))
                              .sort((a, b) => {
                                const aLive = a.status === 'live' ? 0 : 1;
                                const bLive = b.status === 'live' ? 0 : 1;
                                if (aLive !== bLive) return aLive - bLive;
                                return compareMatchDatesAsc(a.matchDate, b.matchDate);
                              });
                            if (todayMatches.length === 0) return null;

                            const hasLiveFromOtherDay = todayMatches.some(
                              (m) => m.status === 'live' && getMatchLocalDateString(m.matchDate) !== todayStr,
                            );

                            return (
                              <View style={{ marginBottom: Spacing.three }}>
                                <Pressable 
                                  onPress={() => setExpandedTodayMatches(prev => !prev)}
                                  style={({ pressed }) => ({
                                    flexDirection: 'row', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: Spacing.two,
                                    backgroundColor: Palette.neonGreen + '0A',
                                    paddingVertical: Spacing.two,
                                    paddingHorizontal: Spacing.three,
                                    borderRadius: BorderRadius.sm,
                                    borderWidth: 1,
                                    borderColor: Palette.neonGreen + '20',
                                    opacity: pressed ? 0.8 : 1,
                                  })}
                                >
                                  <ThemedText style={[Typography.small, { color: Palette.neonGreen, letterSpacing: 1, fontWeight: '700' }]}>
                                    {hasLiveFromOtherDay
                                      ? `HOY Y EN VIVO (${todayMatches.length})`
                                      : `PARTIDOS DE HOY (${todayMatches.length})`}
                                  </ThemedText>
                                  <ThemedText style={[Typography.small, { color: Palette.neonGreen, fontWeight: '700', fontSize: 10 }]}>
                                    {expandedTodayMatches ? 'MINIMIZAR [−]' : 'EXPANDIR [+]'}
                                  </ThemedText>
                                </Pressable>
                                {expandedTodayMatches && todayMatches.map((m) => {
                                  const tPrediction = myPredictions.find((p) => p.matchId === m.id);
                                  const tFinished = m.status === 'finished';
                                  const tLive = m.status === 'live';
                                  const tStarted = isMatchStarted(m.matchDate);
                                  const tBlocked = tFinished || tLive || tStarted;
                                  const matchDay = getMatchLocalDateString(m.matchDate);
                                  const isKickoffToday = matchDay === todayStr;

                                  return (
                                    <Pressable
                                      key={m.id}
                                      onPress={() => openPrediction(q, m, tPrediction)}
                                      style={({ pressed }) => ({
                                        backgroundColor: Palette.surface + '40',
                                        borderRadius: BorderRadius.md,
                                        borderWidth: 1,
                                        borderColor: tLive ? Palette.neonPink + '30' : '#2A2A4A',
                                        padding: Spacing.four,
                                        marginBottom: Spacing.two,
                                        opacity: pressed ? 0.9 : 1,
                                      })}
                                    >
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two }}>
                                        <ThemedText style={[Typography.small, { color: theme.textMuted, fontSize: 10 }]}>
                                          {m.stage.toUpperCase()} {m.groupName ? `· GRUPO ${m.groupName}` : ''}
                                          {!isKickoffToday && tLive ? ` · ${formatMatchDateTime(m.matchDate)}` : ''}
                                        </ThemedText>
                                        {tLive && (
                                          <ThemedText style={[Typography.small, { color: Palette.neonPink, fontWeight: '700', fontSize: 10 }]}>
                                            <MaterialIcons name="fiber-manual-record" size={10} color={Palette.neonPink} /> EN VIVO{m.currentMinute ? ` (${m.currentMinute}')` : ''}
                                          </ThemedText>
                                        )}
                                        {tFinished && (
                                          <ThemedText style={[Typography.small, { color: Palette.neonGreen, fontWeight: '700', fontSize: 10 }]}>
                                            FINALIZADO
                                          </ThemedText>
                                        )}
                                      </View>

                                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.two }}>
                                          <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600', flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                                            {m.homeTeam}
                                          </ThemedText>
                                          <Image source={{ uri: getTeamLogo(m.homeTeam) }} style={{ width: 22, height: 22, borderRadius: 4 }} contentFit="contain" />
                                        </View>

                                        <View style={{ alignItems: 'center', minWidth: 80, paddingHorizontal: Spacing.two }}>
                                          {tBlocked ? (
                                            <View style={{ alignItems: 'center' }}>
                                              <ThemedText style={[Typography.scoreSmall, { color: tLive ? Palette.neonPink : theme.text, fontWeight: '700' }]}>
                                                {m.homeScore !== null ? `${m.homeScore} – ${m.awayScore}` : '– : –'}
                                              </ThemedText>
                                              <ThemedText style={[Typography.small, { color: theme.textMuted, fontSize: 9, textTransform: 'none', marginTop: 2 }]}>
                                                Marcador Real
                                              </ThemedText>
                                            </View>
                                          ) : (
                                            <View style={{ alignItems: 'center' }}>
                                              <ThemedText style={[Typography.scoreSmall, { color: tPrediction ? Palette.neonGreen : theme.textMuted + '50', fontWeight: '700' }]}>
                                                {tPrediction ? `${tPrediction.predictedHomeScore} – ${tPrediction.predictedAwayScore}` : 'VS'}
                                              </ThemedText>
                                              <ThemedText style={[Typography.small, { color: tPrediction ? Palette.neonGreen : theme.textMuted, fontSize: 9, textTransform: 'none', marginTop: 2 }]}>
                                                {tPrediction ? 'Tu Pronóstico' : 'Sin Pronóstico'}
                                              </ThemedText>
                                            </View>
                                          )}
                                        </View>

                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: Spacing.two }}>
                                          <Image source={{ uri: getTeamLogo(m.awayTeam) }} style={{ width: 22, height: 22, borderRadius: 4 }} contentFit="contain" />
                                          <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600', flex: 1, textAlign: 'left' }]} numberOfLines={1}>
                                            {m.awayTeam}
                                          </ThemedText>
                                        </View>
                                      </View>

                                      {tBlocked && (
                                        <View style={{ marginTop: Spacing.three, paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: '#2A2A4A', gap: Spacing.two }}>
                                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                              <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                                Tu pronóstico:{' '}
                                              </ThemedText>
                                              <ThemedText style={[Typography.caption, { color: tPrediction ? Palette.neonCyan : theme.textMuted, fontWeight: '700' }]}>
                                                {tPrediction ? `${tPrediction.predictedHomeScore} – ${tPrediction.predictedAwayScore}` : 'Ninguno'}
                                              </ThemedText>
                                            </View>
                                            {tPrediction && matchHasScoreForScoring(m.status, m.homeScore, m.awayScore) && (
                                              <View style={{
                                                backgroundColor: tLive
                                                  ? Palette.neonPink + '15'
                                                  : tPrediction.pointsEarned > 0
                                                    ? Palette.neonGreen + '15'
                                                    : theme.textMuted + '15',
                                                borderRadius: BorderRadius.sm,
                                                paddingHorizontal: Spacing.two,
                                                paddingVertical: 2,
                                              }}>
                                                <ThemedText style={[Typography.small, {
                                                  color: tLive
                                                    ? Palette.neonPink
                                                    : tPrediction.pointsEarned > 0
                                                      ? Palette.neonGreen
                                                      : theme.textMuted,
                                                  fontWeight: '700',
                                                  fontSize: 10,
                                                }]}>
                                                  +{tPrediction.pointsEarned} PTS{tLive ? ' · VIVO' : ''}
                                                </ThemedText>
                                              </View>
                                            )}
                                          </View>
                                        </View>
                                      )}

                                        <View style={{ alignItems: 'center', marginTop: Spacing.two, paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: '#2A2A4A' }}>
                                          <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                            {tBlocked && tFinished ? 'Jugado' : 'Inicio'}: {formatMatchDateTime(m.matchDate)}
                                          </ThemedText>
                                        </View>
                                    </Pressable>
                                  );
                                })}
                              </View>
                            );
                          })()}

                          {q.matches.length > 0 && (
                            <View style={{ marginBottom: Spacing.three }}>
                              <Pressable 
                                onPress={() => setCollapsedSections(prev => ({ ...prev, [q.id]: { ...prev[q.id], matches: !isMatchesCollapsed } }))}
                                style={({ pressed }) => ({
                                  flexDirection: 'row', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  marginBottom: Spacing.two,
                                  backgroundColor: Palette.neonOrange + '0A',
                                  paddingVertical: Spacing.two,
                                  paddingHorizontal: Spacing.three,
                                  borderRadius: BorderRadius.sm,
                                  borderWidth: 1,
                                  borderColor: Palette.neonOrange + '20',
                                  opacity: pressed ? 0.8 : 1,
                                })}
                              >
                                <ThemedText style={[Typography.small, { color: Palette.neonOrange, letterSpacing: 1, fontWeight: '700' }]}>
                                  PARTIDOS
                                </ThemedText>
                                <ThemedText style={[Typography.small, { color: Palette.neonOrange, fontWeight: '700', fontSize: 10 }]}>
                                  {isMatchesCollapsed ? 'EXPANDIR [+]' : 'MINIMIZAR [−]'}
                                </ThemedText>
                              </Pressable>
                              
                              {!isMatchesCollapsed && (
                                <>
                                  {/* Selector de tamaño de página */}
                                  <View style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    gap: Spacing.two, 
                                    marginBottom: Spacing.three,
                                    marginTop: Spacing.one,
                                    paddingHorizontal: Spacing.one
                                  }}>
                                    <ThemedText style={[Typography.caption, { color: theme.textMuted, fontSize: 11 }]}>
                                      Mostrar por pág:
                                    </ThemedText>
                                    {[5, 10, 20, -1].map((size) => {
                                      const isSelected = (matchPageSizes[q.id] ?? 5) === size;
                                      const sizeLabel = size === -1 ? 'Todos' : size.toString();
                                      return (
                                        <Pressable
                                          key={size}
                                          onPress={() => {
                                            setMatchPageSizes(prev => ({ ...prev, [q.id]: size }));
                                            setMatchPages(prev => ({ ...prev, [q.id]: 1 }));
                                          }}
                                          style={({ pressed }) => ({
                                            backgroundColor: isSelected ? Palette.neonOrange + '20' : Palette.surface,
                                            borderColor: isSelected ? Palette.neonOrange : '#2A2A4A',
                                            borderWidth: 1,
                                            borderRadius: BorderRadius.full,
                                            paddingHorizontal: Spacing.three,
                                            paddingVertical: 2,
                                            opacity: pressed ? 0.8 : 1,
                                          })}
                                        >
                                          <ThemedText style={[Typography.small, { color: isSelected ? Palette.neonOrange : theme.textMuted, fontSize: 10, fontWeight: '700' }]}>
                                            {sizeLabel}
                                          </ThemedText>
                                        </Pressable>
                                      );
                                    })}
                                  </View>

                                  {paginatedMatches.map((m) => {
                                    const prediction = myPredictions.find((p) => p.matchId === m.id);
                                    const isFinished = m.status === 'finished';
                                    const isLive = m.status === 'live';
                                    const hasStarted = isMatchStarted(m.matchDate);
                                    const isBlocked = isFinished || isLive || hasStarted;

                                    return (
                                      <Pressable
                                        key={m.id}
                                        onPress={() => openPrediction(q, m, prediction)}
                                        style={({ pressed }) => ({
                                          backgroundColor: Palette.surface + '40',
                                          borderRadius: BorderRadius.md,
                                          borderWidth: 1,
                                          borderColor: isLive ? Palette.neonPink + '30' : '#2A2A4A',
                                          padding: Spacing.four,
                                          marginBottom: Spacing.two,
                                          opacity: pressed ? 0.9 : 1,
                                        })}
                                      >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two }}>
                                          <ThemedText style={[Typography.small, { color: theme.textMuted, fontSize: 10 }]}>
                                            {m.stage.toUpperCase()} {m.groupName ? `· GRUPO ${m.groupName}` : ''}
                                          </ThemedText>
                                          {isLive && (
                                            <ThemedText style={[Typography.small, { color: Palette.neonPink, fontWeight: '700', fontSize: 10 }]}>
                                              <MaterialIcons name="fiber-manual-record" size={10} color={Palette.neonPink} /> EN VIVO{m.currentMinute ? ` (${m.currentMinute}')` : ''}
                                            </ThemedText>
                                          )}
                                          {isFinished && (
                                            <ThemedText style={[Typography.small, { color: Palette.neonGreen, fontWeight: '700', fontSize: 10 }]}>
                                              FINALIZADO
                                            </ThemedText>
                                          )}
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.two }}>
                                            <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600', flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                                              {m.homeTeam}
                                            </ThemedText>
                                            <Image
                                              source={{ uri: getTeamLogo(m.homeTeam) }}
                                              style={{ width: 22, height: 22, borderRadius: 4 }}
                                              contentFit="contain"
                                            />
                                          </View>

                                          <View style={{ alignItems: 'center', minWidth: 80, paddingHorizontal: Spacing.two }}>
                                            {isBlocked ? (
                                              <View style={{ alignItems: 'center' }}>
                                                <ThemedText style={[Typography.scoreSmall, { color: isLive ? Palette.neonPink : theme.text, fontWeight: '700' }]}>
                                                  {m.homeScore !== null ? `${m.homeScore} – ${m.awayScore}` : '– : –'}
                                                </ThemedText>
                                                <ThemedText style={[Typography.small, { color: theme.textMuted, fontSize: 9, textTransform: 'none', marginTop: 2 }]}>
                                                  Marcador Real
                                                </ThemedText>
                                              </View>
                                            ) : (
                                              <View style={{ alignItems: 'center' }}>
                                                <ThemedText style={[Typography.scoreSmall, { color: prediction ? Palette.neonGreen : theme.textMuted + '50', fontWeight: '700' }]}>
                                                  {prediction ? `${prediction.predictedHomeScore} – ${prediction.predictedAwayScore}` : 'VS'}
                                                </ThemedText>
                                                <ThemedText style={[Typography.small, { color: prediction ? Palette.neonGreen : theme.textMuted, fontSize: 9, textTransform: 'none', marginTop: 2 }]}>
                                                  {prediction ? 'Tu Pronóstico' : 'Sin Pronóstico'}
                                                </ThemedText>
                                              </View>
                                            )}
                                          </View>

                                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: Spacing.two }}>
                                            <Image
                                              source={{ uri: getTeamLogo(m.awayTeam) }}
                                              style={{ width: 22, height: 22, borderRadius: 4 }}
                                              contentFit="contain"
                                            />
                                            <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600', flex: 1, textAlign: 'left' }]} numberOfLines={1}>
                                              {m.awayTeam}
                                            </ThemedText>
                                          </View>
                                        </View>

                                        {isBlocked && (
                                          <View style={{ 
                                            marginTop: Spacing.three,
                                            paddingTop: Spacing.two,
                                            borderTopWidth: 1,
                                            borderTopColor: '#2A2A4A',
                                            gap: Spacing.two
                                          }}>
                                            <View style={{ 
                                              flexDirection: 'row', 
                                              justifyContent: 'space-between', 
                                              alignItems: 'center',
                                            }}>
                                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                                  Tu pronóstico:{' '}
                                                </ThemedText>
                                                <ThemedText style={[Typography.caption, { color: prediction ? Palette.neonCyan : theme.textMuted, fontWeight: '700' }]}>
                                                  {prediction ? `${prediction.predictedHomeScore} – ${prediction.predictedAwayScore}` : 'Ninguno'}
                                                </ThemedText>
                                              </View>
                                              
                                              {prediction && matchHasScoreForScoring(m.status, m.homeScore, m.awayScore) && (
                                                <View style={{ 
                                                  backgroundColor: isLive
                                                    ? Palette.neonPink + '15'
                                                    : prediction.pointsEarned > 0
                                                      ? Palette.neonGreen + '15'
                                                      : theme.textMuted + '15',
                                                  borderRadius: BorderRadius.sm,
                                                  paddingHorizontal: Spacing.two,
                                                  paddingVertical: 2
                                                }}>
                                                  <ThemedText style={[Typography.small, { 
                                                    color: isLive
                                                      ? Palette.neonPink
                                                      : prediction.pointsEarned > 0
                                                        ? Palette.neonGreen
                                                        : theme.textMuted,
                                                    fontWeight: '700',
                                                    fontSize: 10
                                                  }]}>
                                                    +{prediction.pointsEarned} PTS{isLive ? ' · VIVO' : ''}
                                                  </ThemedText>
                                                </View>
                                              )}
                                            </View>

                                            {/* Pronósticos de otros participantes (solo si el juego comenzó) */}
                                            {(() => {
                                              const others = (q.allPredictions || [])
                                                .filter((ap) => ap.participant.userId !== auth.user?.id)
                                                .map((ap) => {
                                                  const pred = ap.predictions.find((p) => p.matchId === m.id);
                                                  return {
                                                    name: ap.participant.user?.displayName || 'Usuario',
                                                    pred,
                                                  };
                                                });

                                              if (others.length === 0) return null;

                                              return (
                                                <View style={{ 
                                                  marginTop: Spacing.one,
                                                  paddingTop: Spacing.two,
                                                  borderTopWidth: 1,
                                                  borderTopColor: '#2A2A4A' + '50',
                                                  gap: Spacing.one
                                                }}>
                                                  <Pressable
                                                    onPress={() => setExpandedOtherPreds(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                                    style={({ pressed }) => ({
                                                      flexDirection: 'row',
                                                      justifyContent: 'space-between',
                                                      alignItems: 'center',
                                                      opacity: pressed ? 0.7 : 1,
                                                    })}
                                                  >
                                                    <ThemedText style={[Typography.caption, { color: theme.textMuted, fontWeight: '700', fontSize: 10, letterSpacing: 0.5 }]}>
                                                      PRONÓSTICOS DE OTROS PARTICIPANTES ({others.length})
                                                    </ThemedText>
                                                    <ThemedText style={[Typography.small, { color: theme.textMuted, fontSize: 10 }]}>
                                                      {expandedOtherPreds[m.id] ? '−' : '+'}
                                                    </ThemedText>
                                                  </Pressable>
                                                  {expandedOtherPreds[m.id] && others.map((o, idx) => (
                                                    <View key={idx} style={{ 
                                                      flexDirection: 'row', 
                                                      justifyContent: 'space-between', 
                                                      alignItems: 'center'
                                                    }}>
                                                      <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                                        {o.name}
                                                      </ThemedText>
                                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                                                        <ThemedText style={[Typography.caption, { color: o.pred ? theme.text : theme.textMuted, fontWeight: '600' }]}>
                                                          {o.pred ? `${o.pred.predictedHomeScore} – ${o.pred.predictedAwayScore}` : 'Ninguno'}
                                                        </ThemedText>
                                                        {o.pred && o.pred.pointsEarned !== undefined && matchHasScoreForScoring(m.status, m.homeScore, m.awayScore) && (
                                                          <ThemedText style={[Typography.caption, {
                                                            color: isLive
                                                              ? Palette.neonPink
                                                              : o.pred.pointsEarned > 0
                                                                ? Palette.neonGreen
                                                                : theme.textMuted,
                                                            fontWeight: '700',
                                                            fontSize: 10,
                                                          }]}>
                                                            (+{o.pred.pointsEarned} pts{isLive ? ' · vivo' : ''})
                                                          </ThemedText>
                                                        )}
                                                      </View>
                                                    </View>
                                                  ))}
                                                </View>
                                              );
                                            })()}
                                          </View>
                                        )}

                                        <View style={{ 
                                          alignItems: 'center',
                                          marginTop: Spacing.two,
                                          paddingTop: Spacing.two,
                                          borderTopWidth: 1,
                                          borderTopColor: '#2A2A4A'
                                        }}>
                                          <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                            {isBlocked && isFinished ? 'Jugado' : 'Inicio'}: {formatMatchDateTime(m.matchDate)}
                                          </ThemedText>
                                        </View>
                                      </Pressable>
                                    );
                                  })}

                                  {totalPages > 1 && (
                                    <View style={{ 
                                      flexDirection: 'row', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      marginTop: Spacing.two,
                                      paddingVertical: Spacing.two,
                                    }}>
                                      <Pressable
                                        disabled={page === 1}
                                        onPress={() => setMatchPages(prev => ({ ...prev, [q.id]: page - 1 }))}
                                        style={({ pressed }) => ({
                                          backgroundColor: Palette.surface,
                                          borderColor: page === 1 ? '#2A2A4A' : Palette.neonCyan,
                                          borderWidth: 1,
                                          borderRadius: BorderRadius.sm,
                                          paddingHorizontal: Spacing.three,
                                          paddingVertical: Spacing.one,
                                          opacity: page === 1 ? 0.3 : pressed ? 0.7 : 1,
                                        })}
                                      >
                                        <ThemedText style={[Typography.small, { color: page === 1 ? theme.textMuted : Palette.neonCyan, fontSize: 10 }]}>
                                          ANTERIOR
                                        </ThemedText>
                                      </Pressable>
                                      
                                      <ThemedText style={[Typography.caption, { color: theme.textMuted, fontSize: 11 }]}>
                                        Pág. {page} de {totalPages}
                                      </ThemedText>
                                      
                                      <Pressable
                                        disabled={page === totalPages}
                                        onPress={() => setMatchPages(prev => ({ ...prev, [q.id]: page + 1 }))}
                                        style={({ pressed }) => ({
                                          backgroundColor: Palette.surface,
                                          borderColor: page === totalPages ? '#2A2A4A' : Palette.neonCyan,
                                          borderWidth: 1,
                                          borderRadius: BorderRadius.sm,
                                          paddingHorizontal: Spacing.three,
                                          paddingVertical: Spacing.one,
                                          opacity: page === totalPages ? 0.3 : pressed ? 0.7 : 1,
                                        })}
                                      >
                                        <ThemedText style={[Typography.small, { color: page === totalPages ? theme.textMuted : Palette.neonCyan, fontSize: 10 }]}>
                                          SIGUIENTE
                                        </ThemedText>
                                      </Pressable>
                                    </View>
                                  )}
                                </>
                              )}
                            </View>
                          )}

                          {q.inviteCode && (
                            <View style={{ backgroundColor: Palette.neonPurple + '10', borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Palette.neonPurple + '30', padding: Spacing.three, marginTop: Spacing.three }}>
                              <ThemedText style={[Typography.caption, { color: theme.textMuted, textAlign: 'center' }]}>
                                Código de invitación:
                              </ThemedText>
                              <ThemedText style={[Typography.headline, { color: Palette.neonYellow, textAlign: 'center', fontFamily: 'monospace', letterSpacing: 4, marginTop: Spacing.one }]}>
                                {q.inviteCode}
                              </ThemedText>
                              <Pressable
                                onPress={() => {
                                  Share.share({
                                    message: `Únete a mi quiniela "${q.name}" con el código: ${q.inviteCode}`,
                                  });
                                }}
                                style={({ pressed }) => ({
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: Spacing.one,
                                  marginTop: Spacing.two,
                                  opacity: pressed ? 0.8 : 1,
                                })}
                              >
                                <MaterialIcons name="share" size={14} color={Palette.neonYellow} />
                                <ThemedText style={[Typography.small, { color: Palette.neonYellow }]}>
                                  COMPARTIR
                                </ThemedText>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={!!predictionModal}
        transparent
        animationType="fade"
        onRequestClose={closePrediction}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closePrediction} />
            <View
              style={styles.modalContent}
              onStartShouldSetResponder={() => true}
            >
              {predictionModal && (
                <NeonScoreInput
                  key={predictionModal.matchId}
                  homeTeam={predictionModal.homeTeam}
                  awayTeam={predictionModal.awayTeam}
                  stage={predictionModal.stage}
                  groupName={predictionModal.groupName}
                  matchDate={predictionModal.matchDate}
                  accent={predictionModal.accent}
                  initialHome={predictionModal.initialHome}
                  initialAway={predictionModal.initialAway}
                  onSave={handleSavePrediction}
                  onCancel={closePrediction}
                  disabled={predictionModal.isBlocked}
                  saving={saving}
                  message={message}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row', position: 'relative' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, paddingTop: 0 },
  scroll: { paddingBottom: BottomTabInset + Spacing.five },
  hero: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.two },
  section: { paddingHorizontal: Spacing.five, gap: Spacing.three },
  modalRoot: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000D9',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  modalContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  predictionCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.five },
});
