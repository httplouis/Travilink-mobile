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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTrips, Trip } from '@/hooks/useTrips';
import { formatDate, formatTime } from '@/lib/utils';
import NavigationHeader from '@/components/NavigationHeader';
import EmptyState from '@/components/EmptyState';
import { RequestCardSkeleton } from '@/components/LoadingSkeleton';

export default function TripsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const { trips, isLoading, error, refetch } = useTrips();
  const [refreshing, setRefreshing] = useState(false);

  if (authLoading || !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleTripPress = (trip: Trip) => {
    if (trip.request_id) {
      router.push(`/request/${trip.request_id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#16a34a';
      case 'in_progress':
      case 'ongoing':
        return '#2563eb';
      case 'scheduled':
        return '#f59e0b';
      case 'cancelled':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const renderTripCard = ({ item: trip }: { item: Trip }) => {
    const departureDate = trip.departure_date ? new Date(trip.departure_date) : null;
    const returnDate = trip.return_date ? new Date(trip.return_date) : null;
    const statusColor = getStatusColor(trip.trip_status);

    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => handleTripPress(trip)}
        activeOpacity={0.7}
      >
        <View style={styles.tripHeader}>
          <View style={styles.tripHeaderLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <View style={styles.tripHeaderText}>
              <Text style={styles.tripDestination} numberOfLines={1}>
                {trip.destination}
              </Text>
              {trip.request?.request_number && (
                <Text style={styles.tripRequestNumber}>
                  {trip.request.request_number}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {trip.trip_status || 'Scheduled'}
            </Text>
          </View>
        </View>

        <Text style={styles.tripPurpose} numberOfLines={2}>
          {trip.purpose || trip.request?.request_number || 'No purpose specified'}
        </Text>

        <View style={styles.tripDetails}>
          <View style={styles.tripDetail}>
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text style={styles.tripDetailText}>
              {departureDate ? formatDate(departureDate.toISOString()) : 'TBD'} - {returnDate ? formatDate(returnDate.toISOString()) : 'TBD'}
            </Text>
          </View>

          {trip.vehicle && (
            <View style={styles.tripDetail}>
              <Ionicons name="car-outline" size={16} color="#6b7280" />
              <Text style={styles.tripDetailText}>
                {trip.vehicle.vehicle_name} ({trip.vehicle.plate_number})
              </Text>
            </View>
          )}

          {trip.driver && (
            <View style={styles.tripDetail}>
              <Ionicons name="person-outline" size={16} color="#6b7280" />
              <Text style={styles.tripDetailText}>
                Driver: {trip.driver.name}
              </Text>
            </View>
          )}

          {trip.passenger_count && trip.passenger_count > 0 && (
            <View style={styles.tripDetail}>
              <Ionicons name="people-outline" size={16} color="#6b7280" />
              <Text style={styles.tripDetailText}>
                {trip.passenger_count} passenger{trip.passenger_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {trip.actual_departure && (
          <View style={styles.actualInfo}>
            <Text style={styles.actualLabel}>Actual Departure:</Text>
            <Text style={styles.actualValue}>
              {formatDate(trip.actual_departure)} {formatTime(trip.actual_departure)}
            </Text>
          </View>
        )}

        <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  if (isLoading && trips.length === 0) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="My Trips"
          showNotification={true}
          showMenu={true}
          showBack={false}
        />
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="My Trips"
          showNotification={true}
          showMenu={true}
          showBack={false}
        />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Error loading trips</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="My Trips"
        showNotification={true}
        showMenu={true}
        showBack={false}
      />

      {trips.length === 0 ? (
        <EmptyState
          iconName="map-outline"
          title="No Trips Yet"
          description="Your scheduled trips will appear here once requests are approved and trips are created."
        />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#7a0019"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  skeletonContainer: {
    gap: 12,
    padding: 16,
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statusIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
  },
  tripHeaderText: {
    flex: 1,
  },
  tripDestination: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  tripRequestNumber: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripPurpose: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 22,
  },
  tripDetails: {
    gap: 10,
    marginBottom: 12,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  actualInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  actualLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  actualValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  chevron: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
});

