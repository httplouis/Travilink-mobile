import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '@/hooks/useVehicles';
import { Driver } from '@/hooks/useDrivers';

interface VehicleDriverSelectionProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  selectedVehicleId: string | null;
  selectedDriverId: string | null;
  onVehicleSelect: (vehicleId: string | null) => void;
  onDriverSelect: (driverId: string | null) => void;
  loading?: boolean;
}

export default function VehicleDriverSelection({
  vehicles,
  drivers,
  selectedVehicleId,
  selectedDriverId,
  onVehicleSelect,
  onDriverSelect,
  loading = false,
}: VehicleDriverSelectionProps) {
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>School Service Request</Text>
        <Text style={styles.subtitle}>
          Suggest your preferred driver and vehicle (optional). The admin will make the final assignment.
        </Text>
      </View>

      {/* Driver Selection */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Preferred Driver (Suggestion)</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowDriverModal(true)}
          disabled={loading}
        >
          <Text style={[styles.selectText, !selectedDriver && styles.selectPlaceholder]}>
            {selectedDriver ? selectedDriver.user?.name || 'Unknown' : 'Select a driver (optional)'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
        {selectedDriver && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onDriverSelect(null)}
          >
            <Ionicons name="close-circle" size={16} color="#dc2626" />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Vehicle Selection */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Preferred Vehicle (Suggestion)</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowVehicleModal(true)}
          disabled={loading}
        >
          <Text style={[styles.selectText, !selectedVehicle && styles.selectPlaceholder]}>
            {selectedVehicle
              ? `${selectedVehicle.vehicle_name} • ${selectedVehicle.plate_number}`
              : 'Select a vehicle (optional)'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
        {selectedVehicle && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onVehicleSelect(null)}
          >
            <Ionicons name="close-circle" size={16} color="#dc2626" />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Driver Selection Modal */}
      <Modal
        visible={showDriverModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDriverModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Driver</Text>
              <TouchableOpacity onPress={() => setShowDriverModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7a0019" />
                <Text style={styles.loadingText}>Loading drivers...</Text>
              </View>
            ) : drivers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="person-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No drivers available</Text>
              </View>
            ) : (
              <FlatList
                data={drivers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedDriverId === item.id && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      onDriverSelect(item.id);
                      setShowDriverModal(false);
                    }}
                  >
                    <View style={styles.modalItemContent}>
                      <View style={styles.modalItemAvatar}>
                        <Text style={styles.modalItemAvatarText}>
                          {item.user?.name?.charAt(0).toUpperCase() || 'D'}
                        </Text>
                      </View>
                      <View style={styles.modalItemText}>
                        <Text style={styles.modalItemName}>{item.user?.name || 'Unknown Driver'}</Text>
                        {item.user?.position_title && (
                          <Text style={styles.modalItemSubtitle}>{item.user.position_title}</Text>
                        )}
                        {item.license_number && (
                          <Text style={styles.modalItemSubtitle}>License: {item.license_number}</Text>
                        )}
                      </View>
                    </View>
                    {selectedDriverId === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#7a0019" />
                    )}
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      onDriverSelect(null);
                      setShowDriverModal(false);
                    }}
                  >
                    <Text style={styles.modalItemClear}>Clear Selection</Text>
                  </TouchableOpacity>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Vehicle Selection Modal */}
      <Modal
        visible={showVehicleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7a0019" />
                <Text style={styles.loadingText}>Loading vehicles...</Text>
              </View>
            ) : vehicles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No vehicles available</Text>
              </View>
            ) : (
              <FlatList
                data={vehicles}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedVehicleId === item.id && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      onVehicleSelect(item.id);
                      setShowVehicleModal(false);
                    }}
                  >
                    <View style={styles.modalItemContent}>
                      <View style={styles.modalItemIcon}>
                        <Ionicons name="car" size={24} color="#7a0019" />
                      </View>
                      <View style={styles.modalItemText}>
                        <Text style={styles.modalItemName}>{item.vehicle_name}</Text>
                        <Text style={styles.modalItemSubtitle}>Plate: {item.plate_number}</Text>
                        <Text style={styles.modalItemSubtitle}>
                          {item.capacity} seats • {item.vehicle_type}
                        </Text>
                      </View>
                    </View>
                    {selectedVehicleId === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#7a0019" />
                    )}
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      onVehicleSelect(null);
                      setShowVehicleModal(false);
                    }}
                  >
                    <Text style={styles.modalItemClear}>Clear Selection</Text>
                  </TouchableOpacity>
                }
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
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  selectPlaceholder: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemSelected: {
    backgroundColor: '#fef2f2',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  modalItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7a0019',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemText: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  modalItemClear: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

