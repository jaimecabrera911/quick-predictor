import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors, Palette } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function AppTabs() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <NativeTabs
      backgroundColor={colors.tabBar}
      indicatorColor={Palette.neonGreen}
      labelStyle={{
        selected: { color: Palette.neonGreen },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>TORNEOS</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>MIS PRONÓSTICOS</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {isAdmin && (
        <NativeTabs.Trigger name="admin">
          <NativeTabs.Trigger.Label>ADMIN</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/admin.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
