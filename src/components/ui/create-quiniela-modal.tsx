import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import {
  Spacing,
  Palette,
  BorderRadius,
  AccentMap,
  type NeonAccent,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Tournament, Quiniela } from '@/db/types';

function formatNumberDisplay(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseFormattedNumber(formatted: string): string {
  return formatted.replace(/\./g, '');
}

interface CreateQuinielaModalProps {
  visible: boolean;
  tournament: Tournament | null;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    deadline: string | null;
    prize: number | null;
    entryFee: number | null;
    scoringRules: {
      pointsExactScore: number;
      pointsWinner: number;
      pointsGoal: number;
      pointsGoalDiff: number;
    };
  }) => Promise<Quiniela>;
  createdQuiniela: Quiniela | null;
  initialData?: Quiniela | null;
  onUpdate?: (data: {
    name: string;
    description: string;
    deadline: string | null;
    prize: number | null;
    entryFee: number | null;
    scoringRules: {
      pointsExactScore: number;
      pointsWinner: number;
      pointsGoal: number;
      pointsGoalDiff: number;
    };
  }) => Promise<void>;
}

export function CreateQuinielaModal({
  visible,
  tournament,
  onClose,
  onCreate,
  createdQuiniela,
  initialData,
  onUpdate,
}: CreateQuinielaModalProps) {
  const theme = useTheme();
  const isEditing = !!initialData;
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [prizeRaw, setPrizeRaw] = useState('');
  const [feeRaw, setFeeRaw] = useState('');
  const [rulesExact, setRulesExact] = useState('5');
  const [rulesWinner, setRulesWinner] = useState('2');
  const [rulesGoal, setRulesGoal] = useState('2');
  const [rulesGoalDiff, setRulesGoalDiff] = useState('1');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name);
        setDesc(initialData.description || '');
        setDeadlineDate(initialData.deadline ? new Date(initialData.deadline) : null);
        setPrizeRaw(initialData.prize != null ? initialData.prize.toString() : '');
        setFeeRaw(initialData.entryFee != null ? initialData.entryFee.toString() : '');
        setRulesExact(initialData.scoringRules.pointsExactScore.toString());
        setRulesWinner(initialData.scoringRules.pointsWinner.toString());
        setRulesGoal(initialData.scoringRules.pointsGoal.toString());
        setRulesGoalDiff(initialData.scoringRules.pointsGoalDiff.toString());
      } else {
        setName('');
        setDesc('');
        setDeadlineDate(null);
        setPrizeRaw('');
        setFeeRaw('');
        setRulesExact('5');
        setRulesWinner('2');
        setRulesGoal('2');
        setRulesGoalDiff('1');
      }
      setShowDatePicker(false);
      setError(null);
    }
  }, [visible, initialData]);

  const accent = (tournament?.accent || 'green') as NeonAccent;
  const accentColor = AccentMap[accent]?.main || Palette.neonGreen;
  const accentDim = AccentMap[accent]?.dim || Palette.greenDim;
  const accentBg = accentColor + '18';

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDeadlineDate(selectedDate);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const prizeNum = prizeRaw ? parseFloat(parseFormattedNumber(prizeRaw)) : null;
      const feeNum = feeRaw ? parseFloat(parseFormattedNumber(feeRaw)) : null;
      const data = {
        name: name.trim(),
        description: desc.trim(),
        deadline: deadlineDate ? deadlineDate.toISOString() : null,
        prize: isNaN(prizeNum!) ? null : prizeNum,
        entryFee: isNaN(feeNum!) ? null : feeNum,
        scoringRules: {
          pointsExactScore: parseInt(rulesExact, 10) || 5,
          pointsWinner: parseInt(rulesWinner, 10) || 2,
          pointsGoal: parseInt(rulesGoal, 10) || 2,
          pointsGoalDiff: parseInt(rulesGoalDiff, 10) || 1,
        },
      };
      if (isEditing && onUpdate) {
        await onUpdate(data);
      } else {
        await onCreate(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  if (!tournament) return null;

  return (
    <Modal
      visible={visible && (isEditing || !createdQuiniela)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.scrollContent}
          >
          <View style={styles.heroSection}>
            <View style={[styles.heroGradient, { backgroundColor: accentDim }]} />
            <View style={styles.heroContent}>
              <View style={styles.heroIcon}>
                <ThemedText style={[Typography.score, { color: accentColor, fontSize: 36 }]}>
                  {name.trim() ? name.trim()[0].toUpperCase() : '?'}
                </ThemedText>
              </View>
              <View style={styles.heroText}>
                <ThemedText style={[Typography.small, { color: accentColor, letterSpacing: 2 }]}>
                  {tournament.name.toUpperCase()}
                </ThemedText>
                <ThemedText style={[Typography.headline, { color: theme.text, marginTop: Spacing.one }]}>
                  {name.trim() || (isEditing ? 'Editar Quiniela' : 'Nueva Quiniela')}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Form Sections */}
          <View style={styles.formContainer}>
            {/* Basic Info Section */}
            <View style={styles.section}>
              <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 1.5, marginBottom: Spacing.three }]}>
                INFORMACIÓN BÁSICA
              </ThemedText>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre de tu liga"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
              />

              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="Descripción (opcional)"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={2}
                style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
              />
            </View>

            {/* Prize & Rules Section */}
            <View style={styles.section}>
              <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 1.5, marginBottom: Spacing.three }]}>
                PREMIO Y REGLAS
              </ThemedText>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 0.5, marginBottom: Spacing.one }]}>
                    PREMIO
                  </ThemedText>
                  <TextInput
                    value={prizeRaw ? `$ ${formatNumberDisplay(prizeRaw)}` : ''}
                    onChangeText={(text) => setPrizeRaw(parseFormattedNumber(text))}
                    placeholder="$ 0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
                  />
                </View>
                <View style={styles.halfInput}>
                  <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 0.5, marginBottom: Spacing.one }]}>
                    CUOTA
                  </ThemedText>
                  <TextInput
                    value={feeRaw ? `$ ${formatNumberDisplay(feeRaw)}` : ''}
                    onChangeText={(text) => setFeeRaw(parseFormattedNumber(text))}
                    placeholder="$ 0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    style={[styles.input, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
                  />
                </View>
              </View>

              <View style={styles.scoringRow}>
                <ScoringInput label="Exacto" value={rulesExact} onChange={setRulesExact} color={accentColor} theme={theme} />
                <ScoringInput label="Ganador" value={rulesWinner} onChange={setRulesWinner} color={accentColor} theme={theme} />
                <ScoringInput label="Gol" value={rulesGoal} onChange={setRulesGoal} color={accentColor} theme={theme} />
                <ScoringInput label="Dif." value={rulesGoalDiff} onChange={setRulesGoalDiff} color={accentColor} theme={theme} />
              </View>
            </View>

            {/* Deadline Section */}
            <View style={styles.section}>
              <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 1.5, marginBottom: Spacing.three }]}>
                FECHA LÍMITE
              </ThemedText>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.input, styles.dateButton, { borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
              >
                <ThemedText style={[
                  Typography.body,
                  { color: deadlineDate ? theme.text : theme.textMuted },
                ]}>
                  {deadlineDate ? formatDate(deadlineDate) : 'Seleccionar fecha (opcional)'}
                </ThemedText>
                <MaterialIcons name="calendar-month" size={18} color={accentColor} />
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={deadlineDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  themeVariant="dark"
                />
              )}
            </View>

            {error && (
              <ThemedText style={[Typography.small, { color: Palette.neonPink, marginBottom: Spacing.three }]}>
                {error}
              </ThemedText>
            )}
          </View>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <Pressable
              onPress={handleCreate}
              disabled={creating || !name.trim()}
              style={({ pressed }) => [
                styles.createButton,
                {
                  backgroundColor: accentColor,
                  opacity: pressed || creating || !name.trim() ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText style={[Typography.headline, { color: Palette.black, fontWeight: '700', letterSpacing: 1.5 }]}>
                {creating ? 'GUARDANDO...' : (isEditing ? 'GUARDAR CAMBIOS' : 'CREAR QUINIELA')}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                marginTop: Spacing.three,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: accentColor + '40',
                backgroundColor: pressed ? accentBg : 'transparent',
                paddingVertical: Spacing.three,
                alignItems: 'center',
              })}
            >
              <ThemedText style={[Typography.small, { color: accentColor, fontWeight: '600', letterSpacing: 1 }]}>
                CANCELAR
              </ThemedText>
            </Pressable>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ScoringInput({
  label,
  value,
  onChange,
  color,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
  theme: any;
}) {
  return (
    <View style={styles.scoringInput}>
      <ThemedText style={[Typography.small, { color: theme.textMuted, letterSpacing: 0.5, marginBottom: Spacing.one }]}>
        {label.toUpperCase()}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        style={[styles.scoreInput, { color: theme.text, borderColor: theme.surfaceBorder, backgroundColor: theme.surface }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroSection: {
    height: 100,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    paddingTop: Spacing.three,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  heroText: {
    flex: 1,
  },
  formContainer: {
    padding: Spacing.four,
    paddingTop: 0,
  },
  scrollContent: {
    paddingBottom: Spacing.four,
  },
  section: {
    marginBottom: Spacing.four,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.three,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.two,
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  halfInput: {
    flex: 1,
  },
  scoringRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  scoringInput: {
    flex: 1,
  },
  scoreInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.three,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  actionContainer: {
    padding: Spacing.four,
    paddingTop: Spacing.three,
  },
  createButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
