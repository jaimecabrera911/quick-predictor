import { memo, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  stage?: string;
  groupName?: string;
  matchDate?: string;
  accent?: NeonAccent;
  initialHome?: number | null;
  initialAway?: number | null;
  onSave: (homeScore: number, awayScore: number) => void;
  onCancel?: () => void;
  disabled?: boolean;
  deadline?: string;
  saving?: boolean;
  message?: string | null;
}

const ScoreField = memo(function ScoreField({
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
  const borderColor = focused ? accent : accent + '60';
  const labelColor = focused ? accent : accent + '60';

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: Spacing.one, minWidth: 0 }}>
      <ThemedText
        style={{
          color: labelColor,
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          fontWeight: '700',
          textAlign: 'center',
        }}
        numberOfLines={2}
      >
        {label}
      </ThemedText>
      <View
        style={{
          width: '100%',
          backgroundColor: Palette.black,
          borderRadius: BorderRadius.md,
          borderWidth: 2,
          borderColor,
        }}
      >
        <TextInput
          value={value}
          onChangeText={(t) => {
            const cleaned = t.replace(/[^0-9]/g, '');
            onChangeText(cleaned);
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={2}
          editable={!disabled}
          blurOnSubmit={false}
          showSoftInputOnFocus
          autoComplete="off"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            fontFamily: Typography.display1.fontFamily,
            fontSize: 40,
            lineHeight: 46,
            color: accent,
            textAlign: 'center',
            paddingVertical: Spacing.three,
            paddingHorizontal: Spacing.two,
            fontWeight: '700',
            letterSpacing: 4,
          }}
          placeholderTextColor={accent + '30'}
          placeholder="--"
        />
      </View>
    </View>
  );
});

export function NeonScoreInput({
  homeTeam,
  awayTeam,
  stage,
  groupName,
  matchDate,
  accent = 'purple',
  initialHome,
  initialAway,
  onSave,
  onCancel,
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

  const stageLabel = stage
    ? stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <View style={{
      backgroundColor: theme.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: accentColor + '25',
      overflow: 'hidden',
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 32,
      elevation: 8,
      alignSelf: 'stretch',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
        borderBottomColor: accentColor + '15',
        backgroundColor: accentColor + '08',
      }}>
        <ThemedText style={{
          fontSize: 11,
          letterSpacing: 1.2,
          color: accentColor + '80',
          textTransform: 'uppercase',
          fontWeight: '600',
          flex: 1,
        }} numberOfLines={1}>
          {groupName || stageLabel}
        </ThemedText>
        {onCancel && (
          <Pressable
            onPress={onCancel}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: BorderRadius.full,
              backgroundColor: pressed ? accentColor + '20' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            })}
          >
            <MaterialIcons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={{ padding: Spacing.five, gap: Spacing.five }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.three,
        }}>
          <ScoreField
            value={homeScore}
            onChangeText={setHomeScore}
            accent={accentColor}
            label={homeTeam}
            disabled={disabled || saving}
          />
          <View style={{ alignItems: 'center', paddingHorizontal: Spacing.one, flexShrink: 0 }}>
            <ThemedText style={{
              fontFamily: Typography.scoreSmall.fontFamily,
              fontSize: 18,
              color: accentColor + '50',
              letterSpacing: 4,
              fontWeight: '300',
            }}>
              VS
            </ThemedText>
          </View>
          <ScoreField
            value={awayScore}
            onChangeText={setAwayScore}
            accent={accentColor}
            label={awayTeam}
            disabled={disabled || saving}
          />
        </View>

        {message && (
          <View style={{
            backgroundColor: accentColor + '10',
            borderRadius: BorderRadius.sm,
            paddingVertical: Spacing.two,
            paddingHorizontal: Spacing.three,
          }}>
            <ThemedText style={{
              fontSize: 13,
              color: message.toLowerCase().includes('guardado') ||
                     message.toLowerCase().includes('exito') ||
                     message.toLowerCase().includes('éxito') ||
                     message.toLowerCase().includes('¡')
                ? Palette.neonGreen
                : Palette.neonPink,
              textAlign: 'center',
              fontWeight: '600',
            }}>
              {message}
            </ThemedText>
          </View>
        )}

        <Pressable
          onPress={() => onSave(Number(homeScore), Number(awayScore))}
          disabled={!canSave || saving}
          pointerEvents={canSave ? 'auto' : 'none'}
          style={({ pressed }) => ({
            backgroundColor: accentColor,
            borderRadius: BorderRadius.md,
            paddingVertical: Spacing.four,
            alignItems: 'center',
            opacity: !canSave ? 0 : pressed || saving ? 0.85 : 1,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: canSave ? 0.5 : 0,
            shadowRadius: 16,
            elevation: canSave ? 8 : 0,
          })}
        >
          <ThemedText style={{
            fontFamily: Typography.headline.fontFamily,
            fontSize: 16,
            color: Palette.black,
            fontWeight: '700',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {saving ? 'GUARDANDO...' : 'GUARDAR PRONÓSTICO'}
          </ThemedText>
        </Pressable>

        {disabled && (
          <View style={{
            gap: Spacing.three,
          }}>
            <View style={{
              backgroundColor: accentColor + '12',
              borderRadius: BorderRadius.md,
              paddingVertical: Spacing.four,
              paddingHorizontal: Spacing.four,
              alignItems: 'center',
            }}>
              <MaterialIcons name="lock-outline" size={20} color={accentColor + '80'} style={{ marginBottom: 4 }} />
              <ThemedText style={{
                fontSize: 13,
                color: accentColor + '90',
                letterSpacing: 0.5,
                fontWeight: '600',
              }}>
                Este partido ya ha comenzado o finalizó
              </ThemedText>
            </View>
            {onCancel && (
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => ({
                  backgroundColor: theme.surfaceBorder,
                  borderRadius: BorderRadius.md,
                  paddingVertical: Spacing.three,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <ThemedText style={{
                  fontSize: 14,
                  color: theme.textMuted,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }}>
                  CANCELAR
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {deadline && (
          <ThemedText style={{
            fontSize: 11,
            color: theme.textMuted,
            textAlign: 'center',
          }}>
            Límite: {deadline}
          </ThemedText>
        )}
      </View>
    </View>
  );
}
