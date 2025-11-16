import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function RequestNewScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();

  useEffect(() => {
    if (type === 'travel_order') {
      router.replace('/request/travel-order');
    } else if (type === 'seminar') {
      router.replace('/request/seminar');
    } else {
      // Default to travel order if no type specified
      router.replace('/request/travel-order');
    }
  }, [type]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7a0019" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});

