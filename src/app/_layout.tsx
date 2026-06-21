import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { RepositoryProvider, initDatabase } from '@/db';
import { AuthProvider } from '@/hooks/use-auth';
import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .catch(() => {})
      .finally(async () => {
        setDbReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  if (!dbReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Palette.black,
        }}
      />
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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthProvider>
      </RepositoryProvider>
    </ThemeProvider>
  );
}
