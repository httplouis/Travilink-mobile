import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CurrencyInput from './CurrencyInput';
import { TextInput as RNTextInput } from 'react-native';

interface OtherItem {
  label: string;
  amount: number | null;
  description?: string;
}

interface TravelCosts {
  food?: number | null;
  foodDescription?: string;
  driversAllowance?: number | null;
  driversAllowanceDescription?: string;
  rentVehicles?: number | null;
  rentVehiclesDescription?: string;
  hiredDrivers?: number | null;
  hiredDriversDescription?: string;
  accommodation?: number | null;
  accommodationDescription?: string;
  otherItems?: OtherItem[];
  otherLabel?: string;
  otherAmount?: number | null;
  justification?: string;
}

interface CostsSectionProps {
  costs: TravelCosts;
  needsJustif: boolean;
  errors: Record<string, string>;
  onChangeCosts: (patch: Partial<TravelCosts>) => void;
}

const MAX_REASONABLE_AMOUNT = 50_000;

function toNumOrNull(value: string): number | null {
  const cleaned = value.replace(/[₱,\s]/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export default function CostsSection({
  costs = {},
  needsJustif,
  errors,
  onChangeCosts,
}: CostsSectionProps) {
  // Build working list from costs.otherItems or legacy pair
  const otherItems: OtherItem[] = useMemo(() => {
    if (Array.isArray(costs.otherItems)) return costs.otherItems;
    const hasLegacy =
      (costs?.otherLabel && String(costs.otherLabel).trim().length > 0) ||
      (typeof costs?.otherAmount === 'number' && !!costs.otherAmount);
    return hasLegacy
      ? [{ label: costs.otherLabel ?? '', amount: costs.otherAmount ?? null }]
      : [];
  }, [costs?.otherItems, costs?.otherLabel, costs?.otherAmount]);

  const setOtherItems = (next: OtherItem[]) => {
    onChangeCosts({
      otherItems: next,
      // Clear legacy fields to avoid double counting
      otherLabel: '',
      otherAmount: null,
    });
  };

  const addOther = () => setOtherItems([...otherItems, { label: '', amount: null }]);
  const updateOther = (i: number, patch: Partial<OtherItem>) =>
    setOtherItems(otherItems.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeOther = (i: number) => setOtherItems(otherItems.filter((_, idx) => idx !== i));

  // Calculate total
  const totalCost = useMemo(() => {
    const base =
      (costs?.food || 0) +
      (costs?.driversAllowance || 0) +
      (costs?.rentVehicles || 0) +
      (costs?.hiredDrivers || 0) +
      (costs?.accommodation || 0);
    const otherTotal = otherItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    return base + otherTotal;
  }, [costs, otherItems]);

  const handleLargeAmount = async (amount: number, fieldName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const formatted = `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      Alert.alert(
        'Large Amount Detected',
        `You entered ${formatted} for ${fieldName}.\n\nThis is a very large amount. Please verify that this is correct before proceeding.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Proceed', style: 'default', onPress: () => resolve(true) },
        ]
      );
    });
  };

  const handleCurrencyChange = (
    value: string,
    field: keyof TravelCosts,
    fieldName: string
  ) => {
    const num = toNumOrNull(value);
    if (num === null) {
      onChangeCosts({ [field]: null });
      return;
    }
    if (num < 0) {
      Alert.alert('Invalid Amount', `${fieldName} cannot be negative.`);
      return;
    }
    if (num > MAX_REASONABLE_AMOUNT) {
      handleLargeAmount(num, fieldName).then((confirmed) => {
        if (confirmed) {
          onChangeCosts({ [field]: num });
        }
      });
      return;
    }
    onChangeCosts({ [field]: num });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Travel Cost (estimate)</Text>
          <Text style={styles.subtitle}>Estimate your travel expenses</Text>
        </View>
        {totalCost > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText} numberOfLines={1} adjustsFontSizeToFit>
              Total: ₱{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Food */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Food</Text>
            <View style={styles.presetContainer}>
              {[500, 1000, 1500, 2000].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.presetButton}
                  onPress={() => onChangeCosts({ food: preset })}
                >
                  <Text style={styles.presetText}>₱{preset.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <CurrencyInput
            label=""
            placeholder="0.00"
            value={costs?.food ?? ''}
            onChange={(value) => handleCurrencyChange(value, 'food', 'Food')}
            onLargeAmount={handleLargeAmount}
          />
          <RNTextInput
            style={styles.descriptionInput}
            placeholder="e.g., Lunch during seminar, Meals for 2 days"
            placeholderTextColor="#9ca3af"
            value={costs?.foodDescription ?? ''}
            onChangeText={(text) => onChangeCosts({ foodDescription: text })}
            multiline
          />
        </View>

        {/* Driver's Allowance */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Driver's allowance</Text>
            <View style={styles.presetContainer}>
              {[300, 500, 800, 1000].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.presetButton}
                  onPress={() => onChangeCosts({ driversAllowance: preset })}
                >
                  <Text style={styles.presetText}>₱{preset.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <CurrencyInput
            label=""
            placeholder="0.00"
            value={costs?.driversAllowance ?? ''}
            onChange={(value) => handleCurrencyChange(value, 'driversAllowance', "Driver's Allowance")}
            onLargeAmount={handleLargeAmount}
          />
          <RNTextInput
            style={styles.descriptionInput}
            placeholder="e.g., Daily allowance for driver"
            placeholderTextColor="#9ca3af"
            value={costs?.driversAllowanceDescription ?? ''}
            onChangeText={(text) => onChangeCosts({ driversAllowanceDescription: text })}
            multiline
          />
        </View>

        {/* Rent Vehicles */}
        <View style={styles.fieldGroup}>
          <CurrencyInput
            label="Rent vehicles"
            placeholder="0.00"
            value={costs?.rentVehicles ?? ''}
            onChange={(value) => handleCurrencyChange(value, 'rentVehicles', 'Rent Vehicles')}
            onLargeAmount={handleLargeAmount}
          />
          <RNTextInput
            style={styles.descriptionInput}
            placeholder="e.g., Van rental for 3 days"
            placeholderTextColor="#9ca3af"
            value={costs?.rentVehiclesDescription ?? ''}
            onChangeText={(text) => onChangeCosts({ rentVehiclesDescription: text })}
            multiline
          />
        </View>

        {/* Hired Drivers */}
        <View style={styles.fieldGroup}>
          <CurrencyInput
            label="Hired drivers"
            placeholder="0.00"
            value={costs?.hiredDrivers ?? ''}
            onChange={(value) => handleCurrencyChange(value, 'hiredDrivers', 'Hired Drivers')}
            onLargeAmount={handleLargeAmount}
          />
          <RNTextInput
            style={styles.descriptionInput}
            placeholder="e.g., Hired driver for long-distance travel"
            placeholderTextColor="#9ca3af"
            value={costs?.hiredDriversDescription ?? ''}
            onChangeText={(text) => onChangeCosts({ hiredDriversDescription: text })}
            multiline
          />
        </View>

        {/* Accommodation */}
        <View style={styles.fieldGroup}>
          <CurrencyInput
            label="Accommodation"
            placeholder="0.00"
            value={costs?.accommodation ?? ''}
            onChange={(value) => handleCurrencyChange(value, 'accommodation', 'Accommodation')}
            onLargeAmount={handleLargeAmount}
          />
          <RNTextInput
            style={styles.descriptionInput}
            placeholder="e.g., Hotel for 2 nights, Lodging expenses"
            placeholderTextColor="#9ca3af"
            value={costs?.accommodationDescription ?? ''}
            onChangeText={(text) => onChangeCosts({ accommodationDescription: text })}
            multiline
          />
        </View>

        {/* Dynamic Other expenses */}
        <View style={styles.otherSection}>
          <View style={styles.otherHeader}>
            <Text style={styles.otherTitle}>Other expenses</Text>
            <TouchableOpacity style={styles.addButton} onPress={addOther}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>

          {otherItems.length === 0 ? (
            <View style={styles.emptyOther}>
              <Text style={styles.emptyOtherText}>No other expenses added yet</Text>
              <Text style={styles.emptyOtherSubtext}>Click "Add Expense" to add additional cost items</Text>
            </View>
          ) : (
            otherItems.map((row, idx) => (
              <View key={idx} style={styles.otherItem}>
                <View style={styles.otherItemHeader}>
                  <View style={styles.otherItemFields}>
                    <RNTextInput
                      style={[styles.otherLabelInput, idx === 0 && styles.otherLabelInputFirst]}
                      placeholder="e.g., Materials, Printing"
                      placeholderTextColor="#9ca3af"
                      value={row.label}
                      onChangeText={(text) => updateOther(idx, { label: text })}
                    />
                    <View style={styles.currencyInputWrapper}>
                      <CurrencyInput
                        label={idx === 0 ? 'Amount' : ''}
                        placeholder="0.00"
                        value={row.amount !== null && row.amount !== undefined ? String(row.amount) : ''}
                        onChange={(value) => {
                          const num = toNumOrNull(value);
                          if (num === null || value.trim() === '') {
                            updateOther(idx, { amount: null });
                            return;
                          }
                          if (num < 0) {
                            Alert.alert('Invalid Amount', 'Amount cannot be negative.');
                            return;
                          }
                          if (num > MAX_REASONABLE_AMOUNT) {
                            handleLargeAmount(num, row.label || 'Other Expense').then((confirmed) => {
                              if (confirmed) {
                                updateOther(idx, { amount: num });
                              } else {
                                updateOther(idx, { amount: null });
                              }
                            });
                            return;
                          }
                          updateOther(idx, { amount: num });
                        }}
                        onLargeAmount={handleLargeAmount}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeOther(idx)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                  <RNTextInput
                    style={styles.otherDescriptionInput}
                    placeholder="e.g., Details or justification for this expense"
                    placeholderTextColor="#9ca3af"
                    value={row.description ?? ''}
                    onChangeText={(text) => updateOther(idx, { description: text })}
                    multiline
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Justification */}
        {needsJustif && (
          <View style={styles.justificationSection}>
            <Text style={styles.justificationLabel}>
              Justification <Text style={styles.required}>*</Text>
            </Text>
            <RNTextInput
              style={[styles.justificationInput, errors['travelOrder.costs.justification'] && styles.justificationInputError]}
              placeholder="Explain why these costs are needed…"
              placeholderTextColor="#9ca3af"
              value={costs?.justification ?? ''}
              onChangeText={(text) => onChangeCosts({ justification: text })}
              multiline
              numberOfLines={4}
            />
            {errors['travelOrder.costs.justification'] && (
              <Text style={styles.justificationError}>
                {errors['travelOrder.costs.justification']}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  totalBadge: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
    maxWidth: '48%',
  },
  totalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  content: {
    maxHeight: 600,
  },
  fieldGroup: {
    marginBottom: 16,
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  presetContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  descriptionInput: {
    fontSize: 14,
    color: '#111827',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    minHeight: 44,
    textAlignVertical: 'top',
  },
  otherSection: {
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  otherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7a0019',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyOther: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  emptyOtherText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyOtherSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  otherItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  otherItemHeader: {
    gap: 8,
  },
  otherItemFields: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  otherLabelInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    height: 44,
  },
  otherLabelInputFirst: {
    // Add label styling if needed
  },
  currencyInputWrapper: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherDescriptionInput: {
    fontSize: 14,
    color: '#111827',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    minHeight: 44,
    textAlignVertical: 'top',
  },
  justificationSection: {
    marginTop: 16,
    gap: 8,
  },
  justificationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  required: {
    color: '#dc2626',
  },
  justificationInput: {
    fontSize: 14,
    color: '#111827',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  justificationInputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  justificationError: {
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
    marginTop: 4,
  },
});

