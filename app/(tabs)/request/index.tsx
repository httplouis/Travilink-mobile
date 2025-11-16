import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';

export default function RequestScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Create Request"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />
      <View style={styles.content}>
        <Ionicons name="add-circle-outline" size={64} color="#7a0019" />
        <Text style={styles.title}>Create New Request</Text>
        <Text style={styles.subtitle}>
          Start a new travel order or seminar application
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/request/new?type=travel_order')}
          >
            <Ionicons name="car-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Travel Order</Text>
            <Text style={styles.actionButtonSubtext}>
              Request transportation for official travel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/request/new?type=seminar')}
          >
            <Ionicons name="school-outline" size={24} color="#7a0019" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
              Seminar Application
            </Text>
            <Text style={styles.actionButtonSubtextSecondary}>
              Apply for training or seminar participation
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  actionButton: {
    backgroundColor: '#7a0019',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#7a0019',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  actionButtonTextSecondary: {
    color: '#7a0019',
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  actionButtonSubtextSecondary: {
    color: '#6b7280',
    opacity: 1,
  },
});

