import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { useApproveRequest } from '@/hooks/useApproveRequest';
import { useAuth } from '@/contexts/AuthContext';
import NavigationHeader from '@/components/NavigationHeader';
import SignaturePad from '@/components/SignaturePad';
import { formatDateTime, formatDate, formatCurrency } from '@/lib/utils';

interface ApprovalHistory {
  stage: string;
  approverName: string | null;
  approvedAt: string | null;
  comments: string | null;
  signature?: string | null;
}

export default function ReviewScreen() {
  const { id, role } = useLocalSearchParams<{ id: string; role: string }>();
  const insets = useSafeAreaInsets();
  const [action, setAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [signature, setSignature] = useState('');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [autoSignature, setAutoSignature] = useState<string | null>(null);
  const [isAutoSignEnabled, setIsAutoSignEnabled] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { approveRequest, isSubmitting } = useApproveRequest();
  const { profile } = useAuth();

  // Load auto-signature settings when component mounts or action changes
  useEffect(() => {
    if (!profile?.id || !action) return;
    
    const loadAutoSignature = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('automatic_signature, is_auto_sign_enabled')
          .eq('id', profile.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116' || error.code === '42703') {
            return; // Fields don't exist, that's okay
          }
          return;
        }

        if (data) {
          setAutoSignature(data.automatic_signature || null);
          setIsAutoSignEnabled(data.is_auto_sign_enabled || false);
          
          // Auto-fill signature if enabled
          if (data.is_auto_sign_enabled && data.automatic_signature && !signature) {
            setSignature(data.automatic_signature);
          }
        }
      } catch (err) {
        // Silently fail
      }
    };

    loadAutoSignature();
  }, [profile?.id, action]);
  
  const userRole = role as 'head' | 'vp' | 'president' | 'hr' | 'comptroller' | string;

  // Fetch request details and approval history
  const { data: requestData, isLoading: isLoadingRequest, error: requestError } = useQuery({
    queryKey: ['request-review', id],
    queryFn: async () => {
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .single();

      if (requestError) throw requestError;

      const approverIds = [
        request.head_approved_by,
        request.parent_head_approved_by,
        request.admin_processed_by,
        request.comptroller_approved_by,
        request.hr_approved_by,
        request.vp_approved_by,
        request.president_approved_by,
      ].filter(Boolean);

      const approversMap: Record<string, { id: string; name: string }> = {};
      
      if (approverIds.length > 0) {
        const { data: approvers, error: approversError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', approverIds);

        if (!approversError && approvers) {
          approvers.forEach((approver: any) => {
            approversMap[approver.id] = approver;
          });
        }
      }

      const approvalHistory: ApprovalHistory[] = [];
      
      if (request.head_approved_by && request.head_approved_at) {
        approvalHistory.push({
          stage: 'Department Head Approval',
          approverName: approversMap[request.head_approved_by]?.name || null,
          approvedAt: request.head_approved_at,
          comments: request.head_comments || null,
          signature: request.head_signature || null,
        });
      }
      if (request.parent_head_approved_by && request.parent_head_approved_at) {
        approvalHistory.push({
          stage: 'Parent Head Approval',
          approverName: approversMap[request.parent_head_approved_by]?.name || null,
          approvedAt: request.parent_head_approved_at,
          comments: request.parent_head_comments || null,
          signature: request.parent_head_signature || null,
        });
      }
      if (request.admin_processed_by && request.admin_processed_at) {
        approvalHistory.push({
          stage: 'Administrator Processing',
          approverName: approversMap[request.admin_processed_by]?.name || null,
          approvedAt: request.admin_processed_at,
          comments: request.admin_comments || null,
          signature: request.admin_signature || null,
        });
      }
      if (request.comptroller_approved_by && request.comptroller_approved_at) {
        approvalHistory.push({
          stage: 'Comptroller Approval',
          approverName: approversMap[request.comptroller_approved_by]?.name || null,
          approvedAt: request.comptroller_approved_at,
          comments: request.comptroller_comments || null,
          signature: request.comptroller_signature || null,
        });
      }
      if (request.hr_approved_by && request.hr_approved_at) {
        approvalHistory.push({
          stage: 'HR Approval',
          approverName: approversMap[request.hr_approved_by]?.name || null,
          approvedAt: request.hr_approved_at,
          comments: request.hr_comments || null,
          signature: request.hr_signature || null,
        });
      }
      if (request.vp_approved_by && request.vp_approved_at) {
        approvalHistory.push({
          stage: 'VP Approval',
          approverName: approversMap[request.vp_approved_by]?.name || null,
          approvedAt: request.vp_approved_at,
          comments: request.vp_comments || null,
          signature: request.vp_signature || null,
        });
      }
      if (request.president_approved_by && request.president_approved_at) {
        approvalHistory.push({
          stage: 'President Approval',
          approverName: approversMap[request.president_approved_by]?.name || null,
          approvedAt: request.president_approved_at,
          comments: request.president_comments || null,
          signature: request.president_signature || null,
        });
      }

      return { request, approvalHistory };
    },
    enabled: !!id,
  });

  const getRoleTitle = () => {
    switch (userRole) {
      case 'hr': return 'HR Review';
      case 'vp': return 'VP Review';
      case 'president': return 'President Review';
      case 'comptroller': return 'Budget Review';
      case 'head': return 'Head Approval';
      default: return 'Review Request';
    }
  };

  const canReturnToSender = userRole === 'hr' || userRole === 'vp' || userRole === 'president';

  const handleApprove = async () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide your signature to approve this request.');
      return;
    }

    try {
      console.log('[ReviewScreen] Approving request:', { requestId: id, role: userRole, hasSignature: !!signature });
      const result = await approveRequest({
        requestId: id!,
        role: userRole as any,
        action: 'approve',
        signature,
        comments: comments.trim() || undefined,
      });

      console.log('[ReviewScreen] Approve result:', result);
      
      if (result && result.success) {
        setSuccessMessage('Request approved successfully.');
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', result?.error || 'Failed to approve request. Please try again.');
      }
    } catch (error: any) {
      console.error('[ReviewScreen] Error approving request:', error);
      Alert.alert('Error', error.message || 'Failed to approve request. Please try again.');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rejecting this request.');
      return;
    }
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide your signature to reject this request.');
      return;
    }

    try {
      console.log('[ReviewScreen] Rejecting request:', { requestId: id, role: userRole, hasSignature: !!signature, hasReason: !!rejectionReason.trim() });
      const result = await approveRequest({
        requestId: id!,
        role: userRole as any,
        action: 'reject',
        signature,
        rejectionReason: rejectionReason.trim(),
      });

      console.log('[ReviewScreen] Reject result:', result);
      
      if (result && result.success) {
        setSuccessMessage('Request rejected successfully.');
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', result?.error || 'Failed to reject request. Please try again.');
      }
    } catch (error: any) {
      console.error('[ReviewScreen] Error rejecting request:', error);
      Alert.alert('Error', error.message || 'Failed to reject request. Please try again.');
    }
  };

  const handleReturnToSender = async () => {
    if (!returnReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for returning this request.');
      return;
    }
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide your signature to return this request.');
      return;
    }

    try {
      console.log('[ReviewScreen] Returning request:', { requestId: id, role: userRole, hasSignature: !!signature, hasReason: !!returnReason.trim() });
      const result = await approveRequest({
        requestId: id!,
        role: userRole as any,
        action: 'return',
        signature,
        returnReason: returnReason.trim(),
      });

      console.log('[ReviewScreen] Return result:', result);
      
      if (result && result.success) {
        setSuccessMessage('Request returned to sender successfully.');
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', result?.error || 'Failed to return request. Please try again.');
      }
    } catch (error: any) {
      console.error('[ReviewScreen] Error returning request:', error);
      Alert.alert('Error', error.message || 'Failed to return request. Please try again.');
    }
  };

  // Debug logging
  React.useEffect(() => {
    console.log('[ReviewScreen] Mounted with params:', { id, role });
    if (!id) {
      console.error('[ReviewScreen] ERROR: No request ID provided!');
    }
    if (!role) {
      console.error('[ReviewScreen] ERROR: No role provided!');
    }
  }, [id, role]);
  
  if (!id) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <NavigationHeader title="Error" showBack={true} showMenu={false} showNotification={false} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Request ID is missing</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoadingRequest) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <NavigationHeader title={getRoleTitle()} showBack={true} showMenu={false} showNotification={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7a0019" />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </View>
    );
  }

  if (requestError || !requestData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <NavigationHeader title={getRoleTitle()} showBack={true} showMenu={false} showNotification={false} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load request details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { request, approvalHistory } = requestData;
  const expenseBreakdown = request.expense_breakdown && Array.isArray(request.expense_breakdown) 
    ? request.expense_breakdown
    : [];
  const participants = request.participants && Array.isArray(request.participants) 
    ? request.participants 
    : [];

  // Calculate duration
  const getDuration = () => {
    if (!request.travel_start_date || !request.travel_end_date) return null;
    try {
      const start = new Date(request.travel_start_date);
      const end = new Date(request.travel_end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 0 ? 'Same day' : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } catch {
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#fff' }}>
        <NavigationHeader title={getRoleTitle()} showBack={true} showMenu={false} showNotification={false} />
      </View>
      
      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, action && styles.scrollContentWithAction]}
        scrollEnabled={!isDrawing}
        showsVerticalScrollIndicator={true}
      >
        {/* PRIORITY 1: Requester Information - Most Important for HEAD */}
        <View style={styles.requesterCard}>
          <View style={styles.requesterHeader}>
            <Ionicons name="person-circle" size={20} color="#fff" />
            <Text style={styles.requesterTitle}>Requester Information</Text>
          </View>
          <View style={styles.requesterContent}>
            {request.requester_name && (
              <View style={styles.requesterRow}>
                <View style={styles.requesterRowLeft}>
                  <Ionicons name="person" size={16} color="#6b7280" />
                  <Text style={styles.requesterLabel}>Requester</Text>
                </View>
                <Text style={styles.requesterValue}>{request.requester_name}</Text>
              </View>
            )}
            {request.request_type && (
              <View style={styles.requesterRow}>
                <View style={styles.requesterRowLeft}>
                  <Ionicons name="folder" size={16} color="#6b7280" />
                  <Text style={styles.requesterLabel}>Type</Text>
                </View>
                <Text style={styles.requesterValue}>
                  {request.request_type === 'travel_order' ? 'Travel Order' : 'Seminar Application'}
                </Text>
              </View>
            )}
            {request.request_number && (
              <View style={styles.requesterRow}>
                <View style={styles.requesterRowLeft}>
                  <Ionicons name="document-text" size={16} color="#6b7280" />
                  <Text style={styles.requesterLabel}>Request Number</Text>
                </View>
                <Text style={[styles.requesterValue, styles.requestNumberValue]}>
                  {request.request_number}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* PRIORITY 2: Travel Details - When they're leaving */}
        {(request.travel_start_date || request.travel_end_date || request.purpose || request.destination) && (
          <View style={styles.detailCard}>
            <View style={styles.detailCardHeader}>
              <Ionicons name="calendar" size={18} color="#7a0019" />
              <Text style={styles.detailCardTitle}>Travel Details</Text>
            </View>
            <View style={styles.detailCardContent}>
              {request.destination && (
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Ionicons name="location" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Destination</Text>
                  </View>
                  <Text style={styles.detailValue}>{request.destination}</Text>
                </View>
              )}
              {request.travel_start_date && (
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Ionicons name="airplane" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Departure Date</Text>
                  </View>
                  <Text style={styles.detailValue}>{formatDate(request.travel_start_date)}</Text>
                </View>
              )}
              {request.travel_end_date && (
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Ionicons name="airplane-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Return Date</Text>
                  </View>
                  <Text style={styles.detailValue}>{formatDate(request.travel_end_date)}</Text>
                </View>
              )}
              {getDuration() && (
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Ionicons name="time" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Duration</Text>
                  </View>
                  <Text style={styles.detailValue}>{getDuration()}</Text>
                </View>
              )}
              {request.purpose && (
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Purpose</Text>
                  </View>
                  <Text style={[styles.detailValue, styles.purposeText]}>{request.purpose}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* PRIORITY 3: Budget - Above Requester Signature */}
        {request.has_budget && request.total_budget && (
          <View style={styles.budgetSection}>
            <Text style={styles.sectionTitle}>Budget</Text>
            <Text style={styles.budgetAmount}>
              {formatCurrency(request.total_budget)}
            </Text>
            {expenseBreakdown.length > 0 && (
              <View style={styles.budgetBreakdown}>
                {expenseBreakdown.map((expense: any, index: number) => (
                  <View key={index} style={styles.budgetItem}>
                    <View>
                      <Text style={styles.budgetItemCategory}>
                        {expense.category || expense.item || 'Expense'}
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

        {/* PRIORITY 4: Requester Signature */}
        {request.requester_signature && (
          <View style={styles.detailCard}>
            <View style={styles.detailCardHeader}>
              <Ionicons name="create" size={18} color="#7a0019" />
              <Text style={styles.detailCardTitle}>Requester Signature</Text>
            </View>
            <View style={styles.signatureDisplayContainer}>
              <Image 
                source={{ uri: request.requester_signature }} 
                style={styles.signatureDisplayImage} 
                resizeMode="contain"
              />
              {request.requester_name && (
                <Text style={styles.signatureDisplayName}>{request.requester_name}</Text>
              )}
              {request.created_at && (
                <Text style={styles.signatureDisplayDate}>
                  Submitted on {formatDate(request.created_at)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* PRIORITY 5: Participants - Who's going */}
        {participants.length > 0 && (
          <View style={styles.detailCard}>
            <View style={styles.detailCardHeader}>
              <Ionicons name="people" size={18} color="#7a0019" />
              <Text style={styles.detailCardTitle}>Participants ({participants.length})</Text>
            </View>
            <View style={styles.detailCardContent}>
              {participants.map((participant: any, index: number) => (
                <View key={index} style={[styles.detailRow, index < participants.length - 1 && styles.detailRowBorder]}>
                  <View style={styles.participantInfo}>
                    <View style={styles.participantHeader}>
                      <Text style={styles.participantName}>{participant.name || 'Unknown'}</Text>
                      {participant.is_head && (
                        <View style={styles.headBadge}>
                          <Text style={styles.headBadgeText}>Head</Text>
                        </View>
                      )}
                    </View>
                    {participant.email && (
                      <Text style={styles.participantEmail}>{participant.email}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* PRIORITY 6: Vehicle Information - If needed */}
        {request.needs_vehicle && (
          <View style={styles.detailCard}>
            <View style={styles.detailCardHeader}>
              <Ionicons name="car" size={18} color="#7a0019" />
              <Text style={styles.detailCardTitle}>Transportation</Text>
            </View>
            <View style={styles.detailCardContent}>
              {request.transportation_type && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>
                    {request.transportation_type === 'institutional' ? 'Institutional Vehicle' : 
                     request.transportation_type === 'owned' ? 'Personal Vehicle' :
                     request.transportation_type === 'rent' ? 'Rental Vehicle' : request.transportation_type}
                  </Text>
                </View>
              )}
              {request.vehicle_type && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vehicle Type</Text>
                  <Text style={styles.detailValue}>{request.vehicle_type.toUpperCase()}</Text>
                </View>
              )}
              {request.pickup_location && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pickup Location</Text>
                  <Text style={styles.detailValue}>{request.pickup_location}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* PRIORITY 7: Approval History - Least Priority */}
        {approvalHistory.length > 0 && (
          <View style={styles.historyCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done" size={18} color="#6b7280" />
              <Text style={styles.sectionTitle}>Approval History</Text>
            </View>
            <View style={styles.historyList}>
              {approvalHistory.map((item, index) => (
                <View key={index} style={[styles.historyItem, index < approvalHistory.length - 1 && styles.historyItemBorder]}>
                  <View style={styles.historyItemHeader}>
                    <View style={styles.historyItemLeft}>
                      <View style={styles.historyIcon}>
                        <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyStage}>{item.stage}</Text>
                        {item.approverName && (
                          <Text style={styles.historyApprover}>{item.approverName}</Text>
                        )}
                        {item.approvedAt && (
                          <Text style={styles.historyTime}>{formatDateTime(item.approvedAt)}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {item.comments && (
                    <View style={styles.historyComment}>
                      <Text style={styles.historyCommentText}>{item.comments}</Text>
                    </View>
                  )}
                  {item.signature && (
                    <View style={styles.signatureInHistory}>
                      <Image 
                        source={{ uri: item.signature }} 
                        style={styles.signatureInHistoryImage} 
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding for fixed action buttons */}
        <View style={{ height: action ? 400 : 100 }} />
      </ScrollView>

      {/* Fixed Action Buttons at Bottom */}
      {!action && (
        <View style={[styles.fixedActionContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.fixedActionButtons}>
            {canReturnToSender && (
              <TouchableOpacity
                style={[styles.fixedActionButton, styles.fixedReturnButton]}
                onPress={() => setAction('return')}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-undo" size={22} color="#fff" />
                <Text style={styles.fixedActionButtonText}>Return</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.fixedActionButton, styles.fixedRejectButton]}
              onPress={() => setAction('reject')}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={22} color="#fff" />
              <Text style={styles.fixedActionButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fixedActionButton, styles.fixedApproveButton]}
              onPress={() => setAction('approve')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.fixedActionButtonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Form Modal Overlay */}
      {action && (
        <View style={styles.actionFormOverlay}>
          <TouchableOpacity 
            style={styles.actionFormOverlayBackdrop}
            activeOpacity={1}
            onPress={() => {
              setAction(null);
              setSignature('');
              setComments('');
              setRejectionReason('');
              setReturnReason('');
            }}
          />
          <View style={[styles.actionFormContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.actionFormHeader}>
              <Text style={styles.actionFormTitle}>
                {action === 'approve' ? 'Approve Request' :
                 action === 'reject' ? 'Reject Request' : 'Return to Sender'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setAction(null);
                  setSignature('');
                  setComments('');
                  setRejectionReason('');
                  setReturnReason('');
                }}
                style={styles.closeFormButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.actionFormScroll}
              contentContainerStyle={styles.actionFormContent}
              scrollEnabled={!isDrawing}
            >
              {/* Comments Section */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>
                  {action === 'approve' ? 'Comments (Optional)' :
                   action === 'reject' ? 'Rejection Reason *' : 'Return Reason *'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    action === 'approve' ? 'Enter approval comments (optional)...' :
                    action === 'reject' ? 'Enter reason for rejection (required)...' :
                    'Enter reason for returning to sender...'
                  }
                  placeholderTextColor="#9ca3af"
                  value={action === 'approve' ? comments : action === 'reject' ? rejectionReason : returnReason}
                  onChangeText={action === 'approve' ? setComments : action === 'reject' ? setRejectionReason : setReturnReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Signature Section */}
              <View style={styles.formSection}>
                <View style={styles.signatureHeader}>
                  <Text style={styles.formLabel}>
                    Signature <Text style={styles.required}>*</Text>
                  </Text>
                  {autoSignature && (
                    <TouchableOpacity
                      style={styles.useSavedSignatureButton}
                      onPress={() => {
                        setSignature(autoSignature);
                        Alert.alert('Success', 'Saved signature loaded.');
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.useSavedSignatureText}>Use Saved Signature</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.signatureContainer}>
                  <SignaturePad
                    height={180}
                    value={signature || null}
                    onSave={(dataUrl) => setSignature(dataUrl)}
                    onClear={() => setSignature('')}
                    hideSaveButton
                    onDrawingStart={() => setIsDrawing(true)}
                    onDrawingEnd={() => setIsDrawing(false)}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Form Action Buttons */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  setAction(null);
                  setSignature('');
                  setComments('');
                  setRejectionReason('');
                  setReturnReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formButton, 
                  action === 'approve' ? styles.submitApproveButton :
                  action === 'reject' ? styles.submitRejectButton : styles.submitReturnButton,
                  ((action === 'reject' && !rejectionReason.trim()) ||
                   (action === 'return' && !returnReason.trim()) ||
                   !signature || isSubmitting) && styles.formButtonDisabled
                ]}
                disabled={
                  (action === 'reject' && !rejectionReason.trim()) ||
                  (action === 'return' && !returnReason.trim()) ||
                  !signature || isSubmitting
                }
                onPress={async () => {
                  if (action === 'approve') {
                    await handleApprove();
                  } else if (action === 'reject') {
                    await handleReject();
                  } else {
                    await handleReturnToSender();
                  }
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={action === 'approve' ? 'checkmark-circle' : action === 'reject' ? 'close-circle' : 'arrow-undo'} 
                      size={18} 
                      color="#fff" 
                    />
                    <Text style={styles.submitButtonText}>
                      {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Return'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Success Modal - Travilink Branding */}
      {showSuccessModal && (
        <View style={styles.successModalOverlay}>
          <TouchableOpacity 
            style={styles.successModalBackdrop} 
            activeOpacity={1}
            onPress={() => {
              setShowSuccessModal(false);
              router.back();
            }}
          />
          <View style={styles.successModalContainer}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>
            <Text style={styles.successModalTitle}>Success</Text>
            <Text style={styles.successModalMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.successModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  scrollContentWithAction: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7a0019',
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Requester Card - Priority 1
  requesterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  requesterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#7a0019',
  },
  requesterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  requesterContent: {
    padding: 12,
    gap: 12,
  },
  requesterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requesterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requesterLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  requesterValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  requestNumberValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7a0019',
  },
  // Detail Cards - Matching View Details Design
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  detailCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailCardContent: {
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailRowBorder: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  purposeText: {
    textAlign: 'left',
    marginTop: 4,
    fontWeight: '400',
  },
  // Signature Display
  signatureDisplayContainer: {
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  signatureDisplayImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signatureDisplayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  signatureDisplayDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Participants
  participantInfo: {
    flex: 1,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  participantEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  headBadge: {
    backgroundColor: '#7a0019',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  // Budget Section - Matching View Details Design
  budgetSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
  // History Card
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  historyList: {
    gap: 0,
  },
  historyItem: {
    paddingVertical: 12,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyItemLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  historyIcon: {
    marginTop: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyStage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  historyApprover: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historyComment: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7a0019',
  },
  historyCommentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  signatureInHistory: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  signatureInHistoryImage: {
    width: '100%',
    height: 80,
  },
  // Fixed Action Buttons
  fixedActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  fixedActionButtons: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  fixedActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  fixedApproveButton: {
    backgroundColor: '#16a34a',
  },
  fixedRejectButton: {
    backgroundColor: '#dc2626',
  },
  fixedReturnButton: {
    backgroundColor: '#f59e0b',
  },
  fixedActionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Action Form Modal
  actionFormOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  actionFormOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  actionFormContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 1001,
  },
  actionFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  actionFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeFormButton: {
    padding: 4,
  },
  actionFormScroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  actionFormContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  signatureHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signatureHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  useSavedSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  useSavedSignatureText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  signatureContainer: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    minHeight: 180,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  formButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitApproveButton: {
    backgroundColor: '#16a34a',
  },
  submitRejectButton: {
    backgroundColor: '#dc2626',
  },
  submitReturnButton: {
    backgroundColor: '#f59e0b',
  },
  formButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Success Modal - Travilink Branding
  successModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  successModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  successModalContainer: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#7a0019',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#7a0019',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#16a34a',
  },
  successModalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#7a0019',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
    fontWeight: '500',
  },
  successModalButton: {
    backgroundColor: '#7a0019',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 140,
    shadowColor: '#7a0019',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
