import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ParticipantInvitation {
  email: string;
  name?: string;
  department?: string;
  status?: 'pending' | 'confirmed' | 'declined';
  invitationId?: string;
}

interface ParticipantInvitationEditorProps {
  invitations: ParticipantInvitation[];
  onChange: (invitations: ParticipantInvitation[]) => void;
  requestId?: string;
  disabled?: boolean;
}

export default function ParticipantInvitationEditor({
  invitations,
  onChange,
  requestId,
  disabled = false,
}: ParticipantInvitationEditorProps) {
  const [emailFields, setEmailFields] = useState<string[]>(['']);
  const [sending, setSending] = useState<string | null>(null);

  const addEmailField = () => {
    setEmailFields([...emailFields, '']);
  };

  const updateEmailField = (index: number, value: string) => {
    const updated = [...emailFields];
    updated[index] = value;
    setEmailFields(updated);
  };

  const removeEmailField = (index: number) => {
    if (emailFields.length === 1) {
      setEmailFields(['']);
      return;
    }
    const updated = emailFields.filter((_, i) => i !== index);
    setEmailFields(updated);
  };

  const addAllInvitations = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    emailFields.forEach((email) => {
      const trimmed = email.trim();
      if (!trimmed) return;

      if (emailRegex.test(trimmed)) {
        if (!invitations.some((inv) => inv.email.toLowerCase() === trimmed.toLowerCase())) {
          validEmails.push(trimmed);
        }
      } else {
        invalidEmails.push(trimmed);
      }
    });

    if (emailFields.every((f) => !f.trim())) {
      Alert.alert('No emails entered', 'Please enter at least one email address');
      return;
    }

    if (invalidEmails.length > 0) {
      Alert.alert(
        'Invalid emails',
        `${invalidEmails.length} email${invalidEmails.length > 1 ? 's' : ''} were invalid and skipped`
      );
    }

    if (validEmails.length > 0) {
      onChange([
        ...invitations,
        ...validEmails.map((email) => ({ email, status: 'pending' as const })),
      ]);
      setEmailFields(['']);
    } else if (invalidEmails.length === 0) {
      Alert.alert('No new emails', 'All emails are already in the list');
    }
  };

  const removeInvitation = (index: number) => {
    const next = [...invitations];
    next.splice(index, 1);
    onChange(next);
  };

  const sendInvitation = async (email: string) => {
    if (!requestId) {
      Alert.alert(
        'Save request first',
        'Please save the request as draft or submit it first, then you can send invitations.'
      );
      return;
    }

    setSending(email);
    try {
      // Get Supabase URL and construct API URL
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const baseUrl = supabaseUrl.replace('/rest/v1', '').replace('/rest/v1/', '');
      const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || baseUrl;
      const apiUrl = `${webAppUrl}/api/participants/invite`;

      const { data: { session } } = await require('@/lib/supabase/client').supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      // Update invitation with invitationId
      const updated = invitations.map((inv) =>
        inv.email === email ? { ...inv, invitationId: data.data?.invitation_id, status: 'pending' as const } : inv
      );
      onChange(updated);

      Alert.alert('Success', 'Invitation sent successfully');
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setSending(null);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <Ionicons name="checkmark-circle" size={20} color="#16a34a" />;
      case 'declined':
        return <Ionicons name="close-circle" size={20} color="#dc2626" />;
      case 'pending':
      default:
        return <Ionicons name="time-outline" size={20} color="#f59e0b" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'declined':
        return 'Declined';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people-outline" size={20} color="#7a0019" />
          <Text style={styles.title}>Another Requester</Text>
        </View>
        <Text style={styles.subtitle}>Add another person as requester for this trip</Text>
      </View>

      {/* Existing Invitations */}
      {invitations.length > 0 && (
        <View style={styles.invitationsList}>
          {invitations.map((inv, index) => (
            <View key={index} style={styles.invitationItem}>
              <View style={styles.invitationInfo}>
                <Text style={styles.invitationEmail}>{inv.email}</Text>
                {inv.name && <Text style={styles.invitationName}>{inv.name}</Text>}
                {inv.department && <Text style={styles.invitationDept}>{inv.department}</Text>}
              </View>
              <View style={styles.invitationActions}>
                <View style={styles.statusBadge}>
                  {getStatusIcon(inv.status)}
                  <Text style={[styles.statusText, styles[`status${inv.status || 'pending'}` as keyof typeof styles]]}>
                    {getStatusText(inv.status)}
                  </Text>
                </View>
                {!disabled && (
                  <TouchableOpacity
                    onPress={() => removeInvitation(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#dc2626" />
                  </TouchableOpacity>
                )}
                {!disabled && inv.status === 'pending' && !inv.invitationId && requestId && (
                  <TouchableOpacity
                    onPress={() => sendInvitation(inv.email)}
                    style={styles.sendButton}
                    disabled={sending === inv.email}
                  >
                    {sending === inv.email ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send-outline" size={16} color="#fff" />
                        <Text style={styles.sendButtonText}>Send</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add New Invitations */}
      {!disabled && (
        <View style={styles.addSection}>
          <View style={styles.addHeader}>
            <Text style={styles.addTitle}>Add Another Requester</Text>
            <TouchableOpacity onPress={addEmailField} style={styles.addFieldButton}>
              <Ionicons name="add-circle-outline" size={20} color="#7a0019" />
              <Text style={styles.addFieldButtonText}>Add Field</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.emailFieldsContainer}>
            {emailFields.map((email, index) => (
              <View key={index} style={styles.emailFieldRow}>
                <TextInput
                  style={styles.emailInput}
                  placeholder={`Requester ${index + 1} email address`}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={(value) => updateEmailField(index, value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailFields.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeEmailField(index)}
                    style={styles.removeFieldButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={addAllInvitations}
            style={styles.addAllButton}
            disabled={emailFields.every((f) => !f.trim())}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.addAllButtonText}>Add All Requesters</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  header: {
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  invitationsList: {
    marginBottom: 16,
  },
  invitationItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  invitationInfo: {
    marginBottom: 8,
  },
  invitationEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  invitationName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  invitationDept: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  invitationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statuspending: {
    color: '#f59e0b',
  },
  statusconfirmed: {
    color: '#16a34a',
  },
  statusdeclined: {
    color: '#dc2626',
  },
  removeButton: {
    padding: 4,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#7a0019',
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  addSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  addHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  addFieldButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a0019',
  },
  emailFieldsContainer: {
    maxHeight: 200,
    marginBottom: 12,
  },
  emailFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emailInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  removeFieldButton: {
    padding: 4,
  },
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#7a0019',
  },
  addAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

