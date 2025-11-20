import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/useNotifications';
import { Notification } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAgo } from '@/lib/utils';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import NavigationHeader from '@/components/NavigationHeader';
import CustomTabBar from '@/components/CustomTabBar';
import SidebarMenu from '@/components/SidebarMenu';

type NotificationsTab = 'unread' | 'all';

export default function NotificationsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<NotificationsTab>('unread');
  const { notifications, isLoading, error, refetch } = useNotifications(
    profile?.id || ''
  );
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  // Don't render if still loading auth or no profile
  if (authLoading || !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const visibleNotifications =
    tab === 'unread' ? unreadNotifications : notifications;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
        queryClient.invalidateQueries({
          queryKey: ['notifications', profile?.id],
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate
    if (notification.related_id && notification.related_type === 'request') {
      router.push(`/request/${notification.related_id}`);
    } else if (notification.action_url) {
      router.push(notification.action_url as any);
    } else {
      router.push('/(tabs)/submissions');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead(unreadNotifications.map((n) => n.id));
      queryClient.invalidateQueries({
        queryKey: ['notifications', profile?.id],
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_approved':
        return <Ionicons name="checkmark-circle" size={24} color="#16a34a" />;
      case 'request_rejected':
        return <Ionicons name="close-circle" size={24} color="#dc2626" />;
      case 'request_pending':
        return <Ionicons name="time" size={24} color="#f59e0b" />;
      default:
        return <Ionicons name="information-circle" size={24} color="#2563eb" />;
    }
  };

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#dc2626" />
        <Text style={styles.errorTitle}>Error loading notifications</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Notifications"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={false}
        showMenu={true}
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'unread' && styles.tabActive]}
          onPress={() => setTab('unread')}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'unread' && styles.tabTextActive,
            ]}
          >
            Unread ({unreadNotifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text
            style={[styles.tabText, tab === 'all' && styles.tabTextActive]}
          >
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {visibleNotifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="notifications-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>
            No {tab === 'unread' ? 'unread ' : ''}notifications
          </Text>
          <Text style={styles.emptyText}>
            You'll see updates about your requests here
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.notificationItem,
                !item.is_read && styles.notificationItemUnread,
              ]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationIcon}>
                {getNotificationIcon(item.notification_type)}
              </View>
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  {!item.is_read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {item.message}
                </Text>
                <View style={styles.notificationFooter}>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(item.created_at)}
                  </Text>
                  {item.action_label && (
                    <Text style={styles.notificationAction}>
                      {item.action_label} →
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'ios' ? 140 : 120 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#7a0019"
            />
          }
          ListFooterComponent={
            tab === 'unread' && unreadNotifications.length > 0 ? (
              <View style={styles.markAllFooterContainer}>
                <TouchableOpacity
                  style={styles.markAllFooterButton}
                  onPress={handleMarkAllRead}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-done" size={20} color="#7a0019" />
                  <Text style={styles.markAllFooterButtonText}>Mark all as read</Text>
                </TouchableOpacity>
              </View>
            ) : tab === 'all' && unreadNotifications.length > 0 ? (
              <View style={styles.markAllFooterContainer}>
                <TouchableOpacity
                  style={styles.markAllFooterButton}
                  onPress={handleMarkAllRead}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-done" size={20} color="#7a0019" />
                  <Text style={styles.markAllFooterButtonText}>Mark all as read</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
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
  markAllFooterContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  markAllFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  markAllFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7a0019',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#7a0019',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notificationItemUnread: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7a0019',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notificationAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a0019',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  retryButton: {
    backgroundColor: '#7a0019',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

