import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import AppTabs from '@/components/app-tabs';
import { Palette } from '@/constants/theme';

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Palette.black }}>
        <ActivityIndicator size="large" color={Palette.neonGreen} />
      </View>
    );
  }

  if (!user) return <Redirect href={'/(auth)' as any} />;

  return <AppTabs />;
}
