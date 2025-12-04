import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Request } from '@/lib/types';
import StatusBadge from './StatusBadge';
import RequestStatusTracker from './RequestStatusTracker';
import { formatDate, formatCurrency } from '@/lib/utils';

interface RequestCardProps {
  request: Request;
  onPress: () => void;
  onViewDetails?: () => void;
  onViewTracking?: () => void;
  needsFeedback?: boolean;
}

export default function RequestCard({
  request,
  onPress,
  onViewDetails,
  onViewTracking,
  needsFeedback = false,
}: RequestCardProps) {
  const hasParentHead = !!request.parent_department_id;
  const requiresPresidentApproval = (request.total_budget || 0) > 50000;

  return (
    <TouchableOpacity 
      style={[styles.card, needsFeedback && styles.cardNeedsFeedback]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.requestNumber}>{request.request_number || 'DRAFT'}</Text>
          <StatusBadge status={request.status} size="sm" />
          {needsFeedback && (
            <View style={styles.feedbackBadge}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
              <Text style={styles.feedbackBadgeText}>Needs Feedback</Text>
            </View>
          )}
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {request.title || request.purpose}
      </Text>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={styles.detailText} numberOfLines={1}>
            {request.destination || 'No destination'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {request.travel_start_date ? formatDate(request.travel_start_date) : 'No date'}
          </Text>
        </View>
        {request.total_budget && (
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatCurrency(request.total_budget)}
            </Text>
          </View>
        )}
      </View>

      {/* Progress Tracker */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Approval Progress</Text>
        <RequestStatusTracker
          status={request.status}
          requesterIsHead={request.requester_is_head}
          hasBudget={request.has_budget}
          hasParentHead={hasParentHead}
          requiresPresidentApproval={requiresPresidentApproval}
          headApprovedAt={request.head_approved_at}
          headApprovedBy={request.head_approved_by}
          parentHeadApprovedAt={request.parent_head_approved_at}
          parentHeadApprovedBy={request.parent_head_approved_by}
          adminProcessedAt={request.admin_processed_at}
          adminProcessedBy={request.admin_processed_by}
          comptrollerApprovedAt={request.comptroller_approved_at}
          comptrollerApprovedBy={request.comptroller_approved_by}
          hrApprovedAt={request.hr_approved_at}
          hrApprovedBy={request.hr_approved_by}
          vpApprovedAt={request.vp_approved_at}
          vpApprovedBy={request.vp_approved_by}
          presidentApprovedAt={request.president_approved_at}
          presidentApprovedBy={request.president_approved_by}
          execApprovedAt={request.exec_approved_at}
          execApprovedBy={request.exec_approved_by}
          rejectedAt={request.rejected_at}
          rejectedBy={request.rejected_by}
          rejectionStage={request.rejection_stage}
          compact
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onViewDetails && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            <Ionicons name="eye" size={16} color="#7a0019" />
            <Text style={styles.actionText}>View Details</Text>
          </TouchableOpacity>
        )}
        {onViewTracking && request.status !== 'draft' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onViewTracking();
            }}
          >
            <Ionicons name="time" size={16} color="#7a0019" />
            <Text style={styles.actionText}>Track Status</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardNeedsFeedback: {
    borderColor: '#f59e0b',
    borderWidth: 2,
    backgroundColor: '#fffbeb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  feedbackBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  requestNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  details: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7a0019',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
});

