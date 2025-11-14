import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Request } from '@/lib/types';
import RequestStatusTracker from '@/components/RequestStatusTracker';
import StatusBadge from '@/components/StatusBadge';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { useRequestTracking } from '@/hooks/useRequestTracking';

export default function RequestDetailsScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'tracking'>(tab === 'tracking' ? 'tracking' : 'details');

  // Use the tracking hook which fetches all related data
  const { data: trackingData, isLoading: isLoadingTracking, error: trackingError, refetch: refetchTracking } = useRequestTracking(id || '');
  
  const request = trackingData?.request;
  const isLoading = isLoadingTracking;
  const error = trackingError;
  
  const refetch = async () => {
    await refetchTracking();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (error || !request) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#dc2626" />
        <Text style={styles.errorTitle}>Error loading request</Text>
        <Text style={styles.errorText}>
          {error?.message || 'Request not found'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasParentHead = !!request?.parent_department_id;
  const requiresPresidentApproval = (request?.total_budget || 0) > 50000;
  
  // Get approver names from tracking data
  const headApproverName = trackingData?.headApprover?.name || null;
  const parentHeadApproverName = trackingData?.parentHeadApprover?.name || null;
  const adminApproverName = trackingData?.adminApprover?.name || null;
  const comptrollerApproverName = trackingData?.comptrollerApprover?.name || null;
  const hrApproverName = trackingData?.hrApprover?.name || null;
  const vpApproverName = trackingData?.vpApprover?.name || null;
  const presidentApproverName = trackingData?.presidentApprover?.name || null;
  const execApproverName = trackingData?.execApprover?.name || null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7a0019"
          />
        }
      >
        {/* Request Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerCardTop}>
            <Text style={styles.requestNumber}>{request.request_number}</Text>
            <StatusBadge status={request.status} size="md" />
          </View>
          <Text style={styles.requestTitle}>{request.title || request.purpose}</Text>
          <View style={styles.headerCardDetails}>
            <View style={styles.headerCardDetail}>
              <Ionicons name="calendar" size={16} color="#6b7280" />
              <Text style={styles.headerCardDetailText}>
                {formatDate(request.travel_start_date)}
                {request.travel_start_date !== request.travel_end_date &&
                  ` - ${formatDate(request.travel_end_date)}`}
              </Text>
            </View>
            <View style={styles.headerCardDetail}>
              <Ionicons name="location" size={16} color="#6b7280" />
              <Text style={styles.headerCardDetailText}>{request.destination}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.tabActive]}
            onPress={() => setActiveTab('details')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'details' && styles.tabTextActive,
              ]}
            >
              Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tracking' && styles.tabActive]}
            onPress={() => setActiveTab('tracking')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'tracking' && styles.tabTextActive,
              ]}
            >
              Tracking
            </Text>
          </TouchableOpacity>
        </View>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <View style={styles.tabContent}>
            {/* Purpose */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Purpose</Text>
              <Text style={styles.sectionText}>{request.purpose}</Text>
            </View>

            {/* Travel Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Travel Details</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Destination</Text>
                  <Text style={styles.detailValue}>{request.destination}</Text>
                </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Department</Text>
                      <Text style={styles.detailValue}>
                        {trackingData?.department?.name || 'N/A'}
                      </Text>
                    </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Travel Dates</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(request.travel_start_date)}
                    {request.travel_start_date !== request.travel_end_date &&
                      ` - ${formatDate(request.travel_end_date)}`}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date Requested</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(request.created_at)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Budget */}
            {request.has_budget && request.total_budget && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Budget</Text>
                <Text style={styles.budgetAmount}>
                  {formatCurrency(request.total_budget)}
                </Text>
                {request.expense_breakdown && request.expense_breakdown.length > 0 && (
                  <View style={styles.budgetBreakdown}>
                    {request.expense_breakdown.map((expense, index) => (
                      <View key={index} style={styles.budgetItem}>
                        <View>
                          <Text style={styles.budgetItemCategory}>
                            {expense.category}
                          </Text>
                          {expense.description && (
                            <Text style={styles.budgetItemDescription}>
                              {expense.description}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.budgetItemAmount}>
                          {formatCurrency(expense.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Transportation */}
            {request.transportation_type && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transportation</Text>
                <Text style={styles.sectionText}>
                  {request.transportation_type === 'institutional'
                    ? 'University Vehicle'
                    : request.transportation_type === 'owned'
                    ? 'Own Transportation'
                    : 'Rental'}
                </Text>
                {request.pickup_location && (
                  <Text style={styles.sectionText}>
                    Pick-up: {request.pickup_location}
                    {request.pickup_time && ` at ${request.pickup_time}`}
                  </Text>
                )}
              </View>
            )}

            {/* Vehicle & Driver Assignment */}
            {(trackingData?.assignedVehicle || trackingData?.assignedDriver) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assignment</Text>
                {trackingData?.assignedVehicle && (
                  <View style={styles.assignmentItem}>
                    <Ionicons name="car" size={20} color="#7a0019" />
                    <View style={styles.assignmentText}>
                      <Text style={styles.assignmentLabel}>Vehicle</Text>
                      <Text style={styles.assignmentValue}>
                        {trackingData.assignedVehicle.vehicle_name} (
                        {trackingData.assignedVehicle.plate_number})
                      </Text>
                    </View>
                  </View>
                )}
                {trackingData?.assignedDriver && (
                  <View style={styles.assignmentItem}>
                    <Ionicons name="person" size={20} color="#7a0019" />
                    <View style={styles.assignmentText}>
                      <Text style={styles.assignmentLabel}>Driver</Text>
                      <Text style={styles.assignmentValue}>
                        {trackingData.assignedDriver.name}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Tracking Tab */}
        {activeTab === 'tracking' && (
          <View style={styles.tabContent}>
            <RequestStatusTracker
              status={request.status}
              requesterIsHead={request.requester_is_head}
              hasBudget={request.has_budget}
              hasParentHead={hasParentHead}
              requiresPresidentApproval={requiresPresidentApproval}
              headApprovedAt={request.head_approved_at}
              headApprovedBy={headApproverName}
              parentHeadApprovedAt={request.parent_head_approved_at}
              parentHeadApprovedBy={parentHeadApproverName}
              adminProcessedAt={request.admin_processed_at}
              adminProcessedBy={adminApproverName}
              comptrollerApprovedAt={request.comptroller_approved_at}
              comptrollerApprovedBy={comptrollerApproverName}
              hrApprovedAt={request.hr_approved_at}
              hrApprovedBy={hrApproverName}
              vpApprovedAt={request.vp_approved_at}
              vpApprovedBy={vpApproverName}
              presidentApprovedAt={request.president_approved_at}
              presidentApprovedBy={presidentApproverName}
              execApprovedAt={request.exec_approved_at}
              execApprovedBy={execApproverName}
              rejectedAt={request.rejected_at}
              rejectedBy={request.rejected_by}
              rejectionStage={request.rejection_stage}
            />

            {/* Comments Section */}
            {(request.head_comments ||
              request.admin_comments ||
              request.comptroller_comments ||
              request.hr_comments ||
              request.vp_comments ||
              request.president_comments ||
              request.exec_comments ||
              request.rejection_reason) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comments & Notes</Text>
                {request.head_comments && (
                  <View style={styles.commentCard}>
                    <Text style={styles.commentRole}>Department Head</Text>
                    <Text style={styles.commentText}>{request.head_comments}</Text>
                  </View>
                )}
                {request.admin_comments && (
                  <View style={styles.commentCard}>
                    <Text style={styles.commentRole}>Admin</Text>
                    <Text style={styles.commentText}>{request.admin_comments}</Text>
                  </View>
                )}
                {request.comptroller_comments && (
                  <View style={styles.commentCard}>
                    <Text style={styles.commentRole}>Comptroller</Text>
                    <Text style={styles.commentText}>
                      {request.comptroller_comments}
                    </Text>
                  </View>
                )}
                {request.hr_comments && (
                  <View style={styles.commentCard}>
                    <Text style={styles.commentRole}>HR</Text>
                    <Text style={styles.commentText}>{request.hr_comments}</Text>
                  </View>
                )}
                {request.vp_comments && (
                  <View style={styles.commentCard}>
                    <Text style={styles.commentRole}>Vice President</Text>
                    <Text style={styles.commentText}>{request.vp_comments}</Text>
                  </View>
                )}
                {request.president_comments && (
                  <View style={styles.commentCard}>
                    <Text style={styles.commentRole}>President</Text>
                    <Text style={styles.commentText}>
                      {request.president_comments}
                    </Text>
                  </View>
                )}
                {request.exec_comments && (
                  <View style={styles.commentCard}>
                    <Text style={styles.commentRole}>Executive</Text>
                    <Text style={styles.commentText}>{request.exec_comments}</Text>
                  </View>
                )}
                {request.rejection_reason && (
                  <View style={[styles.commentCard, styles.rejectionCard]}>
                    <Text style={styles.commentRole}>Rejection Reason</Text>
                    <Text style={styles.commentText}>
                      {request.rejection_reason}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  requestNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  headerCardDetails: {
    gap: 8,
  },
  headerCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCardDetailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#7a0019',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    gap: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  detailGrid: {
    gap: 16,
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7a0019',
    marginBottom: 12,
  },
  budgetBreakdown: {
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  budgetItemCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  budgetItemDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  budgetItemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  assignmentText: {
    flex: 1,
  },
  assignmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  assignmentValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  commentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7a0019',
  },
  rejectionCard: {
    borderLeftColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  commentRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

