import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignaturePad from './SignaturePad';
import { useSignatureSettings } from '@/hooks/useSignatureSettings';
import { useAuth } from '@/contexts/AuthContext';

export default function SignatureSettings() {
  const { profile } = useAuth();
  const { signature, loading, saving, saveSignature } = useSignatureSettings();
  const [currentSignature, setCurrentSignature] = useState<string | null>(null);

  // Check if user can sign (head, hr, exec, comptroller, admin)
  const canSign = profile?.is_head || profile?.is_hr || profile?.is_exec || profile?.is_admin || 
                  profile?.role === 'comptroller';

  React.useEffect(() => {
    setCurrentSignature(signature);
  }, [signature]);

  const handleSave = async () => {
    if (!currentSignature) {
      Alert.alert('No Signature', 'Please draw your signature first');
      return;
    }

    try {
      await saveSignature(currentSignature);
      Alert.alert('Success', 'Signature saved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save signature');
    }
  };

  if (!canSign) {
    return (
      <View style={styles.container}>
        <View style={styles.noPermissionContainer}>
          <Ionicons name="lock-closed" size={48} color="#9ca3af" />
          <Text style={styles.noPermissionTitle}>No Permission</Text>
          <Text style={styles.noPermissionText}>
            Only heads, HR, executives, comptrollers, and admins can save signatures.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading signature...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="create-outline" size={20} color="#7a0019" />
          <Text style={styles.title}>Digital Signature</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Draw your signature below. This will be automatically applied when you approve requests.
      </Text>

      {signature && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Current Signature:</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>Your saved signature will appear here</Text>
          </View>
        </View>
      )}

      <View style={styles.signatureContainer}>
        <SignaturePad
          height={160}
          value={currentSignature}
          onSave={(dataUrl) => setCurrentSignature(dataUrl)}
          onClear={() => setCurrentSignature(null)}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.saveButtonContainer}
          onPress={handleSave}
          disabled={saving || !currentSignature}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Signature</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  signatureContainer: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  actions: {
    marginTop: 8,
  },
  saveButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7a0019',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    opacity: 1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  noPermissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noPermissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

