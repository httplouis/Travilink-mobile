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
  Alert,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { useAuth } from '@/contexts/AuthContext';

// Optional haptics import
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Haptics not available, continue without it
}
import { useDashboard } from '@/hooks/useDashboard';
import { useHeadInbox } from '@/hooks/useHeadInbox';
import { useHRInbox } from '@/hooks/useHRInbox';
import { useVPInbox } from '@/hooks/useVPInbox';
import { usePresidentInbox } from '@/hooks/usePresidentInbox';
import { usePendingEvaluations } from '@/hooks/usePendingEvaluations';
import { useComptrollerStats } from '@/hooks/useComptrollerStats';
import { useComptrollerInbox } from '@/hooks/useComptrollerInbox';
import { useVPStats } from '@/hooks/useVPStats';
import { useHRStats } from '@/hooks/useHRStats';
import { usePresidentStats } from '@/hooks/usePresidentStats';
import { useAutoCompleteTrips } from '@/hooks/useAutoCompleteTrips';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDate, formatTime, isComptroller } from '@/lib/utils';
import SidebarMenu from '@/components/SidebarMenu';
import NavigationHeader from '@/components/NavigationHeader';
import CalendarWidget from '@/components/CalendarWidget';

export default function DashboardScreen() {
  const { profile, loading: authLoading } = useAuth();
  const { kpis, vehicles, drivers, trips, isLoading, refetch } = useDashboard(profile?.id || '');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Role-based inbox hooks (only enabled if user has that role)
  const headInbox = useHeadInbox(profile?.id || '', profile?.department_id || null);
  const hrInbox = useHRInbox(profile?.is_hr ? profile.id : '');
  const vpInbox = useVPInbox(profile?.is_vp ? profile.id : '');
  const presidentInbox = usePresidentInbox(profile?.is_president ? profile.id : '');
  const pendingEvaluations = usePendingEvaluations(profile?.id || '');

  // Role-based stats hooks
  const isComptrollerUser = isComptroller(profile?.email || '');
  const comptrollerInbox = useComptrollerInbox(isComptrollerUser ? profile?.id || '' : '');
  const comptrollerStats = useComptrollerStats();
  const vpStats = useVPStats();
  const hrStats = useHRStats();
  const presidentStats = usePresidentStats();

  // Auto-complete trips in background
  useAutoCompleteTrips();

  // Determine pending approvals count based on role
  const pendingApprovalsCount = isComptrollerUser
    ? comptrollerInbox.requests.length
    : profile?.is_head
    ? headInbox.requests.length
    : profile?.is_hr
    ? hrInbox.requests.length
    : profile?.is_vp
    ? vpInbox.requests.length
    : profile?.is_president
    ? presidentInbox.requests.length
    : 0;

  // Show alert if many pending requests (>5)
  const showPendingAlert = pendingApprovalsCount > 5;
  
  // Pending evaluations count
  const pendingEvaluationsCount = pendingEvaluations.pendingTrips?.length || 0;
  const showEvaluationAlert = pendingEvaluationsCount > 0;

  // Get trips starting soon (within 3 days)
  const tripsStartingSoon = trips.filter((trip) => {
    if (!trip.travel_start_date) return false;
    const startDate = new Date(trip.travel_start_date);
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    return startDate >= today && startDate <= threeDaysFromNow;
  });

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
        <ActivityIndicator size="large" color="#7A0010" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const day = currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const time = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Swipe gesture handler - only swipe right to go to Inbox (no left swipe)
  const onGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    // Only allow swipe right (positive translationX)
    if (translationX > 50) {
      if (Haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push('/(tabs)/inbox');
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      // Only allow swipe right (positive translationX or velocityX)
      if (translationX > 50 || (velocityX > 500 && translationX > 0)) {
        if (Haptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.push('/(tabs)/inbox');
      }
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header with Menu and Notifications */}
      <NavigationHeader
        title="Dashboard"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10}
        failOffsetX={[-10, 10]} // Block left swipe: first negative, second positive
        failOffsetY={[-5, 5]}
      >
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
            tintColor="#7A0010"
            colors={['#7A0010']}
            />
          }
        >
      {/* Enhanced Hero Section */}
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
          <Text style={styles.heroGreeting}>Welcome back,</Text>
          <Text style={styles.heroName}>{profile.name || 'User'}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Ionicons name="document-text-outline" size={16} color="#fff" />
              <Text style={styles.heroStatText}>{kpis.activeRequests} Active</Text>
            </View>
            <View style={styles.heroStatItem}>
              <Ionicons name={isComptrollerUser ? "calculator-outline" : "time-outline"} size={16} color="#fff" />
              <Text style={styles.heroStatText}>
                {isComptrollerUser 
                  ? `${pendingApprovalsCount} Budget Review${pendingApprovalsCount !== 1 ? 's' : ''}`
                  : `${pendingApprovalsCount} Pending`}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* KPI Cards - Role-based (Hide for head users) */}
      {profile?.is_head ? null : isComptrollerUser ? (
        <View style={styles.kpiRow}>
          <KPICard
            icon="time-outline"
            label="Pending Reviews"
            value={comptrollerStats.stats.pending}
            color="#2563eb"
          />
          <KPICard
            icon="checkmark-circle-outline"
            label="Approved (Month)"
            value={comptrollerStats.stats.approved}
            color="#16a34a"
          />
          <KPICard
            icon="close-circle-outline"
            label="Rejected (Month)"
            value={comptrollerStats.stats.rejected}
            color="#dc2626"
          />
          <KPICard
            icon="cash-outline"
            label="Budget Reviewed"
            value={`₱${(comptrollerStats.stats.totalBudget / 1000).toFixed(0)}k`}
            color="#7A0010"
          />
        </View>
      ) : profile?.is_vp ? (
        <View style={styles.kpiRow}>
          <KPICard
            icon="time-outline"
            label="Pending Review"
            value={vpStats.stats.pending}
            color="#f59e0b"
          />
          <KPICard
            icon="checkmark-circle-outline"
            label="Approved Today"
            value={vpStats.stats.approvedToday}
            color="#16a34a"
          />
          <KPICard
            icon="cash-outline"
            label="Budget (Month)"
            value={`₱${(vpStats.stats.totalBudget / 1000).toFixed(0)}k`}
            color="#2563eb"
          />
          <KPICard
            icon="trending-up-outline"
            label="Avg Time"
            value={vpStats.stats.avgApprovalTime}
            color="#9333ea"
          />
        </View>
      ) : profile?.is_hr ? (
        <View style={styles.kpiRow}>
          <KPICard
            icon="time-outline"
            label="Pending HR"
            value={hrStats.stats.pending}
            color="#f59e0b"
          />
          <KPICard
            icon="checkmark-circle-outline"
            label="Approved Today"
            value={hrStats.stats.approvedToday}
            color="#16a34a"
          />
          <KPICard
            icon="people-outline"
            label="Active Requests"
            value={kpis.activeRequests}
            color="#2563eb"
          />
        </View>
      ) : profile?.is_president ? (
        <View style={styles.kpiRow}>
          <KPICard
            icon="time-outline"
            label="Final Review"
            value={presidentStats.stats.pending}
            color="#f59e0b"
          />
          <KPICard
            icon="checkmark-circle-outline"
            label="Approved (Week)"
            value={presidentStats.stats.approvedThisWeek}
            color="#16a34a"
          />
          <KPICard
            icon="cash-outline"
            label="Budget (YTD)"
            value={`₱${(presidentStats.stats.totalBudgetYTD / 1000000).toFixed(1)}M`}
            color="#2563eb"
          />
          <KPICard
            icon="business-outline"
            label="Departments"
            value={presidentStats.stats.activeDepartments}
            color="#9333ea"
          />
        </View>
      ) : (
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
      )}

      {/* Head Dashboard: Reorganized Order */}
      {profile?.is_head ? (
        <>
          {/* 1. Feedback Widget First */}
          {pendingEvaluations.pendingTrips.length > 0 && (
            <ActionCard
              title={`${pendingEvaluations.pendingTrips.length} Trip${pendingEvaluations.pendingTrips.length !== 1 ? 's' : ''} Need Your Feedback`}
              subtitle="Please rate your completed trips"
              icon="chatbubble-ellipses-outline"
              color="#9333ea"
              borderColor="#9333ea"
              trips={pendingEvaluations.pendingTrips.slice(0, 1)}
              onPress={() => router.push('/feedback')}
            />
          )}

          {/* 2. Requests Needing Approval */}
          {pendingApprovalsCount > 0 && (
            <ActionCard
              title={`${pendingApprovalsCount} Request${pendingApprovalsCount !== 1 ? 's' : ''} Need Your Approval`}
              subtitle={pendingApprovalsCount === 1 ? '1 request waiting' : `${pendingApprovalsCount} requests waiting`}
              icon="notifications-outline"
              color="#dc2626"
              borderColor="#dc2626"
              requests={headInbox.requests.slice(0, 2)}
              onPress={() => {
                router.push('/(tabs)/inbox');
              }}
            />
          )}

          {/* 3. Calendar Widget */}
          <CalendarWidget userId={profile.id} />

          {/* 4. Available Vehicles (Clickable) */}
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

          {/* 5. Available Drivers (Clickable) */}
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
        </>
      ) : (
        <>
          {/* Non-Head Dashboard: Standard Order */}
          {/* Action Cards - Role-based */}
          {pendingApprovalsCount > 0 && (
            <ActionCard
              title={
                isComptrollerUser
                  ? `${pendingApprovalsCount} Budget Review${pendingApprovalsCount !== 1 ? 's' : ''} Pending`
                  : `${pendingApprovalsCount} Request${pendingApprovalsCount !== 1 ? 's' : ''} Need Your Approval`
              }
              subtitle={
                isComptrollerUser
                  ? pendingApprovalsCount === 1 
                    ? '1 budget review waiting for your approval' 
                    : `${pendingApprovalsCount} budget reviews waiting for your approval`
                  : pendingApprovalsCount === 1 
                    ? '1 request waiting' 
                    : `${pendingApprovalsCount} requests waiting`
              }
              icon={isComptrollerUser ? "calculator-outline" : "notifications-outline"}
              color="#dc2626"
              borderColor="#dc2626"
              requests={
                isComptrollerUser
                  ? comptrollerInbox.requests.slice(0, 2)
                  : profile?.is_hr
                  ? hrInbox.requests.slice(0, 2)
                  : profile?.is_vp
                  ? vpInbox.requests.slice(0, 2)
                  : profile?.is_president
                  ? presidentInbox.requests.slice(0, 2)
                  : []
              }
              onPress={() => {
                if (isComptrollerUser) {
                  router.push('/(tabs)/budget-review');
                } else {
                  router.push('/(tabs)/inbox');
                }
              }}
            />
          )}

          {/* Calendar Widget */}
          <CalendarWidget userId={profile.id} />

          {/* Merged Upcoming Trips Widget */}
          {(tripsStartingSoon.length > 0 || trips.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="calendar-outline" size={20} color="#7a0019" />
                  <Text style={styles.sectionTitle}>Upcoming Trips</Text>
                </View>
                {trips.length > 3 && (
                  <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
                    <Text style={styles.viewAllLink}>View All →</Text>
                  </TouchableOpacity>
                )}
              </View>
              {tripsStartingSoon.length > 0 ? (
                <>
                  {tripsStartingSoon.slice(0, 3).map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </>
              ) : (
                <>
                  {trips.slice(0, 3).map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </>
              )}
            </View>
          )}

          {pendingEvaluations.pendingTrips.length > 0 && (
            <ActionCard
              title={`${pendingEvaluations.pendingTrips.length} Trip${pendingEvaluations.pendingTrips.length !== 1 ? 's' : ''} Need Your Feedback`}
              subtitle="Please rate your completed trips"
              icon="document-text-outline"
              color="#9333ea"
              borderColor="#9333ea"
              trips={pendingEvaluations.pendingTrips.slice(0, 1)}
              onPress={() => router.push('/feedback')}
            />
          )}

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
        </>
      )}



      {/* Bottom padding to account for navbar */}
      <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
        </ScrollView>
      </PanGestureHandler>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </GestureHandlerRootView>
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

function VehicleCard({ vehicle }: { vehicle: any }) {
  return (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={() => {
        // Show vehicle details modal or navigate to vehicle details
        Alert.alert(
          vehicle.vehicle_name,
          `Plate: ${vehicle.plate_number}\nType: ${vehicle.type || 'N/A'}\nCapacity: ${vehicle.capacity || 'N/A'} seats\nStatus: ${vehicle.status || 'Available'}`,
          [{ text: 'OK' }]
        );
      }}
      activeOpacity={0.7}
    >
      {vehicle.photo_url ? (
        <Image source={{ uri: vehicle.photo_url }} style={styles.vehicleImage} resizeMode="cover" />
      ) : (
        <View style={styles.vehicleImagePlaceholder}>
          <Ionicons name="car-outline" size={32} color="#9ca3af" />
        </View>
      )}
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
    </TouchableOpacity>
  );
}

function DriverCard({ driver }: { driver: any }) {
  return (
    <TouchableOpacity
      style={styles.driverCard}
      onPress={() => {
        // Show driver details modal
        Alert.alert(
          driver.name,
          `Email: ${driver.email || 'N/A'}\nPhone: ${driver.phone_number || driver.phone || 'N/A'}\nLicense: ${driver.license_no || 'N/A'}\nRating: ${driver.driver_rating ? driver.driver_rating.toFixed(1) : 'N/A'}\nStatus: ${driver.status || 'Available'}`,
          [{ text: 'OK' }]
        );
      }}
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

function ActionCard({
  title,
  subtitle,
  icon,
  color,
  borderColor,
  requests,
  trips,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  borderColor: string;
  requests?: any[];
  trips?: any[];
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.actionCard, { borderLeftColor: borderColor }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
      <View style={styles.actionCardContent}>
        <View style={[styles.actionCardIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.actionCardText}>
          <Text style={styles.actionCardTitle}>{title}</Text>
          <Text style={styles.actionCardSubtitle}>{subtitle}</Text>
          {requests && requests.length > 0 && (
            <View style={styles.actionCardItems}>
              {requests.slice(0, 2).map((req, idx) => (
                <Text key={idx} style={styles.actionCardItem} numberOfLines={1}>
                  • {req.request_number || req.title || 'Request'}
                </Text>
              ))}
            </View>
          )}
          {trips && trips.length > 0 && (
            <View style={styles.actionCardItems}>
              {trips.slice(0, 1).map((trip, idx) => (
                <Text key={idx} style={styles.actionCardItem} numberOfLines={1}>
                  • {trip.destination || 'Trip'}
                </Text>
              ))}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color={color} />
      </View>
    </TouchableOpacity>
    </Animated.View>
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
    backgroundColor: '#7A0010',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 24,
    marginBottom: 20,
  },
  heroContent: {
    marginBottom: 0,
  },
  heroGreeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '500',
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
    color: '#7A0010',
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
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
    marginBottom: 4,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
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
    marginBottom: 10,
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
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 16,
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
    color: '#7A0010',
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
  vehicleImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#e5e7eb',
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
    backgroundColor: '#7A0010',
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
    padding: 18,
    marginBottom: 14,
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
  actionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  actionCardItems: {
    marginTop: 4,
  },
  actionCardItem: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});

