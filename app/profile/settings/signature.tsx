import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import NavigationHeader from '@/components/NavigationHeader';
import SignaturePad from '@/components/SignaturePad';
import CustomTabBar from '@/components/CustomTabBar';

export default function AutomaticSignatureScreen() {
  const { profile } = useAuth();
  const [signature, setSignature] = useState<string | null>(null);
  const [autoSignEnabled, setAutoSignEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadSignature();
  }, []);

  const loadSignature = async () => {
    if (!profile?.id) return;
    
    try {
      // Load from users table instead of user_preferences
      const { data, error } = await supabase
        .from('users')
        .select('automatic_signature, is_auto_sign_enabled')
        .eq('id', profile.id)
        .single();

      if (error) {
        // If fields don't exist, that's okay - user just hasn't set signature yet
        if (error.code === 'PGRST116' || error.code === '42703') {
          console.log('Signature fields not found, using defaults');
          return;
        }
        console.error('Error loading signature:', error);
        return;
      }

      if (data) {
        setSignature(data.automatic_signature || null);
        setAutoSignEnabled(data.is_auto_sign_enabled || false);
      }
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    
    if (!signature) {
      Alert.alert('Signature Required', 'Please provide a signature to save.');
      return;
    }

    setLoading(true);
    try {
      // Save to users table instead of user_preferences
      const { error } = await supabase
        .from('users')
        .update({
          automatic_signature: signature,
          is_auto_sign_enabled: autoSignEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        // If columns don't exist, try to handle gracefully
        if (error.code === '42703') {
          Alert.alert('Error', 'Signature feature is not available. Please contact support.');
          return;
        }
        throw error;
      }

      Alert.alert('Success', 'Automatic signature saved successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error saving signature:', error);
      Alert.alert('Error', 'Failed to save signature. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Automatic Signature"
        showNotification={false}
        showMenu={false}
        showBack={true}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.description}>
            Save your signature to automatically fill it in forms. You can enable or disable this feature at any time.
          </Text>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#6b7280" />
                <Text style={styles.switchLabel}>Enable Automatic Signature</Text>
              </View>
              <Switch
                value={autoSignEnabled}
                onValueChange={setAutoSignEnabled}
                trackColor={{ false: '#d1d5db', true: '#7a0019' }}
                thumbColor="#fff"
              />
            </View>
            <Text style={styles.switchDescription}>
              When enabled, your saved signature will automatically appear in forms that require it.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Signature</Text>
            <SignaturePad
              onSave={(dataUrl) => setSignature(dataUrl)}
              value={signature || null}
              hideSaveButton={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, (!signature || loading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!signature || loading}
          >
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Signature</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>
      <CustomTabBar />
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
  content: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  switchDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7a0019',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

