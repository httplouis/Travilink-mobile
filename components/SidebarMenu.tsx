import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { AvailabilityStatus } from '@/lib/types';
import AvailabilityPicker from '@/components/AvailabilityPicker';

interface SidebarMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function SidebarMenu({ visible, onClose }: SidebarMenuProps) {
  const { profile, refreshProfile } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(-Dimensions.get('window').width)).current;
  const [shouldRender, setShouldRender] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Reset animation value immediately
      slideAnim.setValue(-Dimensions.get('window').width);
      // Use requestAnimationFrame to ensure the value is set before animating
      requestAnimationFrame(() => {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
          velocity: 0,
        }).start();
      });
    } else {
      Animated.timing(slideAnim, {
        toValue: -Dimensions.get('window').width,
        duration: 200,
        useNativeDriver: true,
        easing: (t) => t * (2 - t),
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, slideAnim]);

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path as any);
    }, 250);
  };

  const handleAvailabilityChange = async (status: AvailabilityStatus) => {
    if (!profile || updatingAvailability) return;
    
    setUpdatingAvailability(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ availability_status: status })
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshProfile();
    } catch (error) {
      console.error('[SidebarMenu] Error updating availability:', error);
    } finally {
      setUpdatingAvailability(false);
    }
  };


  // Filter menu items - only items not in bottom nav
  const menuItems = [
    {
      icon: 'home-outline' as const,
      label: 'Home',
      path: '/(tabs)/home',
    },
    {
      icon: 'car-outline' as const,
      label: 'Vehicles',
      path: '/vehicles',
    },
    {
      icon: 'person-outline' as const,
      label: 'Drivers',
      path: '/drivers',
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      path: '/profile/settings',
    },
    {
      icon: 'help-circle-outline' as const,
      label: 'Help & Support',
      path: '/help',
    },
  ];

  // Add admin/manager items conditionally
  const isAdminOrManager =
    profile &&
    (profile.role === 'admin' ||
      profile.is_head ||
      profile.is_hr ||
      profile.is_exec ||
      profile.role === 'driver');

  // Filter menu items based on role
  const filteredMenuItems = isAdminOrManager
    ? menuItems
    : menuItems.filter((item) => item.path !== '/vehicles' && item.path !== '/drivers');

  if (!visible && !shouldRender) {
    return null;
  }

  // Only render modal when it should be visible or is animating out
  return (
    <Modal
      visible={visible || shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Profile Header - Teams-inspired */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              onPress={() => {
                handleNavigate('/profile');
              }}
              activeOpacity={0.7}
              style={styles.profileSection}
            >
              {profile?.profile_picture ? (
                <Image
                  source={{ uri: profile.profile_picture }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profile?.name || 'User'}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {profile?.email || ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Availability Status */}
          <View style={styles.availabilitySection}>
            <Text style={styles.availabilityLabel}>Set availability</Text>
            <AvailabilityPicker
              currentStatus={profile?.availability_status || 'online'}
              onSelect={handleAvailabilityChange}
            />
          </View>

          {/* Notifications Toggle */}
          <View style={styles.notificationSection}>
            <View style={styles.notificationRow}>
              <View style={styles.notificationLeft}>
                <Ionicons name="notifications-outline" size={20} color="#6b7280" />
                <Text style={styles.notificationLabel}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#d1d5db', true: '#7a0019' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(tabs)/calendar')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="calendar-outline" size={24} color="#6b7280" />
                <Text style={styles.menuItemLabel}>Calendar</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
            {filteredMenuItems.map((item) => (
              <TouchableOpacity
                key={item.path}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.path)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon} size={24} color="#6b7280" />
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => handleNavigate('/feedback')}
              activeOpacity={0.7}
            >
              <Ionicons name="star-outline" size={18} color="#6b7280" />
              <Text style={styles.footerButtonText}>Feedback</Text>
            </TouchableOpacity>
            <View style={styles.footerDivider} />
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => handleNavigate('/profile/settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              <Text style={styles.footerButtonText}>About</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: Dimensions.get('window').width * 0.85,
    maxWidth: 340,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    justifyContent: 'space-between',
  },
  profileHeader: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#6b7280',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  availabilitySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  availabilityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  notificationSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  menu: {
    flex: 1,
    paddingVertical: 8,
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
    gap: 16,
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
  },
});
