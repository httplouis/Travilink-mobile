import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="auto" />
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="request/[id]" />
              <Stack.Screen name="request/new" />
              <Stack.Screen name="request/travel-order" />
              <Stack.Screen name="request/seminar" />
              <Stack.Screen name="review/[id]" />
              <Stack.Screen name="auth/callback" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="feedback" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="profile/settings" />
              <Stack.Screen name="vehicles" />
              <Stack.Screen name="drivers" />
              <Stack.Screen name="help" />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

