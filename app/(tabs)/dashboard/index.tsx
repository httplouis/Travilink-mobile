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
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDate, formatTime } from '@/lib/utils';
import SidebarMenu from '@/components/SidebarMenu';
import NavigationHeader from '@/components/NavigationHeader';

export default function DashboardScreen() {
  const { profile, loading: authLoading } = useAuth();
  const { kpis, vehicles, drivers, trips, isLoading, refetch } = useDashboard(profile?.id || '');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
          <Text style={styles.heroGreeting}>Welcome to TraviLink 👋</Text>
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

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KPICard
          icon="document-text-outline"
          label="Active Requests"
          value={kpis.activeRequests}
          color="#2563eb"
        />
        <KPICard
          icon="car-outline"
          label="Vehicles Online"
          value={kpis.vehiclesOnline}
          color="#16a34a"
        />
        <KPICard
          icon="time-outline"
          label="Pending Approvals"
          value={kpis.pendingApprovals}
          color="#f59e0b"
        />
      </View>

      {/* Quick Actions */}
      <Animated.View
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>Fast shortcuts</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            icon="person-circle-outline"
            label="Edit Profile"
            color="#7a0019"
            onPress={() => router.push('/profile')}
          />
          <QuickActionButton
            icon="time-outline"
            label="Set Status"
            color="#2563eb"
            onPress={() => {
              // Open sidebar to set availability
              setSidebarVisible(true);
            }}
          />
          <QuickActionButton
            icon="star-outline"
            label="Feedback"
            color="#f59e0b"
            onPress={() => router.push('/feedback')}
          />
          <QuickActionButton
            icon="settings-outline"
            label="Settings"
            color="#6b7280"
            onPress={() => router.push('/profile/settings')}
          />
        </View>
      </Animated.View>

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

      {/* Upcoming Trips */}
      {trips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Trips</Text>
          {trips.slice(0, 6).map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
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
    <Animated.View
      style={[
        styles.kpiCard,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.kpiIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Animated.View>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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
    >
      <Animated.View
        style={[
          styles.quickActionButton,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.quickActionIconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function VehicleCard({ vehicle }: { vehicle: any }) {
  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleImagePlaceholder}>
        <Ionicons name="car-outline" size={32} color="#9ca3af" />
      </View>
      <View style={styles.vehicleStatusBadge}>
        <Text style={styles.vehicleStatusText}>Available</Text>
      </View>
      <Text style={styles.vehicleName} numberOfLines={1}>
        {vehicle.vehicle_name}
      </Text>
      <Text style={styles.vehiclePlate}>{vehicle.plate_number}</Text>
      <View style={styles.vehicleCapacity}>
        <Ionicons name="people-outline" size={14} color="#6b7280" />
        <Text style={styles.vehicleCapacityText}>{vehicle.capacity} seats</Text>
      </View>
    </View>
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
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  heroTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTime: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
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
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    textAlign: 'center',
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
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
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
  vehicleImagePlaceholder: {
    width: '100%',
    height: 100,
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
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginHorizontal: 12,
  },
  vehiclePlate: {
    fontSize: 12,
    color: '#6b7280',
    marginHorizontal: 12,
    marginTop: 4,
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
    fontSize: 12,
    color: '#6b7280',
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
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  driverPosition: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
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
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'capitalize',
  },
  tripPurpose: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
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
    fontSize: 12,
    color: '#6b7280',
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
    fontSize: 11,
    color: '#6b7280',
  },
});

