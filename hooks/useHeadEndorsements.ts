import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';

export interface HeadEndorsementInvitation {
  id: string;
  request_id: string;
  department_id: string;
  department_name: string;
  head_user_id: string;
  head_name: string;
  head_email: string;
  status: 'pending' | 'confirmed' | 'expired';
  invited_at: string;
  confirmed_at?: string;
  expires_at: string;
}

/**
 * Hook for managing head endorsement invitations
 * Used when participants are from different departments
 */
export function useHeadEndorsements(requestId?: string) {
  const [sending, setSending] = useState(false);

  /**
   * Send email invitations to department heads
   * This requires backend API: POST /api/head-endorsements/invite
   */
  const sendInvitations = async (
    requestId: string,
    departmentHeads: Array<{
      department_id: string;
      department_name: string;
      head_user_id: string;
      head_name: string;
      head_email: string;
    }>
  ) => {
    if (!requestId || departmentHeads.length === 0) {
      Alert.alert('Error', 'Request ID and department heads are required');
      return;
    }

    setSending(true);
    try {
      // Get session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get web app URL from environment
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const baseUrl = supabaseUrl.replace('/rest/v1', '').replace('/rest/v1/', '');
      const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || baseUrl;
      const apiUrl = `${webAppUrl}/api/head-endorsements/invite`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          department_heads: departmentHeads,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to send invitations');
      }

      Alert.alert(
        'Invitations Sent',
        `Email invitations have been sent to ${departmentHeads.length} department head${departmentHeads.length !== 1 ? 's' : ''}.`,
        [{ text: 'OK' }]
      );

      return data.data;
    } catch (error: any) {
      console.error('[useHeadEndorsements] Error:', error);
      Alert.alert(
        'Send Failed',
        error.message || 'Failed to send invitations. Please try again.',
        [{ text: 'OK' }]
      );
      throw error;
    } finally {
      setSending(false);
    }
  };

  /**
   * Fetch head endorsement invitations for a request
   */
  const fetchInvitations = async (requestId: string): Promise<HeadEndorsementInvitation[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const baseUrl = supabaseUrl.replace('/rest/v1', '').replace('/rest/v1/', '');
      const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || baseUrl;
      const apiUrl = `${webAppUrl}/api/head-endorsements?request_id=${requestId}`;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to fetch invitations');
      }

      return data.data || [];
    } catch (error: any) {
      console.error('[useHeadEndorsements] Fetch error:', error);
      return [];
    }
  };

  return {
    sendInvitations,
    fetchInvitations,
    sending,
  };
}

