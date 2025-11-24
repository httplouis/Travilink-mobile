import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export default function EmptyState({ 
  icon = 'document-outline', 
  title, 
  description,
  action 
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={64} color="#d1d5db" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      {action && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: '#7a0019',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

