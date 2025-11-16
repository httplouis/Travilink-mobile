import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CurrencyInput from './CurrencyInput';
import { TextInput as RNTextInput } from 'react-native';

interface BreakdownItem {
  label: string;
  amount: number | null;
  description?: string;
}

interface BreakdownEditorProps {
  items: BreakdownItem[];
  onChange: (items: BreakdownItem[]) => void;
}

export default function BreakdownEditor({
  items = [],
  onChange,
}: BreakdownEditorProps) {
  const setItem = (i: number, patch: Partial<BreakdownItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const add = () => {
    onChange([...(items || []), { label: '', amount: null, description: '' }]);
  };

  const remove = (i: number) => {
    const next = [...items];
    next.splice(i, 1);
    onChange(next);
  };

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const toNumOrNull = (value: string): number | null => {
    const cleaned = value.replace(/[₱,\s]/g, '').trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Breakdown of Expenses</Text>
          <Text style={styles.subtitle}>List all expense items, amounts, and justifications</Text>
        </View>
        {total > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>
              Total: ₱{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.itemsList}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No expense items added yet</Text>
            <Text style={styles.emptySubtext}>Click "Add Expense Item" below to add expenses</Text>
          </View>
        ) : (
          items.map((item, i) => (
            <View key={i} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemLabel}>
                  {i === 0 && <Text style={styles.fieldLabel}>Expense Item</Text>}
                  <RNTextInput
                    style={styles.input}
                    placeholder="e.g., Accommodation / Transport / Materials"
                    placeholderTextColor="#9ca3af"
                    value={item.label}
                    onChangeText={(text) => setItem(i, { label: text })}
                  />
                </View>

                <View style={styles.itemAmount}>
                  {i === 0 && <Text style={styles.fieldLabel}>Amount</Text>}
                  <CurrencyInput
                    value={item.amount?.toString() || ''}
                    onChange={(text) => setItem(i, { amount: toNumOrNull(text) })}
                    placeholder="0.00"
                  />
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => remove(i)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>

              <View style={styles.itemDescription}>
                {i === 0 && <Text style={styles.fieldLabel}>Justification</Text>}
                <RNTextInput
                  style={[styles.input, styles.descriptionInput]}
                  placeholder="e.g., Details or justification for this expense"
                  placeholderTextColor="#9ca3af"
                  value={item.description || ''}
                  onChangeText={(text) => setItem(i, { description: text })}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
                {i === 0 && (
                  <Text style={styles.helperText}>Explain why this expense is needed</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={add} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={20} color="#7a0019" />
        <Text style={styles.addButtonText}>Add Expense Item</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  totalBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  itemsList: {
    maxHeight: 600,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  itemCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  itemLabel: {
    flex: 1,
  },
  itemAmount: {
    width: 140,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDescription: {
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 40,
  },
  descriptionInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginTop: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
});

