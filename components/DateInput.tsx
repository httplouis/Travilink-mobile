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
  // Default to calendar view on iOS to avoid 2-month spinner limit
  const [useCalendarView, setUseCalendarView] = useState(Platform.OS === 'ios'); // Default to calendar on iOS
  const [tempDate, setTempDate] = useState<Date>(() => {
    if (value) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  });

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
    // Update temp date for both platforms
    if (selectedDate) {
      setTempDate(selectedDate);
    }

    // Android: only auto-close if NOT using calendar view
    if (Platform.OS === 'android' && !useCalendarView) {
      if (event.type === 'set' && selectedDate) {
        onChange(formatDate(selectedDate));
        setShowPicker(false);
      } else if (event.type === 'dismissed') {
        setShowPicker(false);
      }
    }
    // iOS: always wait for Done button (handled in handleConfirm)
  };

  const handleConfirm = () => {
    if (tempDate) {
      onChange(formatDate(tempDate));
      setUseCalendarView(false); // Reset view mode
      setShowPicker(false);
    }
  };

  const handleCancel = () => {
    // Reset to original value
    if (value) {
      const date = new Date(value);
      setTempDate(isNaN(date.getTime()) ? new Date() : date);
    } else {
      setTempDate(new Date());
    }
    setUseCalendarView(false); // Reset view mode
    setShowPicker(false);
  };

  // Reset temp date when picker opens
  React.useEffect(() => {
    if (showPicker) {
      if (value) {
        const date = new Date(value);
        setTempDate(isNaN(date.getTime()) ? new Date() : date);
      } else {
        setTempDate(new Date());
      }
    }
  }, [showPicker, value]);

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
                <TouchableOpacity onPress={handleCancel} style={styles.modalHeaderButton}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.modalHeaderCenter}>
                  <Text style={styles.modalTitle}>Select Date</Text>
                </View>
                <TouchableOpacity onPress={handleConfirm} style={styles.modalHeaderButton}>
                  <Text style={styles.modalConfirm}>Done</Text>
                </TouchableOpacity>
              </View>
              {/* Calendar View Toggle - Moved below header for better spacing */}
              <View style={styles.calendarToggleContainer}>
                <TouchableOpacity
                  onPress={() => setUseCalendarView(!useCalendarView)}
                  style={styles.viewToggleButton}
                >
                  <Ionicons 
                    name={useCalendarView ? "calendar-outline" : "calendar"} 
                    size={20} 
                    color="#7a0019" 
                  />
                  <Text style={styles.viewToggleText}>
                    {useCalendarView ? 'Switch to Spinner' : 'Switch to Calendar'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[
                styles.pickerContainer,
                useCalendarView && styles.pickerContainerCalendar
              ]} collapsable={false}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={useCalendarView ? "inline" : "spinner"}
                  onChange={handleDateChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  style={styles.picker}
                  textColor={Platform.OS === 'ios' ? '#111827' : undefined}
                  accentColor={Platform.OS === 'ios' ? '#7a0019' : undefined}
                  themeVariant="light"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.androidModal}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel} style={styles.modalHeaderButton}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.modalHeaderCenter}>
                  <Text style={styles.modalTitle}>Select Date</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('[DateInput] ✅ Done pressed, tempDate:', tempDate);
                    if (tempDate) {
                      const formatted = formatDate(tempDate);
                      console.log('[DateInput] 📅 Formatted date:', formatted);
                      onChange(formatted);
                      setShowPicker(false);
                      setUseCalendarView(false);
                    }
                  }}
                  style={styles.modalHeaderButton}
                >
                  <Text style={styles.modalConfirm}>Done</Text>
                </TouchableOpacity>
              </View>
              {/* Calendar View Toggle - Moved below header for better spacing */}
              <View style={styles.calendarToggleContainer}>
                <TouchableOpacity
                  onPress={() => setUseCalendarView(!useCalendarView)}
                  style={styles.viewToggleButton}
                >
                  <Ionicons 
                    name={useCalendarView ? "calendar-outline" : "calendar"} 
                    size={20} 
                    color="#7a0019" 
                  />
                  <Text style={styles.viewToggleText}>
                    {useCalendarView ? 'Switch to Spinner' : 'Switch to Calendar'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[
                styles.pickerContainer,
                useCalendarView && styles.pickerContainerCalendar
              ]}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={useCalendarView ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    console.log('[DateInput] 📅 Android date changed:', event.type, selectedDate);
                    if (event.type === 'set' && selectedDate) {
                      setTempDate(selectedDate);
                      if (!useCalendarView) {
                        // Default view - auto-close and save
                        const formatted = formatDate(selectedDate);
                        console.log('[DateInput] ✅ Saving date:', formatted);
                        onChange(formatted);
                        setShowPicker(false);
                      }
                      // Calendar view - wait for Done button
                    } else if (event.type === 'dismissed') {
                      console.log('[DateInput] ❌ Date picker dismissed');
                      setShowPicker(false);
                    }
                  }}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  textColor={Platform.OS === 'android' ? '#111827' : undefined}
                  accentColor={Platform.OS === 'android' ? '#7a0019' : undefined}
                  themeVariant="light"
                />
              </View>
            </View>
          </View>
        </Modal>
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
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
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
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 60,
  },
  modalHeaderButton: {
    minWidth: 60,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modalHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 140,
    justifyContent: 'flex-end',
  },
  calendarToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#7a0019',
    alignSelf: 'center',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainerCalendar: {
    height: 350,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 200,
    backgroundColor: '#ffffff',
    alignSelf: 'center',
  },
  androidModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
});

