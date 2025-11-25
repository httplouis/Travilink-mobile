import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Request } from '@/lib/types';
import { useApproveRequest } from '@/hooks/useApproveRequest';
import SignaturePad from './SignaturePad';
import { supabase } from '@/lib/supabase/client';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSignatureSettings } from '@/hooks/useSignatureSettings';
import { useQueryClient } from '@tanstack/react-query';
import ApproverSelectionModal from './ApproverSelectionModal';

const { height: screenHeight } = Dimensions.get('window');

interface HeadApprovalModalProps {
  visible: boolean;
  request: Request;
  onClose: () => void;
  isHistory?: boolean;
}

interface ApproverInfo {
  id: string;
  name: string;
  email?: string;
  profile_picture?: string;
}

export default function HeadApprovalModal({
  visible,
  request,
  onClose,
  isHistory = false,
}: HeadApprovalModalProps) {
  const { profile } = useAuth();
  const [signature, setSignature] = useState('');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const panY = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(screenHeight * 0.9)).current;

  // Fetch approver info
  const [requesterInfo, setRequesterInfo] = useState<ApproverInfo | null>(null);
  const [parentHeadInfo, setParentHeadInfo] = useState<ApproverInfo | null>(null);
  
  // Approver selection
  const [showApproverSelection, setShowApproverSelection] = useState(false);
  const [adminApprovers, setAdminApprovers] = useState<any[]>([]);
  const [suggestedAdminId, setSuggestedAdminId] = useState<string | null>(null);
  
  // Auto-signature
  const { autoSignature, isAutoSignEnabled } = useSignatureSettings();

  const { approveRequest, isSubmitting } = useApproveRequest();
  const queryClient = useQueryClient();

  // Get expense breakdown
  const expenseBreakdown = useMemo(() => {
    if (!request.expense_breakdown || !Array.isArray(request.expense_breakdown)) {
      return [];
    }
    return request.expense_breakdown.map((item: any) => ({
      item: item.category || item.item || 'Other',
      amount: item.amount || 0,
      description: item.description || null,
    }));
  }, [request.expense_breakdown]);

  // Fetch requester and parent head info
  useEffect(() => {
    if (!request.requester_id) return;

    const fetchRequesterInfo = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, name, email, profile_picture')
          .eq('id', request.requester_id)
          .maybeSingle();
        
        if (data) {
          setRequesterInfo({
            id: data.id,
            name: data.name || 'Unknown',
            email: data.email,
            profile_picture: data.profile_picture,
          });
        }
      } catch (error) {
        console.warn('Error fetching requester info:', error);
      }
    };

    fetchRequesterInfo();
  }, [request.requester_id]);

  useEffect(() => {
    if (!request.parent_head_approved_by) return;

    const fetchParentHeadInfo = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, name, email, profile_picture')
          .eq('id', request.parent_head_approved_by)
          .maybeSingle();
        
        if (data) {
          setParentHeadInfo({
            id: data.id,
            name: data.name || 'Unknown',
            email: data.email,
            profile_picture: data.profile_picture,
          });
        }
      } catch (error) {
        console.warn('Error fetching parent head info:', error);
      }
    };

    fetchParentHeadInfo();
  }, [request.parent_head_approved_by]);

  // Load saved signature on mount
  useEffect(() => {
    if (request.head_signature && isHistory) {
      setSignature(request.head_signature);
    }
  }, [request.head_signature, isHistory]);

  // Apply auto-signature if enabled
  useEffect(() => {
    if (isAutoSignEnabled && autoSignature && !signature && !isHistory) {
      setSignature(autoSignature);
    }
  }, [isAutoSignEnabled, autoSignature, signature, isHistory]);

  // Swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
          modalTranslateY.setValue(screenHeight * 0.9 + gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(modalTranslateY, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: false,
          }).start(onClose);
        } else {
          Animated.spring(modalTranslateY, {
            toValue: screenHeight * 0.9,
            useNativeDriver: false,
          }).start();
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Fetch admin approvers when ready to approve
  const fetchAdminApprovers = async () => {
    try {
      const { data: adminData, error } = await supabase
        .from('users')
        .select('id, name, email, profile_picture, phone_number, position_title, role, status')
        .eq('role', 'admin');

      if (!error && adminData && adminData.length > 0) {
        const admins = adminData.map((a: any) => ({
          id: a.id,
          name: a.name || a.email || 'Unknown',
          email: a.email,
          position: a.position_title || 'Administrator',
          role: 'admin',
          roleLabel: 'Administrator',
        }));
        
        setAdminApprovers(admins);
        // Set first admin as suggested
        if (admins.length > 0) {
          setSuggestedAdminId(admins[0].id);
        }
        setShowApproverSelection(true);
      } else {
        // No admins found, proceed with default (null = admin role)
        proceedWithApproval(null, 'admin');
      }
    } catch (error) {
      console.error('Error fetching admin approvers:', error);
      // On error, still allow proceeding with default
      proceedWithApproval(null, 'admin');
    }
  };

  const handleApprove = async () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide your signature to approve this request.');
      return;
    }

    // Show approver selection for heads
    await fetchAdminApprovers();
  };

  const proceedWithApproval = async (selectedApproverId: string | null, selectedRole: string, returnReason?: string) => {
    setShowApproverSelection(false);
    
    const result = await approveRequest({
      requestId: request.id,
      role: 'head',
      action: 'approve',
      signature,
      comments: comments.trim() || undefined,
      nextApproverId: selectedApproverId,
      nextApproverRole: selectedRole,
      returnReason: returnReason,
    });

    if (result.success) {
      // Invalidate queries to refresh inbox
      queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
      onClose();
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rejection.');
      return;
    }

    Alert.alert(
      'Confirm Rejection',
      'Are you sure you want to reject this request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const result = await approveRequest({
              requestId: request.id,
              role: 'head',
              action: 'reject',
              signature: '',
              rejectionReason: rejectionReason.trim(),
            });

            if (result.success) {
              // Invalidate queries to refresh inbox
              queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
              queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
              onClose();
            }
          },
        },
      ]
    );
  };

  const handleReturnToSender = async () => {
    if (!returnReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for returning this request.');
      return;
    }

    Alert.alert(
      'Return to Sender',
      'This request will be returned to the requester for editing. They can add additional attachments and resubmit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('requests')
                .update({
                  status: 'returned',
                  returned_at: new Date().toISOString(),
                  returned_by: profile?.id || null,
                  return_reason: returnReason.trim(),
                  returned_comments: comments.trim() || null,
                })
                .eq('id', request.id);

              if (error) {
                Alert.alert('Error', 'Failed to return request. Please try again.');
                return;
              }

              // Invalidate queries to refresh inbox
              queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
              queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
              
              Alert.alert(
                'Request Returned',
                'The request has been returned to the sender. They can now edit and resubmit it.',
                [{ text: 'OK', onPress: onClose }]
              );
            } catch (err) {
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUseAutoSign = () => {
    if (autoSignature) {
      setSignature(autoSignature);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlayBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: modalTranslateY }],
            },
          ]}
        >
          {/* Swipe Handle */}
          <View
            {...panResponder.panHandlers}
            style={styles.dragHandleContainer}
          >
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="document-text" size={24} color="#7a0019" />
              <View>
                <Text style={styles.modalTitle}>Review Request</Text>
                <Text style={styles.requestNumber}>{request.request_number || 'DRAFT'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.modalBody}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
            scrollEnabled={!isDrawing}
          >
            {/* PRIORITY 1: BUDGET BREAKDOWN (if available) */}
            {request.has_budget && expenseBreakdown.length > 0 && (
              <View style={styles.budgetSection}>
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetHeaderLeft}>
                    <Ionicons name="cash" size={20} color="#fff" />
                    <View>
                      <Text style={styles.budgetTitle}>Budget Breakdown</Text>
                      <Text style={styles.budgetSubtitle}>Total: ₱{(request.total_budget || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.budgetContent}>
                  {expenseBreakdown.map((item: any, index: number) => {
                    const displayLabel = item.item === 'Other' && item.description
                      ? item.description
                      : (item.item || 'Other');

                    return (
                      <View key={index} style={styles.budgetItem}>
                        <Text style={styles.budgetItemName}>{displayLabel}</Text>
                        <Text style={styles.budgetAmount}>
                          ₱{(item.amount || 0).toLocaleString()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* PRIORITY 2: REQUEST DETAILS */}
            <View style={styles.detailsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={18} color="#7a0019" />
                <Text style={styles.sectionTitle}>Request Details</Text>
              </View>

              <View style={styles.detailsCard}>
                <View style={styles.detailItem}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="person" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Requester</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {requesterInfo?.name || request.requester_name || 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="business" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Department</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {request.department?.name || 'N/A'}
                    {request.department?.code && ` (${request.department.code})`}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="location" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Destination</Text>
                  </View>
                  <Text style={styles.detailValue}>{request.destination || 'N/A'}</Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="calendar" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Travel Dates</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {request.travel_start_date ? formatDate(request.travel_start_date) : 'TBD'}
                    {request.travel_end_date && ` - ${formatDate(request.travel_end_date)}`}
                  </Text>
                </View>

                {request.purpose && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="document" size={16} color="#6b7280" />
                      <Text style={styles.detailLabel}>Purpose</Text>
                    </View>
                    <Text style={styles.detailValue}>{request.purpose}</Text>
                  </View>
                )}

                {request.cost_justification && (
                  <View style={styles.detailItemFull}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="information-circle" size={16} color="#3b82f6" />
                      <Text style={styles.detailLabel}>Cost Justification</Text>
                    </View>
                    <Text style={styles.detailValueFull}>{request.cost_justification}</Text>
                  </View>
                )}

                {/* Participants */}
                {request.participants && request.participants.length > 0 && (
                  <View style={styles.detailItemFull}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="people" size={16} color="#6b7280" />
                      <Text style={styles.detailLabel}>Participants</Text>
                    </View>
                    <View style={styles.participantsList}>
                      {request.participants.map((participant, idx) => (
                        <Text key={idx} style={styles.participantItem}>
                          • {participant.name}
                          {participant.is_head && ' (Head)'}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Vehicle/Driver Info */}
                {request.needs_vehicle && (
                  <View style={styles.detailItemFull}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="car" size={16} color="#6b7280" />
                      <Text style={styles.detailLabel}>Transportation</Text>
                    </View>
                    <Text style={styles.detailValueFull}>
                      {request.transportation_type === 'owned' && 'Own Vehicle'}
                      {request.transportation_type === 'institutional' && 'Institutional Vehicle'}
                      {request.transportation_type === 'rent' && 'Rental Vehicle'}
                      {request.vehicle_type && ` • ${request.vehicle_type.toUpperCase()}`}
                    </Text>
                    {request.preferred_vehicle_note && (
                      <Text style={styles.noteText}>Note: {request.preferred_vehicle_note}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* PRIORITY 3: HEAD ACTIONS (if not history) */}
            {!isHistory && (
              <View style={styles.actionsSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="create" size={18} color="#7a0019" />
                  <Text style={styles.sectionTitle}>Your Review</Text>
                </View>

                {!action ? (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => setAction('approve')}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.returnButton]}
                      onPress={() => setAction('return')}
                    >
                      <Ionicons name="arrow-undo" size={24} color="#fff" />
                      <Text style={styles.actionButtonText}>Return to Sender</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => setAction('reject')}
                    >
                      <Ionicons name="close-circle" size={24} color="#fff" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                ) : action === 'approve' ? (
                  <View style={styles.actionForm}>
                    <View style={styles.commentsCard}>
                      <Text style={styles.inputLabel}>Comments & Notes (Optional)</Text>
                      <TextInput
                        style={styles.commentsInput}
                        placeholder="Add your comments or notes about this request..."
                        placeholderTextColor="#9ca3af"
                        value={comments}
                        onChangeText={setComments}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                      />
                    </View>

                    <View style={styles.signatureSection}>
                      <View style={styles.signatureHeader}>
                        <Text style={styles.inputLabel}>Signature *</Text>
                        {isAutoSignEnabled && autoSignature && (
                          <TouchableOpacity
                            style={styles.autoSignButton}
                            onPress={handleUseAutoSign}
                          >
                            <Ionicons name="flash" size={16} color="#7a0019" />
                            <Text style={styles.autoSignButtonText}>Use Auto-Sign</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <SignaturePad
                        onSave={(dataUrl) => setSignature(dataUrl)}
                        value={signature || null}
                        hideSaveButton
                        onDrawingStart={() => {
                          setIsDrawing(true);
                          setScrollEnabled(false);
                        }}
                        onDrawingEnd={() => {
                          setIsDrawing(false);
                          setScrollEnabled(true);
                        }}
                        onClear={() => setSignature('')}
                      />
                    </View>

                    <View style={styles.submitButtons}>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.cancelButton]}
                        onPress={() => {
                          setAction(null);
                          setSignature('');
                          setComments('');
                        }}
                      >
                        <Ionicons name="arrow-back" size={18} color="#6b7280" />
                        <Text style={styles.cancelButtonText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.confirmButton, !signature && styles.disabledButton]}
                        onPress={handleApprove}
                        disabled={!signature || isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.confirmButtonText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : action === 'return' ? (
                  <View style={styles.actionForm}>
                    <View style={styles.commentsCard}>
                      <Text style={styles.inputLabel}>Return Reason *</Text>
                      <TextInput
                        style={styles.commentsInput}
                        placeholder="Please provide a reason for returning this request..."
                        placeholderTextColor="#9ca3af"
                        value={returnReason}
                        onChangeText={setReturnReason}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                      />
                    </View>

                    <View style={styles.commentsCard}>
                      <Text style={styles.inputLabel}>Additional Comments (Optional)</Text>
                      <TextInput
                        style={styles.commentsInput}
                        placeholder="Add any additional comments..."
                        placeholderTextColor="#9ca3af"
                        value={comments}
                        onChangeText={setComments}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                      />
                    </View>

                    <View style={styles.submitButtons}>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.cancelButton]}
                        onPress={() => {
                          setAction(null);
                          setReturnReason('');
                          setComments('');
                        }}
                      >
                        <Ionicons name="arrow-back" size={18} color="#6b7280" />
                        <Text style={styles.cancelButtonText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.confirmButton, !returnReason.trim() && styles.disabledButton]}
                        onPress={handleReturnToSender}
                        disabled={!returnReason.trim() || isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="arrow-undo" size={20} color="#fff" />
                            <Text style={styles.confirmButtonText}>Return</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actionForm}>
                    <View style={styles.commentsCard}>
                      <Text style={styles.inputLabel}>Rejection Reason *</Text>
                      <TextInput
                        style={styles.commentsInput}
                        placeholder="Please provide a reason for rejection..."
                        placeholderTextColor="#9ca3af"
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                      />
                    </View>

                    <View style={styles.submitButtons}>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.cancelButton]}
                        onPress={() => {
                          setAction(null);
                          setRejectionReason('');
                        }}
                      >
                        <Ionicons name="arrow-back" size={18} color="#6b7280" />
                        <Text style={styles.cancelButtonText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.confirmButton, !rejectionReason.trim() && styles.disabledButton]}
                        onPress={handleReject}
                        disabled={!rejectionReason.trim() || isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={styles.confirmButtonText}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* PRIORITY 4: APPROVAL HISTORY (at bottom) */}
            <View style={styles.bottomSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={18} color="#9ca3af" />
                <Text style={styles.sectionTitleBottom}>Approval History</Text>
              </View>

              {/* Requester Signature */}
              {request.requester_signature && (
                <View style={styles.signatureCard}>
                  <View style={styles.signatureHeader}>
                    <Text style={styles.signatureLabel}>Requester</Text>
                    {request.created_at && (
                      <Text style={styles.signatureDate}>
                        {formatDateTime(request.created_at)}
                      </Text>
                    )}
                  </View>
                  {request.requester_signature && (
                    <Image
                      source={{ uri: request.requester_signature }}
                      style={styles.signatureImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.signatureName}>
                    {request.requester_name || 'Requester'}
                  </Text>
                </View>
              )}

              {/* Parent Head Signature */}
              {request.parent_head_approved_at && parentHeadInfo && (
                <View style={styles.signatureCard}>
                  <View style={styles.signatureHeader}>
                    <Text style={styles.signatureLabel}>Parent Head</Text>
                    <Text style={styles.signatureDate}>
                      {formatDateTime(request.parent_head_approved_at)}
                    </Text>
                  </View>
                  {request.parent_head_signature && (
                    <Image
                      source={{ uri: request.parent_head_signature }}
                      style={styles.signatureImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.signatureName}>
                    {parentHeadInfo.name}
                  </Text>
                  {request.parent_head_comments && (
                    <Text style={styles.signatureComments}>{request.parent_head_comments}</Text>
                  )}
                </View>
              )}

              {/* Head Signature (if already signed) */}
              {request.head_approved_at && (
                <View style={styles.signatureCard}>
                  <View style={styles.signatureHeader}>
                    <Text style={styles.signatureLabel}>Department Head</Text>
                    <Text style={styles.signatureDate}>
                      {formatDateTime(request.head_approved_at)}
                    </Text>
                  </View>
                  {request.head_signature && (
                    <Image
                      source={{ uri: request.head_signature }}
                      style={styles.signatureImage}
                      resizeMode="contain"
                    />
                  )}
                  {request.head_comments && (
                    <Text style={styles.signatureComments}>{request.head_comments}</Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Approver Selection Modal */}
        <ApproverSelectionModal
          visible={showApproverSelection}
          onClose={() => setShowApproverSelection(false)}
          onSelect={(approverId, approverRole, returnReason) => {
            proceedWithApproval(approverId, approverRole, returnReason);
          }}
          title="Select Next Approver"
          description={`Request ${request.request_number || request.id} - Choose where to send this request after approval`}
          role="admin"
          departmentId={request.department_id}
          requestId={request.id}
          allowReturnToRequester={true}
          requesterId={request.requester_id}
          requesterName={request.requester_name}
          suggestedApproverId={suggestedAdminId}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: screenHeight * 0.9,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandleContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  requestNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  budgetSection: {
    marginBottom: 24,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 0,
  },
  budgetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  budgetSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1fae5',
    marginTop: 2,
  },
  budgetContent: {
    backgroundColor: '#f9fafb',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
    gap: 12,
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  budgetItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailsCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  detailItem: {
    gap: 6,
  },
  detailItemFull: {
    gap: 6,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 22,
  },
  detailValueFull: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 22,
    lineHeight: 22,
  },
  participantsList: {
    marginLeft: 22,
    gap: 4,
  },
  participantItem: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  noteText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginLeft: 22,
    marginTop: 4,
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  returnButton: {
    backgroundColor: '#f59e0b',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  actionForm: {
    gap: 20,
  },
  commentsCard: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    backgroundColor: '#fff',
  },
  signatureSection: {
    gap: 8,
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  autoSignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  autoSignButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a0019',
  },
  submitButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#7a0019',
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSection: {
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitleBottom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  signatureCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  signatureDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
  signatureImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signatureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  signatureComments: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

