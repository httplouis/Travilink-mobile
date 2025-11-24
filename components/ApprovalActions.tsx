import React, { useState } from 'react';
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
import { useApproveRequest } from '@/hooks/useApproveRequest';
import SignaturePad from './SignaturePad';

interface ApprovalActionsProps {
  requestId: string;
  role: 'head' | 'vp' | 'president' | 'hr';
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApprovalActions({
  requestId,
  role,
  onClose,
  onSuccess,
}: ApprovalActionsProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [signature, setSignature] = useState('');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const { approveRequest, isSubmitting } = useApproveRequest();

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
              signature: '', // Rejection doesn't require signature
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
            <Text style={styles.modalTitle}>
              {action === 'approve' ? 'Approve Request' : action === 'reject' ? 'Reject Request' : 'Review Request'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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

