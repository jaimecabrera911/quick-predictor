import { View, type ViewStyle, type StyleProp } from 'react-native';
import {
  BorderRadius,
  Spacing,
  AccentMap,
  NeonAccent,
} from '@/constants/theme';
import { Typography } from '@/constants/typography';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface StadiumCardProps {
  children: React.ReactNode;
  accent?: NeonAccent;
  title?: string;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}

export function StadiumCard({
  children,
  accent = 'green',
  title,
  style,
  glow = true,
}: StadiumCardProps) {
  const theme = useTheme();
  const accentKeys: Record<NeonAccent, 'neonGreen' | 'neonOrange' | 'neonPurple' | 'neonCyan' | 'neonPink' | 'neonYellow'> = {
    green: 'neonGreen',
    orange: 'neonOrange',
    purple: 'neonPurple',
    cyan: 'neonCyan',
    pink: 'neonPink',
    yellow: 'neonYellow',
  };
  const accentColor = theme[accentKeys[accent]] as string;

  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: BorderRadius.md,
          borderWidth: 1,
          borderColor: accentColor + '25',
          overflow: 'hidden',
        },
        glow && {
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 6,
        },
        style,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: accentColor + '08',
        }}
      />

      <View
        style={{
          height: 3,
          backgroundColor: accentColor,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 4,
        }}
      />

      {title && (
        <View
          style={{
            paddingHorizontal: Spacing.four,
            paddingTop: Spacing.three,
            paddingBottom: Spacing.two,
          }}
        >
          <ThemedText
            style={[
              Typography.small,
              { color: accentColor, letterSpacing: 2 },
            ]}
          >
            {title.toUpperCase()}
          </ThemedText>
        </View>
      )}

      <View style={{ padding: Spacing.four }}>{children}</View>
    </View>
  );
}
