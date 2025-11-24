import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import CustomTabBar from '@/components/CustomTabBar';
import React from 'react';

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7a0019" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Icon components - Teams-inspired design
  const HomeIcon = ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
  );

  const RequestIcon = ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={24} color={color} />
  );

  const CalendarIcon = ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
  );

  const SubmissionsIcon = ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? "list" : "list-outline"} size={24} color={color} />
  );

  const MoreIcon = ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"} size={24} color={color} />
  );

  return (
    <>
      <Tabs
        tabBar={(props) => <CustomTabBar />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Hide default tab bar
        }}
      >
        {/* ONLY 5 TABS - EXPLICITLY DEFINED */}
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => <HomeIcon color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, focused }) => <CalendarIcon color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "mail" : "mail-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="budget-review"
          options={{
            title: 'Budget Review',
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calculator" : "calculator-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="request"
          options={{
            title: 'Request',
            tabBarIcon: ({ color, focused }) => <RequestIcon color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="submissions"
          options={{
            title: 'Requests',
            tabBarIcon: ({ color, focused }) => <SubmissionsIcon color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, focused }) => <MoreIcon color={color} focused={focused} />,
          }}
        />
      </Tabs>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </>
  );
}
