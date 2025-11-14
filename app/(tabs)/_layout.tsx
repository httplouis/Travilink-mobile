import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';

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

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#7a0019',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingTop: 8,
            paddingBottom: 8,
            height: Platform.OS === 'ios' ? 85 : 65,
            backgroundColor: '#fff',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="request"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#7a0019',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                  shadowColor: '#7a0019',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Ionicons name="add" size={32} color="#fff" />
              </View>
            ),
            tabBarButton: (props) => (
              <TouchableOpacity {...props} activeOpacity={0.7} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        {/* Hidden screens - accessible via sidebar */}
        <Tabs.Screen
          name="submissions"
          options={{
            tabBarButton: () => null, // Completely hide from tab bar
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            tabBarButton: () => null, // Completely hide from tab bar
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarButton: () => null, // Completely hide from tab bar
          }}
        />
      </Tabs>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </>
  );
}

