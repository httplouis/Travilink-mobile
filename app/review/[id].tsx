import React, { useState } from 'react';
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
import { formatDateTime } from '@/lib/utils';

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
  const { approveRequest, isSubmitting } = useApproveRequest();
  const { profile } = useAuth();
  
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
          comments: request.head_approval_comments || null,
          signature: request.head_signature || null,
        });
      }
      if (request.parent_head_approved_by && request.parent_head_approved_at) {
        approvalHistory.push({
          stage: 'Parent Head Approval',
          approverName: approversMap[request.parent_head_approved_by]?.name || null,
          approvedAt: request.parent_head_approved_at,
          comments: request.parent_head_approval_comments || null,
          signature: request.parent_head_signature || null,
        });
      }
      if (request.admin_processed_by && request.admin_processed_at) {
        approvalHistory.push({
          stage: 'Administrator Processing',
          approverName: approversMap[request.admin_processed_by]?.name || null,
          approvedAt: request.admin_processed_at,
          comments: request.admin_processing_comments || null,
          signature: request.admin_signature || null,
        });
      }
      if (request.comptroller_approved_by && request.comptroller_approved_at) {
        approvalHistory.push({
          stage: 'Comptroller Approval',
          approverName: approversMap[request.comptroller_approved_by]?.name || null,
          approvedAt: request.comptroller_approved_at,
          comments: request.comptroller_approval_comments || null,
          signature: request.comptroller_signature || null,
        });
      }
      if (request.hr_approved_by && request.hr_approved_at) {
        approvalHistory.push({
          stage: 'HR Approval',
          approverName: approversMap[request.hr_approved_by]?.name || null,
          approvedAt: request.hr_approved_at,
          comments: request.hr_approval_comments || null,
          signature: request.hr_signature || null,
        });
      }
      if (request.vp_approved_by && request.vp_approved_at) {
        approvalHistory.push({
          stage: 'VP Approval',
          approverName: approversMap[request.vp_approved_by]?.name || null,
          approvedAt: request.vp_approved_at,
          comments: request.vp_approval_comments || null,
          signature: request.vp_signature || null,
        });
      }
      if (request.president_approved_by && request.president_approved_at) {
        approvalHistory.push({
          stage: 'President Approval',
          approverName: approversMap[request.president_approved_by]?.name || null,
          approvedAt: request.president_approved_at,
          comments: request.president_approval_comments || null,
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

    const result = await approveRequest({
      requestId: id!,
      role: userRole as any,
      action: 'approve',
      signature,
      comments: comments.trim() || undefined,
    });

    if (result.success) {
      Alert.alert('Success', 'Request approved successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rejection.');
      return;
    }
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide your signature to reject this request.');
      return;
    }

    const result = await approveRequest({
      requestId: id!,
      role: userRole as any,
      action: 'reject',
      signature,
      comments: rejectionReason.trim(),
    });

    if (result.success) {
      Alert.alert('Success', 'Request rejected successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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

    const result = await approveRequest({
      requestId: id!,
      role: userRole as any,
      action: 'return',
      signature,
      comments: returnReason.trim(),
    });

    if (result.success) {
      Alert.alert('Success', 'Request returned to sender successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <NavigationHeader title={getRoleTitle()} showBack={true} showMenu={false} showNotification={false} />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isDrawing}
        showsVerticalScrollIndicator={true}
      >
        {/* Request Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.summaryTitle}>Request Summary</Text>
            </View>
            <View style={styles.requestNumberBadge}>
              <Text style={styles.requestNumberText}>{request.request_number}</Text>
            </View>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <Ionicons name="location" size={16} color="#6b7280" />
                <Text style={styles.summaryLabel}>Destination</Text>
              </View>
              <Text style={styles.summaryValue}>{request.destination || 'N/A'}</Text>
            </View>
            {request.total_budget && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                  <Ionicons name="cash" size={16} color="#6b7280" />
                  <Text style={styles.summaryLabel}>Budget</Text>
                </View>
                <Text style={[styles.summaryValue, styles.budgetValue]}>
                  ₱{request.total_budget.toLocaleString()}
                </Text>
              </View>
            )}
            {request.requester_name && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                  <Ionicons name="person" size={16} color="#6b7280" />
                  <Text style={styles.summaryLabel}>Requester</Text>
                </View>
                <Text style={styles.summaryValue}>{request.requester_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Approval History */}
        {approvalHistory.length > 0 && (
          <View style={styles.historyCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done" size={18} color="#6b7280" />
              <Text style={styles.sectionTitle}>Approval History</Text>
            </View>
            <View style={styles.historyList}>
              {approvalHistory.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <View style={styles.historyItemLeft}>
                      <View style={styles.historyIcon}>
                        <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyStage}>{item.stage}</Text>
                        {item.approverName && (
                          <Text style={styles.historyApprover}>
                            {item.approverName}
                          </Text>
                        )}
                        {item.approvedAt && (
                          <Text style={styles.historyTime}>
                            {formatDateTime(item.approvedAt)}
                          </Text>
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

        {/* Action Selection */}
        {!action && (
          <View style={styles.actionSelectionCard}>
            <Text style={styles.actionSelectionTitle}>Select Action</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => setAction('approve')}
                activeOpacity={0.8}
              >
                <View style={styles.actionButtonIcon}>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                </View>
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              {canReturnToSender && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.returnButton]}
                  onPress={() => setAction('return')}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionButtonIcon}>
                    <Ionicons name="arrow-undo" size={24} color="#fff" />
                  </View>
                  <Text style={styles.actionButtonText}>Return to Sender</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setAction('reject')}
                activeOpacity={0.8}
              >
                <View style={styles.actionButtonIcon}>
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </View>
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Approval Form */}
        {action === 'approve' && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.formTitle}>Approve Request</Text>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Comments (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter approval comments..."
                placeholderTextColor="#9ca3af"
                value={comments}
                onChangeText={setComments}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.signatureHeader}>
                <Text style={styles.formLabel}>
                  Signature <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.signatureHint}>
                  Sign with your finger — it auto-saves when you lift
                </Text>
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

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  setAction(null);
                  setSignature('');
                  setComments('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formButton, 
                  styles.submitApproveButton,
                  (!signature || isSubmitting) && styles.formButtonDisabled
                ]}
                onPress={handleApprove}
                disabled={!signature || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Rejection Form */}
        {action === 'reject' && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Ionicons name="close-circle" size={20} color="#dc2626" />
              <Text style={styles.formTitle}>Reject Request</Text>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>
                Rejection Reason <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter reason for rejection..."
                placeholderTextColor="#9ca3af"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.signatureHeader}>
                <Text style={styles.formLabel}>
                  Signature <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.signatureHint}>
                  Sign with your finger — it auto-saves when you lift
                </Text>
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

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  setAction(null);
                  setSignature('');
                  setRejectionReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formButton, 
                  styles.submitRejectButton,
                  (!rejectionReason.trim() || !signature || isSubmitting) && styles.formButtonDisabled
                ]}
                onPress={handleReject}
                disabled={!rejectionReason.trim() || !signature || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Return to Sender Form */}
        {action === 'return' && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Ionicons name="arrow-undo" size={20} color="#f59e0b" />
              <Text style={styles.formTitle}>Return to Sender</Text>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>
                Return Reason <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter reason for returning to sender..."
                placeholderTextColor="#9ca3af"
                value={returnReason}
                onChangeText={setReturnReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.signatureHeader}>
                <Text style={styles.formLabel}>
                  Signature <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.signatureHint}>
                  Sign with your finger — it auto-saves when you lift
                </Text>
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

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  setAction(null);
                  setSignature('');
                  setReturnReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formButton, 
                  styles.submitReturnButton,
                  (!returnReason.trim() || !signature || isSubmitting) && styles.formButtonDisabled
                ]}
                onPress={handleReturnToSender}
                disabled={!returnReason.trim() || !signature || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="arrow-undo" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Return to Sender</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom padding for navbar */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    padding: 16,
    paddingBottom: 32,
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
  // Summary Card
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#7a0019',
  },
  summaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  requestNumberBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  requestNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  summaryContent: {
    padding: 16,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  budgetValue: {
    fontSize: 16,
    color: '#7a0019',
    fontWeight: '700',
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
    gap: 16,
  },
  historyItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  // Action Selection Card
  actionSelectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionSelectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  returnButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  // Form Card
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
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
  },
  signatureHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
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
    marginTop: 8,
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
});
