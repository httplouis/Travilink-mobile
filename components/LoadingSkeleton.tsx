import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function LoadingSkeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}: LoadingSkeletonProps) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function RequestCardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardHeaderSkeleton}>
        <LoadingSkeleton width={120} height={18} borderRadius={4} />
        <LoadingSkeleton width={60} height={24} borderRadius={12} />
      </View>
      <View style={styles.cardContentSkeleton}>
        <LoadingSkeleton width="80%" height={16} borderRadius={4} />
        <LoadingSkeleton width="60%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <LoadingSkeleton width="70%" height={14} borderRadius={4} style={{ marginTop: 12 }} />
      </View>
      <View style={styles.cardActionsSkeleton}>
        <LoadingSkeleton width={100} height={36} borderRadius={8} />
        <LoadingSkeleton width={80} height={36} borderRadius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  cardSkeleton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardContentSkeleton: {
    marginBottom: 16,
  },
  cardActionsSkeleton: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});

