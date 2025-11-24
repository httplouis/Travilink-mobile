import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';

interface VehicleDriverSelectionProps {
  visible: boolean;
  onClose: () => void;
  type: 'vehicle' | 'driver';
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function VehicleDriverSelection({
  visible,
  onClose,
  type,
  selectedId,
  onSelect,
}: VehicleDriverSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { vehicles, isLoading: vehiclesLoading } = useVehicles({ available: true });
  const { data: drivers, isLoading: driversLoading } = useDrivers({ status: 'active' });

  const isLoading = type === 'vehicle' ? vehiclesLoading : driversLoading;
  const items = type === 'vehicle' 
    ? vehicles.filter(v => 
        !searchQuery.trim() || 
        v.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.plate_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (drivers || []).filter(d =>
        !searchQuery.trim() ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSelect = (id: string | null) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Select {type === 'vehicle' ? 'Preferred Vehicle' : 'Preferred Driver'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Choose a {type === 'vehicle' ? 'vehicle' : 'driver'}
          </Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${type === 'vehicle' ? 'vehicles' : 'drivers'}...`}
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

          {/* List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7a0019" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={type === 'vehicle' ? 'car-outline' : 'person-outline'} 
                size={48} 
                color="#9ca3af" 
              />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No results found' : `No ${type === 'vehicle' ? 'vehicles' : 'drivers'} available`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.item,
                    selectedId === item.id && styles.itemSelected,
                  ]}
                  onPress={() => handleSelect(item.id)}
                >
                  <View style={styles.itemContent}>
                    <View style={styles.itemIcon}>
                      <Ionicons
                        name={type === 'vehicle' ? 'car-outline' : 'person-outline'}
                        size={24}
                        color={selectedId === item.id ? '#7a0019' : '#6b7280'}
                      />
                    </View>
                    <View style={styles.itemInfo}>
                      {type === 'vehicle' ? (
                        <>
                          <Text style={styles.itemName}>
                            {(item as any).vehicle_name}
                          </Text>
                          <Text style={styles.itemDetail}>
                            {(item as any).plate_number} • {(item as any).type || 'N/A'}
                          </Text>
                          {(item as any).capacity && (
                            <Text style={styles.itemSubDetail}>
                              {(item as any).capacity} seats
                            </Text>
                          )}
                        </>
                      ) : (
                        <>
                          <Text style={styles.itemName}>
                            {item.name}
                          </Text>
                          {item.email && (
                            <Text style={styles.itemDetail}>
                              {item.email}
                            </Text>
                          )}
                          {(item as any).license_no && (
                            <Text style={styles.itemSubDetail}>
                              License: {(item as any).license_no}
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                    {selectedId === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#7a0019" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          )}

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
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
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  list: {
    flex: 1,
    maxHeight: 400,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemSelected: {
    backgroundColor: '#fef2f2',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemSubDetail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cancelButton: {
    margin: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7a0019',
  },
});
