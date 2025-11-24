import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeadEndorsements } from '@/hooks/useHeadEndorsements';
import { supabase } from '@/lib/supabase/client';

interface Participant {
  id: string;
  name: string;
  department_id?: string;
  department_name?: string;
}

interface HeadEndorsementInvitationEditorProps {
  requestId?: string;
  participants: Participant[];
  requesterDepartmentId?: string;
  onInvitationsSent?: () => void;
}

/**
 * Component for managing head endorsement invitations
 * Shows when participants are from different departments
 */
export default function HeadEndorsementInvitationEditor({
  requestId,
  participants,
  requesterDepartmentId,
  onInvitationsSent,
}: HeadEndorsementInvitationEditorProps) {
  const { sendInvitations, sending } = useHeadEndorsements();
  const [requiredHeads, setRequiredHeads] = useState<Array<{
    department_id: string;
    department_name: string;
    head_user_id: string;
    head_name: string;
    head_email: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  // Detect which department heads need to be invited
  useEffect(() => {
    const detectRequiredHeads = async () => {
      if (!participants || participants.length === 0) {
        setLoading(false);
        return;
      }

      // Get unique departments from participants (excluding requester's department)
      const uniqueDepartments = new Map<string, { id: string; name: string }>();
      
      participants.forEach((participant) => {
        if (
          participant.department_id &&
          participant.department_name &&
          participant.department_id !== requesterDepartmentId
        ) {
          uniqueDepartments.set(participant.department_id, {
            id: participant.department_id,
            name: participant.department_name,
          });
        }
      });

      // Fetch department heads for each unique department
      const heads = await Promise.all(
        Array.from(uniqueDepartments.values()).map(async (dept) => {
          try {
            // Fetch department head
            const { data: headUser } = await supabase
              .from('users')
              .select('id, name, email')
              .eq('department_id', dept.id)
              .eq('is_head', true)
              .eq('status', 'active')
              .single();

            if (headUser) {
              return {
                department_id: dept.id,
                department_name: dept.name,
                head_user_id: headUser.id,
                head_name: headUser.name || 'Unknown',
                head_email: headUser.email || '',
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      setRequiredHeads(heads.filter((head) => head !== null) as typeof requiredHeads);
      setLoading(false);
    };

    detectRequiredHeads();
  }, [participants, requesterDepartmentId]);

  const handleSendInvitations = async () => {
    if (!requestId) {
      Alert.alert('Error', 'Request ID is required to send invitations');
      return;
    }

    if (requiredHeads.length === 0) {
      Alert.alert('No Heads Found', 'No department heads found for the participants\' departments.');
      return;
    }

    try {
      await sendInvitations(requestId, requiredHeads);
      onInvitationsSent?.();
    } catch (error) {
      // Error already handled in hook
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#7a0019" />
        <Text style={styles.loadingText}>Checking departments...</Text>
      </View>
    );
  }

  if (requiredHeads.length === 0) {
    return null; // No additional heads needed
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mail-outline" size={20} color="#7a0019" />
        <Text style={styles.title}>Department Head Endorsements Required</Text>
      </View>
      
      <Text style={styles.description}>
        Participants are from different departments. Please send email invitations to the following department heads:
      </Text>

      <View style={styles.headsList}>
        {requiredHeads.map((head, index) => (
          <View key={head.department_id} style={styles.headItem}>
            <View style={styles.headInfo}>
              <Text style={styles.headName}>{head.head_name}</Text>
              <Text style={styles.headDepartment}>{head.department_name}</Text>
              <Text style={styles.headEmail}>{head.head_email}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
              <Text style={styles.statusText}>Pending</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.sendButton, sending && styles.sendButtonDisabled]}
        onPress={handleSendInvitations}
        disabled={sending || !requestId}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="send-outline" size={18} color="#fff" />
            <Text style={styles.sendButtonText}>
              Send Invitations ({requiredHeads.length})
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  headsList: {
    gap: 12,
    marginBottom: 16,
  },
  headItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headInfo: {
    flex: 1,
  },
  headName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  headDepartment: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  headEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7a0019',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

