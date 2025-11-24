import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';

export default function Index() {
  const { session, profile, loading } = useAuth();
  const [hasWaited, setHasWaited] = useState(false);

  // Give auth context time to initialize (max 3 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaited(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner while checking auth (first 3 seconds)
  if (loading || (!hasWaited && !session)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#7a0019" />
      </View>
    );
  }

  // If no session after waiting, redirect to sign-in
  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // If session exists but no profile after waiting, session is likely invalid
  // Clear it and redirect to sign-in
  if (!profile && hasWaited) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Still loading profile
  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#7a0019" />
      </View>
    );
  }

  // Both session and profile exist - redirect to dashboard
  return <Redirect href="/(tabs)/dashboard" />;
}

