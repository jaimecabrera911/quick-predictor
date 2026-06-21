import { useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLogo } from '@/components/ui/app-logo';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { Typography } from '@/constants/typography';
import {
  BorderRadius,
  Spacing,
  Palette,
  MaxContentWidth,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const theme = useTheme();
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (mode === 'login') {
      await auth.signIn(email, password);
    } else {
      await auth.signUp(email, password, name || email.split('@')[0]);
    }
  };

  const fillDemo = async (type: 'user' | 'admin') => {
    const demoEmail = type === 'admin' ? 'admin@quinielapp.com' : 'demo@quinielapp.com';
    const demoPass = type === 'admin' ? 'admin1234' : 'demo1234';
    setEmail(demoEmail);
    setPassword(demoPass);
    setMode('login');
    await auth.signIn(demoEmail, demoPass);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.hero}>
              <AppLogo variant="full" />
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.neonGreen, letterSpacing: 4, marginTop: Spacing.three },
                ]}
              >
                {mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
              </ThemedText>
            </View>

            <View style={styles.form}>
              {mode === 'register' && (
                <ThemedTextInput
                  label="Nombre"
                  value={name}
                  onChangeText={setName}
                  placeholder="Tu nombre"
                  accent="green"
                />
              )}

              <ThemedTextInput
                label="Correo"
                value={email}
                onChangeText={setEmail}
                placeholder="correo@ejemplo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                accent="green"
              />

              <ThemedTextInput
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                accent="green"
              />

              {process.env.EXPO_PUBLIC_ENV === 'develop' && (
              <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
                <Pressable
                  onPress={() => fillDemo('user')}
                  disabled={auth.loading}
                  style={({ pressed }) => ({
                    backgroundColor: theme.neonGreen + '18',
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: theme.neonGreen + '40',
                    paddingVertical: Spacing.four,
                    alignItems: 'center',
                    opacity: pressed || auth.loading ? 0.7 : 1,
                  })}
                >
                  <ThemedText
                    style={[
                      Typography.headline,
                      { color: theme.neonGreen, letterSpacing: 2, fontWeight: '700' },
                    ]}
                  >
                    ENTRAR COMO DEMO
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => fillDemo('admin')}
                  disabled={auth.loading}
                  style={({ pressed }) => ({
                    backgroundColor: theme.neonPurple + '18',
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: theme.neonPurple + '40',
                    paddingVertical: Spacing.four,
                    alignItems: 'center',
                    opacity: pressed || auth.loading ? 0.7 : 1,
                  })}
                >
                  <ThemedText
                    style={[
                      Typography.headline,
                      { color: theme.neonPurple, letterSpacing: 2, fontWeight: '700' },
                    ]}
                  >
                    ENTRAR COMO ADMIN
                  </ThemedText>
                </Pressable>
              </View>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  marginTop: Spacing.five,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: theme.surfaceBorder }} />
                <ThemedText
                  style={[Typography.small, { color: theme.textMuted, letterSpacing: 1 }]}
                >
                  {mode === 'login' ? 'O INGRESA CON CORREO' : 'O REGÍSTRATE'}
                </ThemedText>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.surfaceBorder }} />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={auth.loading || !email || !password}
                style={({ pressed }) => ({
                  backgroundColor:
                    !email || !password
                      ? theme.surfaceBorder
                      : mode === 'login'
                      ? theme.neonGreen
                      : theme.neonBlue,
                  borderRadius: BorderRadius.md,
                  paddingVertical: Spacing.four,
                  alignItems: 'center',
                  opacity: !email || !password ? 0.35 : pressed ? 0.9 : 1,
                  marginTop: Spacing.three,
                })}
              >
                <ThemedText
                  style={[
                    Typography.headline,
                    {
                      color: !email || !password ? theme.textMuted : Palette.black,
                      fontWeight: '700',
                      letterSpacing: 2,
                    },
                  ]}
                >
                  {auth.loading
                    ? 'CARGANDO...'
                    : mode === 'login'
                    ? 'ENTRAR'
                    : 'CREAR CUENTA'}
                </ThemedText>
              </Pressable>

              {Platform.OS !== 'web' && (
                <View style={{ gap: Spacing.three, marginTop: Spacing.five }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing.three,
                    }}
                  >
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.surfaceBorder }} />
                    <ThemedText
                      style={[Typography.small, { color: theme.textMuted, letterSpacing: 1 }]}
                    >
                      O CONTINÚA CON
                    </ThemedText>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.surfaceBorder }} />
                  </View>

                  <Pressable
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: Spacing.two,
                      backgroundColor: theme.surface,
                      borderRadius: BorderRadius.md,
                      borderWidth: 1,
                      borderColor: theme.surfaceBorder,
                      paddingVertical: Spacing.three,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <ThemedText style={[Typography.body, { fontWeight: '600' }]}>Google</ThemedText>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: Spacing.two,
                      backgroundColor: Palette.black,
                      borderRadius: BorderRadius.md,
                      borderWidth: 1,
                      borderColor: theme.surfaceBorder,
                      paddingVertical: Spacing.three,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <ThemedText style={[Typography.body, { fontWeight: '600' }]}>Apple</ThemedText>
                  </Pressable>
                </View>
              )}

              <Pressable
                onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
                style={({ pressed }) => ({
                  marginTop: Spacing.five,
                  alignItems: 'center',
                  paddingVertical: Spacing.three,
                  opacity: pressed ? 0.7 : 1,
                })}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              >
                <ThemedText style={[Typography.caption, { color: theme.textMuted }]}>
                  {mode === 'login'
                    ? '¿No tienes cuenta? Regístrate'
                    : '¿Ya tienes cuenta? Inicia sesión'}
                </ThemedText>
              </Pressable>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  hero: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  form: {
    paddingHorizontal: Spacing.five,
  },
});
