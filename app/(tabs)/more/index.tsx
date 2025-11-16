import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';

export default function MoreScreen() {
  const { profile, loading, refreshProfile, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  };

  // Check if user has admin/manager permissions
  const isAdminOrManager =
    profile &&
    (profile.role === 'admin' ||
      profile.is_head ||
      profile.is_hr ||
      profile.is_exec ||
      profile.role === 'driver');

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
        <Text style={styles.errorTitle}>No profile found</Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="More"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7a0019"
          />
        }
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {profile.profile_picture ? (
                <Image
                  source={{ uri: profile.profile_picture }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {profile.email}
              </Text>
              {(() => {
                // Priority: role badges > position_title > role
                if (profile.is_president) return <Text style={styles.profileRole}>President</Text>;
                if (profile.is_vp) return <Text style={styles.profileRole}>Vice President</Text>;
                if (profile.is_exec) return <Text style={styles.profileRole}>Executive</Text>;
                if (profile.is_hr) return <Text style={styles.profileRole}>Human Resources</Text>;
                if (profile.is_head) return <Text style={styles.profileRole}>Department Head</Text>;
                if (profile.role === 'admin') return <Text style={styles.profileRole}>Administrator</Text>;
                if (profile.role === 'driver') return <Text style={styles.profileRole}>Driver</Text>;
                if (profile.position_title) return <Text style={styles.profileRole}>{profile.position_title}</Text>;
                // Default to role if available
                return profile.role ? (
                  <Text style={styles.profileRole}>
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Text>
                ) : null;
              })()}
            </View>
            <TouchableOpacity
              style={styles.viewProfileButton}
              onPress={() => router.push('/profile')}
            >
              <Ionicons name="chevron-forward" size={24} color="#7a0019" />
            </TouchableOpacity>
          </View>

          {/* Role Badges */}
          {(profile.is_head ||
            profile.is_hr ||
            profile.is_exec ||
            profile.is_vp ||
            profile.is_president) && (
            <View style={styles.badgesContainer}>
              {profile.is_head && (
                <View style={styles.badge}>
                  <Ionicons name="star" size={14} color="#7a0019" />
                  <Text style={styles.badgeText}>Head</Text>
                </View>
              )}
              {profile.is_hr && (
                <View style={styles.badge}>
                  <Ionicons name="people" size={14} color="#7a0019" />
                  <Text style={styles.badgeText}>HR</Text>
                </View>
              )}
              {profile.is_exec && (
                <View style={styles.badge}>
                  <Ionicons name="checkmark-circle" size={14} color="#7a0019" />
                  <Text style={styles.badgeText}>Executive</Text>
                </View>
              )}
              {profile.is_vp && (
                <View style={styles.badge}>
                  <Ionicons name="trophy" size={14} color="#7a0019" />
                  <Text style={styles.badgeText}>VP</Text>
                </View>
              )}
              {profile.is_president && (
                <View style={styles.badge}>
                  <Ionicons name="medal" size={14} color="#7a0019" />
                  <Text style={styles.badgeText}>President</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profile/settings')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="settings-outline" size={20} color="#7a0019" />
              </View>
              <Text style={styles.menuItemLabel}>Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/help')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#f0f9ff' }]}>
              <Ionicons name="help-circle-outline" size={20} color="#0369a1" />
            </View>
            <Text style={styles.menuItemLabel}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/feedback')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#fefce8' }]}>
              <Ionicons name="star-outline" size={20} color="#ca8a04" />
            </View>
            <Text style={styles.menuItemLabel}>Feedback</Text>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Admin/Manager Section */}
        {isAdminOrManager && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Management</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/vehicles')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="car-outline" size={20} color="#16a34a" />
              </View>
              <Text style={styles.menuItemLabel}>Vehicles</Text>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/drivers')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="person-outline" size={20} color="#dc2626" />
              </View>
              <Text style={styles.menuItemLabel}>Drivers</Text>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Bottom padding */}
        <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 16,
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#7a0019',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e5e7eb',
  },
  viewProfileButton: {
    padding: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a0019',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
});

