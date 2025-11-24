import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useComptrollerInbox } from '@/hooks/useComptrollerInbox';
import { Request } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import NavigationHeader from '@/components/NavigationHeader';
import InboxRequestCard from '@/components/InboxRequestCard';
import BudgetReviewModal from '@/components/BudgetReviewModal';
import { supabase } from '@/lib/supabase/client';
import { RequestCardSkeleton } from '@/components/LoadingSkeleton';

type FilterType = 'pending' | 'history';

export default function BudgetReviewScreen() {
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [historyRequests, setHistoryRequests] = useState<Request[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { requests, isLoading, error, refetch } = useComptrollerInbox(profile?.id || '');

  // Fetch history requests (approved or rejected by comptroller)
  const fetchHistory = async () => {
    if (!profile?.id) return;
    setLoadingHistory(true);
    
    // Create AbortController for request cancellation
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout
    
    try {
      const { data, error: historyError } = await supabase
        .from('requests')
        .select(`
          *,
          department:departments!department_id(id, name, code)
        `)
        .or('comptroller_approved_at.not.is.null,comptroller_rejected_at.not.is.null')
        .order('created_at', { ascending: false })
        .limit(100)
        .abortSignal(abortController.signal);

      clearTimeout(timeoutId);

      if (historyError) {
        // Don't log abort errors - they're expected when component unmounts
        if (historyError.message?.includes('Aborted') || historyError.message?.includes('abort') || historyError.name === 'AbortError') {
          return;
        }
        console.warn('Error fetching history:', historyError);
        return;
      }

      setHistoryRequests((data || []) as Request[]);
    } catch (err: any) {
      clearTimeout(timeoutId);
      // Handle abort errors gracefully - don't log them as errors
      if (err?.message?.includes('Aborted') || err?.message?.includes('abort') || err?.name === 'AbortError') {
        return;
      }
      console.warn('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load history when filter changes to history
  React.useEffect(() => {
    let isMounted = true;
    
    if (filter === 'history' && historyRequests.length === 0) {
      fetchHistory().then(() => {
        if (!isMounted) return;
      }).catch(() => {
        // Errors already handled in fetchHistory
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [filter]);

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    const baseRequests = filter === 'pending' ? requests : historyRequests;
    
    if (!searchQuery.trim()) {
      return baseRequests;
    }

    const query = searchQuery.toLowerCase();
    return baseRequests.filter(
      (req) =>
        req.request_number?.toLowerCase().includes(query) ||
        req.destination?.toLowerCase().includes(query) ||
        req.requester_name?.toLowerCase().includes(query) ||
        req.purpose?.toLowerCase().includes(query)
    );
  }, [filter, requests, historyRequests, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (filter === 'pending') {
      await refetch();
    } else {
      await fetchHistory();
    }
    setRefreshing(false);
  };

  const handleReviewRequest = (request: Request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedRequest(null);
    refetch();
  };

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
      </View>
    );
  }

  const isLoadingData = filter === 'pending' ? isLoading : loadingHistory;

  return (
    <View style={styles.container}>
      <NavigationHeader title="Budget Review" />
      
      {/* Search and Filter Bar */}
      {(requests.length > 0 || historyRequests.length > 0) && (
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
          
          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>
                Pending
              </Text>
              {filter === 'pending' && requests.length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{requests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'history' && styles.filterTabActive]}
              onPress={() => setFilter('history')}
            >
              <Text style={[styles.filterTabText, filter === 'history' && styles.filterTabTextActive]}>
                History
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Error loading budget reviews</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoadingData && !refreshing ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </View>
      ) : filteredRequests.length === 0 && (requests.length > 0 || historyRequests.length > 0) ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your search or filter criteria
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchQuery('');
              setFilter('pending');
            }}
          >
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calculator-outline" size={80} color="#9ca3af" />
          <Text style={styles.emptyTitle}>
            {filter === 'pending' ? 'No Pending Budget Reviews' : 'No History Yet'}
          </Text>
          <Text style={styles.emptyText}>
            {filter === 'pending' ? "You're all caught up!" : 'Your reviewed requests will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InboxRequestCard
              request={item}
              role="comptroller"
              onPress={() => handleReviewRequest(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7a0019" />
          }
        />
      )}

      {selectedRequest && (
        <BudgetReviewModal
          visible={showModal}
          request={selectedRequest}
          onClose={handleModalClose}
          isHistory={filter === 'history'}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  requesterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  destination: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  budgetLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7a0019',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  skeletonContainer: {
    padding: 16,
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  filterTabActive: {
    backgroundColor: '#7a0019',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeApproved: {
    backgroundColor: '#d1fae5',
  },
  statusBadgeRejected: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  comments: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

