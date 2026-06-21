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
};

const TAB_LABELS: Record<string, string> = {
  index: 'TORNEOS',
  explore: 'PRONÓSTICOS',
  admin: 'ADMIN',
};

export default function AppTabs() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList style={[styles.tabBar, { paddingBottom: insets.bottom, backgroundColor: theme.tabBar, borderTopColor: theme.surfaceBorder }]}>
        <TabTrigger name="index" href={'/(tabs)' as any} asChild>
          <TabIconButton name="index" />
        </TabTrigger>
        <TabTrigger name="explore" href={'/(tabs)/explore' as any} asChild>
          <TabIconButton name="explore" />
        </TabTrigger>
        {isAdmin && (
          <TabTrigger name="admin" href={'/(tabs)/admin' as any} asChild>
            <TabIconButton name="admin" />
          </TabTrigger>
        )}
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
