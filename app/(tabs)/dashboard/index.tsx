import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  Image,
  PanResponder,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useRequests } from '@/hooks/useRequests';
import { usePendingEvaluations } from '@/hooks/usePendingEvaluations';
import { useHeadInbox } from '@/hooks/useHeadInbox';
import { useVPInbox } from '@/hooks/useVPInbox';
import { usePresidentInbox } from '@/hooks/usePresidentInbox';
import { useHRInbox } from '@/hooks/useHRInbox';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDate, formatTime } from '@/lib/utils';
import SidebarMenu from '@/components/SidebarMenu';
import NavigationHeader from '@/components/NavigationHeader';
import CalendarWidget from '@/components/CalendarWidget';
import InboxRequestCard from '@/components/InboxRequestCard';

export default function DashboardScreen() {
  const { profile, loading: authLoading } = useAuth();
  const { kpis, vehicles, drivers, trips, isLoading, refetch } = useDashboard(profile?.id || '');
  const { requests: userRequests } = useRequests(profile?.id || '');
  const { pendingTrips, count: pendingFeedbackCount } = usePendingEvaluations(profile?.id || '');
  const headInbox = useHeadInbox(profile?.id || '', profile?.department_id || null);
  const vpInbox = useVPInbox(profile?.id || '');
  const presidentInbox = usePresidentInbox(profile?.id || '');
  const hrInbox = useHRInbox(profile?.id || '');
  
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  // Get pending inbox requests based on role
  const getPendingInboxRequests = () => {
    if (profile?.is_head) return headInbox.requests || [];
    if (profile?.is_vp) return vpInbox.requests || [];
    if (profile?.is_president) return presidentInbox.requests || [];
    if (profile?.is_hr) return hrInbox.requests || [];
    return [];
  };
  
  const pendingInboxRequests = getPendingInboxRequests();
  
  // Get urgent requests (traveling within 3 days)
  const urgentRequests = userRequests.filter((req) => {
    if (!req.travel_start_date || req.status !== 'approved') return false;
    const travelDate = new Date(req.travel_start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    travelDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((travelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });
  
  // Swipe left to navigate to inbox - only trigger on horizontal swipes, not vertical (pull to refresh)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Don't capture initially
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture if horizontal movement is greater than vertical (swipe left/right, not pull to refresh)
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isSignificant = Math.abs(gestureState.dx) > 20;
        return isHorizontal && isSignificant;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Only navigate if it's a clear left swipe (not during refresh)
        if (gestureState.dx < -80 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2) {
          router.push('/(tabs)/inbox');
        }
      },
    })
  ).current;

  // All hooks must be called BEFORE any early returns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    return () => clearInterval(timer);
  }, [fadeAnim, slideAnim]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (authLoading || !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const day = currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const time = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      {/* Header with Menu and Notifications */}
      <NavigationHeader
        title="Dashboard"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7a0019" />
        }
        {...panResponder.panHandlers}
      >
      {/* Hero Section */}
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroGreeting}>Welcome to TraveLink 👋</Text>
          <Text style={styles.heroName}>{profile.name || 'User'}</Text>
          <View style={styles.heroTimeContainer}>
            <Ionicons name="calendar-outline" size={14} color="#fff" />
            <Text style={styles.heroTime}>{day}</Text>
            <Text style={styles.heroTimeSeparator}>•</Text>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.heroTime}>{time}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Priority Section: What Needs Attention NOW */}
      <View style={styles.prioritySection}>
        {/* Pending Approvals (if user is approver) */}
        {pendingInboxRequests.length > 0 && (
          <View style={styles.attentionCard}>
            <View style={styles.attentionHeader}>
              <View style={styles.attentionIconContainer}>
                <Ionicons name="notifications" size={24} color="#fff" />
              </View>
              <View style={styles.attentionContent}>
                <Text style={styles.attentionTitle}>
                  {pendingInboxRequests.length} Request{pendingInboxRequests.length !== 1 ? 's' : ''} Need Your Approval
                </Text>
                <Text style={styles.attentionSubtitle}>
                  Tap to review and approve
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/inbox')}
                style={styles.attentionButton}
              >
                <Text style={styles.attentionButtonText}>View</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {/* Show first 2 urgent requests */}
            {pendingInboxRequests.slice(0, 2).map((request) => (
              <TouchableOpacity
                key={request.id}
                onPress={() => router.push(`/request/${request.id}`)}
                style={styles.attentionRequestItem}
              >
                <View style={styles.attentionRequestLeft}>
                  <Text style={styles.attentionRequestNumber}>{request.request_number}</Text>
                  <Text style={styles.attentionRequestDestination} numberOfLines={1}>
                    {request.destination}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Urgent Upcoming Trips */}
        {urgentRequests.length > 0 && (
          <View style={styles.urgentCard}>
            <View style={styles.urgentHeader}>
              <View style={styles.urgentIconContainer}>
                <Ionicons name="alert-circle" size={24} color="#fff" />
              </View>
              <View style={styles.urgentContent}>
                <Text style={styles.urgentTitle}>
                  {urgentRequests.length} Trip{urgentRequests.length !== 1 ? 's' : ''} Starting Soon
                </Text>
                <Text style={styles.urgentSubtitle}>
                  Within the next 3 days
                </Text>
              </View>
            </View>
            {urgentRequests.slice(0, 2).map((request) => {
              const travelDate = new Date(request.travel_start_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              travelDate.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil((travelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <TouchableOpacity
                  key={request.id}
                  onPress={() => router.push(`/request/${request.id}`)}
                  style={styles.urgentTripItem}
                >
                  <View style={styles.urgentTripLeft}>
                    <Text style={styles.urgentTripDestination} numberOfLines={1}>
                      {request.destination}
                    </Text>
                    <Text style={styles.urgentTripDate}>
                      {formatDate(request.travel_start_date)} • {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays} days`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Pending Feedback */}
        {pendingFeedbackCount > 0 && (
          <TouchableOpacity
            style={styles.feedbackCard}
            onPress={() => router.push('/(tabs)/submissions?filter=needs_feedback')}
          >
            <View style={styles.feedbackIconContainer}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
            </View>
            <View style={styles.feedbackContent}>
              <Text style={styles.feedbackTitle}>
                {pendingFeedbackCount} Trip{pendingFeedbackCount !== 1 ? 's' : ''} Need Your Feedback
              </Text>
              <Text style={styles.feedbackSubtitle}>
                Help us improve by sharing your experience
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#8b5cf6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Calendar Widget */}
      {profile?.id && <CalendarWidget userId={profile.id} />}

      {/* KPI Cards - Improved with better visual hierarchy */}
      <View style={styles.kpiRow}>
        <KPICard
          icon="document-text-outline"
          label="My Requests"
          value={kpis.activeRequests}
          color="#2563eb"
          description="Active"
        />
        <KPICard
          icon="time-outline"
          label="Pending"
          value={pendingInboxRequests.length}
          color="#f59e0b"
          description="Awaiting"
        />
        <KPICard
          icon="checkmark-circle-outline"
          label="Approved"
          value={userRequests.filter(r => r.status === 'approved').length}
          color="#16a34a"
          description="Ready"
        />
      </View>

      {/* Quick Actions - Simplified */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.quickActionsTitle}>Quick Access</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            icon="mail-outline"
            label="Inbox"
            color="#7a0019"
            onPress={() => router.push('/(tabs)/inbox')}
            badge={pendingInboxRequests.length > 0 ? pendingInboxRequests.length : undefined}
          />
          <QuickActionButton
            icon="list-outline"
            label="My Requests"
            color="#2563eb"
            onPress={() => router.push('/(tabs)/submissions')}
          />
          <QuickActionButton
            icon="calendar-outline"
            label="Calendar"
            color="#16a34a"
            onPress={() => router.push('/(tabs)/calendar')}
          />
          <QuickActionButton
            icon="person-outline"
            label="Profile"
            color="#8b5cf6"
            onPress={() => router.push('/profile')}
          />
        </View>
      </View>

      {/* Available Vehicles */}
      {vehicles.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="car-outline" size={20} color="#7a0019" />
              <Text style={styles.sectionTitle}>Available Vehicles</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/vehicles')}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehiclesScroll}>
            {vehicles.slice(0, 3).map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Available Drivers */}
      {drivers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="person-outline" size={20} color="#7a0019" />
              <Text style={styles.sectionTitle}>Available Drivers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/drivers')}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehiclesScroll}>
            {drivers.slice(0, 3).map((driver) => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
          </ScrollView>
        </View>
      )}


      {/* Bottom padding to account for navbar */}
      <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

function KPICard({
  icon,
  label,
  value,
  color,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  description?: string;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [value, scaleAnim]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (label === 'My Requests') router.push('/(tabs)/submissions');
        else if (label === 'Pending') router.push('/(tabs)/inbox');
        else if (label === 'Approved') router.push('/(tabs)/submissions?filter=approved');
      }}
    >
      <Animated.View
        style={[
          styles.kpiCard,
          {
            transform: [{ scale: scaleAnim }],
            borderLeftWidth: 4,
            borderLeftColor: color,
          },
        ]}
      >
        <View style={[styles.kpiIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={32} color={color} />
        </View>
        <Text style={[styles.kpiValue, { color }]}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
        {description && (
          <Text style={styles.kpiDescription}>{description}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  badge?: number;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.quickActionButtonWrapper}
    >
      <Animated.View
        style={[
          styles.quickActionButton,
          {
            transform: [{ scale: scaleAnim }],
            borderColor: color + '30',
          },
        ]}
      >
        <View style={[styles.quickActionIconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={28} color={color} />
          {badge !== undefined && badge > 0 && (
            <View style={styles.quickActionBadge}>
              <Text style={styles.quickActionBadgeText}>
                {badge > 99 ? '99+' : badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function VehicleCard({ vehicle }: { vehicle: any }) {
  const [imageError, setImageError] = React.useState(false);

  const handlePress = () => {
    router.push('/vehicles');
  };

  return (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.vehicleImageContainer}>
        {vehicle.photo_url && !imageError ? (
          <Image
            source={{ uri: vehicle.photo_url }}
            style={styles.vehicleImage}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.vehicleImagePlaceholder}>
            <Ionicons name="car-outline" size={32} color="#9ca3af" />
          </View>
        )}
        <View style={styles.vehicleStatusBadge}>
          <Text style={styles.vehicleStatusText}>Available</Text>
        </View>
      </View>
      <Text style={styles.vehicleName} numberOfLines={1}>
        {vehicle.vehicle_name}
      </Text>
      <Text style={styles.vehiclePlate}>{vehicle.plate_number}</Text>
      <View style={styles.vehicleCapacity}>
        <Ionicons name="people-outline" size={14} color="#6b7280" />
        <Text style={styles.vehicleCapacityText}>{vehicle.capacity} seats</Text>
      </View>
    </TouchableOpacity>
  );
}

function DriverCard({ driver }: { driver: any }) {
  return (
    <TouchableOpacity
      style={styles.driverCard}
      onPress={() => router.push('/drivers')}
      activeOpacity={0.7}
    >
      {driver.profile_picture ? (
        <Image source={{ uri: driver.profile_picture }} style={styles.driverAvatar} />
      ) : (
        <View style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>
            {driver.name?.charAt(0).toUpperCase() || 'D'}
          </Text>
        </View>
      )}
      <View style={styles.driverStatusBadge}>
        <View style={styles.driverStatusDot} />
        <Text style={styles.driverStatusText}>Available</Text>
      </View>
      <Text style={styles.driverName} numberOfLines={1}>
        {driver.name}
      </Text>
      {driver.position_title && (
        <Text style={styles.driverPosition} numberOfLines={1}>
          {driver.position_title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function TripCard({ trip }: { trip: any }) {
  const startDate = trip.travel_start_date ? new Date(trip.travel_start_date) : null;
  const endDate = trip.travel_end_date ? new Date(trip.travel_end_date) : null;

  return (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => router.push(`/request/${trip.id}`)}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.tripDestination} numberOfLines={1}>
          {trip.destination}
        </Text>
        <View style={styles.tripStatusBadge}>
          <Text style={styles.tripStatusText}>{trip.status}</Text>
        </View>
      </View>
      <Text style={styles.tripPurpose} numberOfLines={1}>
        {trip.purpose}
      </Text>
      <View style={styles.tripDetails}>
        <View style={styles.tripDetail}>
          <Ionicons name="time-outline" size={14} color="#6b7280" />
          <Text style={styles.tripDetailText}>
            {startDate ? formatTime(startDate.toISOString()) : 'TBD'} - {endDate ? formatTime(endDate.toISOString()) : 'TBD'}
          </Text>
        </View>
        {trip.assigned_vehicle && (
          <View style={styles.tripDetail}>
            <Ionicons name="car-outline" size={14} color="#6b7280" />
            <Text style={styles.tripDetailText}>
              {trip.assigned_vehicle.vehicle_name} ({trip.assigned_vehicle.plate_number})
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function AvailabilityHeatmap({ trips }: { trips: any[] }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const getDayStatus = (date: Date): 'available' | 'partial' | 'full' => {
    const dateStr = date.toISOString().split('T')[0];
    const dayTrips = trips.filter((t) => {
      const tripDate = t.travel_start_date ? new Date(t.travel_start_date).toISOString().split('T')[0] : null;
      return tripDate === dateStr;
    });

    if (dayTrips.length >= 5) return 'full';
    if (dayTrips.length > 0) return 'partial';
    return 'available';
  };

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmapGrid}>
        {days.map((day, index) => {
          const status = getDayStatus(day);
          return (
            <View
              key={index}
              style={[
                styles.heatmapDay,
                status === 'full' && styles.heatmapDayFull,
                status === 'partial' && styles.heatmapDayPartial,
                status === 'available' && styles.heatmapDayAvailable,
              ]}
            />
          );
        })}
      </View>
      <View style={styles.heatmapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotAvailable]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotPartial]} />
          <Text style={styles.legendText}>Partial</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotFull]} />
          <Text style={styles.legendText}>Full</Text>
        </View>
      </View>
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
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  hero: {
    backgroundColor: '#7a0019',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  heroContent: {
    marginBottom: 16,
  },
  heroGreeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.95,
    marginBottom: 6,
    fontWeight: '500',
  },
  heroName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTime: {
    fontSize: 15,
    color: '#fff',
    opacity: 0.95,
    fontWeight: '500',
  },
  heroTimeSeparator: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.5,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  heroButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
  heroButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  prioritySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  attentionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#7a0019',
    shadowColor: '#7a0019',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  attentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  attentionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#7a0019',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  attentionContent: {
    flex: 1,
  },
  attentionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 24,
  },
  attentionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  attentionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7a0019',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  attentionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  attentionRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginTop: 8,
  },
  attentionRequestLeft: {
    flex: 1,
  },
  attentionRequestNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  attentionRequestDestination: {
    fontSize: 13,
    color: '#6b7280',
  },
  urgentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  urgentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  urgentContent: {
    flex: 1,
  },
  urgentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 24,
  },
  urgentSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  urgentTripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    marginTop: 8,
  },
  urgentTripLeft: {
    flex: 1,
  },
  urgentTripDestination: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  urgentTripDate: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  feedbackIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 24,
  },
  feedbackSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  quickActionsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 160, // Fixed height for all KPI cards
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 0, // Allow flex to work properly
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  kpiDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a0019',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButtonWrapper: {
    width: '48%',
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  quickActionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  vehiclesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  vehicleCard: {
    width: 160,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleImageContainer: {
    width: '100%',
    height: 100,
    position: 'relative',
    backgroundColor: '#e5e7eb',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  vehicleImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vehicleStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
    marginHorizontal: 12,
  },
  vehiclePlate: {
    fontSize: 14,
    color: '#6b7280',
    marginHorizontal: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  vehicleCapacity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  vehicleCapacityText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  driverCard: {
    width: 160,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  driverStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  driverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  driverStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    letterSpacing: 0.2,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  driverPosition: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripDestination: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  tripStatusBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  tripPurpose: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  tripDetails: {
    gap: 8,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  heatmapContainer: {
    marginTop: 12,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  heatmapDay: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  heatmapDayAvailable: {
    backgroundColor: '#d1d5db',
  },
  heatmapDayPartial: {
    backgroundColor: '#fbbf24',
  },
  heatmapDayFull: {
    backgroundColor: '#f87171',
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendDotAvailable: {
    backgroundColor: '#d1d5db',
  },
  legendDotPartial: {
    backgroundColor: '#fbbf24',
  },
  legendDotFull: {
    backgroundColor: '#f87171',
  },
  legendText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
});

