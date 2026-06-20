import { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import {
  BorderRadius,
  Spacing,
  AccentMap,
  Palette,
  NeonAccent,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ThemedTextInputProps extends TextInputProps {
  label?: string;
  accent?: NeonAccent;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function ThemedTextInput({
  label,
  accent = 'green',
  error,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: ThemedTextInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const accentKeys: Record<NeonAccent, 'neonGreen' | 'neonOrange' | 'neonPurple' | 'neonCyan' | 'neonPink' | 'neonYellow'> = {
    green: 'neonGreen',
    orange: 'neonOrange',
    purple: 'neonPurple',
    cyan: 'neonCyan',
    pink: 'neonPink',
    yellow: 'neonYellow',
  };
  const accentColor = theme[accentKeys[accent]] as string;

  const borderThemeColor = error
    ? theme.neonPink
    : isFocused
    ? accentColor
    : theme.surfaceBorder;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText
          style={[
            Typography.small,
            {
              color: error ? theme.neonPink : isFocused ? accentColor : theme.textMuted,
              letterSpacing: 1.5,
              marginBottom: Spacing.one,
              fontWeight: '600',
            },
          ]}
        >
          {label.toUpperCase()}
        </ThemedText>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: borderThemeColor,
            backgroundColor: theme.surface,
          },
        ]}
      >
        <TextInput
          style={[
            Typography.body,
            {
              color: theme.text,
              padding: Spacing.three,
              flex: 1,
            },
            style,
          ] as any}
          placeholderTextColor={theme.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
      </View>

      {error && (
        <ThemedText
          style={[
            Typography.caption,
            {
              color: theme.neonPink,
              marginTop: Spacing.one,
            },
          ]}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
    width: '100%',
  },
  inputContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
