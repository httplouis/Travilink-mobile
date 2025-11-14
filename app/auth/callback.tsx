import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshProfile, session } = useAuth();
  const hasProcessedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Watch for session changes and redirect when session is available
  useEffect(() => {
    if (session && hasProcessedRef.current) {
      console.log('[auth/callback] Session detected after processing, redirecting...');
      setShouldRedirect(true);
    }
  }, [session]);

  // Main callback processing effect - ALL hooks must be declared before any conditional returns
  useEffect(() => {
    // CRITICAL: Check hasProcessedRef BEFORE anything else
    // If we've already processed, just wait for redirect (don't process again)
    if (hasProcessedRef.current) {
      console.log('[auth/callback] Already processed, waiting for redirect...');
      // If we already have a session after processing, redirect immediately
      if (session) {
        console.log('[auth/callback] Session available after processing, redirecting...');
        setShouldRedirect(true);
      }
      return;
    }

    // If we already have a session and no params, just redirect
    if (session && Object.keys(params).length === 0) {
      console.log('[auth/callback] Session exists but no params, redirecting...');
      hasProcessedRef.current = true;
      setShouldRedirect(true);
      return;
    }

    // Early exit if no params and no session - might be a re-render
    if (Object.keys(params).length === 0 && !session) {
      console.log('[auth/callback] No params and no session, might be re-render, waiting...');
      return;
    }

    const handleCallback = async () => {
      // Prevent multiple executions
      if (isProcessingRef.current) {
        console.log('[auth/callback] Already processing, skipping...');
        return;
      }
      isProcessingRef.current = true;

      try {
        console.log('[auth/callback] Platform:', Platform.OS);
        console.log('[auth/callback] Params:', JSON.stringify(params, null, 2));
        
        // On web, Supabase may redirect with access_token in hash fragment
        // On native, it can also use access_token in hash (travilink://auth/callback#access_token=...)
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
            console.log('[auth/callback] Found hash in params["#"]:', { hasAccessToken: !!accessToken, hasCode: !!code });
          }
        }
        
        // Parse URL parameter (from sign-in redirect) - handles both native deep links and web
        const urlParam = params.url as string;
        if (urlParam) {
          try {
            // Extract hash fragment from deep link URL (e.g., travilink://auth/callback#access_token=...)
            const hashMatch = urlParam.match(/#(.+)/);
            if (hashMatch && hashMatch[1]) {
              hashParams = new URLSearchParams(hashMatch[1]);
              if (!accessToken) accessToken = hashParams.get('access_token');
              if (!code) code = hashParams.get('code');
              if (!error) error = hashParams.get('error');
            }
            
            // Also try to parse as URL (for web or if it's a full URL)
            try {
              const url = new URL(urlParam);
              if (!code) code = url.searchParams.get('code');
              if (!error) error = url.searchParams.get('error');
            } catch (e) {
              // Not a valid URL, that's okay - we already tried hash parsing
            }
          } catch (e) {
            console.log('[auth/callback] Failed to parse URL param:', e);
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
        
        // Check for error first (from params or hash)
        if (!error) {
          error = (params.error as string) || (params['#error'] as string);
        }
        
        if (error) {
          console.error('[auth/callback] Error:', error);
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent(error));
          return;
        }

        // Try to get code from params (native flow - direct params)
        if (!code) {
          code = (params.code as string) || (params['#code'] as string);
        }
        
        // Try to get access_token from params (native flow - direct params)
        if (!accessToken) {
          accessToken = (params.access_token as string) || (params['#access_token'] as string);
        }

        // If we have an access_token (web or native flow with hash), set the session directly
        if (accessToken) {
          console.log('[auth/callback] Setting session from access_token (platform:', Platform.OS, ')');
          
          // CRITICAL: Mark as processed IMMEDIATELY to prevent re-processing on re-renders
          // This must happen BEFORE async operations to prevent race conditions
          hasProcessedRef.current = true;
          
          // Extract other tokens from hash or params
          let refreshToken = '';
          if (hashParams) {
            refreshToken = hashParams.get('refresh_token') || '';
          } else {
            refreshToken = (params.refresh_token as string) || '';
          }
          
          // Set the session manually
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !sessionData.session) {
            console.error('[auth/callback] Failed to set session:', sessionError);
            // Reset hasProcessedRef on error so user can retry
            hasProcessedRef.current = false;
            router.replace('/(auth)/sign-in?error=' + encodeURIComponent(sessionError?.message || 'failed_to_set_session'));
            return;
          }

          console.log('[auth/callback] Session set successfully, session ID:', sessionData.session?.user?.id);
          
          // Clear hash on web before redirecting
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          
          // Verify session is accessible
          const { data: verifySession } = await supabase.auth.getSession();
          if (verifySession.session) {
            console.log('[auth/callback] Session verified, proceeding with redirect...');
          }
          
          // Refresh profile, but don't wait if it fails - just redirect
          try {
            await refreshProfile();
          } catch (profileError) {
            console.warn('[auth/callback] Profile refresh failed, but continuing:', profileError);
          }
          
          // Small delay to ensure AuthContext has updated
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Use Redirect component instead of router.replace for more reliable navigation
          setShouldRedirect(true);
          
          // Force redirect after a short delay to ensure state update
          setTimeout(() => {
            setShouldRedirect(true);
          }, 100);
          
          return;
        }

        // Native flow: exchange code for session
        if (!code) {
          // If we've already processed, don't redirect to sign-in - just wait
          if (hasProcessedRef.current) {
            console.log('[auth/callback] Already processed, waiting for session...');
            return;
          }
          
          // If we already have a session and no params, just redirect (might be a re-render after redirect)
          if (session) {
            console.log('[auth/callback] No code/token but session exists, redirecting to dashboard...');
            hasProcessedRef.current = true;
            setShouldRedirect(true);
            return;
          }
          
          // If we have no params and no session, this might be a re-render - don't process
          if (Object.keys(params).length === 0) {
            console.log('[auth/callback] No params, no session, no code - likely re-render, skipping...');
            return;
          }
          
          console.error('[auth/callback] No code or access_token provided. Params:', JSON.stringify(params, null, 2));
          if (urlParam) {
            console.error('[auth/callback] URL param:', urlParam);
          }
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            console.error('[auth/callback] Full URL:', window.location.href);
          }
          router.replace('/(auth)/sign-in?error=no_code');
          return;
        }

        console.log('[auth/callback] Exchanging code for session...');
        
        // CRITICAL: Mark as processed IMMEDIATELY to prevent re-processing on re-renders
        // This must happen BEFORE async operations to prevent race conditions
        hasProcessedRef.current = true;
        
        // Exchange code for session
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error('[auth/callback] Session error:', sessionError);
          // Reset hasProcessedRef on error so user can retry
          hasProcessedRef.current = false;
          router.replace('/(auth)/sign-in?error=' + encodeURIComponent(sessionError.message));
          return;
        }

        if (data.session) {
          console.log('[auth/callback] Session created successfully, session ID:', data.session?.user?.id);
          
          // Verify session is accessible
          const { data: verifySession } = await supabase.auth.getSession();
          if (verifySession.session) {
            console.log('[auth/callback] Session verified, proceeding with redirect...');
          }
          
          // Refresh profile, but don't wait if it fails - just redirect
          try {
            await refreshProfile();
          } catch (profileError) {
            console.warn('[auth/callback] Profile refresh failed, but continuing:', profileError);
          }
          
          // Small delay to ensure AuthContext has updated
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Use Redirect component instead of router.replace for more reliable navigation
          setShouldRedirect(true);
          
          // Force redirect after a short delay to ensure state update
          setTimeout(() => {
            setShouldRedirect(true);
          }, 100);
        } else {
          console.error('[auth/callback] No session in response');
          router.replace('/(auth)/sign-in?error=no_session');
        }
      } catch (err: any) {
        console.error('[auth/callback] Unexpected error:', err);
        router.replace('/(auth)/sign-in?error=' + encodeURIComponent(err.message || 'unexpected_error'));
      } finally {
        isProcessingRef.current = false;
      }
    };

    handleCallback();
    
    // Cleanup function to reset processing flag if component unmounts
    return () => {
      isProcessingRef.current = false;
    };
  }, [params, router, refreshProfile, session]);

  // NOW we can do conditional returns - all hooks have been declared
  // CRITICAL: If we've already processed and have a session, redirect immediately
  // This prevents re-processing on re-renders with empty params
  if (hasProcessedRef.current && session) {
    console.log('[auth/callback] Already processed with session, redirecting...');
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // If we should redirect, use Redirect component (more reliable than router.replace)
  if (shouldRedirect) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // If we've already processed but no session yet, just wait (don't process again)
  if (hasProcessedRef.current) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.text}>Completing sign in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7a0019" />
      <Text style={styles.text}>Completing sign in...</Text>
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

