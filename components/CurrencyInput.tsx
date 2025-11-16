import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CurrencyInputProps {
  label?: string;
  placeholder?: string;
  value?: string | number | null;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  helper?: string;
  disabled?: boolean;
  onLargeAmount?: (amount: number, fieldName: string) => Promise<boolean>;
}

// Maximum reasonable budget amount (50k pesos)
const MAX_REASONABLE_AMOUNT = 50_000;

function toNumOrNull(value: string): number | null {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[₱,\s]/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CurrencyInput({
  label,
  placeholder = '0.00',
  value,
  onChange,
  error,
  required = false,
  helper,
  disabled = false,
  onLargeAmount,
}: CurrencyInputProps) {
  const [showModal, setShowModal] = useState(false);
  const [pendingValue, setPendingValue] = useState<{ num: number; formatted: string; fieldName: string } | null>(null);

  const handleChange = (text: string) => {
    const num = toNumOrNull(text);
    
    if (num === null) {
      onChange?.('');
      return;
    }
    
    if (num < 0) {
      // Don't allow negative
      return;
    }
    
    // Check for large amount
    if (num > MAX_REASONABLE_AMOUNT && onLargeAmount) {
      const formatted = `₱${formatCurrency(num)}`;
      setPendingValue({ num, formatted, fieldName: label || 'Amount' });
      setShowModal(true);
      return;
    }
    
    onChange?.(text);
  };

  const handleModalConfirm = async () => {
    if (pendingValue && onLargeAmount) {
      const confirmed = await onLargeAmount(pendingValue.num, pendingValue.fieldName);
      if (confirmed) {
        onChange?.(pendingValue.num.toString());
      } else {
        onChange?.('');
      }
    }
    setShowModal(false);
    setPendingValue(null);
  };

  const handleModalCancel = () => {
    onChange?.('');
    setShowModal(false);
    setPendingValue(null);
  };

  const displayValue = typeof value === 'number' ? value.toString() : (value || '');

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
        <Text style={styles.currencySymbol}>₱</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={displayValue}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          editable={!disabled}
        />
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {helper && !error && (
        <Text style={styles.helperText}>{helper}</Text>
      )}

      {/* Large Amount Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleModalCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Ionicons name="alert-triangle" size={24} color="#f59e0b" />
              <Text style={styles.modalTitle}>Large Amount Detected</Text>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                You entered <Text style={styles.modalBold}>{pendingValue?.formatted}</Text> for{' '}
                <Text style={styles.modalBold}>{pendingValue?.fieldName}</Text>.
              </Text>
              <Text style={styles.modalSubtext}>
                This is a very large amount. Please verify that this is correct before proceeding.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleModalCancel}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleModalConfirm}
              >
                <Text style={styles.modalButtonConfirmText}>Proceed</Text>
              </TouchableOpacity>
            </View>
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
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: '#7a0019',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalContent: {
    padding: 20,
    gap: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  modalBold: {
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  modalButtonConfirm: {
    backgroundColor: '#7a0019',
  },
  modalButtonConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

