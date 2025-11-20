import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type PickupPreference = 'pickup' | 'self' | 'gymnasium' | null;

interface PickupPreferenceSelectorProps {
  value: PickupPreference;
  onChange: (value: PickupPreference) => void;
  error?: string;
  disabled?: boolean;
}

const OPTIONS: Array<{
  value: PickupPreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = [
  {
    value: 'pickup',
    label: 'Pickup at Location',
    icon: 'location',
    description: 'Vehicle will pick you up at specified location',
  },
  {
    value: 'self',
    label: 'Self-Transport',
    icon: 'car',
    description: 'You will provide your own transportation',
  },
  {
    value: 'gymnasium',
    label: 'Gymnasium Pickup',
    icon: 'business',
    description: 'Pickup at the gymnasium',
  },
];

export default function PickupPreferenceSelector({
  value,
  onChange,
  error,
  disabled = false,
}: PickupPreferenceSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Pickup Preference <Text style={styles.optional}>(Optional)</Text>
      </Text>
      <Text style={styles.helperText}>
        Select how you prefer to be picked up for this trip
      </Text>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              onPress={() => !disabled && onChange(option.value)}
              disabled={disabled}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionInfo}>
                  <View style={styles.optionHeader}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? '#7a0019' : '#6b7280'}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

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
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
  },
  options: {
    gap: 12,
  },
  option: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#7a0019',
    backgroundColor: '#fef2f2',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: '#7a0019',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7a0019',
  },
  optionInfo: {
    flex: 1,
    gap: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  optionLabelSelected: {
    color: '#7a0019',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 28,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
});

