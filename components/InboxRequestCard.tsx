import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Request } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDate } from '@/lib/utils';

interface InboxRequestCardProps {
  request: Request;
  role: 'head' | 'vp' | 'president' | 'hr' | 'comptroller';
  onPress?: () => void; // Optional custom onPress handler
}

export default function InboxRequestCard({ request, role, onPress }: InboxRequestCardProps) {
  const handleViewDetails = () => {
    // Always navigate to read-only details page
    router.push(`/request/${request.id}`);
  };

  // Calculate days until travel
  const getDaysUntilTravel = () => {
    if (!request.travel_start_date) return null;
    const travelDate = new Date(request.travel_start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    travelDate.setHours(0, 0, 0, 0);
    const diffTime = travelDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilTravel();
  const isUrgent = daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;
  const isOverdue = daysUntil !== null && daysUntil < 0;

  // Get status color based on request status
  const getStatusColor = () => {
    if (request.status?.includes('pending_comptroller')) return '#7a0019'; // Maroon
    if (request.status?.includes('pending_head')) return '#f59e0b'; // Yellow
    if (request.status?.includes('pending_vp')) return '#3b82f6'; // Blue
    if (request.status?.includes('pending_president')) return '#8b5cf6'; // Purple
    if (request.status?.includes('pending_hr')) return '#10b981'; // Green
    return '#6b7280'; // Gray
  };

  const statusColor = getStatusColor();

  return (
    <>
      <TouchableOpacity onPress={handleViewDetails} activeOpacity={0.8} style={styles.cardContainer}>
        <View style={[styles.card, isUrgent && styles.cardUrgent, isOverdue && styles.cardOverdue]}>
          {/* Gradient Header */}
          <View style={[styles.cardHeader, { backgroundColor: statusColor + '15' }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
              <View style={styles.headerTextContainer}>
                <Text style={styles.requestNumber}>{request.request_number || 'DRAFT'}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.badgeText, { color: statusColor }]}>
                      {request.request_type === 'travel_order' ? 'TO' : 'SA'}
                    </Text>
                  </View>
                  {isUrgent && (
                    <View style={styles.urgentBadge}>
                      <Ionicons name="alert-circle" size={12} color="#fff" />
                      <Text style={styles.urgentBadgeText}>Urgent</Text>
                    </View>
                  )}
                  {isOverdue && (
                    <View style={styles.overdueBadge}>
                      <Ionicons name="time-outline" size={12} color="#fff" />
                      <Text style={styles.overdueBadgeText}>Overdue</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={statusColor} />
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.requesterSection}>
              <View style={styles.requesterAvatar}>
                <Text style={styles.requesterAvatarText}>
                  {request.requester_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.requesterInfo}>
                <Text style={styles.requesterName}>{request.requester_name || 'Unknown Requester'}</Text>
                <View style={styles.departmentRow}>
                  <Ionicons name="business-outline" size={12} color="#6b7280" />
                  <Text style={styles.department}>
                    {request.department?.name || 'N/A'}
                    {request.department?.code ? ` (${request.department.code})` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.destinationSection}>
              <Ionicons name="location-outline" size={16} color="#7a0019" />
              <Text style={styles.destination} numberOfLines={2}>{request.destination || 'No destination'}</Text>
            </View>

            <View style={styles.datesRow}>
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                <Text style={styles.dateText}>
                  {request.travel_start_date ? formatDate(request.travel_start_date) : 'TBD'}
                </Text>
              </View>
              {request.travel_end_date && (
                <>
                  <Ionicons name="arrow-forward" size={12} color="#9ca3af" />
                  <View style={styles.dateItem}>
                    <Text style={styles.dateText}>
                      {formatDate(request.travel_end_date)}
                    </Text>
                  </View>
                </>
              )}
              {daysUntil !== null && (
                <View style={[styles.daysBadge, isUrgent && styles.daysBadgeUrgent, isOverdue && styles.daysBadgeOverdue]}>
                  <Text style={[styles.daysText, isUrgent && styles.daysTextUrgent, isOverdue && styles.daysTextOverdue]}>
                    {isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `${daysUntil}d left`}
                  </Text>
                </View>
              )}
            </View>

            {request.total_budget && (
              <View style={styles.budgetRow}>
                <View style={styles.budgetLabelContainer}>
                  <Ionicons name="cash-outline" size={14} color="#6b7280" />
                  <Text style={styles.budgetLabel}>Budget</Text>
                </View>
                <View style={styles.budgetAmountContainer}>
                  <Text style={styles.budgetAmount}>₱{request.total_budget ? request.total_budget.toLocaleString() : '0'}</Text>
                  {request.total_budget >= 15000 && (
                    <View style={styles.highBudgetBadge}>
                      <Ionicons name="trending-up" size={10} color="#dc2626" />
                      <Text style={styles.highBudgetText}>High</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Submission/Inbox Time - Show for comptroller role */}
            {role === 'comptroller' && request.created_at && (
              <View style={styles.submissionTimeRow}>
                <Ionicons name="time-outline" size={12} color="#9ca3af" />
                <Text style={styles.submissionTimeText}>
                  Submitted {formatDate(request.created_at)} at {new Date(request.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={(e) => {
                e.stopPropagation();
                handleViewDetails();
              }}
            >
              <Ionicons name="eye-outline" size={16} color="#7a0019" />
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={(e) => {
                e.stopPropagation();
                // For comptroller with custom onPress, use that instead
                if (role === 'comptroller' && onPress) {
                  onPress();
                } else {
                  // Navigate to review screen for all roles
                  const reviewUrl = `/review/${request.id}?role=${role}`;
                  console.log('[InboxRequestCard] Navigating to review screen:', {
                    requestId: request.id,
                    role: role,
                    url: reviewUrl
                  });
                  router.push(reviewUrl as any);
                }
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.approveButtonText}>Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardUrgent: {
    borderColor: '#fbbf24',
    borderWidth: 1,
  },
  cardOverdue: {
    borderColor: '#f87171',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIndicator: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  requestNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
    letterSpacing: 0.2,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#991b1b',
    letterSpacing: 0.2,
  },
  cardContent: {
    padding: 12,
    paddingTop: 0,
  },
  requesterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  requesterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requesterAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  requesterInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  department: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    lineHeight: 18,
  },
  destinationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  destination: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    lineHeight: 18,
  },
  daysBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    marginLeft: 'auto',
  },
  daysBadgeUrgent: {
    backgroundColor: '#fef3c7',
  },
  daysBadgeOverdue: {
    backgroundColor: '#fee2e2',
  },
  daysText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.2,
  },
  daysTextUrgent: {
    color: '#92400e',
  },
  daysTextOverdue: {
    color: '#991b1b',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 10,
  },
  budgetLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    lineHeight: 18,
  },
  budgetAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7a0019',
    letterSpacing: 0.5,
  },
  highBudgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  highBudgetText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fafafa',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    minHeight: 44, // Accessibility: minimum touch target
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#7a0019',
    backgroundColor: '#fff',
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7a0019',
    letterSpacing: 0.2,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    minHeight: 44, // Accessibility: minimum touch target
    borderRadius: 10,
    backgroundColor: '#7a0019',
    shadowColor: '#7a0019',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  submissionTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  submissionTimeText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
});

