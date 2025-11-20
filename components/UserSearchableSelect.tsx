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
import { useUsers } from '@/hooks/useUsers';

interface UserSearchableSelectProps {
  value: string; // User name
  onChange: (userName: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export default function UserSearchableSelect({
  value,
  onChange,
  placeholder = 'Type to search user (e.g., name, email)...',
  label = 'Requesting person',
  required = false,
  error,
  disabled = false,
}: UserSearchableSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  // Fetch users when dropdown is open - match web API behavior
  // IMPORTANT: When modal opens, we want ALL users (empty string = all users)
  // When user types, we filter by search query
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  
  // Use empty string when modal opens to get ALL users, otherwise use search query
  // Always pass empty string when modal is open and no search query, to fetch ALL users
  const searchParam = isDropdownOpen 
    ? (internalSearchQuery.trim() || '') 
    : '';
  const { data: users = [], isLoading, refetch, isFetching } = useUsers(searchParam);
  
  // Force fetch ALL users when modal opens (empty search = all users)
  React.useEffect(() => {
    if (isDropdownOpen) {
      console.log('[UserSearchableSelect] 🚀 Modal opened, clearing search and fetching ALL users...');
      // Clear search to show all users
      setInternalSearchQuery('');
      // Force immediate refetch with empty query to get ALL users
      // Use a longer timeout to ensure the query key updates
      const timeoutId = setTimeout(() => {
        console.log('[UserSearchableSelect] 🔄 Forcing refetch of ALL users...');
        refetch();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      // Reset search when modal closes
      setInternalSearchQuery('');
    }
  }, [isDropdownOpen, refetch]);
  
  // Log when users are received
  React.useEffect(() => {
    if (isDropdownOpen) {
      console.log('[UserSearchableSelect] Users state:', {
        usersCount: users.length,
        isLoading,
        isFetching,
        searchParam: searchParam || '(all users)',
      });
    }
  }, [users, isDropdownOpen, isLoading, isFetching, searchParam]);

  // Filtered users - web version does server-side filtering via API
  // We already filter server-side, but can do client-side refinement too
  const filteredUsers = useMemo(() => {
    if (!isDropdownOpen) return [];
    
    // Server already filtered if searchQuery provided, otherwise returns all
    return users;
  }, [users, isDropdownOpen]);

  const handleSelect = (userName: string) => {
    console.log('[UserSearchableSelect] ✅ User selected:', userName);
    onChange(userName);
    setInternalSearchQuery('');
    setIsDropdownOpen(false);
    setHasFocus(false);
  };

  const handleFocus = () => {
    console.log('[UserSearchableSelect] 🎯 Input focused, opening modal...');
    setHasFocus(true);
    setIsDropdownOpen(true);
    // Clear search to show all users initially (match web behavior)
    setInternalSearchQuery(''); // Always clear to show all users
  };

  const handleBlur = () => {
    // Delay to allow tap on option
    setTimeout(() => {
      setHasFocus(false);
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
      <View style={styles.inputContainer}>
        <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={displayValue}
          onChangeText={(text) => {
            setSearchQuery(text);
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

      {/* Modal Picker - Use Modal to avoid VirtualizedList nesting error */}
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
              <Text style={styles.modalTitle}>Select User</Text>
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
                placeholder="Search by name or email... (leave empty to see all users)"
                placeholderTextColor="#9ca3af"
                value={internalSearchQuery}
                onChangeText={(text) => {
                  console.log('[UserSearchableSelect] 🔍 Search text changed:', text);
                  setInternalSearchQuery(text);
                }}
                autoCapitalize="none"
                autoFocus={false}
              />
              {internalSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => {
                  console.log('[UserSearchableSelect] 🧹 Clearing search, fetching all users...');
                  setInternalSearchQuery('');
                  setTimeout(() => refetch(), 50); // Refetch all users when cleared
                }} style={styles.modalClearButton}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Info text */}
            {!internalSearchQuery && (
              <View style={styles.modalInfoContainer}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={styles.modalInfoText}>
                  Showing all users. Type to search for a specific user.
                </Text>
              </View>
            )}

            {/* Users List */}
            {isLoading || isFetching ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#7a0019" />
                <Text style={styles.modalLoadingText}>Loading users...</Text>
              </View>
            ) : filteredUsers.length === 0 && !isLoading && !isFetching ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text style={styles.modalEmptyText}>
                  {internalSearchQuery ? 'No users found' : 'No users available'}
                </Text>
                <Text style={styles.modalEmptySubtext}>
                  {internalSearchQuery ? 'Try a different search term' : 'Please check your connection'}
                </Text>
              </View>
            ) : filteredUsers.length > 0 ? (
              <>
                <View style={styles.modalListHeader}>
                  <Text style={styles.modalListHeaderText}>
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                    {internalSearchQuery ? ` (filtered by "${internalSearchQuery}")` : ' (all users)'}
                  </Text>
                </View>
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.modalList}
                  ListEmptyComponent={
                    !isLoading && !isFetching && filteredUsers.length === 0 ? (
                      <View style={styles.modalEmptyContainer}>
                        <Ionicons name="people-outline" size={48} color="#9ca3af" />
                        <Text style={styles.modalEmptyText}>
                          {internalSearchQuery ? 'No users found' : 'No users available'}
                        </Text>
                        <Text style={styles.modalEmptySubtext}>
                          {internalSearchQuery ? 'Try a different search term' : 'Please check your connection'}
                        </Text>
                      </View>
                    ) : null
                  }
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
                              .toUpperCase() || 'U'}
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
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  required: {
    color: '#dc2626',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
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
    padding: 4,
    marginLeft: 4,
  },
  dropdownButton: {
    padding: 4,
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    maxHeight: 400, // Increased for better UX
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 1001,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  list: {
    maxHeight: 300,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionSelected: {
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
    fontSize: 12,
    color: '#6b7280',
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
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
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
  modalInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  modalInfoText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
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
});

