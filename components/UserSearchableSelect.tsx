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
  // Pass empty string to get all users, or search query to filter
  const { data: users = [], isLoading } = useUsers(
    isDropdownOpen ? (searchQuery.trim() || '') : undefined
  );

  // Filtered users - web version does server-side filtering via API
  // We already filter server-side, but can do client-side refinement too
  const filteredUsers = useMemo(() => {
    if (!isDropdownOpen) return [];
    
    // Server already filtered if searchQuery provided, otherwise returns all
    return users;
  }, [users, isDropdownOpen]);

  const handleSelect = (userName: string) => {
    onChange(userName);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setHasFocus(false);
  };

  const handleFocus = () => {
    setHasFocus(true);
    setIsDropdownOpen(true);
    // Clear search to show all users initially (match web behavior)
    if (!searchQuery) {
      setSearchQuery('');
    }
  };

  const handleBlur = () => {
    // Delay to allow tap on option
    setTimeout(() => {
      setHasFocus(false);
      setIsDropdownOpen(false);
      setSearchQuery(value || '');
    }, 200);
  };

  const displayValue = isDropdownOpen ? searchQuery : value;

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

      {/* Dropdown */}
      {isDropdownOpen && (
        <View style={styles.dropdown}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7a0019" />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              removeClippedSubviews={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    value === item.name && styles.optionSelected,
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
          )}
        </View>
      )}

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
    maxHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
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
});

