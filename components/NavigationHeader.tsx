import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

interface NavigationHeaderProps {
  title: string;
  onMenuPress?: () => void;
  showNotification?: boolean;
  showMenu?: boolean;
  showBack?: boolean;
}

export default function NavigationHeader({
  title,
  onMenuPress,
  showNotification = true,
  showMenu = true,
  showBack = false,
}: NavigationHeaderProps) {
  const { profile } = useAuth();
  const { notifications } = useNotifications(profile?.id || '');
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        )}
        {showMenu && !showBack && onMenuPress && profile && (
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.profileButton}
            activeOpacity={0.7}
          >
            {profile.profile_picture ? (
              <View style={styles.profileAvatar}>
                <Image
                  source={{ uri: profile.profile_picture }}
                  style={styles.profileAvatarImage}
                />
                {profile.availability_status && profile.availability_status !== 'online' && (
                  <View style={[styles.availabilityIndicator, styles[`availability${profile.availability_status}` as keyof typeof styles]]} />
                )}
              </View>
            ) : (
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {profile.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
                {profile.availability_status && profile.availability_status !== 'online' && (
                  <View style={[styles.availabilityIndicator, styles[`availability${profile.availability_status}` as keyof typeof styles]]} />
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {showNotification && (
        <TouchableOpacity
          onPress={handleNotificationPress}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color="#111827" />
          {unreadCount > 0 && (
            <View style={[styles.badge, unreadCount > 9 && styles.badgeLarge]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeLarge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileButton: {
    padding: 2,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  availabilityIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  availabilitybusy: {
    backgroundColor: '#f59e0b',
  },
  availabilityoff_work: {
    backgroundColor: '#6b7280',
  },
  availabilityon_leave: {
    backgroundColor: '#dc2626',
  },
});

