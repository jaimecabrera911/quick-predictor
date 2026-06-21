import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLogo } from '@/components/ui/app-logo';
import { Typography } from '@/constants/typography';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { WELCOME_DELAY_MS } from '@/constants/env';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login' as any);
    }, WELCOME_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoWrap}>
            <AppLogo variant="full" width={320} height={140} />
          </View>

          <ThemedText
            style={[
              Typography.body,
              {
                color: theme.textMuted,
                textAlign: 'center',
                letterSpacing: 0.5,
                lineHeight: 24,
                maxWidth: 280,
              },
            ]}
          >
            Pronostica los resultados, compite con amigos y sube en la clasificación.
          </ThemedText>

          <View style={styles.features}>
            {['Partidos en vivo', 'Clasificación en tiempo real', 'Quinielas con amigos'].map((item) => (
              <ThemedText
                key={item}
                style={[Typography.small, { color: theme.neonCyan + 'CC', letterSpacing: 0.8 }]}
              >
                · {item}
              </ThemedText>
            ))}
          </View>
        </View>
      </SafeAreaView>
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
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.six,
  },
  logoWrap: {
    alignItems: 'center',
    width: '100%',
  },
  features: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
