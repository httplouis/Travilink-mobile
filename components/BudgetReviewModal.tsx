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
import { useComptrollerBudgetReview } from '@/hooks/useComptrollerBudgetReview';
import SignaturePad from './SignaturePad';
import CurrencyInput from './CurrencyInput';
import { supabase } from '@/lib/supabase/client';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import ApproverSelectionModal from './ApproverSelectionModal';

const { height: screenHeight } = Dimensions.get('window');

interface BudgetReviewModalProps {
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

export default function BudgetReviewModal({
  visible,
  request,
  onClose,
  isHistory = false,
}: BudgetReviewModalProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [editedBudget, setEditedBudget] = useState<Record<string, number | null>>({});
  const [originalBudget, setOriginalBudget] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [signature, setSignature] = useState('');
  const [approvers, setApprovers] = useState<Record<string, ApproverInfo | null>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [autoSignEnabled, setAutoSignEnabled] = useState(false);
  const [autoSignature, setAutoSignature] = useState<string | null>(null);
  const [showApproverSelection, setShowApproverSelection] = useState(false);
  const [suggestedHrId, setSuggestedHrId] = useState<string | null>(null);
  const [hrApprovers, setHrApprovers] = useState<any[]>([]);
  const { updateBudget, approveBudget, returnToSender, isSubmitting } = useComptrollerBudgetReview();
  const { profile } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  // Simple swipe-to-dismiss - only on drag handle
  const translateY = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        translateY.setOffset(translateY._value);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);
        translateY.flattenOffset();
        const shouldClose = gestureState.dy > 80 || gestureState.vy > 0.3;
        if (shouldClose) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // Track saved edits to show strikethrough even after saving
  const [savedEdits, setSavedEdits] = useState<Record<string, number>>({});

  // Reset when modal opens/closes
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      // Load auto-signature settings
      loadAutoSignature();
      // Reset editing state when modal opens (but keep savedEdits to show strikethrough)
      setEditingBudget(false);
      setEditedBudget({});
      setOriginalBudget({});
      setComments('');
      setShowApproverSelection(false);
      // Load saved edits from request if available (comptroller_edited_budget indicates edits were saved)
      if (request.comptroller_edited_budget && request.expense_breakdown) {
        const saved: Record<string, number> = {};
        request.expense_breakdown.forEach((item: any) => {
          const itemKey = item.item?.toLowerCase() || '';
          saved[itemKey] = item.amount || 0;
        });
        setSavedEdits(saved);
      } else {
        setSavedEdits({});
      }
    } else {
      // Clean up when modal closes
      setEditingBudget(false);
      setEditedBudget({});
      setOriginalBudget({});
      setComments('');
      setSignature('');
      setShowApproverSelection(false);
      setSavedEdits({});
    }
  }, [visible, profile?.id, request.id]);

  // Load auto-signature from user settings
  const loadAutoSignature = async () => {
    if (!profile?.id || isHistory) return;
    
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
        setAutoSignEnabled(data.is_auto_sign_enabled || false);
        setAutoSignature(data.automatic_signature || null);
        
        // Auto-fill signature if enabled
        if (data.is_auto_sign_enabled && data.automatic_signature && !signature) {
          setSignature(data.automatic_signature);
        }
      }
    } catch (err) {
      // Silently fail
    }
  };

  // Fetch approver information
  useEffect(() => {
    if (!visible || !request) return;

    const fetchApprovers = async () => {
      const approverIds = [
        { key: 'requester', id: request.requester_id },
        { key: 'head', id: request.head_approved_by },
        { key: 'parent_head', id: request.parent_head_approved_by },
        { key: 'admin', id: request.admin_approved_by || request.admin_processed_by },
        { key: 'comptroller', id: request.comptroller_approved_by },
        { key: 'hr', id: request.hr_approved_by },
        { key: 'vp', id: request.vp_approved_by },
        { key: 'president', id: request.president_approved_by },
      ].filter(item => item.id);

      const approverPromises = approverIds.map(async ({ key, id }) => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, name, email, profile_picture')
            .eq('id', id)
            .maybeSingle();
          
          if (error || !data) {
            return { key, approver: null };
          }
          return { key, approver: data };
        } catch (err) {
          return { key, approver: null };
        }
      });

      const results = await Promise.all(approverPromises);
      const approversMap: Record<string, ApproverInfo | null> = {};
      results.forEach(({ key, approver }) => {
        approversMap[key] = approver;
      });
      setApprovers(approversMap);
    };

    fetchApprovers();
  }, [visible, request]);

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
    
    if (Object.keys(editedBudget).length === 0) {
      return originalTotal;
    }
    
    let newTotal = originalTotal;
    expenseBreakdown.forEach((item: any) => {
      const itemKey = item.item?.toLowerCase() || '';
      const originalAmount = item.amount || 0;
      const editedAmount = editedBudget[itemKey] !== undefined ? (editedBudget[itemKey] ?? 0) : originalAmount;
      newTotal = newTotal - originalAmount + editedAmount;
    });
    
    return Math.max(0, newTotal); // Ensure total never goes negative
  }, [editedBudget, expenseBreakdown, request.total_budget]);

  const handleSaveBudgetChanges = async () => {
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
      // Save the edits to show strikethrough after saving
      setSavedEdits({ ...editedBudget });
      setEditingBudget(false);
      // Keep editedBudget so strikethrough shows
      // Don't clear editedBudget - we want to show the strikethrough
    }
  };

  // Fetch HR approvers when ready to approve
  const fetchHrApprovers = async () => {
    try {
      const { data: hrData, error } = await supabase
        .from('users')
        .select('id, name, email, profile_picture, phone_number, position_title, role, status')
        .eq('is_hr', true);

      if (!error && hrData && hrData.length > 0) {
        const hrs = hrData.map((a: any) => ({
          id: a.id,
          name: a.name || a.email || 'Unknown',
          email: a.email,
          position: a.position_title || 'HR',
          role: 'hr',
          roleLabel: 'HR',
        }));
        
        setHrApprovers(hrs);
        // Set first HR as suggested
        if (hrs.length > 0) {
          setSuggestedHrId(hrs[0].id);
        }
        setShowApproverSelection(true);
      } else {
        // No HR found, proceed with default (HR role)
        proceedWithApproval(null, 'hr');
      }
    } catch (error) {
      console.error('Error fetching HR approvers:', error);
      // On error, still allow proceeding with default
      proceedWithApproval(null, 'hr');
    }
  };

  const handleApprove = async () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide your signature to approve this budget.');
      return;
    }

    // Show approver selection for comptroller
    await fetchHrApprovers();
  };

  const proceedWithApproval = async (selectedApproverId: string | null, selectedRole: string) => {
    setShowApproverSelection(false);
    
    const result = await approveBudget({
      requestId: request.id,
      signature,
      comments: comments.trim() || undefined,
      editedBudget: Object.keys(editedBudget).length > 0 ? editedBudget : undefined,
      nextApproverId: selectedApproverId,
      nextApproverRole: selectedRole,
    });

    if (result.success) {
      Alert.alert('Success', 'Budget approved and forwarded successfully.');
      onClose();
    }
  };

  const handleReturnToSender = async () => {
    if (!comments.trim()) {
      Alert.alert('Comments Required', 'Please provide a reason for returning this request to the sender.');
      return;
    }

    Alert.alert(
      'Confirm Return to Sender',
      'This will return the request to the requester for revision. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return to Sender',
          style: 'destructive',
          onPress: async () => {
            const result = await returnToSender({
              requestId: request.id,
              reason: comments.trim(),
              signature: signature || undefined,
            });

            if (result.success) {
              Alert.alert('Success', 'Request returned to sender successfully.');
              onClose();
            }
          },
        },
      ]
    );
  };

  const updateBudgetItem = (category: string, amount: string) => {
    const cleaned = amount.replace(/[₱,\s]/g, '').trim();
    
    // Allow empty string (null) or valid number including 0
    if (cleaned === '') {
      setEditedBudget((prev) => ({
        ...prev,
        [category.toLowerCase()]: null,
      }));
      return;
    }
    
    const num = Number(cleaned);
    
    // Allow 0 and positive numbers, reject NaN and negative
    if (isNaN(num) || num < 0) {
      return;
    }

    setEditedBudget((prev) => ({
      ...prev,
      [category.toLowerCase()]: num,
    }));
  };

  const hasBudgetChanges = Object.keys(editedBudget).length > 0 && 
    totalBudget !== request.total_budget;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.overlayBackdrop} 
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Header with swipe handle */}
          <View style={styles.modalHeader}>
            {/* Drag handle - swipeable area */}
            <Pressable 
              style={styles.dragHandleContainer} 
              {...panResponder.panHandlers}
            >
              <View style={styles.dragHandle} />
            </Pressable>
            
            <View style={styles.headerContent}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="calculator" size={24} color="#fff" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.modalTitle}>Budget Review</Text>
                <Text style={styles.requestNumber}>{request.request_number || 'DRAFT'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.modalBody}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
            scrollEnabled={!isDrawing}
          >
            {/* PRIORITY 1: BUDGET BREAKDOWN */}
            <View style={styles.budgetSection}>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetHeaderLeft}>
                  <Ionicons name="cash" size={20} color="#fff" />
                  <View>
                    <Text style={styles.budgetTitle}>Budget Breakdown</Text>
                    <Text style={styles.budgetSubtitle}>Review and edit if necessary</Text>
                  </View>
                </View>
                {!editingBudget && !isHistory && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      // Store original values before editing
                      const original: Record<string, number> = {};
                      expenseBreakdown.forEach((item: any) => {
                        const itemKey = item.item?.toLowerCase() || '';
                        original[itemKey] = item.amount || 0;
                      });
                      setOriginalBudget(original);
                      setEditingBudget(true);
                    }}
                  >
                    <Ionicons name="create" size={16} color="#7a0019" />
                    <Text style={styles.editButtonText}>Edit Budget</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.budgetContent}>
                {expenseBreakdown.length === 0 ? (
                  <View style={styles.emptyBudget}>
                    <Ionicons name="alert-circle-outline" size={40} color="#9ca3af" />
                    <Text style={styles.emptyBudgetText}>No budget breakdown available</Text>
                  </View>
                ) : (
                  <>
                    {expenseBreakdown.map((item: any, index: number) => {
                      const itemKey = item.item?.toLowerCase() || `item-${index}`;
                      // Get original amount from stored original breakdown (before any edits)
                      const originalItem = originalExpenseBreakdown.current.find((eb: any) => 
                        (eb.item?.toLowerCase() || eb.category?.toLowerCase() || '') === itemKey
                      );
                      const originalAmount = originalItem?.amount || item.amount || 0;
                      
                      // Check if this item has been edited (either currently editing or previously saved)
                      const hasCurrentEdit = editedBudget[itemKey] !== undefined;
                      const hasSavedEdit = savedEdits[itemKey] !== undefined;
                      const hasEdit = hasCurrentEdit || hasSavedEdit;
                      
                      // Get the edited amount - prioritize current edit, then saved edit, then original
                      const currentEditedAmount = hasCurrentEdit ? (editedBudget[itemKey] ?? 0) : null;
                      const savedEditedAmount = hasSavedEdit ? savedEdits[itemKey] : null;
                      const editedAmount = currentEditedAmount !== null ? currentEditedAmount : (savedEditedAmount !== null ? savedEditedAmount : originalAmount);
                      
                      // Item is edited if it has been modified AND the value is different from original
                      const isEdited = hasEdit && editedAmount !== originalAmount;
                      const displayLabel = item.item === 'Other' && item.description 
                        ? item.description 
                        : (item.item || 'Other');
                      
                      // For display: always show edited value if edited, otherwise original
                      const displayAmount = isEdited ? editedAmount : originalAmount;

                      return (
                        <View key={index} style={styles.budgetItem}>
                          <View style={styles.budgetItemRow}>
                            <View style={styles.budgetItemLeft}>
                              <Text style={styles.budgetItemName}>{displayLabel}</Text>
                              {isEdited && !editingBudget && (
                                <Text style={styles.editedIndicator}>EDITED</Text>
                              )}
                            </View>
                            {editingBudget && !isHistory ? (
                              <View style={styles.budgetInputContainer}>
                                <CurrencyInput
                                  label=""
                                  placeholder="0.00"
                                  value={hasEdit ? (editedBudget[itemKey] !== null ? String(editedBudget[itemKey] ?? 0) : '') : String(originalAmount)}
                                  onChange={(value) => updateBudgetItem(itemKey, value)}
                                />
                              </View>
                            ) : (
                              <View style={styles.budgetAmountContainer}>
                                {isEdited ? (
                                  <View style={styles.editedAmountContainer}>
                                    <Text style={styles.originalAmount}>
                                      ₱{originalAmount.toLocaleString()}
                                    </Text>
                                    <Text style={[styles.budgetAmount, styles.budgetAmountEdited]}>
                                      ₱{displayAmount.toLocaleString()}
                                    </Text>
                                  </View>
                                ) : (
                                  <Text style={styles.budgetAmount}>
                                    ₱{displayAmount.toLocaleString()}
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}

                    {/* Total Budget */}
                    <View style={styles.totalBudget}>
                      <Text style={styles.totalLabel}>Total Budget</Text>
                      <View style={styles.totalAmountContainer}>
                        {hasBudgetChanges && (
                          <Text style={styles.originalTotal}>
                            ₱{(request.total_budget || 0).toLocaleString()}
                          </Text>
                        )}
                        <Text style={[styles.totalAmount, hasBudgetChanges && styles.totalAmountChanged]}>
                          ₱{totalBudget.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {editingBudget && !isHistory && (
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.cancelEditButton}
                          onPress={() => {
                            Alert.alert(
                              'Cancel Editing',
                              'Are you sure you want to cancel? All changes will be lost.',
                              [
                                { text: 'No', style: 'cancel' },
                                {
                                  text: 'Yes, Cancel',
                                  style: 'destructive',
                                  onPress: () => {
                                    // Restore original values
                                    setEditedBudget({});
                                    setEditingBudget(false);
                                    setOriginalBudget({});
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="close" size={18} color="#dc2626" />
                          <Text style={styles.cancelEditButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.saveButton, !hasBudgetChanges && styles.saveButtonDisabled]}
                          onPress={handleSaveBudgetChanges}
                          disabled={!hasBudgetChanges}
                        >
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>

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
                  <Text style={styles.detailValue}>{request.requester_name || 'N/A'}</Text>
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
              </View>
            </View>

            {/* PRIORITY 3: COMPTROLLER ACTIONS */}
            {!isHistory && (
              <View style={styles.actionsSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="create" size={18} color="#7a0019" />
                  <Text style={styles.sectionTitle}>Your Review</Text>
                </View>

                <View style={styles.commentsCard}>
                  <Text style={styles.inputLabel}>Comments & Notes</Text>
                  <TextInput
                    style={styles.commentsInput}
                    placeholder="Add your comments or notes about this budget review..."
                    placeholderTextColor="#9ca3af"
                    value={comments}
                    onChangeText={setComments}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.signatureCard}>
                  <View style={styles.signatureHeader}>
                    <Text style={styles.inputLabel}>Your Signature *</Text>
                    {autoSignEnabled && autoSignature && (
                      <TouchableOpacity
                        style={styles.useAutoSignButton}
                        onPress={() => {
                          if (autoSignature) {
                            setSignature(autoSignature);
                            Alert.alert('Success', 'Auto-signature applied');
                          }
                        }}
                      >
                        <Ionicons name="flash" size={16} color="#7a0019" />
                        <Text style={styles.useAutoSignText}>Use Auto-Sign</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <SignaturePad
                    onSave={(dataUrl) => setSignature(dataUrl)}
                    onClear={() => setSignature('')}
                    value={signature || null}
                    hideSaveButton
                    onDrawingStart={() => setIsDrawing(true)}
                    onDrawingEnd={() => setIsDrawing(false)}
                  />
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.returnButton, !comments.trim() && styles.actionButtonDisabled]}
                    onPress={handleReturnToSender}
                    disabled={isSubmitting || !comments.trim()}
                  >
                    <Ionicons name="arrow-back" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Return to Sender</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton, (!signature || isSubmitting) && styles.actionButtonDisabled]}
                    onPress={handleApprove}
                    disabled={!signature || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve & Forward to HR</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* PRIORITY 4: APPROVAL HISTORY (LEAST PRIORITY - AT BOTTOM) */}
            {((request.head_approved_at || request.admin_approved_at) || 
              (request.head_signature || request.admin_signature || request.requester_signature)) && (
              <View style={styles.bottomSection}>
                {/* Approval History */}
                {(request.head_approved_at || request.admin_approved_at) && (
                  <View style={styles.approvalSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="checkmark-done" size={18} color="#6b7280" />
                      <Text style={styles.sectionTitle}>Approval History</Text>
                    </View>
                    <View style={styles.approvalList}>
                      {request.requester_signature && (
                        <View style={styles.approvalItem}>
                          <View style={styles.approvalItemHeader}>
                            <View style={styles.approvalItemLeft}>
                              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                              <View style={styles.approvalItemContent}>
                                <Text style={styles.approvalRole}>Requesting Person</Text>
                                <Text style={styles.approvalName}>
                                  {request.requester_name || 'Requester'}
                                </Text>
                              </View>
                            </View>
                            {request.requester_signed_at && (
                              <Text style={styles.approvalTime}>
                                {formatDateTime(request.requester_signed_at)}
                              </Text>
                            )}
                          </View>
                          {request.requester_signature && (
                            <View style={styles.signatureInApproval}>
                              <Image 
                                source={{ uri: request.requester_signature }} 
                                style={styles.signatureInApprovalImage} 
                                resizeMode="contain"
                              />
                            </View>
                          )}
                        </View>
                      )}

                      {request.head_approved_at && (
                        <View style={styles.approvalItem}>
                          <View style={styles.approvalItemHeader}>
                            <View style={styles.approvalItemLeft}>
                              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                              <View style={styles.approvalItemContent}>
                                <Text style={styles.approvalRole}>Department Head</Text>
                                <Text style={styles.approvalName}>
                                  {approvers.head?.name || 'Department Head'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.approvalTime}>
                              {formatDateTime(request.head_approved_at)}
                            </Text>
                          </View>
                          {request.head_comments && (
                            <View style={styles.approvalComment}>
                              <Text style={styles.approvalCommentText}>{request.head_comments}</Text>
                            </View>
                          )}
                          {request.head_signature && (
                            <View style={styles.signatureInApproval}>
                              <Image 
                                source={{ uri: request.head_signature }} 
                                style={styles.signatureInApprovalImage} 
                                resizeMode="contain"
                              />
                            </View>
                          )}
                        </View>
                      )}

                      {request.admin_approved_at && (
                        <View style={styles.approvalItem}>
                          <View style={styles.approvalItemHeader}>
                            <View style={styles.approvalItemLeft}>
                              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                              <View style={styles.approvalItemContent}>
                                <Text style={styles.approvalRole}>Administrator</Text>
                                <Text style={styles.approvalName}>
                                  {approvers.admin?.name || 'Administrator'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.approvalTime}>
                              {formatDateTime(request.admin_approved_at)}
                            </Text>
                          </View>
                          {request.admin_comments && (
                            <View style={styles.approvalComment}>
                              <Text style={styles.approvalCommentText}>{request.admin_comments}</Text>
                            </View>
                          )}
                          {request.admin_signature && (
                            <View style={styles.signatureInApproval}>
                              <Image 
                                source={{ uri: request.admin_signature }} 
                                style={styles.signatureInApprovalImage} 
                                resizeMode="contain"
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                )}

              </View>
            )}

            {/* History View Status */}
            {isHistory && (
              <View style={styles.historySection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text" size={18} color="#7a0019" />
                  <Text style={styles.sectionTitle}>Comptroller Review</Text>
                </View>
                {request.comptroller_comments && (
                  <View style={styles.historyComment}>
                    <Text style={styles.historyCommentText}>{request.comptroller_comments}</Text>
                  </View>
                )}
                {request.comptroller_edited_budget && request.comptroller_edited_budget !== request.total_budget && (
                  <View style={styles.budgetChange}>
                    <Text style={styles.budgetChangeLabel}>Budget Adjusted:</Text>
                    <Text style={styles.budgetChangeValue}>
                      ₱{(request.total_budget || 0).toLocaleString()} → ₱{request.comptroller_edited_budget.toLocaleString()}
                    </Text>
                  </View>
                )}
                <View style={styles.statusBadge}>
                  <Ionicons 
                    name={request.comptroller_approved_at ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={request.comptroller_approved_at ? "#16a34a" : "#dc2626"} 
                  />
                  <Text style={[styles.statusBadgeText, request.comptroller_approved_at && styles.statusBadgeApproved]}>
                    {request.comptroller_approved_at ? 'Approved' : 'Returned to Sender'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Approver Selection Modal for Comptroller */}
        <ApproverSelectionModal
          visible={showApproverSelection}
          onClose={() => setShowApproverSelection(false)}
          onSelect={(approverId, approverRole) => {
            proceedWithApproval(approverId, approverRole);
          }}
          title="Select Next Approver"
          description={`Request ${request.request_number || request.id} - Choose where to send this request after approval`}
          role="hr"
          departmentId={request.department_id}
          requestId={request.id}
          suggestedApproverId={suggestedHrId}
        />
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
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.9,
    maxHeight: screenHeight * 0.9,
    width: '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#7a0019',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  dragHandleContainer: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  requestNumber: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 400,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  // Budget Section
  budgetSection: {
    marginBottom: 20,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7a0019',
    overflow: 'hidden',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#7a0019',
  },
  budgetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  budgetSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
  budgetContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  emptyBudget: {
    padding: 32,
    alignItems: 'center',
  },
  emptyBudgetText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  budgetItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  budgetItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetItemLeft: {
    flex: 1,
    marginRight: 16,
  },
  budgetItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  editedIndicator: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    marginTop: 4,
  },
  budgetInputContainer: {
    width: 140,
  },
  budgetAmountContainer: {
    alignItems: 'flex-end',
  },
  editedAmountContainer: {
    alignItems: 'flex-end',
  },
  originalAmount: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'line-through',
    textDecorationColor: '#ef4444',
    marginBottom: 2,
    fontWeight: '500',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  budgetAmountEdited: {
    color: '#f59e0b',
    fontWeight: '800',
  },
  totalBudget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalAmountContainer: {
    alignItems: 'flex-end',
  },
  originalTotal: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7a0019',
  },
  totalAmountChanged: {
    color: '#f59e0b',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 10,
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Details Section
  detailsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailItemFull: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailValueFull: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 8,
  },

  // Approval Section
  approvalSection: {
    marginBottom: 20,
  },
  approvalList: {
    gap: 12,
  },
  approvalItem: {
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  approvalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  approvalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  approvalItemContent: {
    flex: 1,
  },
  approvalRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  approvalName: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  approvalTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  approvalComment: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7a0019',
  },
  approvalCommentText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },

  // Actions Section
  actionsSection: {
    marginBottom: 20,
  },
  commentsCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    backgroundColor: '#f9fafb',
  },
  signatureCard: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    borderRadius: 10,
  },
  returnButton: {
    backgroundColor: '#dc2626',
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Signatures Section
  signaturesSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signaturesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  signaturesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  signaturesList: {
    gap: 12,
  },
  signatureItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signatureItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  signatureItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  signatureImage: {
    width: '100%',
    height: 70,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    marginBottom: 6,
  },
  signatureItemDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  
  // Signature in approval section (combined)
  signatureInApproval: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signatureInApprovalImage: {
    width: '100%',
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },

  // History Section
  historySection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyComment: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7a0019',
    marginBottom: 12,
  },
  historyCommentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  budgetChange: {
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 12,
  },
  budgetChangeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  budgetChangeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  statusBadgeApproved: {
    color: '#16a34a',
  },
  
  // Cancel button in header
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  
  // Edit actions (cancel + save)
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dc2626',
    minHeight: 48,
  },
  cancelEditButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  
  // Signature header with auto-sign
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  useAutoSignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  useAutoSignText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a0019',
  },
  
  // Bottom section (approval history + signatures)
  bottomSection: {
    marginTop: 20,
    marginBottom: 20,
    gap: 16,
  },
});
