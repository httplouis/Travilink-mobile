import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDepartments } from '@/hooks/useDepartments';

interface DepartmentSelectProps {
  value: string; // Department name (formatted as "Name (CODE)")
  onChange: (departmentName: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export default function DepartmentSelect({
  value,
  onChange,
  placeholder = 'Select department...',
  label = 'Department',
  required = false,
  error,
  disabled = false,
}: DepartmentSelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch departments
  const { data: departments = [], isLoading } = useDepartments();

  // Format department display name
  const formatDepartment = (dept: { name: string; code?: string }) => {
    if (dept.code) {
      return `${dept.name} (${dept.code})`;
    }
    return dept.name;
  };

  // Filter departments based on search query
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;

    const query = searchQuery.toLowerCase();
    return departments.filter((dept) => {
      const nameMatch = dept.name?.toLowerCase().includes(query);
      const codeMatch = dept.code?.toLowerCase().includes(query);
      return nameMatch || codeMatch;
    });
  }, [departments, searchQuery]);

  const handleSelect = (department: { name: string; code?: string }) => {
    const formatted = formatDepartment(department);
    onChange(formatted);
    setIsModalOpen(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
        onPress={() => !disabled && setIsModalOpen(true)}
        disabled={disabled}
      >
        <Text
          style={[styles.input, !value && styles.inputPlaceholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6b7280" />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Modal Picker */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search departments..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Departments List */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7a0019" />
                <Text style={styles.loadingText}>Loading departments...</Text>
              </View>
            ) : filteredDepartments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No departments found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredDepartments}
                keyExtractor={(item) => item.id}
                style={styles.list}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                removeClippedSubviews={false}
                renderItem={({ item }) => {
                  const formatted = formatDepartment(item);
                  const isSelected = value === formatted;
                  return (
                    <TouchableOpacity
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => handleSelect(item)}
                    >
                      <View style={styles.optionContent}>
                        <View style={styles.optionInfo}>
                          <Text style={styles.optionName}>{item.name}</Text>
                          {item.code && (
                            <Text style={styles.optionCode}>{item.code}</Text>
                          )}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="#7a0019" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
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
    justifyContent: 'space-between',
    minHeight: 52, // Accessibility: minimum touch target
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
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginRight: 8,
  },
  inputPlaceholder: {
    color: '#9ca3af',
  },
  errorContainer: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
  searchContainer: {
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  list: {
    flex: 1,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionSelected: {
    backgroundColor: '#fef2f2',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionInfo: {
    flex: 1,
    gap: 4,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  optionCode: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
});

