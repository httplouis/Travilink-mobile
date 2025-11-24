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
        // This is the full callback URL from the OAuth provider
        const urlParam = params.url as string;
        if (urlParam) {
          try {
            // Try to parse as a full URL first
            const callbackUrl = new URL(urlParam);
            
            // Extract from hash fragment (OAuth tokens usually in hash)
            const hash = callbackUrl.hash.substring(1); // Remove leading #
            if (hash) {
              hashParams = new URLSearchParams(hash);
              if (!accessToken) accessToken = hashParams.get('access_token');
              if (!code) code = hashParams.get('code');
              if (!error) error = hashParams.get('error');
            }
            
            // Also check query params (some OAuth flows use query params)
            if (!code) code = callbackUrl.searchParams.get('code');
            if (!error) error = callbackUrl.searchParams.get('error');
            
            // Fallback: try regex match for hash
            if (!hashParams) {
              const hashMatch = urlParam.match(/#(.+)/);
              if (hashMatch && hashMatch[1]) {
                hashParams = new URLSearchParams(hashMatch[1]);
                if (!accessToken) accessToken = hashParams.get('access_token');
                if (!code) code = hashParams.get('code');
                if (!error) error = hashParams.get('error');
              }
            }
          } catch (e) {
            // If URL parsing fails, try regex match
            try {
              const hashMatch = urlParam.match(/#(.+)/);
              if (hashMatch && hashMatch[1]) {
                hashParams = new URLSearchParams(hashMatch[1]);
                if (!accessToken) accessToken = hashParams.get('access_token');
                if (!code) code = hashParams.get('code');
                if (!error) error = hashParams.get('error');
              }
            } catch (regexError) {
              // Ignore parsing errors
            }
          }
        }
        
        // On web, also check window.location.hash (fallback)
        if (Platform.OS === 'web' && typeof (global as any).window !== 'undefined' && !hashParams) {
          const window = (global as any).window;
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
          // Log for debugging only (don't expose raw error to users)
          if (__DEV__) {
            console.log('[auth/callback] Error:', error);
          }
          hasProcessedRef.current = true;
          
          // Provide user-friendly error messages
          let errorMessage = 'Authentication failed. Please try again.';
          if (error === 'server_error') {
            errorMessage = 'Microsoft authentication service is temporarily unavailable. Please try again later or use email/password login.';
          } else if (error === 'access_denied') {
            errorMessage = 'Authentication was cancelled. Please try again.';
          } else if (error === 'invalid_request') {
            errorMessage = 'Invalid authentication request. Please try again.';
          }
          
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent(errorMessage));
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
          
          // If no refresh token, try to get session from Supabase (it might have it stored)
          if (!refreshToken) {
            console.warn('[auth/callback] No refresh_token in callback, Supabase will handle token refresh');
          }
          
          // setSession requires both tokens, so if we don't have refresh_token, use code exchange instead
          if (!refreshToken && code) {
            console.log('[auth/callback] No refresh_token, using code exchange instead...');
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError || !exchangeData.session) {
              console.error('[auth/callback] Code exchange failed:', exchangeError);
              hasProcessedRef.current = true;
              router.replace('/(auth)/sign-in?error=' + encodeURIComponent(exchangeError?.message || 'code_exchange_failed'));
              return;
            }
            // Continue with exchangeData.session below
            const verifyData = await supabase.auth.getSession();
            if (verifyData.data.session) {
              hasProcessedRef.current = true;
              router.replace('/(tabs)/dashboard');
              return;
            }
          }
          
          // If we have both tokens, use setSession
          if (!refreshToken) {
            console.error('[auth/callback] Missing refresh_token and no code available');
            hasProcessedRef.current = true;
            router.replace('/(auth)/sign-in?error=missing_refresh_token');
            return;
          }
          
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            // If refresh token error, try to exchange code instead if available
            if (sessionError.message?.includes('refresh_token') && code) {
              console.log('[auth/callback] Refresh token error, trying code exchange instead...');
              const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (!exchangeError && exchangeData.session) {
                console.log('[auth/callback] Code exchange successful');
                // Continue with exchangeData.session
                const verifyData = await supabase.auth.getSession();
                if (verifyData.data.session) {
                  hasProcessedRef.current = true;
                  router.replace('/(tabs)/dashboard');
                  return;
                }
              }
            }
            console.error('[auth/callback] Failed to set session:', sessionError);
            hasProcessedRef.current = true;
            router.replace('/(auth)/sign-in?error=' + encodeURIComponent(sessionError?.message || 'failed_to_set_session'));
            return;
          }
          
          if (!sessionData.session) {
            console.error('[auth/callback] No session in response');
            hasProcessedRef.current = true;
            router.replace('/(auth)/sign-in?error=no_session');
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
            if (Platform.OS === 'web' && typeof (global as any).window !== 'undefined') {
              const window = (global as any).window;
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

        // Native flow: Check if Supabase already has a session (it might have auto-handled the OAuth)
        // Supabase stores the PKCE code verifier and can automatically exchange the code
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession.session) {
          console.log('[auth/callback] Session already exists, redirecting...');
          hasProcessedRef.current = true;
          router.replace('/(tabs)/dashboard');
          return;
        }

        // If no session exists and we have a code, try to exchange it
        // But first, let's check if the URL contains the full callback URL that Supabase expects
        if (!code) {
          console.error('[auth/callback] No code or access_token provided');
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=no_code');
          return;
        }

        console.log('[auth/callback] Exchanging code for session...');
        
        // For PKCE to work, we need to use the same Supabase client instance
        // that initiated the OAuth flow. The code verifier is stored in the client's storage.
        // If we're here, it means Supabase didn't auto-handle it, so we need to exchange manually.
        // However, if the code verifier is missing, it means we're using a different client instance.
        // Let's try the exchange - Supabase should have the verifier stored.
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          // Log the error for debugging
          if (__DEV__) {
            console.log('[auth/callback] Code exchange error:', sessionError);
          }
          
          // If PKCE error, it means the code verifier is missing
          // This can happen if the client instance changed. Let's try to get session again
          // after a brief delay (Supabase might be processing it in the background)
          if (sessionError.message?.includes('code verifier') || sessionError.message?.includes('PKCE')) {
            console.log('[auth/callback] PKCE error detected, waiting for Supabase to auto-handle...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: retrySession } = await supabase.auth.getSession();
            if (retrySession.session) {
              console.log('[auth/callback] Session found after retry, redirecting...');
              hasProcessedRef.current = true;
              router.replace('/(tabs)/dashboard');
              return;
            }
          }
          
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent('Authentication failed. Please try signing in again.'));
          return;
        }

        if (data.session) {
          console.log('[auth/callback] Session created successfully! Waiting for persistence...');
          
          // Wait a moment to ensure session is persisted to storage
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify session is still set
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
