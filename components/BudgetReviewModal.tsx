import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Request } from '@/lib/types';
import { useComptrollerBudgetReview } from '@/hooks/useComptrollerBudgetReview';
import SignaturePad from './SignaturePad';
import CurrencyInput from './CurrencyInput';

interface BudgetReviewModalProps {
  visible: boolean;
  request: Request;
  onClose: () => void;
}

export default function BudgetReviewModal({
  visible,
  request,
  onClose,
}: BudgetReviewModalProps) {
  const [editedBudget, setEditedBudget] = useState<Record<string, number | null>>({});
  const [comments, setComments] = useState('');
  const [signature, setSignature] = useState('');
  const { updateBudget, approveBudget, isSubmitting } = useComptrollerBudgetReview();

  // Parse expense breakdown
  const expenseBreakdown = useMemo(() => {
    if (!request.expense_breakdown || !Array.isArray(request.expense_breakdown)) {
      return [];
    }
    return request.expense_breakdown;
  }, [request.expense_breakdown]);

  // Calculate total from edited budget
  const totalBudget = useMemo(() => {
    const originalTotal = request.total_budget || 0;
    const editedTotal = Object.values(editedBudget).reduce((sum, val) => sum + (val || 0), 0);
    
    // If no edits, return original total
    if (Object.keys(editedBudget).length === 0) {
      return originalTotal;
    }
    
    // Calculate new total: original total - original item amounts + edited amounts
    let newTotal = originalTotal;
    expenseBreakdown.forEach((item: any) => {
      const category = item.category?.toLowerCase() || '';
      const originalAmount = item.amount || 0;
      const editedAmount = editedBudget[category] ?? originalAmount;
      newTotal = newTotal - originalAmount + editedAmount;
    });
    
    return newTotal;
  }, [editedBudget, expenseBreakdown, request.total_budget]);

  const handleSaveChanges = async () => {
    if (Object.keys(editedBudget).length === 0) {
      Alert.alert('No Changes', 'Please make changes to the budget before saving.');
      return;
    }

    const result = await updateBudget({
      requestId: request.id,
      editedBudget,
      comments: comments.trim() || undefined,
    });

    if (result.success) {
      Alert.alert('Success', 'Budget changes saved successfully.');
      onClose();
    }
  };

  const handleApprove = async () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide your signature to approve this budget.');
      return;
    }

    Alert.alert(
      'Confirm Approval',
      'Are you sure you want to approve this budget? This will move the request to the next stage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const result = await approveBudget({
              requestId: request.id,
              signature,
              comments: comments.trim() || undefined,
              editedBudget: Object.keys(editedBudget).length > 0 ? editedBudget : undefined,
            });

            if (result.success) {
              Alert.alert('Success', 'Budget approved successfully.');
              onClose();
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    Alert.prompt(
      'Reject Budget',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert('Error', 'Rejection reason is required.');
              return;
            }

            // Reject logic would go here - similar to approval but with rejection status
            Alert.alert('Info', 'Rejection functionality will be implemented with the workflow engine.');
          },
        },
      ],
      'plain-text'
    );
  };

  const updateBudgetItem = (category: string, amount: string) => {
    const cleaned = amount.replace(/[₱,\s]/g, '').trim();
    const num = cleaned ? Number(cleaned) : null;
    
    if (num !== null && (isNaN(num) || num < 0)) {
      return;
    }

    setEditedBudget((prev) => ({
      ...prev,
      [category.toLowerCase()]: num,
    }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Budget Review</Text>
              <Text style={styles.requestNumber}>{request.request_number}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requester Information</Text>
              <Text style={styles.infoText}>{request.requester_name}</Text>
              <Text style={styles.infoSubtext}>
                {request.department?.name || 'N/A'}
                {request.department?.code && ` (${request.department.code})`}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Original Budget Breakdown</Text>
              {expenseBreakdown.length === 0 ? (
                <Text style={styles.emptyText}>No budget breakdown available</Text>
              ) : (
                expenseBreakdown.map((item: any, index: number) => {
                  const category = item.category?.toLowerCase() || `item-${index}`;
                  const originalAmount = item.amount || 0;
                  const editedAmount = editedBudget[category] ?? originalAmount;
                  const isEdited = editedBudget[category] !== undefined && editedBudget[category] !== originalAmount;

                  return (
                    <View key={index} style={[styles.budgetItem, isEdited && styles.budgetItemEdited]}>
                      <View style={styles.budgetItemHeader}>
                        <Text style={styles.budgetItemLabel}>
                          {item.category || 'Other'}
                          {isEdited && <Text style={styles.editedBadge}> (Edited)</Text>}
                        </Text>
                        <Text style={styles.originalAmount}>
                          Original: ₱{originalAmount.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.budgetItemInput}>
                        <CurrencyInput
                          label=""
                          placeholder="0.00"
                          value={editedAmount !== null && editedAmount !== undefined ? String(editedAmount) : ''}
                          onChange={(value) => updateBudgetItem(category, value)}
                        />
                      </View>
                      {item.description && (
                        <Text style={styles.budgetItemDescription}>{item.description}</Text>
                      )}
                    </View>
                  );
                })
              )}
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Budget:</Text>
                <Text style={[styles.totalAmount, totalBudget !== request.total_budget && styles.totalAmountEdited]}>
                  ₱{totalBudget.toLocaleString()}
                </Text>
              </View>
              {totalBudget !== request.total_budget && (
                <Text style={styles.totalChange}>
                  Original: ₱{(request.total_budget || 0).toLocaleString()} → 
                  New: ₱{totalBudget.toLocaleString()} 
                  ({totalBudget > (request.total_budget || 0) ? '+' : ''}
                  ₱{(totalBudget - (request.total_budget || 0)).toLocaleString()})
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comments</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Add any comments or notes about the budget review..."
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

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveChanges}
                disabled={isSubmitting || Object.keys(editedBudget).length === 0}
              >
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Save Changes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={isSubmitting}
              >
                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton, !signature && styles.disabledButton]}
                onPress={handleApprove}
                disabled={!signature || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  requestNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalBody: {
    padding: 20,
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
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  budgetItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  budgetItemEdited: {
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  budgetItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  editedBadge: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  originalAmount: {
    fontSize: 12,
    color: '#6b7280',
  },
  budgetItemInput: {
    marginBottom: 4,
  },
  budgetItemDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7a0019',
  },
  totalAmountEdited: {
    color: '#f59e0b',
  },
  totalChange: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
    fontWeight: '600',
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
  actionButtons: {
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

