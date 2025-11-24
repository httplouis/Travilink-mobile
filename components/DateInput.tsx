import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DateInputProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  id?: string;
  helper?: string;
}

export default function DateInput({
  value,
  onChange,
  label,
  placeholder = 'Select date...',
  required = false,
  error,
  disabled = false,
  minimumDate,
  maximumDate,
  id,
  helper,
}: DateInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(
    value ? new Date(value) : new Date()
  );

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const displayDate = value
    ? new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(formatDate(selectedDate));
      }
      return;
    }

    // iOS: update temp date, user confirms with Done button
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    if (tempDate) {
      onChange(formatDate(tempDate));
      setShowPicker(false);
    }
  };

  const handleCancel = () => {
    setTempDate(value ? new Date(value) : new Date());
    setShowPicker(false);
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
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
      >
        <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.icon} />
        <Text
          style={[styles.input, !displayDate && styles.inputPlaceholder]}
          numberOfLines={1}
        >
          {displayDate || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6b7280" />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {helper && !error && (
        <Text style={styles.helperText}>{helper}</Text>
      )}

      {/* Date Picker - Modal isolates from ScrollView to prevent VirtualizedList warning */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
          presentationStyle="overFullScreen"
        >
          <View style={styles.modalOverlay} pointerEvents="box-none">
            <View style={styles.modal} collapsable={false}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.modalConfirm}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer} collapsable={false}>
                <DateTimePicker
                  value={tempDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  style={styles.picker}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
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
  icon: {
    marginRight: 8,
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
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    fontWeight: '500',
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
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalConfirm: {
    fontSize: 16,
    color: '#7a0019',
    fontWeight: '600',
  },
  pickerContainer: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 200,
  },
});

