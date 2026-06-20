import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { getTeamLogo } from '@/utils/logos';
import { Typography } from '@/constants/typography';
import {
  BorderRadius,
  Spacing,
  AccentMap,
  Palette,
  NeonAccent,
} from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScore?: number | null;
  awayScore?: number | null;
  predictedHome?: number | null;
  predictedAway?: number | null;
  status: 'scheduled' | 'live' | 'finished';
  stage: string;
  groupName?: string | null;
  currentMinute?: number | null;
}

interface MatchRowProps {
  match: MatchData;
  accent?: NeonAccent;
  onPress: (match: MatchData) => void;
}

export function MatchRow({ match, accent = 'green', onPress }: MatchRowProps) {
  const theme = useTheme();
  const accentColor = AccentMap[accent].main;

  const hasPrediction =
    match.predictedHome !== null && match.predictedHome !== undefined;
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  const predictedText = hasPrediction
    ? `${match.predictedHome} - ${match.predictedAway}`
    : '-- : --';

  const actualScore =
    isFinished && match.homeScore !== null
      ? `${match.homeScore} - ${match.awayScore}`
      : null;

  const matchDateFormatted = formatMatchDate(match.matchDate);

  return (
    <Pressable
      onPress={() => onPress(match)}
      style={({ pressed }) => ({
        backgroundColor: theme.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: accentColor + '15',
        padding: Spacing.four,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ gap: Spacing.two }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <ThemedText
            style={[
              Typography.small,
              { color: theme.textMuted, letterSpacing: 1 },
            ]}
          >
            {match.stage.toUpperCase()}
          </ThemedText>
          {isLive && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.half,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: Palette.neonPink,
                }}
              />
              <ThemedText
                style={[
                  Typography.small,
                  { color: Palette.neonPink, letterSpacing: 1 },
                ]}
              >
                EN VIVO{match.currentMinute ? ` (${match.currentMinute}')` : ''}
              </ThemedText>
            </View>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.two,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Image
              source={{ uri: getTeamLogo(match.homeTeam) }}
              style={{ width: 18, height: 18, borderRadius: 3 }}
              contentFit="contain"
            />
            <ThemedText
              style={[Typography.body, { fontWeight: '600', flex: 1 }]}
              numberOfLines={1}
            >
              {match.homeTeam}
            </ThemedText>
          </View>

          {actualScore ? (
            <View
              style={{
                backgroundColor: accentColor + '15',
                borderRadius: BorderRadius.sm,
                paddingHorizontal: Spacing.two,
                paddingVertical: Spacing.half,
                minWidth: 60,
                alignItems: 'center',
              }}
            >
              <ThemedText
                style={[
                  Typography.scoreSmall,
                  { color: accentColor, letterSpacing: 2 },
                ]}
              >
                {actualScore}
              </ThemedText>
            </View>
          ) : (
            <View
              style={{
                borderWidth: 1,
                borderColor: hasPrediction ? accentColor + '40' : theme.textMuted + '30',
                borderStyle: 'dashed',
                borderRadius: BorderRadius.sm,
                paddingHorizontal: Spacing.two,
                paddingVertical: Spacing.half,
                minWidth: 60,
                alignItems: 'center',
              }}
            >
              <ThemedText
                style={[
                  Typography.scoreSmall,
                  {
                    color: hasPrediction ? accentColor : theme.textMuted + '50',
                    letterSpacing: 2,
                  },
                ]}
              >
                {predictedText}
              </ThemedText>
            </View>
          )}

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.two }}>
            <ThemedText
              style={[Typography.body, { fontWeight: '600', flex: 1, textAlign: 'right' }]}
              numberOfLines={1}
            >
              {match.awayTeam}
            </ThemedText>
            <Image
              source={{ uri: getTeamLogo(match.awayTeam) }}
              style={{ width: 18, height: 18, borderRadius: 3 }}
              contentFit="contain"
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <ThemedText
            style={[
              Typography.caption,
              { color: theme.textMuted },
            ]}
          >
            {matchDateFormatted}
          </ThemedText>
          {!isFinished && !isLive && (
            <ThemedText
              style={[
                Typography.small,
                {
                  color: hasPrediction ? accentColor : theme.textMuted,
                  letterSpacing: 0.5,
                },
              ]}
            >
              {hasPrediction ? 'PRONOSTICADO' : 'PRONOSTICAR'}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function formatMatchDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
