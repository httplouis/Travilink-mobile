import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function SidebarMenu({ visible, onClose }: SidebarMenuProps) {
  const { profile } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(-Dimensions.get('window').width)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -Dimensions.get('window').width,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path as any);
    }, 250);
  };

  const menuItems = [
    {
      icon: 'list-outline' as const,
      label: 'My Requests',
      path: '/(tabs)/submissions',
    },
    {
      icon: 'calendar-outline' as const,
      label: 'Schedule',
      path: '/(tabs)/calendar',
    },
    {
      icon: 'notifications-outline' as const,
      label: 'Notifications',
      path: '/(tabs)/notifications',
    },
    {
      icon: 'car-outline' as const,
      label: 'Vehicles',
      path: '/vehicles',
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      path: '/(tabs)/profile/settings',
    },
    {
      icon: 'help-circle-outline' as const,
      label: 'Help & Support',
      path: '/help',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              {profile?.profile_picture ? (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={32} color="#fff" />
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
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menu}>
            {menuItems.map((item, index) => (
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
        </Animated.View>
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
    width: Dimensions.get('window').width * 0.8,
    maxWidth: 320,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    padding: 20,
    paddingTop: 60,
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
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  closeButton: {
    padding: 4,
  },
  menu: {
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
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 16,
  },
});

