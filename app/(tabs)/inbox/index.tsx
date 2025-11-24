import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHeadInbox } from '@/hooks/useHeadInbox';
import { useVPInbox } from '@/hooks/useVPInbox';
import { usePresidentInbox } from '@/hooks/usePresidentInbox';
import { useHRInbox } from '@/hooks/useHRInbox';
import { Request } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import NavigationHeader from '@/components/NavigationHeader';
import InboxRequestCard from '@/components/InboxRequestCard';
import { RequestCardSkeleton } from '@/components/LoadingSkeleton';
import { formatDate } from '@/lib/utils';

export default function InboxScreen() {
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'urgent' | 'high_budget'>('all');

  // Debug logging
  React.useEffect(() => {
    console.log('[InboxScreen] Profile:', {
      id: profile?.id,
      name: profile?.name,
      email: profile?.email,
      department_id: profile?.department_id,
      is_head: profile?.is_head,
      is_vp: profile?.is_vp,
      is_president: profile?.is_president,
      is_hr: profile?.is_hr,
    });
  }, [profile]);

  // Determine which inbox hook to use based on role
  const headInbox = useHeadInbox(profile?.id || '', profile?.department_id || null);
  const vpInbox = useVPInbox(profile?.id || '');
  const presidentInbox = usePresidentInbox(profile?.id || '');
  const hrInbox = useHRInbox(profile?.id || '');

  let requests: Request[] = [];
  let isLoading = false;
  let error: Error | null = null;
  let refetch = () => {};

  if (profile?.is_head) {
    requests = headInbox.requests || [];
    isLoading = headInbox.isLoading;
    error = headInbox.error as Error | null;
    refetch = headInbox.refetch;
    console.log('[InboxScreen] Head inbox state:', {
      requestsCount: requests.length,
      isLoading,
      error: error?.message,
    });
  } else if (profile?.is_vp) {
    requests = vpInbox.requests || [];
    isLoading = vpInbox.isLoading;
    error = vpInbox.error as Error | null;
    refetch = vpInbox.refetch;
  } else if (profile?.is_president) {
    requests = presidentInbox.requests || [];
    isLoading = presidentInbox.isLoading;
    error = presidentInbox.error as Error | null;
    refetch = presidentInbox.refetch;
  } else if (profile?.is_hr) {
    requests = hrInbox.requests || [];
    isLoading = hrInbox.isLoading;
    error = hrInbox.error as Error | null;
    refetch = hrInbox.refetch;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getRoleTitle = () => {
    if (profile?.is_head) return 'Head Inbox';
    if (profile?.is_vp) return 'VP Inbox';
    if (profile?.is_president) return 'President Inbox';
    if (profile?.is_hr) return 'HR Inbox';
    return 'Inbox';
  };

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.request_number.toLowerCase().includes(query) ||
          req.destination?.toLowerCase().includes(query) ||
          req.requester_name?.toLowerCase().includes(query) ||
          req.purpose?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus === 'urgent') {
      filtered = filtered.filter((req) => {
        if (!req.travel_start_date) return false;
        const travelDate = new Date(req.travel_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        travelDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((travelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && diffDays >= 0;
      });
    } else if (filterStatus === 'high_budget') {
      filtered = filtered.filter((req) => (req.total_budget || 0) >= 15000);
    }

    return filtered;
  }, [requests, searchQuery, filterStatus]);

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader title={getRoleTitle()} />
      
      {/* Search and Filter Bar */}
      {requests.length > 0 && (
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search requests..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            <FilterChip
              label="All"
              active={filterStatus === 'all'}
              onPress={() => setFilterStatus('all')}
              count={requests.length}
            />
            <FilterChip
              label="Urgent"
              active={filterStatus === 'urgent'}
              onPress={() => setFilterStatus('urgent')}
              count={requests.filter((req) => {
                if (!req.travel_start_date) return false;
                const travelDate = new Date(req.travel_start_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                travelDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((travelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays <= 3 && diffDays >= 0;
              }).length}
              color="#f59e0b"
            />
            <FilterChip
              label="High Budget"
              active={filterStatus === 'high_budget'}
              onPress={() => setFilterStatus('high_budget')}
              count={requests.filter((req) => (req.total_budget || 0) >= 15000).length}
              color="#dc2626"
            />
          </ScrollView>
        </View>
      )}
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Error loading inbox</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading && !refreshing ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Pending Requests</Text>
          <Text style={styles.emptyText}>You're all caught up!</Text>
          {profile?.is_head && (
            <Text style={styles.debugText}>
              Debug: Head ID: {profile.id?.substring(0, 8)}..., Dept: {profile.department_id?.substring(0, 8)}...
            </Text>
          )}
        </View>
      ) : filteredRequests.length === 0 && (searchQuery || filterStatus !== 'all') ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your search or filter criteria
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchQuery('');
              setFilterStatus('all');
            }}
          >
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InboxRequestCard
              request={item}
              role={profile.is_head ? 'head' : profile.is_vp ? 'vp' : profile.is_president ? 'president' : 'hr'}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7a0019" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No Pending Requests</Text>
              <Text style={styles.emptyText}>You're all caught up!</Text>
            </View>
          }
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  skeletonContainer: {
    padding: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7a0019',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  debugText: {
    marginTop: 16,
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterContent: {
    gap: 8,
    paddingRight: 16,
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7a0019',
    borderRadius: 10,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

function FilterChip({
  label,
  active,
  onPress,
  count,
  color = '#7a0019',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterChip,
        active && { backgroundColor: color, borderColor: color },
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
        {count !== undefined && count > 0 && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );
}

const filterChipStyles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});

// Merge filter chip styles into main styles
Object.assign(styles, filterChipStyles);

