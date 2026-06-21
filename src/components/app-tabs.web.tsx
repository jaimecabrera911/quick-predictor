import { useState } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from './themed-text';
import { AppLogo } from '@/components/ui/app-logo';
import { Spacing, Palette } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

const BREAKPOINT = 1024;
const NAV_HEIGHT = 56;

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  index: 'emoji-events',
  explore: 'fact-check',
  admin: 'admin-panel-settings',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Torneos',
  explore: 'Pronósticos',
  admin: 'Admin',
};

const TABS = ['index', 'explore', 'admin'] as const;

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT;
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const initial = user ? (user.displayName || user.email)[0].toUpperCase() : '';

  return (
    <Tabs>
      <TabList asChild>
        <Navbar isDesktop={isDesktop} user={user ? { initial, onSignOut: signOut } : undefined} isAdmin={isAdmin}>
          <TabTrigger name="index" href={'/(tabs)' as any} asChild>
            <NavButton icon={TAB_ICONS['index']} label={TAB_LABELS['index']} />
          </TabTrigger>
          <TabTrigger name="explore" href={'/(tabs)/explore' as any} asChild>
            <NavButton icon={TAB_ICONS['explore']} label={TAB_LABELS['explore']} />
          </TabTrigger>
          {isAdmin && (
            <TabTrigger name="admin" href={'/(tabs)/admin' as any} asChild>
              <NavButton icon={TAB_ICONS['admin']} label={TAB_LABELS['admin']} />
            </TabTrigger>
          )}
          <TabTrigger name="profile" href={'/(tabs)/profile' as any} style={{ display: 'none' }} />
        </Navbar>
      </TabList>
      <TabSlot style={{ height: '100%', paddingTop: NAV_HEIGHT + 8 }} />
    </Tabs>
  );
}

function NavButton({
  icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: keyof typeof MaterialIcons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.navBtn,
        isFocused && { backgroundColor: theme.neonGreen + '14' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <MaterialIcons name={icon} size={20} color={isFocused ? theme.neonGreen : theme.textMuted} />
      <ThemedText
        style={{
          fontSize: 13,
          fontWeight: isFocused ? '700' : '500',
          color: isFocused ? theme.neonGreen : theme.textMuted,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface NavbarProps extends TabListProps {
  isDesktop: boolean;
  user?: { initial: string; onSignOut: () => void };
  isAdmin: boolean;
}

function Navbar({ isDesktop, user, children, isAdmin, ...props }: NavbarProps) {
  const theme = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tabs = TABS
    .filter((name) => name !== 'admin' || isAdmin)
    .map((name) => ({
      name,
      icon: TAB_ICONS[name],
      label: TAB_LABELS[name],
      href: name === 'index' ? '/(tabs)' as any : `/(tabs)/${name}` as any,
    }));

  return (
    <View
      {...props}
      style={[
        styles.navbar,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.surfaceBorder,
        },
        Platform.select({ web: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } }),
      ]}
    >
      {/* Nav bar row */}
      <View style={styles.navRow}>
        <AppLogo variant="full" width={100} height={36} />

        <View style={{ flex: isDesktop ? 1 : 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: isDesktop ? 1 : 0 }}>
          {children}
        </View>

        {!isDesktop && <View style={{ flex: 1 }} />}

        {isDesktop ? (
          user && (
            <View style={{ position: 'relative' }}>
              <Pressable
                onPress={() => setUserMenuOpen(!userMenuOpen)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10,
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: userMenuOpen ? theme.surfaceBorder + '40' : 'transparent',
                })}
              >
                <View style={[styles.avatar, { backgroundColor: theme.neonPurple + '20', borderColor: theme.neonPurple + '40' }]}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.neonPurple }}>
                    {user.initial}
                  </ThemedText>
                </View>
                <MaterialIcons name="expand-more" size={18} color={theme.textMuted} />
              </Pressable>

              {userMenuOpen && (
                <Pressable style={styles.backdrop} onPress={() => setUserMenuOpen(false)} />
              )}

              {userMenuOpen && (
                <View style={[styles.userDropdown, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
                  <Pressable
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 12, paddingHorizontal: 16,
                      opacity: pressed ? 0.6 : 1,
                    })}
                    onPress={() => { setUserMenuOpen(false); router.push('/(tabs)/profile' as any); }}
                  >
                    <MaterialIcons name="person" size={18} color={theme.textMuted} />
                    <ThemedText style={{ fontSize: 14, fontWeight: '500' }}>Perfil</ThemedText>
                  </Pressable>
                  <View style={{ height: 1, backgroundColor: theme.surfaceBorder, marginHorizontal: 12 }} />
                  <Pressable
                    onPress={() => { setUserMenuOpen(false); user.onSignOut(); }}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 12, paddingHorizontal: 16,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <MaterialIcons name="logout" size={18} color={Palette.neonPink} />
                    <ThemedText style={{ fontSize: 14, fontWeight: '500', color: Palette.neonPink }}>Cerrar sesión</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          )
        ) : (
          <Pressable
            onPress={() => setMenuOpen(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
          >
            <MaterialIcons name="menu" size={26} color={theme.text} />
          </Pressable>
        )}
      </View>

      {/* Mobile menu backdrop */}
      {menuOpen && (
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
      )}

      {/* Mobile menu panel */}
      {menuOpen && (
        <View style={[styles.menuPanel, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
          <View style={styles.menuHeader}>
            <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>Navegación</ThemedText>
            <Pressable onPress={() => setMenuOpen(false)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          {tabs.map((t) => (
            <Pressable
              key={t.name}
              onPress={() => { setMenuOpen(false); router.push(t.href); }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 14, paddingHorizontal: 20,
                opacity: pressed ? 0.6 : 1, borderRadius: 12, marginHorizontal: 8,
              })}
            >
              <MaterialIcons name={t.icon} size={22} color={theme.neonGreen} />
              <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>{t.label}</ThemedText>
            </Pressable>
          ))}

          {user && (
            <>
              <View style={{ height: 1, backgroundColor: theme.surfaceBorder, marginVertical: 8, marginHorizontal: 16 }} />
              <Pressable
                onPress={() => { setMenuOpen(false); router.push('/(tabs)/profile' as any); }}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingVertical: 14, paddingHorizontal: 20,
                  opacity: pressed ? 0.6 : 1, marginHorizontal: 8,
                })}
              >
                <MaterialIcons name="person" size={20} color={theme.textMuted} />
                <ThemedText style={{ fontSize: 15, fontWeight: '500' }}>Perfil</ThemedText>
              </Pressable>
              <Pressable
                onPress={user.onSignOut}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingVertical: 14, paddingHorizontal: 20,
                  opacity: pressed ? 0.6 : 1, marginHorizontal: 8,
                })}
              >
                <MaterialIcons name="logout" size={20} color={Palette.neonPink} />
                <ThemedText style={{ fontSize: 15, fontWeight: '600', color: Palette.neonPink }}>
                  Cerrar sesión
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
  },
  navRow: {
    height: NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuPanel: {
    position: 'absolute',
    top: NAV_HEIGHT + 1,
    right: 12,
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      },
    }),
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  userDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    marginTop: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      },
    }),
  },
});
