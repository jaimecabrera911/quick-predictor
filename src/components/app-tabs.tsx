import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { Palette, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  index: 'emoji-events',
  explore: 'fact-check',
  admin: 'admin-panel-settings',
  profile: 'person',
};

const TAB_LABELS: Record<string, string> = {
  index: 'TORNEOS',
  explore: 'PRONÓSTICOS',
  admin: 'ADMIN',
  profile: 'PERFIL',
};

export default function AppTabs() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const tabs = [
    { name: 'index', href: '/(tabs)' as const },
    { name: 'explore', href: '/(tabs)/explore' as const },
    ...(isAdmin ? [{ name: 'admin' as const, href: '/(tabs)/admin' as const }] : []),
    { name: 'profile' as const, href: '/(tabs)/profile' as const },
  ];

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={StyleSheet.flatten([styles.tabBar, { paddingBottom: insets.bottom, backgroundColor: theme.tabBar, borderTopColor: theme.surfaceBorder }])}>
          {tabs.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabIconButton name={t.name} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

function TabIconButton({ name, isFocused, ...props }: TabTriggerSlotProps & { name: string }) {
  const theme = useTheme();
  const iconName = TAB_ICONS[name] || 'help-outline';
  const label = TAB_LABELS[name] || name;

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.iconWrap, isFocused && { backgroundColor: Palette.neonGreen + '15' }]}>
        <MaterialIcons name={iconName} size={22} color={isFocused ? Palette.neonGreen : theme.textMuted} />
      </View>
      <ThemedText style={[styles.tabLabel, { color: isFocused ? Palette.neonGreen : theme.textMuted }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.half,
    paddingHorizontal: Spacing.four,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
});
