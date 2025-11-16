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
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDate } from '@/lib/utils';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';
import CustomTabBar from '@/components/CustomTabBar';

export default function ProfileScreen() {
  const { profile, loading, refreshProfile, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
        <Text style={styles.errorTitle}>No profile found</Text>
        <Text style={styles.errorText}>
          Please sign in again
        </Text>
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
        title="Profile"
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
        {/* Header */}
        <View style={styles.header}>
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
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        {profile.position_title && (
          <Text style={styles.position}>{profile.position_title}</Text>
        )}
      </View>

      {/* Profile Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>

        <View style={styles.detailRow}>
          <Ionicons name="mail" size={20} color="#6b7280" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{profile.email}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="briefcase" size={20} color="#6b7280" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            </Text>
          </View>
        </View>

        {profile.department && (
          <View style={styles.detailRow}>
            <Ionicons name="business" size={20} color="#6b7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>
                {profile.department.name}
                {profile.department.code && ` (${profile.department.code})`}
              </Text>
            </View>
          </View>
        )}

        {profile.phone_number && (
          <View style={styles.detailRow}>
            <Ionicons name="call" size={20} color="#6b7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{profile.phone_number}</Text>
            </View>
          </View>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="shield-checkmark" size={20} color="#6b7280" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>
              {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Permissions */}
      {(profile.is_head ||
        profile.is_hr ||
        profile.is_exec ||
        profile.is_vp ||
        profile.is_president) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          {profile.is_head && (
            <View style={styles.badge}>
              <Ionicons name="star" size={16} color="#7a0019" />
              <Text style={styles.badgeText}>Department Head</Text>
            </View>
          )}
          {profile.is_hr && (
            <View style={styles.badge}>
              <Ionicons name="people" size={16} color="#7a0019" />
              <Text style={styles.badgeText}>Human Resources</Text>
            </View>
          )}
          {profile.is_exec && (
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={16} color="#7a0019" />
              <Text style={styles.badgeText}>Executive</Text>
            </View>
          )}
          {profile.is_vp && (
            <View style={styles.badge}>
              <Ionicons name="trophy" size={16} color="#7a0019" />
              <Text style={styles.badgeText}>Vice President</Text>
            </View>
          )}
          {profile.is_president && (
            <View style={styles.badge}>
              <Ionicons name="medal" size={16} color="#7a0019" />
              <Text style={styles.badgeText}>President</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/profile/settings')}
        >
          <Ionicons name="settings-outline" size={20} color="#7a0019" />
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#dc2626" />
          <Text style={styles.actionButtonTextDanger}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      {/* Bottom padding to account for navbar */}
      <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <CustomTabBar />
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
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  position: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
  actions: {
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonDanger: {
    borderColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7a0019',
  },
  actionButtonTextDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
});

