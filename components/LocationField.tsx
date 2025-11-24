import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapPicker, { PickedPlace } from './MapPicker';

interface LocationFieldProps {
  value: string;
  onChange: ({ address, geo }: { address: string; geo?: { lat: number; lng: number } | null }) => void;
  geo?: { lat: number; lng: number } | null;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  inputId?: string;
}

export default function LocationField({
  value,
  onChange,
  geo,
  label = 'Location',
  placeholder = 'Type address or pick on map…',
  required = false,
  error,
  disabled = false,
  inputId,
}: LocationFieldProps) {
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const handleChange = (text: string) => {
    onChange({ address: text, geo: geo || null });
  };

  const handleMapPick = (place: PickedPlace) => {
    onChange({
      address: place.address,
      geo: { lat: place.lat, lng: place.lng },
    });
    setIsMapPickerOpen(false);
  };

  const initialPlace: PickedPlace | null = geo
    ? { lat: geo.lat, lng: geo.lng, address: value }
    : null;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        <Ionicons name="location-outline" size={20} color="#6b7280" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={handleChange}
          editable={!disabled}
          multiline
          numberOfLines={2}
        />
        {!disabled && (
          <TouchableOpacity
            onPress={() => setIsMapPickerOpen(true)}
            style={styles.mapButton}
          >
            <Ionicons name={Platform.OS === 'web' ? 'search-outline' : 'map-outline'} size={18} color="#7a0019" />
          </TouchableOpacity>
        )}
      </View>
      {geo?.lat != null && geo?.lng != null && (
        <Text style={styles.geoText}>
          Selected: {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
        </Text>
      )}
      
      {/* Map Picker Modal - Only render when open to prevent infinite loops */}
      {isMapPickerOpen && (
        <MapPicker
          open={isMapPickerOpen}
          onClose={() => setIsMapPickerOpen(false)}
          onPick={handleMapPick}
          initial={initialPlace}
        />
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
    alignItems: 'flex-start',
    minHeight: 44,
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
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    paddingVertical: 0,
    paddingRight: 8,
    textAlignVertical: 'top',
    minHeight: 40,
  },
  mapButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  geoText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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

