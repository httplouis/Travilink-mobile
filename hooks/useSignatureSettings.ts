import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSignatureSettings() {
  const { profile } = useAuth();
  const [signature, setSignature] = useState<string | null>(null);
  const [autoSignature, setAutoSignature] = useState<string | null>(null);
  const [isAutoSignEnabled, setIsAutoSignEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchSignature = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('signature_url, automatic_signature, is_auto_sign_enabled')
          .eq('id', profile.id)
          .single();

        if (error) {
          // Handle missing columns gracefully (error code 42703 = column does not exist)
          if (error.code === '42703' || error.code === 'PGRST116') {
            console.log('Signature columns not found, using defaults');
            setSignature(null);
            setAutoSignature(null);
            setIsAutoSignEnabled(false);
            setLoading(false);
            return;
          }
          throw error;
        }
        
        setSignature(data?.signature_url || null);
        setAutoSignature(data?.automatic_signature || null);
        setIsAutoSignEnabled(data?.is_auto_sign_enabled || false);
      } catch (error: any) {
        // Log error but don't crash the app
        console.error('Error fetching signature:', error?.message || error);
        setSignature(null);
        setAutoSignature(null);
        setIsAutoSignEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSignature();
  }, [profile?.id]);

  const saveSignature = async (signatureDataUrl: string) => {
    if (!profile?.id) throw new Error('Not authenticated');

    setSaving(true);
    try {
      // Get Supabase URL and construct API URL
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const baseUrl = supabaseUrl.replace('/rest/v1', '').replace('/rest/v1/', '');
      const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || baseUrl;
      const apiUrl = `${webAppUrl}/api/settings/signature`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ signature: signatureDataUrl }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save signature');
      }

      // Update local state
      setSignature(signatureDataUrl);

      // Also update directly in users table as fallback
      await supabase
        .from('users')
        .update({ signature_url: signatureDataUrl })
        .eq('id', profile.id);

      return { success: true };
    } catch (error: any) {
      console.error('Error saving signature:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    signature,
    autoSignature,
    isAutoSignEnabled,
    loading,
    saving,
    saveSignature,
  };
}

