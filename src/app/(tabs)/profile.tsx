import { ScrollView, View, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Typography } from '@/constants/typography';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
  Palette,
  BorderRadius,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const initial = user ? (user.displayName || user.email)[0].toUpperCase() : '?';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: 'flex-start', marginBottom: Spacing.four })}>
              <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            </Pressable>

            <View style={[styles.avatarLarge, { backgroundColor: theme.neonPurple + '20', borderColor: theme.neonPurple + '40' }]}>
              <ThemedText style={{ fontSize: 36, fontWeight: '700', color: theme.neonPurple }}>
                {initial}
              </ThemedText>
            </View>

            <ThemedText style={[Typography.display1, { color: theme.text, marginTop: Spacing.four }]}>
              {user?.displayName || 'Usuario'}
            </ThemedText>
            <ThemedText style={[Typography.body, { color: theme.textMuted, marginTop: Spacing.one }]}>
              {user?.email || ''}
            </ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.neonGreen + '15', borderColor: theme.neonGreen + '30' }]}>
              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.neonGreen, letterSpacing: 1, textTransform: 'uppercase' }}>
                {user?.role === 'super_admin' || user?.role === 'admin' ? 'Administrador' : 'Usuario'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <InfoRow icon="person" label="Nombre" value={user?.displayName || '—'} theme={theme} />
              <View style={{ height: 1, backgroundColor: theme.surfaceBorder, marginLeft: 48 }} />
              <InfoRow icon="email" label="Email" value={user?.email || '—'} theme={theme} />
              <View style={{ height: 1, backgroundColor: theme.surfaceBorder, marginLeft: 48 }} />
              <InfoRow icon="badge" label="Rol" value={user?.role || '—'} theme={theme} />
              <View style={{ height: 1, backgroundColor: theme.surfaceBorder, marginLeft: 48 }} />
              <InfoRow icon="calendar-today" label="Miembro desde" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} theme={theme} />
            </View>
          </View>

          <View style={{ paddingHorizontal: Spacing.five, marginTop: Spacing.four }}>
            <Pressable
              onPress={() => { signOut(); }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: Palette.neonPink + '15',
                borderWidth: 1,
                borderColor: Palette.neonPink + '30',
                borderRadius: BorderRadius.md,
                paddingVertical: Spacing.four,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="logout" size={20} color={Palette.neonPink} />
              <ThemedText style={{ fontSize: 15, fontWeight: '700', color: Palette.neonPink, letterSpacing: 0.5 }}>
                CERRAR SESIÓN
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function InfoRow({ icon, label, value, theme }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 }}>
      <View style={{ width: 24, alignItems: 'center' }}>
        <MaterialIcons name={icon} size={20} color={theme.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontSize: 12, color: theme.textMuted, letterSpacing: 0.5 }}>{label}</ThemedText>
        <ThemedText style={{ fontSize: 15, fontWeight: '500', color: theme.text, marginTop: 2 }}>{value}</ThemedText>
      </View>
    </View>
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
    paddingTop: 0,
  },
  scroll: {
    paddingBottom: BottomTabInset + Spacing.five,
  },
  hero: {
    padding: Spacing.five,
    paddingTop: Spacing.six,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  section: {
    paddingHorizontal: Spacing.five,
    marginTop: Spacing.four,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
