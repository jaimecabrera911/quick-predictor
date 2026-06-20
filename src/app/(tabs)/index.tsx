import { useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Modal, Alert, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StadiumCard } from '@/components/ui/stadium-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { Typography } from '@/constants/typography';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
  Palette as originalPalette,
  BorderRadius,
  NeonAccent,
} from '@/constants/theme';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/db/context';
import { resolveMatchPlaceholders } from '@/utils/match';
import { formatMatchDateTime, isMatchStarted } from '@/utils/date';
import type { Tournament, Match, Quiniela } from '@/db/types';

export default function TorneosScreen() {
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
  const ACCENT_COLORS: Record<string, string> = {
    green: Palette.neonGreen,
    purple: Palette.neonPurple,
    orange: Palette.neonOrange,
    cyan: Palette.neonCyan,
    pink: Palette.neonPink,
    yellow: Palette.neonYellow,
  };
  const auth = useAuth();
  const repo = useRepository();
  const [tournaments, setTournaments] = useState<(Tournament & { matches: Match[] })[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createTarget, setCreateTarget] = useState<Tournament | null>(null);
  const [quinielaName, setQuinielaName] = useState('');
  const [quinielaDesc, setQuinielaDesc] = useState('');
  const [quinielaDeadline, setQuinielaDeadline] = useState('');
  const [rulesExact, setRulesExact] = useState('5');
  const [rulesWinner, setRulesWinner] = useState('2');
  const [rulesGoal, setRulesGoal] = useState('2');
  const [rulesGoalDiff, setRulesGoalDiff] = useState('1');
  const [createdQuiniela, setCreatedQuiniela] = useState<Quiniela | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [userQuinielas, setUserQuinielas] = useState<Quiniela[]>([]);
  const [userQuinielasLoading, setUserQuinielasLoading] = useState(true);

  const [editingQuiniela, setEditingQuiniela] = useState<Quiniela | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editRulesExact, setEditRulesExact] = useState('5');
  const [editRulesWinner, setEditRulesWinner] = useState('2');
  const [editRulesGoal, setEditRulesGoal] = useState('2');
  const [editRulesGoalDiff, setEditRulesGoalDiff] = useState('1');

  const loadData = useCallback(async () => {
    try {
      const [all, allQuinielas] = await Promise.all([
        repo.getTournaments(),
        repo.getQuinielas(),
      ]);
      const active = all.filter((t) => t.status === 'active');
      const withMatches = await Promise.all(
        active.map(async (t) => {
          const matches = await repo.getMatchesByTournament(t.id);
          const resolved = resolveMatchPlaceholders(matches);
          return { ...t, matches: resolved };
        }),
      );
      setTournaments(withMatches);

      const myQuinielas: Quiniela[] = [];
      for (const q of allQuinielas) {
        const participants = await repo.getParticipants(q.id);
        const isParticipant = participants.some((p) => p.userId === auth.user?.id);
        const isCreator = q.createdBy === auth.user?.id;
        if (isParticipant || isCreator) {
          myQuinielas.push(q);
        }
      }
      setUserQuinielas(myQuinielas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setUserQuinielasLoading(false);
    }
  }, [repo, auth.user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (createTarget || editingQuiniela || createdQuiniela) return;
      loadData();
    }, [loadData, createTarget, editingQuiniela, createdQuiniela])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCreateQuiniela = useCallback(async () => {
    if (!createTarget || !quinielaName.trim() || !auth.user) return;
    setCreating(true);
    setCreateError(null);
    try {
      const deadlineVal = quinielaDeadline.trim() ? new Date(quinielaDeadline.trim()).toISOString() : null;
      if (quinielaDeadline.trim() && isNaN(new Date(quinielaDeadline.trim()).getTime())) {
        setCreateError('Fecha límite inválida (usa formato YYYY-MM-DD)');
        setCreating(false);
        return;
      }
      const q = await repo.createQuiniela({
        tournamentId: createTarget.id,
        name: quinielaName.trim(),
        description: quinielaDesc.trim(),
        deadline: deadlineVal,
        accessType: 'code',
        scoringRules: {
          pointsExactScore: parseInt(rulesExact, 10) || 5,
          pointsWinner: parseInt(rulesWinner, 10) || 2,
          pointsGoal: parseInt(rulesGoal, 10) || 2,
          pointsGoalDiff: parseInt(rulesGoalDiff, 10) || 1,
        },
        createdBy: auth.user.id,
      });
      setCreatedQuiniela(q);
      setUserQuinielas((prev) => [...prev, q]);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }, [createTarget, quinielaName, quinielaDesc, quinielaDeadline, rulesExact, rulesWinner, rulesGoal, rulesGoalDiff, auth.user, repo]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim() || !auth.user) return;
    setJoining(true);
    setJoinMessage(null);
    try {
      const q = await repo.joinQuiniela(joinCode.trim().toUpperCase(), auth.user.id);
      if (q) {
        setJoinMessage(`¡Unido a "${q.name}"!`);
        setJoinCode('');
        setUserQuinielas((prev) => {
          if (prev.some((x) => x.id === q.id)) return prev;
          return [...prev, q];
        });
      } else {
        setJoinMessage('Código inválido');
      }
    } catch (e: any) {
      setJoinMessage(e.message);
    } finally {
      setJoining(false);
    }
  }, [joinCode, auth.user, repo]);

  const handleUpdateQuiniela = useCallback(async () => {
    if (!editingQuiniela || !editName.trim() || !auth.user) return;
    try {
      const deadlineVal = editDeadline.trim() ? new Date(editDeadline.trim()).toISOString() : null;
      if (editDeadline.trim() && isNaN(new Date(editDeadline.trim()).getTime())) {
        setCreateError('Fecha límite inválida (usa formato YYYY-MM-DD)');
        return;
      }
      const updated = await repo.updateQuiniela(
        editingQuiniela.id,
        editName.trim(),
        editDesc.trim(),
        deadlineVal,
        {
          pointsExactScore: parseInt(editRulesExact, 10) || 5,
          pointsWinner: parseInt(editRulesWinner, 10) || 2,
          pointsGoal: parseInt(editRulesGoal, 10) || 2,
          pointsGoalDiff: parseInt(editRulesGoalDiff, 10) || 1,
        }
      );
      setUserQuinielas((prev) => prev.map((q) => q.id === updated.id ? updated : q));
      setEditingQuiniela(null);
    } catch (e: any) {
      setCreateError(e.message);
    }
  }, [editingQuiniela, editName, editDesc, editDeadline, editRulesExact, editRulesWinner, editRulesGoal, editRulesGoalDiff, repo, auth.user]);

  const handleDeleteQuiniela = useCallback(async (quinielaId: string) => {
    try {
      await repo.deleteQuiniela(quinielaId);
      setUserQuinielas((prev) => prev.filter((q) => q.id !== quinielaId));
    } catch (e: any) {
      setCreateError(e.message);
    }
  }, [repo]);

  const handleLeaveQuiniela = useCallback(async (quinielaId: string) => {
    if (!auth.user) return;
    try {
      await repo.leaveQuiniela(quinielaId, auth.user.id);
      setUserQuinielas((prev) => prev.filter((q) => q.id !== quinielaId));
    } catch (e: any) {
      setCreateError(e.message);
    }
  }, [repo, auth.user]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Palette.neonGreen}
              colors={[Palette.neonGreen]}
            />
          }
        >
          <View style={styles.hero}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <ThemedText
                  style={[Typography.small, { color: Palette.neonGreen, letterSpacing: 4 }]}
                >
                  TORNEOS DISPONIBLES
                </ThemedText>
                <ThemedText style={[Typography.display1, { color: theme.text }]}>
                  Quiniela
                </ThemedText>
              </View>
              <Pressable
                onPress={auth.signOut}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  padding: Spacing.two,
                })}
              >
                <ThemedText
                  style={[Typography.small, { color: theme.textMuted, letterSpacing: 1 }]}
                >
                  {auth.user?.displayName ?? auth.user?.email ?? ''}
                  {'\n'}CERRAR SESIÓN
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <ThemedText
              style={[Typography.body, { color: theme.textMuted, textAlign: 'center', marginTop: Spacing.six }]}
            >
              Cargando torneos...
            </ThemedText>
          ) : tournaments.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText
                style={[Typography.body, { color: theme.textMuted, textAlign: 'center' }]}
              >
                No hay torneos activos
              </ThemedText>
              <ThemedText
                style={[Typography.caption, { color: theme.textMuted, textAlign: 'center', marginTop: Spacing.two }]}
              >
                El administrador debe activar torneos desde el panel ADMIN
              </ThemedText>
            </View>
          ) : (
            <View style={styles.section}>
              {tournaments.map((t) => {
                const accent = t.accent in ACCENT_COLORS ? t.accent : 'green';
                const accentColor = ACCENT_COLORS[accent];
                const isExpanded = expandedId === t.id;

                return (
                  <View key={t.id} style={{ marginBottom: Spacing.five, backgroundColor: accentColor + '08', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: accentColor + '15', padding: Spacing.four }}>
                    <Pressable
                      onPress={() => setExpandedId(isExpanded ? null : t.id)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ gap: Spacing.half, flex: 1 }}>
                          <ThemedText
                            style={[Typography.small, { color: accentColor, letterSpacing: 2 }]}
                          >
                            {t.season}
                          </ThemedText>
                          <ThemedText style={[Typography.headline, { color: theme.text }]}>
                            {t.name}
                          </ThemedText>
                          <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                            {t.matches.length} partidos
                          </ThemedText>
                        </View>
                        <ThemedText style={[Typography.small, { color: accentColor, fontWeight: '700', fontSize: 10 }]}>
                          {isExpanded ? 'MINIMIZAR [−]' : 'EXPANDIR [+]'}
                        </ThemedText>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setCreateTarget(t);
                        setQuinielaName('');
                        setQuinielaDesc('');
                        setQuinielaDeadline('');
                        setRulesExact('5');
                        setRulesWinner('2');
                        setRulesGoal('2');
                        setRulesGoalDiff('1');
                        setCreatedQuiniela(null);
                        setCreateError(null);
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: accentColor + '20',
                        borderRadius: BorderRadius.sm,
                        paddingVertical: Spacing.three,
                        alignItems: 'center',
                        marginTop: Spacing.three,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <ThemedText
                        style={[Typography.bodyBold, { color: accentColor, fontWeight: '700', letterSpacing: 1 }]}
                      >
                        + CREAR QUINIELA
                      </ThemedText>
                    </Pressable>

                    {isExpanded && (
                      <View style={{ marginTop: Spacing.three }}>
                        {t.matches.length === 0 ? (
                          <ThemedText
                            style={[Typography.caption, { color: theme.textMuted, textAlign: 'center' }]}
                          >
                            No hay partidos disponibles
                          </ThemedText>
                        ) : (
                          <View style={{ gap: Spacing.two }}>
                            {t.matches.map((m) => {
                              const formatted = formatMatchDateTime(m.matchDate);

                              return (
                                <StadiumCard key={m.id} accent={accent as any}>
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: Spacing.three,
                                    }}
                                  >
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                      <ThemedText
                                        style={[Typography.body, { color: theme.text, fontWeight: '600' }]}
                                      >
                                        {m.homeTeam}
                                      </ThemedText>
                                    </View>

                                    <View style={{ alignItems: 'center', minWidth: 60 }}>
                                      {m.homeScore !== null ? (
                                        <ThemedText
                                          style={[
                                            Typography.score,
                                            { color: accentColor, fontWeight: '700' },
                                          ]}
                                        >
                                          {m.homeScore} – {m.awayScore}
                                        </ThemedText>
                                      ) : (
                                        <ThemedText
                                          style={[Typography.small, { color: theme.textMuted }]}
                                        >
                                          VS
                                        </ThemedText>
                                      )}
                                      <ThemedText
                                        style={[Typography.caption, { color: theme.textMuted, marginTop: Spacing.half }]}
                                      >
                                        {formatted}
                                      </ThemedText>
                                    </View>

                                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                      <ThemedText
                                        style={[Typography.body, { color: theme.text, fontWeight: '600' }]}
                                      >
                                        {m.awayTeam}
                                      </ThemedText>
                                    </View>
                                  </View>

                                  {m.groupName && (
                                    <ThemedText
                                      style={[
                                        Typography.caption,
                                        { color: theme.textMuted, marginTop: Spacing.two, textAlign: 'center' },
                                      ]}
                                    >
                                      Grupo {m.groupName}
                                    </ThemedText>
                                  )}
                                </StadiumCard>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <StadiumCard accent="cyan" glow={false}>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: Spacing.three,
                    alignItems: 'center',
                  }}
                >
                  <ThemedTextInput
                    value={joinCode}
                    onChangeText={setJoinCode}
                    placeholder="Código de invitación"
                    autoCapitalize="characters"
                    accent="cyan"
                    containerStyle={{ flex: 1, marginBottom: 0 }}
                  />
                  <Pressable
                    onPress={handleJoin}
                    disabled={joining || !joinCode.trim()}
                    style={({ pressed }) => ({
                      backgroundColor: Palette.neonCyan,
                      borderRadius: BorderRadius.sm,
                      paddingHorizontal: Spacing.five,
                      paddingVertical: Spacing.three,
                      opacity: pressed || joining || !joinCode.trim() ? 0.8 : 1,
                    })}
                  >
                    <ThemedText
                      style={[Typography.bodyBold, { color: Palette.black, fontWeight: '700', letterSpacing: 1 }]}
                    >
                      {joining ? '...' : 'UNIRSE'}
                    </ThemedText>
                  </Pressable>
                </View>
                {joinMessage && (
                  <ThemedText
                    style={[
                      Typography.caption,
                      {
                        color: joinMessage.includes('¡Unido') ? Palette.neonGreen : Palette.neonPink,
                        marginTop: Spacing.two,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {joinMessage}
                  </ThemedText>
                )}
              </StadiumCard>

              {userQuinielas.length > 0 && (
                <View style={{ gap: Spacing.three }}>
                  <ThemedText
                    style={[Typography.small, { color: Palette.neonPurple, letterSpacing: 2, marginTop: Spacing.two }]}
                  >
                    MIS QUINIELAS
                  </ThemedText>
                  {userQuinielas.map((q) => {
                    const isCreator = q.createdBy === auth.user?.id;

                    const confirmDelete = () => {
                      if (Platform.OS === 'web') {
                        if (window.confirm(`¿Estás seguro de que quieres eliminar la quiniela "${q.name}"?`)) {
                          handleDeleteQuiniela(q.id);
                        }
                      } else {
                        Alert.alert(
                          'Confirmación',
                          `¿Estás seguro de que quieres eliminar la quiniela "${q.name}"?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteQuiniela(q.id) }
                          ]
                        );
                      }
                    };

                    const confirmLeave = () => {
                      if (Platform.OS === 'web') {
                        if (window.confirm(`¿Estás seguro de que deseas salirte de la quiniela "${q.name}"?`)) {
                          handleLeaveQuiniela(q.id);
                        }
                      } else {
                        Alert.alert(
                          'Confirmación',
                          `¿Estás seguro de que deseas salirte de la quiniela "${q.name}"?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Salir', style: 'destructive', onPress: () => handleLeaveQuiniela(q.id) }
                          ]
                        );
                      }
                    };

                    return (
                      <StadiumCard key={q.id} accent="purple" glow={false}>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600' }]}>
                            {q.name}
                          </ThemedText>
                          {q.description ? (
                            <ThemedText style={[Typography.caption, { color: theme.textMuted, marginTop: Spacing.half }]}>
                              {q.description}
                            </ThemedText>
                          ) : null}
                          {q.inviteCode && (
                            <ThemedText style={[Typography.caption, { color: theme.textMuted, marginTop: Spacing.half }]}>
                              Código: <ThemedText style={{ color: Palette.neonYellow, fontFamily: 'monospace' }}>{q.inviteCode}</ThemedText>
                            </ThemedText>
                          )}

                          <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three }}>
                            {isCreator ? (
                              <>
                                <Pressable
                                  onPress={() => {
                                    setEditingQuiniela(q);
                                    setEditName(q.name);
                                    setEditDesc(q.description || '');
                                    setEditDeadline(q.deadline ? new Date(q.deadline).toISOString().split('T')[0] : '');
                                    setEditRulesExact(q.scoringRules.pointsExactScore.toString());
                                    setEditRulesWinner(q.scoringRules.pointsWinner.toString());
                                    setEditRulesGoal(q.scoringRules.pointsGoal.toString());
                                    setEditRulesGoalDiff(q.scoringRules.pointsGoalDiff.toString());
                                    setCreateError(null);
                                  }}
                                  style={({ pressed }) => ({
                                    flex: 1,
                                    backgroundColor: Palette.neonCyan + '15',
                                    borderColor: Palette.neonCyan,
                                    borderWidth: 1,
                                    borderRadius: BorderRadius.sm,
                                    paddingVertical: Spacing.two,
                                    alignItems: 'center',
                                    opacity: pressed ? 0.7 : 1,
                                  })}
                                >
                                  <ThemedText style={[Typography.caption, { color: Palette.neonCyan, fontWeight: '700' }]}>
                                    EDITAR
                                  </ThemedText>
                                </Pressable>
                                <Pressable
                                  onPress={confirmDelete}
                                  style={({ pressed }) => ({
                                    flex: 1,
                                    backgroundColor: Palette.neonPink + '15',
                                    borderColor: Palette.neonPink,
                                    borderWidth: 1,
                                    borderRadius: BorderRadius.sm,
                                    paddingVertical: Spacing.two,
                                    alignItems: 'center',
                                    opacity: pressed ? 0.7 : 1,
                                  })}
                                >
                                  <ThemedText style={[Typography.caption, { color: Palette.neonPink, fontWeight: '700' }]}>
                                    ELIMINAR
                                  </ThemedText>
                                </Pressable>
                              </>
                            ) : (
                              <Pressable
                                onPress={confirmLeave}
                                style={({ pressed }) => ({
                                  flex: 1,
                                  backgroundColor: Palette.neonOrange + '15',
                                  borderColor: Palette.neonOrange,
                                  borderWidth: 1,
                                  borderRadius: BorderRadius.sm,
                                  paddingVertical: Spacing.two,
                                  alignItems: 'center',
                                  opacity: pressed ? 0.7 : 1,
                                })}
                              >
                                <ThemedText style={[Typography.caption, { color: Palette.neonOrange, fontWeight: '700' }]}>
                                  SALIRSE
                                </ThemedText>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </StadiumCard>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={!!createTarget && !createdQuiniela}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCreateTarget(null)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: createTarget ? ACCENT_COLORS[createTarget.accent in ACCENT_COLORS ? createTarget.accent : 'green'] : Palette.neonGreen,
                borderRadius: 2,
                marginBottom: Spacing.four,
                alignSelf: 'center',
              }}
            />

            <ThemedText style={[Typography.headline, { color: theme.text, marginBottom: Spacing.one }]}>
              Nueva Quiniela
            </ThemedText>
            <ThemedText style={[Typography.small, { color: theme.textMuted, marginBottom: Spacing.five }]}>
              {createTarget?.name}
            </ThemedText>

            <ThemedTextInput
              value={quinielaName}
              onChangeText={setQuinielaName}
              placeholder="Nombre de tu quiniela"
              accent={(createTarget?.accent || 'green') as NeonAccent}
            />

            <ThemedTextInput
              value={quinielaDesc}
              onChangeText={setQuinielaDesc}
              placeholder="Descripción (opcional)"
              multiline
              numberOfLines={3}
              style={{ minHeight: 60, textAlignVertical: 'top' }}
              accent={(createTarget?.accent || 'green') as NeonAccent}
            />

            <ThemedTextInput
              value={quinielaDeadline}
              onChangeText={setQuinielaDeadline}
              placeholder="Fecha límite (YYYY-MM-DD, opcional)"
              accent={(createTarget?.accent || 'green') as NeonAccent}
            />

            <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 1, marginBottom: Spacing.two }]}>
              REGLAS DE PUNTUACIÓN
            </ThemedText>

            <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.four }}>
              {[
                { label: 'Exacto', value: rulesExact, setter: setRulesExact },
                { label: 'Ganador', value: rulesWinner, setter: setRulesWinner },
                { label: 'Gol', value: rulesGoal, setter: setRulesGoal },
                { label: 'Dif.', value: rulesGoalDiff, setter: setRulesGoalDiff },
              ].map((rule) => (
                <View key={rule.label} style={{ flex: 1 }}>
                  <ThemedTextInput
                    label={rule.label}
                    value={rule.value}
                    onChangeText={rule.setter}
                    keyboardType="number-pad"
                    accent={(createTarget?.accent || 'green') as NeonAccent}
                    style={{ textAlign: 'center' }}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              ))}
            </View>

            {createError && (
              <ThemedText style={[Typography.small, { color: Palette.neonPink, marginBottom: Spacing.three }]}>
                {createError}
              </ThemedText>
            )}

            <Pressable
              onPress={handleCreateQuiniela}
              disabled={creating || !quinielaName.trim()}
              style={({ pressed }) => ({
                backgroundColor: createTarget ? ACCENT_COLORS[createTarget.accent in ACCENT_COLORS ? createTarget.accent : 'green'] : Palette.neonGreen,
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.four,
                alignItems: 'center',
                opacity: pressed || creating || !quinielaName.trim() ? 0.8 : 1,
              })}
            >
              <ThemedText style={[Typography.headline, { color: Palette.black, fontWeight: '700', letterSpacing: 2 }]}>
                {creating ? 'CREANDO...' : 'CREAR QUINIELA'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setCreateTarget(null)}
              style={{ marginTop: Spacing.three, alignItems: 'center' }}
            >
              <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                Cancelar
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!createdQuiniela}
        transparent
        animationType="fade"
        onRequestClose={() => { setCreatedQuiniela(null); setCreateTarget(null); }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { setCreatedQuiniela(null); setCreateTarget(null); }}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: Palette.neonGreen,
                borderRadius: 2,
                marginBottom: Spacing.four,
                alignSelf: 'center',
              }}
            />

            <ThemedText style={[Typography.headline, { color: Palette.neonGreen, textAlign: 'center', marginBottom: Spacing.one }]}>
              ¡Quiniela Creada!
            </ThemedText>
            <ThemedText style={[Typography.body, { color: theme.text, textAlign: 'center', marginBottom: Spacing.three }]}>
              {createdQuiniela?.name}
            </ThemedText>

            {createdQuiniela?.inviteCode && (
              <View
                style={{
                  backgroundColor: Palette.black,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: Palette.neonGreen + '30',
                  padding: Spacing.five,
                  alignItems: 'center',
                  marginBottom: Spacing.five,
                }}
              >
                <ThemedText style={[Typography.caption, { color: Palette.whiteMuted, marginBottom: Spacing.two }]}>
                  Comparte este código para invitar:
                </ThemedText>
                <ThemedText
                  style={[
                    Typography.display2,
                    { color: Palette.neonYellow, fontFamily: 'monospace', letterSpacing: 8 },
                  ]}
                >
                  {createdQuiniela.inviteCode}
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={() => { setCreatedQuiniela(null); setCreateTarget(null); }}
              style={({ pressed }) => ({
                backgroundColor: Palette.neonGreen,
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.four,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <ThemedText style={[Typography.headline, { color: Palette.black, fontWeight: '700', letterSpacing: 2 }]}>
                LISTO
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!editingQuiniela}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingQuiniela(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditingQuiniela(null)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: Palette.neonCyan,
                borderRadius: 2,
                marginBottom: Spacing.four,
                alignSelf: 'center',
              }}
            />

            <ThemedText style={[Typography.headline, { color: theme.text, marginBottom: Spacing.one }]}>
              Editar Quiniela
            </ThemedText>
            <ThemedText style={[Typography.small, { color: theme.textMuted, marginBottom: Spacing.five }]}>
              Configuración y Reglas
            </ThemedText>

            <ThemedTextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Nombre de tu quiniela"
              accent="cyan"
            />

            <ThemedTextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Descripción (opcional)"
              multiline
              numberOfLines={3}
              style={{ minHeight: 60, textAlignVertical: 'top' }}
              accent="cyan"
            />

            <ThemedTextInput
              value={editDeadline}
              onChangeText={setEditDeadline}
              placeholder="Fecha límite (YYYY-MM-DD, opcional)"
              accent="cyan"
            />

            <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 1, marginBottom: Spacing.two }]}>
              REGLAS DE PUNTUACIÓN
            </ThemedText>

            <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.four }}>
              {[
                { label: 'Exacto', value: editRulesExact, setter: setEditRulesExact },
                { label: 'Ganador', value: editRulesWinner, setter: setEditRulesWinner },
                { label: 'Gol', value: editRulesGoal, setter: setEditRulesGoal },
                { label: 'Dif.', value: editRulesGoalDiff, setter: setEditRulesGoalDiff },
              ].map((rule) => (
                <View key={rule.label} style={{ flex: 1 }}>
                  <ThemedTextInput
                    label={rule.label}
                    value={rule.value}
                    onChangeText={rule.setter}
                    keyboardType="number-pad"
                    accent="cyan"
                    style={{ textAlign: 'center' }}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              ))}
            </View>

            {createError && (
              <ThemedText style={[Typography.small, { color: Palette.neonPink, marginBottom: Spacing.three }]}>
                {createError}
              </ThemedText>
            )}

            <Pressable
              onPress={handleUpdateQuiniela}
              disabled={!editName.trim()}
              style={({ pressed }) => ({
                backgroundColor: Palette.neonCyan,
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.four,
                alignItems: 'center',
                opacity: pressed || !editName.trim() ? 0.8 : 1,
              })}
            >
              <ThemedText style={[Typography.headline, { color: Palette.black, fontWeight: '700', letterSpacing: 2 }]}>
                GUARDAR CAMBIOS
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setEditingQuiniela(null)}
              style={{ marginTop: Spacing.three, alignItems: 'center' }}
            >
              <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                Cancelar
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingTop: Platform.OS === 'web' ? 85 : 0,
  },
  scroll: {
    paddingBottom: BottomTabInset + Spacing.five,
  },
  hero: {
    padding: Spacing.five,
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  section: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  empty: {
    padding: Spacing.five,
    alignItems: 'center',
    marginTop: Spacing.six,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.five,
  },
});
