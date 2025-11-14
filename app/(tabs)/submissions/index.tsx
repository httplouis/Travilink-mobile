import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import RequestCard from '@/components/RequestCard';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Request } from '@/lib/types';

export default function SubmissionsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const { requests, isLoading, error, refetch } = useRequests(profile?.id || '');
  const [refreshing, setRefreshing] = useState(false);

  // Don't render if still loading auth or no profile
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

  if (requests.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No submissions yet</Text>
        <Text style={styles.emptyText}>
          Your submitted requests will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Requests</Text>
            <Text style={styles.headerSubtitle}>
              {requests.length} request{requests.length !== 1 ? 's' : ''}
            </Text>
          </View>
        <View style={styles.autoRefreshIndicator}>
          <View style={styles.indicatorDot} />
          <Text style={styles.indicatorText}>Live</Text>
        </View>
      </View>

      {/* Request List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => handleRequestPress(item)}
            onViewDetails={() => handleViewDetails(item)}
            onViewTracking={() => handleViewTracking(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7a0019"
          />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No requests found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
});

