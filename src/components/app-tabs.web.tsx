import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, useColorScheme, View, StyleSheet, Platform } from 'react-native';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing, Palette, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href={'/(tabs)' as any} asChild>
            <TabButton>TORNEOS</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href={'/(tabs)/explore' as any} asChild>
            <TabButton>MIS PRONÓSTICOS</TabButton>
          </TabTrigger>
          {isAdmin && (
            <TabTrigger name="admin" href={'/(tabs)/admin' as any} asChild>
              <TabButton>ADMIN</TabButton>
            </TabTrigger>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          isFocused ? {
            backgroundColor: 'rgba(0, 255, 178, 0.1)',
            borderColor: theme.neonGreen,
            ...Platform.select({
              web: {
                boxShadow: '0px 0px 10px rgba(0, 255, 178, 0.25)'
              }
            })
          } : {
            backgroundColor: 'transparent',
            borderColor: 'transparent'
          }
        ]}>
        <ThemedText
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1,
            color: isFocused ? theme.neonGreen : theme.textMuted,
          }}
        >
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const colors = isDark ? Colors.dark : Colors.light;
  const theme = useTheme();
  const { user, signOut } = useAuth();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView 
        type="surface" 
        style={[
          styles.innerContainer, 
          { 
            borderColor: colors.surfaceBorder,
            backgroundColor: isDark ? 'rgba(26, 26, 46, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            ...Platform.select({
              web: {
                boxShadow: isDark 
                  ? '0px 8px 32px rgba(0, 0, 0, 0.5), 0px 0px 15px rgba(108, 92, 231, 0.15)'
                  : '0px 8px 32px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(20px)',
              }
            })
          }
        ]}
      >
        <ThemedText style={[styles.brandText, { color: theme.neonCyan }]}>
          QUINIELAPP
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
          {props.children}
        </View>

        {user && (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: Spacing.two, 
            marginLeft: Spacing.two,
            paddingLeft: Spacing.three,
            borderLeftWidth: 1,
            borderLeftColor: colors.surfaceBorder
          }}>
            <View style={[styles.avatar, { backgroundColor: theme.neonPurple + '15', borderWidth: 1, borderColor: theme.neonPurple }]}>
              <ThemedText style={[styles.avatarText, { color: theme.neonPurple }]}>
                {(user.displayName || user.email)[0].toUpperCase()}
              </ThemedText>
            </View>
            <View style={{ display: Platform.OS === 'web' ? 'flex' : 'none' }}>
              <ThemedText style={{ fontSize: 11, fontWeight: '600', color: theme.text }}>
                {user.displayName || user.email.split('@')[0]}
              </ThemedText>
              <ThemedText style={{ fontSize: 8, color: theme.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {user.role}
              </ThemedText>
            </View>
            <Pressable
              onPress={signOut}
              style={({ pressed }) => ({
                backgroundColor: Palette.neonPink + '12',
                borderColor: Palette.neonPink,
                borderWidth: 1,
                borderRadius: BorderRadius.sm,
                paddingVertical: Spacing.one - 2,
                paddingHorizontal: Spacing.two,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
                marginLeft: Spacing.one,
                ...Platform.select({
                  web: {
                    boxShadow: pressed ? 'none' : '0px 0px 8px rgba(255, 51, 102, 0.15)'
                  }
                })
              })}
            >
              <ThemedText style={{ fontSize: 10, color: Palette.neonPink, fontWeight: '700', letterSpacing: 0.5 }}>
                SALIR
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    padding: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 1000,
  },
  innerContainer: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.three,
    maxWidth: 800,
    borderWidth: 1,
  },
  brandText: {
    marginRight: 'auto',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
