import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, View, ActivityIndicator } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { RepositoryProvider, initDatabase } from '@/db';
import { AuthProvider } from '@/hooks/use-auth';
import { Palette } from '@/constants/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Palette.black,
        }}
      >
        <ActivityIndicator size="large" color={Palette.neonGreen} />
      </View>
    );
  }

  const isDark = colorScheme !== 'light';
  const NavTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: Palette.black } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#F5F5FA' } };

  return (
    <ThemeProvider value={NavTheme}>
      <RepositoryProvider>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthProvider>
      </RepositoryProvider>
    </ThemeProvider>
  );
}
