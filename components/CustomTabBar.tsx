import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getTabsForRole } from '@/lib/utils/navigation';

const windowWidth = Dimensions.get('window').width;

export default function CustomTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const { profile } = useAuth();
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  // Get role-based tabs (Request always in position 3 - middle)
  const tabs = useMemo(() => getTabsForRole(profile), [profile]);

  const isActive = (route: string) => {
    const routePath = route.replace(/[()]/g, '').replace(/^\/tabs\//, '');
    const currentPath = segments.join('/').replace(/[()]/g, '');
    const tabName = routePath.split('/').pop() || routePath;
    
    // Special handling for nested routes
    if (tabName === 'request') {
      // Match request tab for: request, request/travel-order, request/seminar, etc.
      return currentPath === `tabs/${tabName}` || 
             currentPath === tabName || 
             currentPath.includes(`/${tabName}/`) ||
             currentPath.includes(`request/`);
    }
    
    if (tabName === 'more') {
      // Match more tab for: more, vehicles, drivers, profile/settings, help
      return currentPath === `tabs/${tabName}` || 
             currentPath === tabName || 
             currentPath.includes(`/${tabName}/`) ||
             currentPath === 'vehicles' ||
             currentPath === 'drivers' ||
             currentPath.includes('profile/') ||
             currentPath === 'help';
    }
    
    return currentPath === `tabs/${tabName}` || currentPath === tabName || currentPath.includes(`/${tabName}`);
  };

  // Find active tab index and animate indicator
  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => isActive(tab.route));
    if (activeIndex >= 0) {
      Animated.spring(indicatorAnim, {
        toValue: activeIndex,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [segments, indicatorAnim]);

  const tabWidth = windowWidth / tabs.length;
  
  const translateX = indicatorAnim.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * tabWidth),
  });

  return (
    <View style={styles.tabBar}>
      {/* Animated indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: tabWidth,
            transform: [{ translateX }],
          },
        ]}
      />
      
      {tabs.map((tab, index) => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? (tab.iconFocused as any) : (tab.icon as any)}
              size={24}
              color={active ? '#7a0019' : '#9ca3af'}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 72,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    color: '#9ca3af',
  },
  tabLabelActive: {
    color: '#7a0019',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: '#7a0019',
    borderRadius: 1.5,
  },
});

