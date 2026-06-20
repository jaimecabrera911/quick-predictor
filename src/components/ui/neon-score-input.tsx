import { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  type TextInputProps,
} from 'react-native';
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

interface NeonScoreInputProps {
  homeTeam: string;
  awayTeam: string;
  accent?: NeonAccent;
  initialHome?: number | null;
  initialAway?: number | null;
  onSave: (homeScore: number, awayScore: number) => void;
  disabled?: boolean;
  deadline?: string;
  saving?: boolean;
  message?: string | null;
}

function ScoreField({
  value,
  onChangeText,
  accent,
  label,
  disabled,
}: {
  value: string;
  onChangeText: (t: string) => void;
  accent: string;
  label: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const accentColor = focused ? accent : accent + '60';

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: Spacing.one }}>
      <ThemedText
        style={[
          Typography.caption,
          {
            color: accentColor,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            fontWeight: '700',
          },
        ]}
      >
        {label}
      </ThemedText>
      <View
        style={{
          width: '100%',
          backgroundColor: Palette.black,
          borderRadius: BorderRadius.md,
          borderWidth: 2,
          borderColor: accentColor,
          shadowColor: focused ? accent : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: focused ? 6 : 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={(t) => {
            const cleaned = t.replace(/[^0-9]/g, '');
            onChangeText(cleaned);
          }}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            Typography.score,
            {
              color: accent,
              textAlign: 'center',
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.one,
              fontWeight: '700',
              letterSpacing: 4,
            } as any,
          ]}
          placeholderTextColor={accent + '30'}
          placeholder="--"
        />
      </View>
    </View>
  );
}

export function NeonScoreInput({
  homeTeam,
  awayTeam,
  accent = 'purple',
  initialHome,
  initialAway,
  onSave,
  disabled = false,
  deadline,
  saving = false,
  message = null,
}: NeonScoreInputProps) {
  const theme = useTheme();
  const accentColor = AccentMap[accent].main;
  const [homeScore, setHomeScore] = useState(
    initialHome?.toString() ?? ''
  );
  const [awayScore, setAwayScore] = useState(
    initialAway?.toString() ?? ''
  );

  const canSave =
    homeScore !== '' && awayScore !== '' && !disabled && !saving;

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: accentColor + '25',
        padding: Spacing.five,
        gap: Spacing.five,
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 4,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.three,
        }}
      >
        <ScoreField
          value={homeScore}
          onChangeText={setHomeScore}
          accent={accentColor}
          label={homeTeam}
          disabled={disabled}
        />
        <View style={{ alignItems: 'center', paddingHorizontal: Spacing.two }}>
          <ThemedText
            style={[
              Typography.scoreSmall,
              {
                color: accentColor + '50',
                letterSpacing: 6,
                fontWeight: '300',
              },
            ]}
          >
            VS
          </ThemedText>
        </View>
        <ScoreField
          value={awayScore}
          onChangeText={setAwayScore}
          accent={accentColor}
          label={awayTeam}
          disabled={disabled}
        />
      </View>

      {message && (
        <ThemedText
          style={[
            Typography.caption,
            {
              color:
                message.toLowerCase().includes('guardado') ||
                message.toLowerCase().includes('exito') ||
                message.toLowerCase().includes('éxito') ||
                message.toLowerCase().includes('¡')
                  ? Palette.neonGreen
                  : Palette.neonPink,
              textAlign: 'center',
              fontWeight: '600',
            },
          ]}
        >
          {message}
        </ThemedText>
      )}

      {canSave && (
        <Pressable
          onPress={() => onSave(Number(homeScore), Number(awayScore))}
          disabled={saving}
          style={({ pressed }) => ({
            backgroundColor: accentColor,
            borderRadius: BorderRadius.md,
            paddingVertical: Spacing.three,
            alignItems: 'center',
            opacity: pressed || saving ? 0.8 : 1,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 6,
          })}
        >
          <ThemedText
            style={[
              Typography.headline,
              {
                color: Palette.black,
                fontWeight: '700',
                letterSpacing: 2,
                textTransform: 'uppercase',
              },
            ]}
          >
            {saving ? 'GUARDANDO...' : 'GUARDAR PRONÓSTICO'}
          </ThemedText>
        </Pressable>
      )}

      {disabled && (
        <View
          style={{
            backgroundColor: accentColor + '15',
            borderRadius: BorderRadius.md,
            paddingVertical: Spacing.three,
            alignItems: 'center',
          }}
        >
          <ThemedText
            style={[
              Typography.small,
              { color: accentColor, letterSpacing: 1 },
            ]}
          >
            Pronóstico bloqueado
          </ThemedText>
        </View>
      )}

      {deadline && (
        <ThemedText
          style={[
            Typography.caption,
            { color: theme.textMuted, textAlign: 'center' },
          ]}
        >
          Límite: {deadline}
        </ThemedText>
      )}
    </View>
  );
}
