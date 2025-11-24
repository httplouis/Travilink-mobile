import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import RequestCard from '@/components/RequestCard';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Request, RequestStatus } from '@/lib/types';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';

const STATUS_OPTIONS: (RequestStatus | 'all')[] = [
  'all',
  'pending_head',
  'pending_parent_head',
  'pending_admin',
  'pending_comptroller',
  'pending_hr',
  'pending_vp',
  'pending_president',
  'pending_exec',
  'approved',
  'rejected',
];

export default function SubmissionsScreen() {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const { profile, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { requests, isLoading, error, refetch } = useRequests(profile?.id || '');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.request_number.toLowerCase().includes(query) ||
          req.title?.toLowerCase().includes(query) ||
          req.purpose?.toLowerCase().includes(query) ||
          req.destination.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [requests, statusFilter, searchQuery]);

  // When history filter is active, show only completed requests (approved/rejected)
  // Otherwise show all filtered requests
  const displayRequests = useMemo(() => {
    if (params.filter === 'history') {
      // History view: only show completed requests (approved or rejected)
      return filteredRequests.filter(req => req.status === 'approved' || req.status === 'rejected');
    }
    return filteredRequests;
  }, [filteredRequests, params.filter]);

  // Determine title based on filter
  const screenTitle = params.filter === 'history' ? 'History' : 'My Requests';

  // NOW we can do conditional returns after all hooks are called
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

  const handleRequestPress = (request: Request) => {
    router.push(`/request/${request.id}`);
  };

  const handleViewDetails = (request: Request) => {
    router.push(`/request/${request.id}`);
  };

  const handleViewTracking = (request: Request) => {
    router.push(`/request/${request.id}?tab=tracking`);
  };

  if (isLoading && requests.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading your requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#dc2626" />
        <Text style={styles.errorTitle}>Error loading requests</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isLoading && requests.length === 0) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="My Requests"
          onMenuPress={() => setSidebarVisible(true)}
          showNotification={true}
          showMenu={true}
        />
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No submissions yet</Text>
          <Text style={styles.emptyText}>
            Your submitted requests will appear here
          </Text>
        </View>
        <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <NavigationHeader
        title={screenTitle}
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>
          {`${displayRequests.length} of ${requests.length} request${requests.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
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

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status === 'all' ? 'All' : status.replace('pending_', '').replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Request List */}
      <FlatList
        data={displayRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => handleRequestPress(item)}
            onViewDetails={() => handleViewDetails(item)}
            onViewTracking={() => handleViewTracking(item)}
          />
        )}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#7a0019"
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No requests found</Text>
              <Text style={styles.emptyText}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'No requests match your criteria'}
              </Text>
            </View>
          }
        />
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subHeaderText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  autoRefreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  listContent: {
    padding: 16,
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
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#7a0019',
    borderColor: '#7a0019',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});

