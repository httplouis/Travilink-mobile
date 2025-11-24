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

        // Native flow: For PKCE, Supabase should automatically handle the session
        // when the callback URL matches the redirect URL. Let's check if a session already exists.
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession.session) {
          console.log('[auth/callback] Session already exists, redirecting...');
          hasProcessedRef.current = true;
          router.replace('/(tabs)/dashboard');
          return;
        }

        // If no session exists and we have a code, try to exchange it
        if (!code) {
          console.error('[auth/callback] No code or access_token provided');
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=no_code');
          return;
        }

        console.log('[auth/callback] Exchanging code for session...');
        console.log('[auth/callback] Code length:', code.length);
        
        // Add timeout to code exchange (max 15 seconds for slow networks)
        const exchangeTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Code exchange timeout')), 15000)
        );
        
        // Try to exchange the code - Supabase should automatically retrieve the code verifier
        // The code verifier is stored when signInWithOAuth is called with the same redirect URL
        let exchangeResult;
        try {
          exchangeResult = await Promise.race([
            supabase.auth.exchangeCodeForSession(code),
            exchangeTimeout
          ]);
        } catch (timeoutError) {
          console.error('[auth/callback] Code exchange timeout');
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent('Authentication timed out. Please try again.'));
          return;
        }
        
        const { data, error: sessionError } = exchangeResult as any;

        if (sessionError) {
          // Handle abort errors gracefully
          const errorMessage = sessionError?.message || '';
          const isAbortError = errorMessage.includes('Aborted') || 
                              errorMessage.includes('abort') || 
                              sessionError?.name === 'AbortError' ||
                              errorMessage.includes('AuthRetryableFetchError');
          
          if (isAbortError) {
            // Don't log abort errors - they're noise
            if (__DEV__) {
              console.log('[auth/callback] Code exchange aborted (likely timeout)');
            }
            hasProcessedRef.current = true;
            router.replace('/(auth)/sign-in?error=' + encodeURIComponent('Connection timed out. Please check your internet and try again.'));
            return;
          }
          
          // Log other errors for debugging
          if (__DEV__) {
            console.error('[auth/callback] Code exchange error:', sessionError);
            console.error('[auth/callback] Error message:', sessionError.message);
            console.error('[auth/callback] Error code:', sessionError.status);
          }
          
          // If PKCE error, the code verifier is missing from storage
          // This usually means the redirect URL doesn't match or storage failed
          if (sessionError.message?.includes('code verifier') || 
              sessionError.message?.includes('PKCE') ||
              sessionError.message?.includes('code_verifier') ||
              sessionError.message?.includes('both auth code and code verifier')) {
            console.error('[auth/callback] PKCE error: Code verifier not found');
            console.error('[auth/callback] This usually means:');
            console.error('[auth/callback] 1. The redirect URL in signInWithOAuth doesn\'t match the callback URL');
            console.error('[auth/callback] 2. The storage adapter failed to persist the code verifier');
            console.error('[auth/callback] 3. The code verifier was cleared before the callback');
            
            // Try one more time after a short delay (storage might need more time on slow devices)
            console.log('[auth/callback] Retrying after delay...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000ms to 500ms
            
            const retryTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Retry timeout')), 10000)
            );
            
            let retryResult;
            try {
              retryResult = await Promise.race([
                supabase.auth.exchangeCodeForSession(code),
                retryTimeout
              ]);
            } catch (retryTimeoutError) {
              console.error('[auth/callback] Retry also timed out');
              hasProcessedRef.current = true;
              router.replace('/(auth)/sign-in?error=' + encodeURIComponent('Authentication timed out. Please try again.'));
              return;
            }
            
            const { data: retryData, error: retryError } = retryResult as any;
            if (retryError) {
              console.error('[auth/callback] Retry also failed:', retryError);
              hasProcessedRef.current = true;
              router.replace('/(auth)/sign-in?error=' + encodeURIComponent('Authentication failed. Please close the app completely and try signing in again.'));
              return;
            }
            
            // Retry succeeded
            if (retryData?.session) {
              console.log('[auth/callback] Session created on retry!');
              hasProcessedRef.current = true;
              router.replace('/(tabs)/dashboard');
              return;
            }
          }
          
          // For other errors, show a generic message
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent('Authentication failed. Please try signing in again.'));
          return;
        }

        if (data?.session) {
          console.log('[auth/callback] Session created successfully!');
          hasProcessedRef.current = true;
          router.replace('/(tabs)/dashboard');
        } else {
          console.error('[auth/callback] No session in response');
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=no_session');
        }
      } catch (err: any) {
        // Handle abort errors gracefully - don't log them
        const errorMessage = err?.message || '';
        const isAbortError = errorMessage.includes('Aborted') || 
                            errorMessage.includes('abort') || 
                            err?.name === 'AbortError' ||
                            errorMessage.includes('AuthRetryableFetchError');
        
        if (isAbortError) {
          // Abort errors are usually from timeouts or network issues - don't log
          if (__DEV__) {
            console.log('[auth/callback] Request aborted (likely timeout), redirecting to sign-in');
          }
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent('Connection timed out. Please check your internet and try again.'));
        } else {
          // Log other errors
          console.error('[auth/callback] Unexpected error:', err);
          hasProcessedRef.current = true;
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent(err.message || 'unexpected_error'));
        }
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
