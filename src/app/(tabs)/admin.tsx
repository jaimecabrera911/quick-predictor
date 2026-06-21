import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StadiumCard } from '@/components/ui/stadium-card';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { Typography } from '@/constants/typography';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
  Palette as originalPalette,
  BorderRadius,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/db/context';
import { resolveEventPlaceholders } from '@/utils/match';
import { getLeagues, getSeasons, getLeagueMatches, syncTournamentMatches } from '@/services/bzzoiro';
import { mapBSDStatus, mapBSDStage } from '@/services/bzzoiro';
import type { BSDLeague, BSDSeason, BSDEvent } from '@/services/types';
import type { NeonAccent } from '@/constants/theme';
import type { Tournament, Quiniela, User } from '@/db/types';

const ACCENT_MAP: Record<string, NeonAccent> = {
  'World Cup 2026': 'green',
  'Champions League': 'purple',
  'Copa Libertadores': 'orange',
};

function guessAccent(name: string): NeonAccent {
  if (ACCENT_MAP[name]) return ACCENT_MAP[name];
  const lower = name.toLowerCase();
  if (lower.includes('world cup') || lower.includes('copa') || lower.includes('libertadores'))
    return 'green';
  if (lower.includes('champions') || lower.includes('uefa')) return 'purple';
  if (lower.includes('liga') || lower.includes('premier') || lower.includes('serie a'))
    return 'pink';
  if (lower.includes('bundesliga') || lower.includes('ligue')) return 'cyan';
  return 'green';
}

type Tab = 'disponibles' | 'activos' | 'gestion';

export default function AdminScreen() {
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
  const [tab, setTab] = useState<Tab>('disponibles');
  const [search, setSearch] = useState('');
  const [leagues, setLeagues] = useState<BSDLeague[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [allQuinielas, setAllQuinielas] = useState<Quiniela[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loadingGestion, setLoadingGestion] = useState(false);

  const [preview, setPreview] = useState<{
    league: BSDLeague;
    events: BSDEvent[];
  } | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<BSDLeague | null>(null);
  const [seasons, setSeasons] = useState<BSDSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<BSDSeason | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [step, setStep] = useState<'season' | 'preview'>('season');


  useEffect(() => {
    Promise.all([getLeagues(), repo.getTournaments()])
      .then(([leagueData, tourneyData]) => {
        setLeagues(leagueData.results);
        setTournaments(tourneyData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);


  const importedNames = useMemo(
    () => new Set(tournaments.filter((t) => t.status === 'active').map((t) => t.name)),
    [tournaments],
  );

  const filtered = useMemo(() => {
    const active = leagues.filter((l) => l.current_season);

    const byName = new Map<string, BSDLeague>();
    for (const l of active) {
      const existing = byName.get(l.name);
      if (!existing) {
        byName.set(l.name, l);
      } else {
        const eYear = existing.current_season?.year ?? 0;
        const nYear = l.current_season?.year ?? 0;
        if (nYear > eYear) byName.set(l.name, l);
      }
    }
    const unique = Array.from(byName.values());

    const q = search.toLowerCase().trim();
    if (!q) return unique;
    return unique.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q),
    );
  }, [leagues, search]);

  const [manualSeason, setManualSeason] = useState('');

  const openPreview = useCallback(async (league: BSDLeague) => {
    setError(null);
    setStep('season');
    setSelectedSeason(null);
    setSeasons([]);
    setSelectedLeague(league);
    setManualSeason('');
    setLoadingSeasons(true);
    try {
      const seasonData = await getSeasons(league.id);
      const now = new Date().getFullYear();
      const currentId = league.current_season?.id;
      const upcoming = seasonData.results.filter((s) => {
        if (s.id === currentId) return true;
        if (s.year && s.year >= now) return true;
        return false;
      }).sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
      if (league.current_season) {
        const current = upcoming.find((s) => s.id === currentId);
        const others = upcoming.filter((s) => s.id !== currentId);
        setSeasons(current ? [current, ...others] : [league.current_season, ...others]);
      } else {
        setSeasons(upcoming);
      }
    } catch {
      if (league.current_season) {
        setSeasons([league.current_season]);
      } else {
        setSeasons([]);
      }
    } finally {
      setLoadingSeasons(false);
    }
  }, []);

  const loadSeasonEvents = useCallback(async (season: BSDSeason, league: BSDLeague) => {
    setError(null);
    setSelectedSeason(season);
    try {
      const events = await getLeagueMatches(league.id, season.id);
      if (events.results.length === 0) {
        setError(`"${season.name}" no tiene partidos`);
        return;
      }
      const resolved = resolveEventPlaceholders(events.results);
      setPreview({ league, events: resolved });
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const loadManualSeason = useCallback(async () => {
    if (!selectedLeague || !manualSeason.trim()) return;
    const seasonId = parseInt(manualSeason.trim(), 10);
    if (isNaN(seasonId)) { setError('El ID de temporada debe ser un número'); return; }
    setError(null);
    setSelectedSeason({ id: seasonId, name: `Temporada #${seasonId}`, year: null });
    try {
      const events = await getLeagueMatches(selectedLeague.id, seasonId);
      if (events.results.length === 0) {
        setError(`No hay partidos para temporada ${seasonId}`);
        return;
      }
      const resolved = resolveEventPlaceholders(events.results);
      setPreview({ league: selectedLeague, events: resolved });
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
    }
  }, [selectedLeague, manualSeason]);

  const handleImport = useCallback(
    async (league: BSDLeague, events: BSDEvent[]) => {
      setImporting(league.id.toString());
      setError(null);
      setSuccess(null);
      try {
        let tournamentId: string;
        const existing = tournaments.find((t) => t.name === league.name);
        if (existing) {
          await repo.updateTournamentStatus(existing.id, 'active');
          tournamentId = existing.id;
        } else {
          const accent = guessAccent(league.name);
          const tournament = await repo.createTournament({
            name: league.name,
            season: selectedSeason?.name ?? league.country,
            accent,
            createdBy: auth.user?.id ?? 'system',
          });
          await repo.updateTournamentStatus(tournament.id, 'active');
          tournamentId = tournament.id;
        }
        setTournaments(await repo.getTournaments());

        try {
          await repo.importMatches(
            tournamentId,
            events.map((e) => ({
              externalId: e.id.toString(),
              homeTeam: e.home_team,
              awayTeam: e.away_team,
              matchDate: e.event_date,
              stage: mapBSDStage(e.group_name, e.round_name),
              groupName: e.group_name ?? undefined,
              status: mapBSDStatus(e.status),
              homeScore: e.home_score,
              awayScore: e.away_score,
            })),
          );
          setSuccess(`"${league.name}" activado y partidos actualizados (${events.length} partidos)`);
        } catch (importErr: any) {
          setError(`Torneo creado/reactivado pero error al importar partidos: ${importErr.message}`);
        }

        setPreview(null);
        setSelectedSeason(null);
        setSeasons([]);
        setTab('activos');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setImporting(null);
      }
    },
    [repo, selectedSeason, tournaments],
  );

  const loadGestion = useCallback(async () => {
    setLoadingGestion(true);
    try {
      const [qs, part] = await Promise.all([
        repo.getQuinielas(),
        Promise.all((await repo.getQuinielas()).map(async (q) => {
          const p = await repo.getParticipants(q.id);
          return { id: q.id, count: p.length };
        })),
      ]);
      setAllQuinielas(qs);
      const counts: Record<string, number> = {};
      part.forEach((p) => { counts[p.id] = p.count; });
      setParticipantCounts(counts);
      setUsers(qs.map((q) => ({ id: q.createdBy, email: '', displayName: q.createdBy, avatarUrl: null, role: 'user' as const, createdAt: '' })));
    } catch { } finally {
      setLoadingGestion(false);
    }
  }, [repo]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [leagueData, tourneyData] = await Promise.all([
        getLeagues(),
        repo.getTournaments(),
      ]);
      setLeagues(leagueData.results);
      setTournaments(tourneyData);
      if (tab === 'gestion') {
        await loadGestion();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }, [tab, repo, loadGestion]);

  const handleSyncMatches = useCallback(
    async (t: Tournament) => {
      setSyncing(t.id);
      setError(null);
      setSuccess(null);
      try {
        await syncTournamentMatches(repo, t, leagues);
        setSuccess(`"${t.name}" sincronizado con éxito. Marcadores y partidos actualizados.`);
        setTournaments(await repo.getTournaments());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setSyncing(null);
      }
    },
    [leagues, repo],
  );

  if (auth.user?.role !== 'super_admin') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText
            style={[
              Typography.headline,
              {
                color: theme.textMuted,
                textAlign: 'center',
                marginTop: Spacing.six,
              },
            ]}
          >
            Acceso solo para administradores
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={[Typography.display2, { color: theme.text }]}>
            GESTIÓN
          </ThemedText>
          <ThemedText
            style={[
              Typography.caption,
              { color: theme.textMuted, marginTop: Spacing.half },
            ]}
          >
            Activa torneos para que los usuarios creen ligas
          </ThemedText>
        </View>

        <View style={styles.tabRow}>
          <TabButton
            label="DISPONIBLES"
            active={tab === 'disponibles'}
            onPress={() => setTab('disponibles')}
            count={leagues.length}
            color={Palette.neonCyan}
            icon="sports-soccer"
          />
          <TabButton
            label="ACTIVOS"
            active={tab === 'activos'}
            onPress={() => setTab('activos')}
            count={tournaments.length}
            color={Palette.neonGreen}
            icon="check-circle"
          />
          <TabButton
            label="GESTIÓN"
            active={tab === 'gestion'}
            onPress={() => { setTab('gestion'); loadGestion(); }}
            count={allQuinielas.length}
            color={Palette.neonOrange}
            icon="people"
          />
        </View>

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
          {error && (
            <ThemedView
              type="surface"
              style={{
                backgroundColor: Palette.neonPink + '15',
                borderColor: Palette.neonPink + '40',
                borderWidth: 1,
                borderRadius: BorderRadius.sm,
                padding: Spacing.three,
                marginBottom: Spacing.four,
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.two,
              }}
            >
              <MaterialIcons name="warning" size={18} color={Palette.neonPink} />
              <ThemedText style={[Typography.small, { color: Palette.neonPink, flex: 1 }]}>
                {error}
              </ThemedText>
            </ThemedView>
          )}

          {success && (
            <ThemedView
              type="surface"
              style={{
                backgroundColor: Palette.neonGreen + '15',
                borderColor: Palette.neonGreen + '40',
                borderWidth: 1,
                borderRadius: BorderRadius.sm,
                padding: Spacing.three,
                marginBottom: Spacing.four,
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.two,
              }}
            >
              <MaterialIcons name="check-circle" size={18} color={Palette.neonGreen} />
              <ThemedText style={[Typography.small, { color: Palette.neonGreen, flex: 1 }]}>
                {success}
              </ThemedText>
            </ThemedView>
          )}

          {tab === 'disponibles' && (
            <View style={{ width: '100%' }}>
              <ThemedTextInput
                key="admin-search-input"
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar liga..."
                accent="cyan"
              />

              {loading ? (
                <ActivityIndicator
                  size="large"
                  color={Palette.neonGreen}
                  style={{ marginTop: Spacing.six }}
                />
              ) : filtered.length === 0 ? (
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      color: theme.textMuted,
                      textAlign: 'center',
                      marginTop: Spacing.six,
                    },
                  ]}
                >
                  {search ? 'Sin resultados' : 'No hay ligas disponibles'}
                </ThemedText>
              ) : (
                <View style={{ gap: Spacing.two }}>
                  {filtered.map((league) => {
                    const accent = guessAccent(league.name);
                    const active = importedNames.has(league.name);

                    return (
                      <StadiumCard key={league.id} accent={accent}>
                        <Pressable
                          onPress={() => !active && openPreview(league)}
                          disabled={active}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.85 : 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: Spacing.half,
                          })}
                        >
                          <View style={{ flex: 1 }}>
                            <ThemedText
                              style={[
                                Typography.body,
                                {
                                  color: active ? theme.textMuted + '60' : theme.text,
                                  fontWeight: '600',
                                },
                              ]}
                            >
                              {league.name}
                            </ThemedText>
                            <ThemedText
                              style={[
                                Typography.small,
                                {
                                  color: active ? theme.textMuted + '40' : theme.textMuted,
                                  marginTop: Spacing.half,
                                },
                              ]}
                            >
                              {league.country}
                              {league.current_season ? ` · ${league.current_season.name}` : ''}
                            </ThemedText>
                          </View>

                          {active ? (
                            <View
                              style={{
                                backgroundColor: Palette.neonGreen + '20',
                                borderRadius: BorderRadius.sm,
                                paddingHorizontal: Spacing.two,
                                paddingVertical: Spacing.one,
                              }}
                            >
                              <ThemedText
                                style={[
                                  Typography.small,
                                  { color: Palette.neonGreen, fontWeight: '700' },
                                ]}
                              >
                                ACTIVO
                              </ThemedText>
                            </View>
                          ) : (
                            <View
                              style={{
                                backgroundColor: accent + '15',
                                borderRadius: BorderRadius.sm,
                                paddingHorizontal: Spacing.two,
                                paddingVertical: Spacing.one,
                              }}
                            >
                              <ThemedText
                                style={[
                                  Typography.small,
                                  { color: accent, fontWeight: '600' },
                                ]}
                              >
                                ACTIVAR
                              </ThemedText>
                            </View>
                          )}
                        </Pressable>
                      </StadiumCard>
                    );
                  })}
                </View>
              )}
            </View>
          )}

            {tab === 'gestion' && (
              <>
                {loadingGestion ? (
                  <ActivityIndicator size="large" color={Palette.neonOrange} style={{ marginTop: Spacing.six }} />
                ) : (
                  <View style={{ gap: Spacing.four }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two }}>
                        <MaterialIcons name="people" size={16} color={Palette.neonOrange} />
                        <ThemedText style={[Typography.small, { color: Palette.neonOrange, letterSpacing: 1 }]}>
                          USUARIOS ({users.length})
                        </ThemedText>
                      </View>
                      {users.length === 0 ? (
                        <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>Sin usuarios registrados</ThemedText>
                      ) : (
                        <View style={{ gap: Spacing.one }}>
                          {users.map((u) => (
                            <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, backgroundColor: Palette.surface + '40', borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: '#2A2A4A' }}>
                              <View style={{ flex: 1 }}>
                                <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600' }]}>{u.displayName || u.email}</ThemedText>
                                <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>{u.email} · {u.role}</ThemedText>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two }}>
                        <MaterialIcons name="quiz" size={16} color={Palette.neonOrange} />
                        <ThemedText style={[Typography.small, { color: Palette.neonOrange, letterSpacing: 1 }]}>
                          LIGAS ({allQuinielas.length})
                        </ThemedText>
                      </View>
                      {allQuinielas.length === 0 ? (
                        <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>Sin ligas creadas</ThemedText>
                      ) : (
                        <View style={{ gap: Spacing.one }}>
                          {allQuinielas.map((q) => (
                            <View key={q.id} style={{ padding: Spacing.three, backgroundColor: Palette.surface + '40', borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: '#2A2A4A' }}>
                              <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600' }]}>{q.name}</ThemedText>
                              <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                                {participantCounts[q.id] ?? 0} participantes · Creada por: {users.find((u) => u.id === q.createdBy)?.displayName ?? 'Desconocido'}
                              </ThemedText>
                              {q.inviteCode && (
                                <ThemedText style={[Typography.caption, { color: Palette.neonYellow }]}>Código: {q.inviteCode}</ThemedText>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    <Pressable
                      onPress={async () => {
                        const confirmReset = Platform.OS === 'web' 
                          ? window.confirm("¿Estás seguro de que quieres restablecer toda la base de datos? Esto eliminará todos los torneos, usuarios y ligas locales.")
                          : await new Promise<boolean>((resolve) => {
                              Alert.alert(
                                "Restablecer Datos",
                                "¿Estás seguro de que quieres restablecer toda la base de datos? Esto eliminará todos los torneos, usuarios y ligas locales.",
                                [
                                  { text: "Cancelar", onPress: () => resolve(false), style: "cancel" },
                                  { text: "Confirmar", onPress: () => resolve(true), style: "destructive" }
                                ]
                              );
                            });
                        if (confirmReset) {
                          try {
                            await repo.resetDatabase();
                            if (Platform.OS === 'web') {
                              window.location.reload();
                            } else {
                              setSuccess("Base de datos restablecida correctamente");
                              handleRefresh();
                            }
                          } catch (e: any) {
                            setError(e.message);
                          }
                        }
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: Palette.neonPink + '15',
                        borderColor: Palette.neonPink,
                        borderWidth: 1,
                        borderRadius: BorderRadius.md,
                        paddingVertical: Spacing.four,
                        alignItems: 'center',
                        marginTop: Spacing.six,
                        opacity: pressed ? 0.8 : 1,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: Spacing.two,
                      })}
                    >
                      <MaterialIcons name="delete-forever" size={20} color={Palette.neonPink} />
                      <ThemedText style={[Typography.headline, { color: Palette.neonPink, fontWeight: '700', letterSpacing: 2 }]}>
                        RESTABLECER BASE DE DATOS
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {tab === 'activos' && (
            <>
              {tournaments.length === 0 ? (
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      color: theme.textMuted,
                      textAlign: 'center',
                      marginTop: Spacing.six,
                    },
                  ]}
                >
                  No hay torneos importados todavía
                </ThemedText>
              ) : (
                <View style={{ gap: Spacing.two }}>
                  {tournaments.map((t) => {
                    const accent = guessAccent(t.name);
                    const isActive = t.status === 'active';
                    return (
                      <StadiumCard key={t.id} accent={accent}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: Spacing.half,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <ThemedText
                              style={[
                                Typography.body,
                                { color: theme.text, fontWeight: '600' },
                              ]}
                            >
                              {t.name}
                            </ThemedText>
                            <ThemedText
                              style={[
                                Typography.small,
                                { color: theme.textMuted, marginTop: Spacing.half },
                              ]}
                            >
                              {t.season}
                            </ThemedText>
                          </View>

                          <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                            {isActive && (
                              <Pressable
                                onPress={() => handleSyncMatches(t)}
                                disabled={syncing === t.id}
                                style={({ pressed }) => ({
                                  backgroundColor: Palette.neonCyan + '20',
                                  borderRadius: BorderRadius.sm,
                                  paddingHorizontal: Spacing.two,
                                  paddingVertical: Spacing.one,
                                  opacity: pressed || syncing === t.id ? 0.7 : 1,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: Spacing.one,
                                })}
                              >
                                <MaterialIcons name="sync" size={14} color={Palette.neonCyan} />
                                <ThemedText
                                  style={[
                                    Typography.small,
                                    {
                                      color: Palette.neonCyan,
                                      fontWeight: '700',
                                    },
                                  ]}
                                >
                                  {syncing === t.id ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}
                                </ThemedText>
                              </Pressable>
                            )}

                            <Pressable
                              onPress={async () => {
                                try {
                                  await repo.updateTournamentStatus(
                                    t.id,
                                    isActive ? 'finished' : 'active',
                                  );
                                  setTournaments(await repo.getTournaments());
                                } catch (e: any) {
                                  setError(e.message);
                                }
                              }}
                              style={({ pressed }) => ({
                                backgroundColor: isActive
                                  ? Palette.neonGreen + '20'
                                  : Palette.neonPink + '20',
                                borderRadius: BorderRadius.sm,
                                paddingHorizontal: Spacing.two,
                                paddingVertical: Spacing.one,
                                opacity: pressed ? 0.8 : 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: Spacing.one,
                              })}
                            >
                              {isActive ? (
                                <MaterialIcons name="check-circle" size={14} color={Palette.neonGreen} />
                              ) : (
                                <MaterialIcons name="cancel" size={14} color={Palette.neonPink} />
                              )}
                              <ThemedText
                                style={[
                                  Typography.small,
                                  {
                                    color: isActive ? Palette.neonGreen : Palette.neonPink,
                                    fontWeight: '700',
                                  },
                                ]}
                              >
                                {isActive ? 'ACTIVO' : 'INACTIVO'}
                              </ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      </StadiumCard>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={!!preview || (step === 'season' && !!selectedLeague)}
        transparent
        animationType="fade"
        onRequestClose={() => { setPreview(null); setSeasons([]); setSelectedSeason(null); setSelectedLeague(null); setStep('season'); }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { setPreview(null); setSeasons([]); setSelectedSeason(null); setSelectedLeague(null); setStep('season'); }}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
            ]}
          >
            {step === 'season' && selectedLeague && (
              <>
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

                <ThemedText style={[Typography.headline, { color: theme.text, marginBottom: Spacing.three }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                    <MaterialIcons name="calendar-month" size={20} color={Palette.neonCyan} />
                    Seleccionar Temporada
                  </View>
                </ThemedText>
                <ThemedText style={[Typography.small, { color: theme.textMuted, marginBottom: Spacing.five }]}>
                  {selectedLeague.name}
                </ThemedText>

                {loadingSeasons ? (
                  <ActivityIndicator size="large" color={Palette.neonGreen} />
                ) : (
                  <>
                    {seasons.length > 0 && (
                      <View style={{ gap: Spacing.two, marginBottom: Spacing.five }}>
                        <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 1 }]}>
                          TEMPORADAS DISPONIBLES
                        </ThemedText>
                        {seasons.map((s) => (
                          <Pressable
                            key={s.id}
                            onPress={() => loadSeasonEvents(s, selectedLeague)}
                            style={({ pressed }) => ({
                              backgroundColor: Palette.surface + '40',
                              borderRadius: BorderRadius.sm,
                              borderWidth: 1,
                              borderColor: '#2A2A4A',
                              padding: Spacing.four,
                              opacity: pressed ? 0.85 : 1,
                            })}
                          >
                            <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600' }]}>
                              {s.name}
                            </ThemedText>
                            {s.year && (
                              <ThemedText style={[Typography.caption, { color: theme.textMuted, marginTop: Spacing.half }]}>
                                {s.year}
                              </ThemedText>
                            )}
                          </Pressable>
                        ))}
                      </View>
                    )}

                    <ThemedTextInput
                      key="admin-manual-season-input"
                      value={manualSeason}
                      onChangeText={setManualSeason}
                      placeholder="O ingresa ID de temporada manual (ej: 188)"
                      keyboardType="number-pad"
                      accent="cyan"
                    />

                    <Pressable
                      onPress={loadManualSeason}
                      disabled={!manualSeason.trim()}
                      style={({ pressed }) => ({
                        backgroundColor: Palette.neonCyan,
                        borderRadius: BorderRadius.md,
                        paddingVertical: Spacing.four,
                        alignItems: 'center',
                        opacity: pressed || !manualSeason.trim() ? 0.8 : 1,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: Spacing.two,
                      })}
                    >
                      <MaterialIcons name="file-download" size={20} color={Palette.black} />
                      <ThemedText style={[Typography.headline, { color: Palette.black, fontWeight: '700', letterSpacing: 2 }]}>
                        CARGAR PARTIDOS
                      </ThemedText>
                    </Pressable>
                  </>
                )}

                <Pressable
                  onPress={() => { setPreview(null); setSeasons([]); setSelectedSeason(null); setSelectedLeague(null); setStep('season'); }}
                  style={{ marginTop: Spacing.three, alignItems: 'center' }}
                >
                  <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                    Cancelar
                  </ThemedText>
                </Pressable>
              </>
            )}

            {step === 'preview' && preview && (
              <>
                <View
                  style={{
                    width: 40,
                    height: 3,
                    backgroundColor: guessAccent(preview.league.name),
                    borderRadius: 2,
                    marginBottom: Spacing.four,
                    alignSelf: 'center',
                  }}
                />

                <ThemedText
                  style={[Typography.headline, { color: theme.text, marginBottom: Spacing.one }]}
                >
                  {preview.league.name}
                </ThemedText>
                <ThemedText
                  style={[Typography.small, { color: theme.textMuted, marginBottom: Spacing.three }]}
                >
                  {selectedSeason?.name ?? preview.league.country} · {preview.events.length} partidos
                </ThemedText>

                <ThemedText
                  style={[Typography.small, { color: theme.textMuted, marginBottom: Spacing.one }]}
                >
                  Fechas: {new Date(preview.events[0].event_date).toLocaleDateString()} –{' '}
                  {new Date(preview.events[preview.events.length - 1].event_date).toLocaleDateString()}
                </ThemedText>

                <ScrollView style={{ maxHeight: 300, marginVertical: Spacing.two, width: '100%' }}>
                  {preview.events.map((e) => {
                    const status = mapBSDStatus(e.status);
                    const isPlayed = status === 'finished' || e.home_score !== null;
                    const dateStr = new Date(e.event_date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <View 
                        key={e.id} 
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          paddingVertical: Spacing.two, 
                          borderBottomWidth: 1, 
                          borderBottomColor: '#2A2A4A',
                        }}
                      >
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <ThemedText style={[Typography.small, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                            {e.home_team}
                          </ThemedText>
                        </View>

                        <View style={{ minWidth: 70, alignItems: 'center', paddingHorizontal: Spacing.one }}>
                          {isPlayed ? (
                            <ThemedText style={[Typography.small, { color: Palette.neonGreen, fontWeight: '700' }]}>
                              {e.home_score} – {e.away_score}
                            </ThemedText>
                          ) : (
                            <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                              VS
                            </ThemedText>
                          )}
                          <ThemedText style={{ fontSize: 9, color: theme.textMuted, marginTop: 2 }}>
                            {dateStr}
                          </ThemedText>
                        </View>

                        <View style={{ flex: 1, alignItems: 'flex-start' }}>
                          <ThemedText style={[Typography.small, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                            {e.away_team}
                          </ThemedText>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <Pressable
                  onPress={() => handleImport(preview.league, preview.events)}
                  disabled={importing === preview.league.id.toString()}
                  style={({ pressed }) => ({
                    backgroundColor: Palette.neonGreen,
                    borderRadius: BorderRadius.md,
                    paddingVertical: Spacing.four,
                    alignItems: 'center',
                    opacity: pressed || importing === preview.league.id.toString() ? 0.8 : 1,
                    marginTop: Spacing.two,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: Spacing.two,
                  })}
                >
                  <MaterialIcons name="sports-soccer" size={20} color={Palette.black} />
                  <ThemedText
                    style={[
                      Typography.headline,
                      { color: Palette.black, fontWeight: '700', letterSpacing: 2 },
                    ]}
                  >
                    {importing === preview.league.id.toString()
                      ? 'IMPORTANDO...'
                      : 'ACTIVAR TORNEO'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => { setPreview(null); setSeasons([]); setSelectedSeason(null); setSelectedLeague(null); setStep('season'); }}
                  style={{ marginTop: Spacing.three, alignItems: 'center' }}
                >
                  <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                    Cancelar
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function TabButton({
  label,
  active,
  onPress,
  count,
  color,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  count: number;
  color: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.three,
        borderBottomWidth: 2,
        borderBottomColor: active ? color : 'transparent',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.half }}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={16}
            color={active ? color : '#FFFFFF60'}
          />
        )}
        <ThemedText
          style={[
            Typography.small,
            { color: active ? color : '#FFFFFF60', fontWeight: '700', letterSpacing: 1.5 },
          ]}
        >
          {label}
        </ThemedText>
      </View>
      <ThemedText
        style={[
          Typography.caption,
          { color: active ? color : '#FFFFFF40', marginTop: Spacing.half },
        ]}
      >
        {count}
      </ThemedText>
    </Pressable>
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
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.five,
    marginBottom: Spacing.four,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    marginBottom: Spacing.four,
  },
  scroll: {
    paddingHorizontal: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.five,
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
