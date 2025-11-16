import { useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const hasProcessedRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // If already processed, don't do anything
    if (hasProcessedRef.current || isProcessingRef.current) {
      return;
    }

    const handleCallback = async () => {
      isProcessingRef.current = true;

      try {
        console.log('[auth/callback] Processing callback...');
        
        let code: string | null = null;
        let error: string | null = null;
        let accessToken: string | null = null;
        let hashParams: URLSearchParams | null = null;
        
        // On web, expo-router passes hash fragment as a param with key "#"
        if (Platform.OS === 'web' && params['#']) {
          const hashValue = params['#'] as string;
          if (hashValue && (hashValue.startsWith('access_token=') || hashValue.includes('&') || hashValue.includes('='))) {
            hashParams = new URLSearchParams(hashValue);
            accessToken = hashParams.get('access_token');
            code = hashParams.get('code');
            error = hashParams.get('error');
          }
        }
        
        // Parse URL parameter (from sign-in redirect)
        const urlParam = params.url as string;
        if (urlParam) {
          try {
            const hashMatch = urlParam.match(/#(.+)/);
            if (hashMatch && hashMatch[1]) {
              hashParams = new URLSearchParams(hashMatch[1]);
              if (!accessToken) accessToken = hashParams.get('access_token');
              if (!code) code = hashParams.get('code');
              if (!error) error = hashParams.get('error');
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        // On web, also check window.location.hash (fallback)
        if (Platform.OS === 'web' && typeof window !== 'undefined' && !hashParams) {
          const hash = window.location.hash;
          if (hash && hash.length > 1) {
            hashParams = new URLSearchParams(hash.substring(1));
            if (!accessToken) accessToken = hashParams.get('access_token');
            if (!code) code = hashParams.get('code');
            if (!error) error = hashParams.get('error');
          }
        }
        
        // Check for error
        if (!error) {
          error = (params.error as string) || (params['#error'] as string);
        }
        
        if (error) {
          console.error('[auth/callback] Error:', error);
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent(error));
          return;
        }

        // Try to get code/token from params
        if (!code) {
          code = (params.code as string) || (params['#code'] as string);
        }
        if (!accessToken) {
          accessToken = (params.access_token as string) || (params['#access_token'] as string);
        }

        // If we have access_token, set session and redirect IMMEDIATELY
        if (accessToken) {
          console.log('[auth/callback] Setting session from access_token...');
          
          let refreshToken = '';
          if (hashParams) {
            refreshToken = hashParams.get('refresh_token') || '';
          } else {
            refreshToken = (params.refresh_token as string) || '';
          }
          
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !sessionData.session) {
            console.error('[auth/callback] Failed to set session:', sessionError);
            hasProcessedRef.current = true;
            router.replace('/(auth)/sign-in?error=' + encodeURIComponent(sessionError?.message || 'failed_to_set_session'));
            return;
          }

          console.log('[auth/callback] Session set successfully! Waiting for persistence...');
          
          // Wait a moment to ensure session is persisted to storage
          // This allows AuthContext to pick up the session change
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify session is still set (in case of race conditions)
          const { data: verifyData } = await supabase.auth.getSession();
          if (verifyData.session) {
            console.log('[auth/callback] Session verified, redirecting to dashboard...');
            
            // Clear hash on web
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
            
            hasProcessedRef.current = true;
            router.replace('/(tabs)/dashboard');
          } else {
            console.error('[auth/callback] Session not persisted');
            hasProcessedRef.current = true;
            router.replace('/(auth)/sign-in?error=session_not_persisted');
          }
          return;
        }

        // Native flow: exchange code for session
        if (!code) {
          console.error('[auth/callback] No code or access_token provided');
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=no_code');
          return;
        }

        console.log('[auth/callback] Exchanging code for session...');
        
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error('[auth/callback] Session error:', sessionError);
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent(sessionError.message));
          return;
        }

        if (data.session) {
          console.log('[auth/callback] Session created successfully! Waiting for persistence...');
          
          // Wait a moment to ensure session is persisted to storage
          // This allows AuthContext to pick up the session change
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify session is still set (in case of race conditions)
          const { data: verifyData } = await supabase.auth.getSession();
          if (verifyData.session) {
            console.log('[auth/callback] Session verified, redirecting to dashboard...');
            hasProcessedRef.current = true;
            router.replace('/(tabs)/dashboard');
          } else {
            console.error('[auth/callback] Session not persisted');
            hasProcessedRef.current = true;
            router.replace('/(auth)/sign-in?error=session_not_persisted');
          }
        } else {
          console.error('[auth/callback] No session in response');
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=no_session');
        }
      } catch (err: any) {
        console.error('[auth/callback] Unexpected error:', err);
        hasProcessedRef.current = true;
        router.replace('/(auth)/sign-in?error=' + encodeURIComponent(err.message || 'unexpected_error'));
      } finally {
        isProcessingRef.current = false;
      }
    };

    handleCallback();
  }, [params, router]);

  // Show loading while processing
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7a0019" />
      <Text style={styles.text}>Logging in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
  },
});
