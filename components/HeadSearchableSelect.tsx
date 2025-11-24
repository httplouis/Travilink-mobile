import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Head {
  id: string;
  name: string;
  email: string;
  department_name?: string;
}

interface HeadSearchableSelectProps {
  value: string; // Head name
  onChange: (headName: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  departmentId?: string | null; // Optional: filter by department
}

export default function HeadSearchableSelect({
  value,
  onChange,
  placeholder = 'Type to search department head...',
  label = 'Endorsed by',
  required = false,
  error,
  disabled = false,
  departmentId,
}: HeadSearchableSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  // Fetch heads when dropdown is open
  const { data: heads = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['heads', internalSearchQuery, departmentId],
    queryFn: async (): Promise<Head[]> => {
      let query = supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          department_id,
          departments:department_id(name)
        `)
        .or('is_head.eq.true,role.eq.head')
        .eq('status', 'active')
        .order('name', { ascending: true });

      // Filter by department if provided
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      // Filter by search query if provided
      if (internalSearchQuery.trim()) {
        query = query.or(`name.ilike.%${internalSearchQuery}%,email.ilike.%${internalSearchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[HeadSearchableSelect] Error fetching heads:', error);
        return [];
      }

      return (data || []).map((head: any) => ({
        id: head.id,
        name: head.name,
        email: head.email,
        department_name: head.departments?.name || 'N/A',
      }));
    },
    enabled: isDropdownOpen,
    staleTime: 0,
  });

  // Force fetch when modal opens
  React.useEffect(() => {
    if (isDropdownOpen) {
      setInternalSearchQuery('');
      const timeoutId = setTimeout(() => {
        refetch();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      setInternalSearchQuery('');
    }
  }, [isDropdownOpen, refetch]);

  const filteredHeads = useMemo(() => {
    if (!isDropdownOpen) return [];
    return heads;
  }, [heads, isDropdownOpen]);

  const handleSelect = (headName: string) => {
    onChange(headName);
    setInternalSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleFocus = () => {
    setIsDropdownOpen(true);
    setInternalSearchQuery('');
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsDropdownOpen(false);
      setInternalSearchQuery('');
    }, 200);
  };

  const displayValue = isDropdownOpen ? internalSearchQuery : value;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <View style={[styles.inputContainer, error && styles.inputContainerError, disabled && styles.inputContainerDisabled]}>
        <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={displayValue}
          onChangeText={(text) => {
            setSearchQuery(text);
            setInternalSearchQuery(text);
            setIsDropdownOpen(true);
            if (!text.trim()) {
              onChange('');
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          numberOfLines={1}
          ellipsizeMode="tail"
        />
        {value && !isDropdownOpen && (
          <TouchableOpacity
            onPress={() => {
              onChange('');
              setSearchQuery('');
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => {
            setIsDropdownOpen(!isDropdownOpen);
            if (!isDropdownOpen) {
              setSearchQuery(value || '');
            }
          }}
          style={styles.dropdownButton}
        >
          <Ionicons
            name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      {/* Modal Picker */}
      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsDropdownOpen(false)}
        >
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Department Head</Text>
              <TouchableOpacity
                onPress={() => setIsDropdownOpen(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.modalSearchContainer}>
              <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by name or email..."
                placeholderTextColor="#9ca3af"
                value={internalSearchQuery}
                onChangeText={(text) => {
                  setInternalSearchQuery(text);
                }}
                autoCapitalize="none"
                autoFocus={false}
              />
              {internalSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => {
                  setInternalSearchQuery('');
                  setTimeout(() => refetch(), 50);
                }} style={styles.modalClearButton}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Heads List */}
            {isLoading || isFetching ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#7a0019" />
                <Text style={styles.modalLoadingText}>Loading heads...</Text>
              </View>
            ) : filteredHeads.length === 0 && !isLoading && !isFetching ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="person-outline" size={48} color="#9ca3af" />
                <Text style={styles.modalEmptyText}>
                  {internalSearchQuery ? 'No heads found' : 'No department heads available'}
                </Text>
                <Text style={styles.modalEmptySubtext}>
                  {internalSearchQuery ? 'Try a different search term' : 'Please check your connection'}
                </Text>
              </View>
            ) : filteredHeads.length > 0 ? (
              <>
                <View style={styles.modalListHeader}>
                  <Text style={styles.modalListHeaderText}>
                    {filteredHeads.length} {filteredHeads.length === 1 ? 'head' : 'heads'} found
                  </Text>
                </View>
                <FlatList
                  data={filteredHeads}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.modalList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalOption,
                        value === item.name && styles.modalOptionSelected,
                      ]}
                      onPress={() => handleSelect(item.name)}
                    >
                      <View style={styles.optionContent}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {item.name
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase() || 'H'}
                          </Text>
                        </View>
                        <View style={styles.optionInfo}>
                          <View style={styles.optionHeader}>
                            <Text style={styles.optionName}>{item.name}</Text>
                            {value === item.name && (
                              <Ionicons name="checkmark-circle" size={20} color="#7a0019" />
                            )}
                          </View>
                          {item.email && (
                            <Text style={styles.optionEmail}>{item.email}</Text>
                          )}
                          {item.department_name && (
                            <Text style={styles.optionDepartment}>{item.department_name}</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    zIndex: 1000,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 20,
  },
  required: {
    color: '#dc2626',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainerError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  inputContainerDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    paddingVertical: 0,
    minHeight: 44,
  },
  clearButton: {
    padding: 8,
    marginLeft: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownButton: {
    padding: 8,
    marginLeft: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
  },
  modalSearchIcon: {
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  modalClearButton: {
    padding: 4,
    marginLeft: 4,
  },
  modalListHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalListHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalLoadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalEmptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalList: {
    flex: 1,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionSelected: {
    backgroundColor: '#fef2f2',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  optionEmail: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  optionDepartment: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  errorContainer: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    lineHeight: 18,
  },
});

