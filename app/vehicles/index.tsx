import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useVehicles } from '@/hooks/useVehicles';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Vehicle } from '@/hooks/useVehicles';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';
import CustomTabBar from '@/components/CustomTabBar';

export default function VehiclesScreen() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('available');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { data: vehicles = [], isLoading, error, refetch } = useVehicles({
    status: statusFilter,
    type: typeFilter,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#16a34a';
      case 'in_use':
        return '#f59e0b';
      case 'maintenance':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'in_use':
        return 'In Use';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Inactive';
    }
  };

  if (isLoading && vehicles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#dc2626" />
        <Text style={styles.errorTitle}>Error loading vehicles</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      vehicle.vehicle_name.toLowerCase().includes(query) ||
      vehicle.plate_number.toLowerCase().includes(query) ||
      vehicle.type.toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Vehicles"
        onMenuPress={() => {}}
        showNotification={true}
        showMenu={false}
        showBack={true}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicles..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterButton, !statusFilter && styles.filterButtonActive]}
              onPress={() => setStatusFilter(undefined)}
            >
              <Text style={[styles.filterButtonText, !statusFilter && styles.filterButtonTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'available' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('available')}
            >
              <Text style={[styles.filterButtonText, statusFilter === 'available' && styles.filterButtonTextActive]}>
                Available
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'in_use' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('in_use')}
            >
              <Text style={[styles.filterButtonText, statusFilter === 'in_use' && styles.filterButtonTextActive]}>
                In Use
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'maintenance' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('maintenance')}
            >
              <Text style={[styles.filterButtonText, statusFilter === 'maintenance' && styles.filterButtonTextActive]}>
                Maintenance
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Vehicle List */}
      <FlatList
        data={filteredVehicles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VehicleListItem vehicle={item} statusColor={getStatusColor(item.status)} statusLabel={getStatusLabel(item.status)} />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7a0019" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No vehicles found</Text>
            <Text style={styles.emptyText}>
              {statusFilter ? `No ${getStatusLabel(statusFilter).toLowerCase()} vehicles` : 'No vehicles available'}
            </Text>
          </View>
        }
      />
      <CustomTabBar />
    </View>
  );
}

function VehicleListItem({
  vehicle,
  statusColor,
  statusLabel,
}: {
  vehicle: Vehicle;
  statusColor: string;
  statusLabel: string;
}) {
  return (
    <View style={styles.vehicleItem}>
      <View style={styles.vehicleImageContainer}>
        {vehicle.photo_url ? (
          <Image source={{ uri: vehicle.photo_url }} style={styles.vehicleImage} />
        ) : (
          <View style={styles.vehicleImagePlaceholder}>
            <Ionicons name="car" size={40} color="#9ca3af" />
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>{vehicle.vehicle_name}</Text>
        <Text style={styles.vehiclePlate}>{vehicle.plate_number}</Text>

        <View style={styles.vehicleDetails}>
          <View style={styles.vehicleDetail}>
            <Ionicons name="car-sport" size={16} color="#6b7280" />
            <Text style={styles.vehicleDetailText}>
              {vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)}
            </Text>
          </View>
          <View style={styles.vehicleDetail}>
            <Ionicons name="people" size={16} color="#6b7280" />
            <Text style={styles.vehicleDetailText}>{vehicle.capacity} seats</Text>
          </View>
        </View>

        {vehicle.notes && (
          <Text style={styles.vehicleNotes} numberOfLines={2}>
            {vehicle.notes}
          </Text>
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  filters: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#7a0019',
    borderColor: '#7a0019',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  vehicleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vehicleImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  vehicleInfo: {
    padding: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  vehiclePlate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  vehicleDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  vehicleDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleDetailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  vehicleNotes: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
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

