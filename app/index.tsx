import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7a0019" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/submissions" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

