import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useComptrollerInbox } from '@/hooks/useComptrollerInbox';
import { Request } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import NavigationHeader from '@/components/NavigationHeader';
import InboxRequestCard from '@/components/InboxRequestCard';
import BudgetReviewModal from '@/components/BudgetReviewModal';

export default function BudgetReviewScreen() {
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { requests, isLoading, refetch } = useComptrollerInbox(profile?.id || '');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
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

  return (
    <View style={styles.container}>
      <NavigationHeader title="Budget Review" />
      
      {isLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7a0019" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calculator-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Pending Budget Reviews</Text>
          <Text style={styles.emptyText}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleReviewRequest(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.requestNumber}>{item.request_number}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
              <Text style={styles.requesterName}>{item.requester_name}</Text>
              <Text style={styles.destination}>{item.destination}</Text>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Budget:</Text>
                <Text style={styles.budgetAmount}>₱{item.total_budget?.toLocaleString() || '0'}</Text>
              </View>
            </TouchableOpacity>
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
});

