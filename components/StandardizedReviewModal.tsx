import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useApproveRequest } from '@/hooks/useApproveRequest';
import SignaturePad from './SignaturePad';
import { formatDateTime } from '@/lib/utils';

interface StandardizedReviewModalProps {
  requestId: string;
  role: 'hr' | 'vp' | 'president' | 'comptroller';
  onClose: () => void;
  onSuccess: () => void;
  canReturnToSender?: boolean;
}

interface ApprovalHistory {
  stage: string;
  approverName: string | null;
  approvedAt: string | null;
  comments: string | null;
}

export default function StandardizedReviewModal({
  requestId,
  role,
  onClose,
  onSuccess,
  canReturnToSender = false,
}: StandardizedReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [signature, setSignature] = useState('');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const { approveRequest, isSubmitting } = useApproveRequest();

  // Fetch request details and approval history
  const { data: requestData, isLoading: isLoadingRequest } = useQuery({
    queryKey: ['request-review', requestId],
    queryFn: async () => {
      // Fetch request with all approver details
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Fetch approver names separately
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
          approvers.forEach(approver => {
            approversMap[approver.id] = approver;
          });
        }
      }

      return {
        ...request,
        head_approver: request.head_approved_by ? approversMap[request.head_approved_by] : null,
        parent_head_approver: request.parent_head_approved_by ? approversMap[request.parent_head_approved_by] : null,
        admin_approver: request.admin_processed_by ? approversMap[request.admin_processed_by] : null,
        comptroller_approver: request.comptroller_approved_by ? approversMap[request.comptroller_approved_by] : null,
        hr_approver: request.hr_approved_by ? approversMap[request.hr_approved_by] : null,
        vp_approver: request.vp_approved_by ? approversMap[request.vp_approved_by] : null,
        president_approver: request.president_approved_by ? approversMap[request.president_approved_by] : null,
      };

      if (error) throw error;
      return request;
    },
    enabled: !!requestId,
  });

  // Build approval history
  const approvalHistory: ApprovalHistory[] = [];
  if (requestData) {
    if (requestData.head_approved_at) {
      approvalHistory.push({
        stage: 'Department Head',
        approverName: requestData.head_approver?.name || null,
        approvedAt: requestData.head_approved_at,
        comments: requestData.head_comments || null,
      });
    }
    if (requestData.parent_head_approved_at) {
      approvalHistory.push({
        stage: 'College Dean',
        approverName: requestData.parent_head_approver?.name || null,
        approvedAt: requestData.parent_head_approved_at,
        comments: requestData.parent_head_comments || null,
      });
    }
    if (requestData.admin_processed_at) {
      approvalHistory.push({
        stage: 'Transportation Coordinator',
        approverName: requestData.admin_approver?.name || null,
        approvedAt: requestData.admin_processed_at,
        comments: requestData.admin_comments || null,
      });
    }
    if (requestData.comptroller_approved_at) {
      approvalHistory.push({
        stage: 'Comptroller',
        approverName: requestData.comptroller_approver?.name || null,
        approvedAt: requestData.comptroller_approved_at,
        comments: requestData.comptroller_comments || null,
      });
    }
    if (requestData.hr_approved_at && role !== 'hr') {
      approvalHistory.push({
        stage: 'HR',
        approverName: requestData.hr_approver?.name || null,
        approvedAt: requestData.hr_approved_at,
        comments: requestData.hr_comments || null,
      });
    }
    if (requestData.vp_approved_at && role !== 'vp') {
      approvalHistory.push({
        stage: 'VP',
        approverName: requestData.vp_approver?.name || null,
        approvedAt: requestData.vp_approved_at,
        comments: requestData.vp_comments || null,
      });
    }
    if (requestData.president_approved_at && role !== 'president') {
      approvalHistory.push({
        stage: 'President',
        approverName: requestData.president_approver?.name || null,
        approvedAt: requestData.president_approved_at,
        comments: requestData.president_comments || null,
      });
    }
  }

  const handleApprove = async () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide your signature to approve this request.');
      return;
    }

    const result = await approveRequest({
      requestId,
      role,
      action: 'approve',
      signature,
      comments: comments.trim() || undefined,
    });

    if (result.success) {
      onSuccess();
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
              requestId,
              role,
              action: 'reject',
              signature: '',
              rejectionReason: rejectionReason.trim(),
            });

            if (result.success) {
              onSuccess();
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
            const { supabase } = await import('@/lib/supabase/client');
            const { error } = await supabase
              .from('requests')
              .update({
                status: 'returned',
                returned_at: new Date().toISOString(),
                returned_by: role,
                return_reason: returnReason.trim(),
                returned_comments: comments.trim() || null,
              })
              .eq('id', requestId);

            if (error) {
              Alert.alert('Error', 'Failed to return request. Please try again.');
              return;
            }

            Alert.alert(
              'Request Returned',
              'The request has been returned to the sender. They can now edit and resubmit it.',
              [{ text: 'OK', onPress: onSuccess }]
            );
          },
        },
      ]
    );
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'hr': return 'HR Review';
      case 'vp': return 'VP Review';
      case 'president': return 'President Review';
      case 'comptroller': return 'Budget Review';
      default: return 'Review Request';
    }
  };

  if (isLoadingRequest) {
    return (
      <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#7a0019" />
            <Text style={styles.loadingText}>Loading request details...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getRoleTitle()}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.modalBody} 
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
          >
            {/* Approval History */}
            {approvalHistory.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Approval History</Text>
                {approvalHistory.map((item, index) => (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyIcon}>
                        <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyStage}>{item.stage}</Text>
                        {item.approverName && (
                          <Text style={styles.historyApprover}>
                            Approved by {item.approverName}
                          </Text>
                        )}
                        {item.approvedAt && (
                          <Text style={styles.historyTime}>
                            {formatDateTime(item.approvedAt)}
                          </Text>
                        )}
                      </View>
                    </View>
                    {item.comments && (
                      <View style={styles.historyComments}>
                        <Text style={styles.historyCommentsText}>{item.comments}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Request Summary */}
            {requestData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Request Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Request Number</Text>
                    <Text style={styles.summaryValue}>{requestData.request_number}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Requester</Text>
                    <Text style={styles.summaryValue}>{requestData.requester_name}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Destination</Text>
                    <Text style={styles.summaryValue}>{requestData.destination}</Text>
                  </View>
                  {requestData.total_budget && (
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Budget</Text>
                      <Text style={styles.summaryValue}>
                        ₱{requestData.total_budget.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {!action ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => setAction('approve')}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                {canReturnToSender && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.returnButton]}
                    onPress={() => setAction('return')}
                  >
                    <Ionicons name="arrow-undo" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Return to Sender</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => setAction('reject')}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : action === 'approve' ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Comments (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Add any comments..."
                    value={comments}
                    onChangeText={setComments}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Signature *</Text>
                  <SignaturePad
                    onSave={(dataUrl) => setSignature(dataUrl)}
                    value={signature || null}
                    hideSaveButton
                    onDrawingStart={() => setScrollEnabled(false)}
                    onDrawingEnd={() => setScrollEnabled(true)}
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
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.confirmButtonText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : action === 'return' ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Return Reason *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Please provide a reason for returning this request..."
                    value={returnReason}
                    onChangeText={setReturnReason}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Comments (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Add any additional comments..."
                    value={comments}
                    onChangeText={setComments}
                    multiline
                    numberOfLines={4}
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
              </>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Rejection Reason *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Please provide a reason for rejection..."
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                    multiline
                    numberOfLines={4}
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
                        <Ionicons name="close" size={20} color="#fff" />
                        <Text style={styles.confirmButtonText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyIcon: {
    marginTop: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyStage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  historyApprover: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historyComments: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  historyCommentsText: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
  },
  summaryGrid: {
    gap: 12,
  },
  summaryItem: {
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
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
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
  submitButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
});

