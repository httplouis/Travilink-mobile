import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

interface UseDuplicateRequestOptions {
  requestId: string;
}

export function useDuplicateRequest({ requestId }: UseDuplicateRequestOptions) {
  const [duplicating, setDuplicating] = useState(false);

  const duplicateRequest = async () => {
    if (!requestId) {
      Alert.alert('Error', 'Request ID is required');
      return;
    }

    setDuplicating(true);
    try {
      // Get session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get web app URL from environment or use Supabase URL as fallback
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const baseUrl = supabaseUrl.replace('/rest/v1', '').replace('/rest/v1/', '');
      const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || baseUrl;
      const apiUrl = `${webAppUrl}/api/requests/${requestId}/duplicate`;

      console.log('[useDuplicateRequest] Duplicating request:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to duplicate request');
      }

      console.log('[useDuplicateRequest] Request duplicated:', data.data.id);

      Alert.alert(
        'Request Duplicated',
        'The request has been duplicated. You can now edit and submit it.',
        [
          {
            text: 'Edit Now',
            onPress: () => {
              // Navigate to edit form based on request type
              // We'll need to fetch the request type first or pass it as parameter
              router.push(`/request/${data.data.id}?edit=true`);
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error: any) {
      console.error('[useDuplicateRequest] Error:', error);
      Alert.alert(
        'Duplicate Failed',
        error.message || 'Failed to duplicate request. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDuplicating(false);
    }
  };

  return {
    duplicateRequest,
    duplicating,
  };
}

