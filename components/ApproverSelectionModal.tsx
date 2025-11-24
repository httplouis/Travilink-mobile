import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Approver {
  id: string;
  name: string;
  email?: string;
  position?: string;
  department?: string;
  role: string;
  roleLabel: string;
}

interface ApproverSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (approverId: string | null, approverRole: string, returnReason?: string) => void;
  title: string;
  description?: string;
  role: 'admin' | 'hr' | string; // Role to fetch approvers for
  departmentId?: string | null;
  requestId?: string;
  allowReturnToRequester?: boolean;
  requesterId?: string;
  requesterName?: string;
  suggestedApproverId?: string | null; // ID of suggested/default approver
}

export default function ApproverSelectionModal({
  visible,
  onClose,
  onSelect,
  title,
  description,
  role,
  departmentId,
  requestId,
  allowReturnToRequester = false,
  requesterId,
  requesterName,
  suggestedApproverId,
}: ApproverSelectionModalProps) {
  const { profile } = useAuth();
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(suggestedApproverId || null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    if (visible && role) {
      fetchApprovers();
      // Reset selection to suggested on open
      if (suggestedApproverId) {
        setSelectedId(suggestedApproverId);
      }
    }
  }, [visible, role, departmentId]);

  const fetchApprovers = async () => {
    setLoading(true);
    try {
      let approversList: Approver[] = [];

      if (role === 'admin') {
        // Fetch admins
        const { data: adminData, error: adminError } = await supabase
          .from('users')
          .select('id, name, email, profile_picture, phone_number, position_title, role, status')
          .eq('role', 'admin');

        if (!adminError && adminData) {
          approversList = adminData.map((a: any) => ({
            id: a.id,
            name: a.name || a.email || 'Unknown',
            email: a.email,
            position: a.position_title || 'Administrator',
            role: 'admin',
            roleLabel: 'Administrator',
          }));
        }
      } else if (role === 'hr') {
        // Fetch HR approvers
        const { data: hrData, error: hrError } = await supabase
          .from('users')
          .select('id, name, email, profile_picture, phone_number, position_title, role, status')
          .eq('is_hr', true);

        if (!hrError && hrData) {
          approversList = hrData.map((a: any) => ({
            id: a.id,
            name: a.name || a.email || 'Unknown',
            email: a.email,
            position: a.position_title || 'HR',
            role: 'hr',
            roleLabel: 'HR',
          }));
        }
      }

      // Sort approvers by name
      approversList.sort((a, b) => a.name.localeCompare(b.name));
      setApprovers(approversList);

      // Auto-select suggested approver if provided and exists
      if (suggestedApproverId && approversList.find(a => a.id === suggestedApproverId)) {
        setSelectedId(suggestedApproverId);
      } else if (approversList.length > 0) {
        // Auto-select first approver as default if no suggested
        setSelectedId(approversList[0].id);
      }
    } catch (error) {
      console.error('Error fetching approvers:', error);
      Alert.alert('Error', 'Failed to load approvers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredApprovers = approvers.filter((approver) => {
    const query = searchQuery.toLowerCase();
    return (
      approver.name.toLowerCase().includes(query) ||
      approver.email?.toLowerCase().includes(query) ||
      approver.position?.toLowerCase().includes(query)
    );
  });

  const handleSelect = () => {
    if (isReturning && requesterId) {
      if (!returnReason.trim()) {
        Alert.alert('Reason Required', 'Please provide a reason for returning to requester.');
        return;
      }
      onSelect(requesterId, 'requester', returnReason.trim());
    } else if (selectedId) {
      const selected = approvers.find((a) => a.id === selectedId);
      if (selected) {
        onSelect(selectedId, selected.role);
      }
    }
  };

  const canSubmit = isReturning ? (requesterId && returnReason.trim()) : selectedId !== null;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="person-add" size={24} color="#7a0019" />
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {description && (
            <Text style={styles.description}>{description}</Text>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7a0019" />
                <Text style={styles.loadingText}>Loading approvers...</Text>
              </View>
            ) : (
              <>
                {/* Search Bar */}
                {approvers.length > 0 && (
                  <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#6b7280" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search approvers..."
                      placeholderTextColor="#9ca3af"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Approvers List */}
                {filteredApprovers.length > 0 ? (
                  <View style={styles.approversList}>
                    {filteredApprovers.map((approver) => {
                      const isSelected = selectedId === approver.id;
                      const isSuggested = suggestedApproverId === approver.id;
                      
                      return (
                        <TouchableOpacity
                          key={approver.id}
                          style={[
                            styles.approverCard,
                            isSelected && styles.approverCardSelected,
                            isSuggested && styles.approverCardSuggested,
                          ]}
                          onPress={() => {
                            setSelectedId(approver.id);
                            setIsReturning(false);
                          }}
                        >
                          <View style={styles.approverLeft}>
                            <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                              {isSelected && (
                                <View style={styles.radioButtonInner} />
                              )}
                            </View>
                            <View style={styles.approverInfo}>
                              <Text style={styles.approverName}>{approver.name}</Text>
                              <Text style={styles.approverDetails}>
                                {approver.position}
                                {isSuggested && (
                                  <Text style={styles.suggestedBadge}> • Suggested</Text>
                                )}
                              </Text>
                              {approver.email && (
                                <Text style={styles.approverEmail}>{approver.email}</Text>
                              )}
                            </View>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={24} color="#7a0019" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="person-outline" size={48} color="#9ca3af" />
                    <Text style={styles.emptyText}>No approvers available</Text>
                  </View>
                )}

                {/* Return to Requester Option */}
                {allowReturnToRequester && requesterId && (
                  <>
                    <View style={styles.divider} />
                    <TouchableOpacity
                      style={[
                        styles.returnCard,
                        isReturning && styles.returnCardSelected,
                      ]}
                      onPress={() => {
                        setIsReturning(true);
                        setSelectedId(null);
                      }}
                    >
                      <View style={styles.approverLeft}>
                        <View style={[styles.radioButton, isReturning && styles.radioButtonSelected]}>
                          {isReturning && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                        <View style={styles.approverInfo}>
                          <Text style={styles.returnLabel}>Return to Requester</Text>
                          <Text style={styles.returnDetails}>
                            {requesterName || 'Requester'} can revise and resubmit
                          </Text>
                        </View>
                      </View>
                      {isReturning && (
                        <Ionicons name="arrow-undo" size={24} color="#f59e0b" />
                      )}
                    </TouchableOpacity>

                    {isReturning && (
                      <View style={styles.returnReasonContainer}>
                        <Text style={styles.returnReasonLabel}>Reason for Return *</Text>
                        <TextInput
                          style={styles.returnReasonInput}
                          placeholder="Enter reason for returning..."
                          placeholderTextColor="#9ca3af"
                          value={returnReason}
                          onChangeText={setReturnReason}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !canSubmit && styles.confirmButtonDisabled]}
              onPress={handleSelect}
              disabled={!canSubmit}
            >
              <Text style={styles.confirmButtonText}>
                {isReturning ? 'Return to Requester' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  content: {
    maxHeight: 500,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  approversList: {
    gap: 12,
  },
  approverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  approverCardSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#7a0019',
  },
  approverCardSuggested: {
    backgroundColor: '#fef3c7',
  },
  approverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#7a0019',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7a0019',
  },
  approverInfo: {
    flex: 1,
  },
  approverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  approverDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  approverEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  suggestedBadge: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  returnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  returnCardSelected: {
    borderColor: '#f59e0b',
  },
  returnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  returnDetails: {
    fontSize: 14,
    color: '#92400e',
  },
  returnReasonContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  returnReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  returnReasonInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    backgroundColor: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7a0019',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

