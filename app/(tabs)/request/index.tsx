import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import RequestCard from '@/components/RequestCard';
import { formatDate } from '@/lib/utils';

export default function RequestScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { profile } = useAuth();
  const { requests, isLoading } = useRequests(profile?.id || '');
  
  // Filter drafts
  const drafts = requests.filter(req => req.status === 'draft');

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Create Request"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Drafts Section */}
        {drafts.length > 0 && (
          <View style={styles.draftsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#7a0019" />
              <Text style={styles.sectionTitle}>My Drafts ({drafts.length})</Text>
            </View>
            <FlatList
              data={drafts.slice(0, 3)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.draftCard}
                  onPress={() => {
                    router.push(`/request/${item.id}`);
                  }}
                >
                  <View style={styles.draftCardHeader}>
                    <Text style={styles.draftRequestNumber}>{item.request_number || 'DRAFT'}</Text>
                    <Text style={styles.draftType}>
                      {item.request_type === 'travel_order' ? 'TO' : 'SA'}
                    </Text>
                  </View>
                  <Text style={styles.draftDestination} numberOfLines={1}>
                    {item.destination || 'No destination'}
                  </Text>
                  <Text style={styles.draftDate}>
                    {item.created_at ? `Created ${formatDate(item.created_at)}` : 'Recently created'}
                  </Text>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                drafts.length > 3 ? (
                  <TouchableOpacity
                    style={styles.viewAllDrafts}
                    onPress={() => router.push('/(tabs)/submissions?filter=draft')}
                  >
                    <Text style={styles.viewAllText}>View All Drafts ({drafts.length})</Text>
                    <Ionicons name="chevron-forward" size={16} color="#7a0019" />
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
        )}

        {/* Create New Section */}
        <View style={styles.content}>
          <Ionicons name="add-circle-outline" size={64} color="#7a0019" />
          <Text style={styles.title}>Create New Request</Text>
          <Text style={styles.subtitle}>
            Start a new travel order or seminar application
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/request/travel-order')}
            >
              <Ionicons name="car-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Travel Order</Text>
              <Text style={styles.actionButtonSubtext}>
                Request transportation for official travel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => router.push('/request/seminar')}
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
      </ScrollView>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  draftsSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  draftCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  draftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  draftRequestNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  draftType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7a0019',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  draftDestination: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  draftDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  viewAllDrafts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
  content: {
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

