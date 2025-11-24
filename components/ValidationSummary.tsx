import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ValidationSummaryProps {
  visible: boolean;
  errors: Record<string, string>;
  onClose: () => void;
  onScrollToField?: (fieldKey: string) => void;
}

// Map error keys to user-friendly field names
const fieldNameMap: Record<string, string> = {
  'travelOrder.date': 'Date',
  'travelOrder.requestingPerson': 'Requesting Person',
  'travelOrder.department': 'Department',
  'travelOrder.destination': 'Destination',
  'travelOrder.departureDate': 'Departure Date',
  'travelOrder.returnDate': 'Return Date',
  'travelOrder.purposeOfTravel': 'Purpose of Travel',
  'travelOrder.requesterSignature': "Requesting Person's Signature",
  'travelOrder.endorsedByHeadSignature': "Department Head's Signature",
  'travelOrder.endorsedByHeadName': "Department Head's Name",
  'travelOrder.endorsedByHeadDate': "Endorsement Date",
  'travelOrder.costs.justification': 'Cost Justification',
  'travelOrder.requesterContactNumber': 'Contact Number',
  'seminar.applicationDate': 'Application Date',
  'seminar.title': 'Seminar Title',
  'seminar.dateFrom': 'Start Date',
  'seminar.dateTo': 'End Date',
  'seminar.typeOfTraining': 'Type of Training',
  'seminar.venue': 'Venue',
  'seminar.modality': 'Modality',
  'seminar.applicants': 'Applicants',
  'seminar.requesterSignature': "Requesting Person's Signature",
  'seminar.endorsedByHeadSignature': "Department Head's Signature",
  'seminar.endorsedByHeadName': "Department Head's Name",
  'seminar.endorsedByHeadDate': "Endorsement Date",
};

export default function ValidationSummary({
  visible,
  errors,
  onClose,
  onScrollToField,
}: ValidationSummaryProps) {
  const errorEntries = Object.entries(errors);

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="alert-circle" size={24} color="#dc2626" />
              <Text style={styles.title}>Missing Required Fields</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Please complete the following {errorEntries.length} field{errorEntries.length !== 1 ? 's' : ''}:
            </Text>

            <ScrollView style={styles.errorList} showsVerticalScrollIndicator={true}>
              {errorEntries.map(([key, message], index) => {
                const fieldName = fieldNameMap[key] || key.replace(/^(travelOrder|seminar)\./, '');
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.errorItem}
                    onPress={() => {
                      if (onScrollToField) {
                        onScrollToField(key);
                        onClose();
                      }
                    }}
                  >
                    <View style={styles.errorNumber}>
                      <Text style={styles.errorNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.errorContent}>
                      <Text style={styles.errorFieldName}>{fieldName}</Text>
                      <Text style={styles.errorMessage}>{message}</Text>
                    </View>
                    {onScrollToField && (
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  errorList: {
    maxHeight: 300,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 12,
  },
  errorNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  errorNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  errorContent: {
    flex: 1,
    gap: 4,
  },
  errorFieldName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  errorMessage: {
    fontSize: 12,
    color: '#dc2626',
  },
  footer: {
    padding: 20,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#7a0019',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

