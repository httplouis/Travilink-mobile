import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking as RNLinking,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn } = useAuth();
  const params = useLocalSearchParams();

  // Check for error from OAuth callback
  React.useEffect(() => {
    if (params.error) {
      const errorParam = decodeURIComponent(params.error as string);
      setError(errorParam);
    }
  }, [params.error]);

  // Check if email is a student email
  const isStudentEmail = (email: string) => {
    return email.toLowerCase().endsWith('@student.mseuf.edu.ph');
  };

  // Handle Microsoft OAuth login (for student emails or if user prefers)
  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the redirect URL based on platform
      let redirectTo: string;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // For web, use the full URL with the callback route
        redirectTo = `${window.location.origin}/auth/callback`;
      } else {
        // For iOS/Android, use the app's deep link scheme directly
        // Hardcode the scheme to avoid Expo dev URL issues
        redirectTo = 'travilink://auth/callback';
      }

      console.log('[sign-in] Starting OAuth with redirect:', redirectTo);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectTo,
          scopes: 'openid profile email User.Read',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        // Log for debugging only
        if (__DEV__) {
          console.log('[sign-in] OAuth error:', oauthError);
        }
        setError('Failed to connect to Microsoft. Please try again or use email/password login.');
        setLoading(false);
        return;
      }

      // Supabase returns a URL that needs to be opened in a browser
      if (data?.url) {
        console.log('[sign-in] Opening OAuth URL in browser:', data.url);
        
        if (Platform.OS === 'web') {
          // On web, redirect directly
          if (typeof window !== 'undefined') {
            window.location.href = data.url;
          }
        } else {
          // On iOS/Android, open in browser and handle callback
          try {
            // Use openAuthSessionAsync which handles the OAuth flow properly
            const result = await WebBrowser.openAuthSessionAsync(
              data.url,
              redirectTo
            );

            console.log('[sign-in] OAuth result type:', result.type);
            console.log('[sign-in] OAuth result:', JSON.stringify(result, null, 2));

            if (result.type === 'success' && result.url) {
              // The URL contains the callback with tokens
              console.log('[sign-in] Callback URL:', result.url);
              
              // Parse the callback URL - handle both hash fragments and query params
              let code: string | null = null;
              let error: string | null = null;
              let accessToken: string | null = null;
              
              // Try to extract from hash fragment (most common for OAuth callbacks)
              const hashMatch = result.url.match(/#(.+)/);
              if (hashMatch && hashMatch[1]) {
                const hashParams = new URLSearchParams(hashMatch[1]);
                accessToken = hashParams.get('access_token');
                code = hashParams.get('code');
                error = hashParams.get('error');
              }
              
              // Also try to parse as URL for query params (if it's a full URL)
              try {
                const url = new URL(result.url);
                if (!code) code = url.searchParams.get('code');
                if (!error) error = url.searchParams.get('error');
              } catch (e) {
                // Not a valid URL, that's okay - we already tried hash parsing
              }
              
              if (error) {
                // Log for debugging only (don't expose raw error to users)
                if (__DEV__) {
                  console.log('[sign-in] OAuth callback error:', error);
                }
                
                // Provide user-friendly error messages
                let errorMessage = 'Authentication failed. Please try again.';
                if (error === 'server_error') {
                  errorMessage = 'Microsoft authentication service is temporarily unavailable. Please try again later or use email/password login.';
                } else if (error === 'access_denied') {
                  errorMessage = 'Authentication was cancelled. Please try again.';
                } else if (error === 'invalid_request') {
                  errorMessage = 'Invalid authentication request. Please try again.';
                }
                
                setError(errorMessage);
                setLoading(false);
                return;
              }

              // CRITICAL: The callback URL format must match the redirect URL format
              // Supabase stores the code verifier with a key based on the redirect URL
              // If the formats don't match, Supabase won't find the code verifier
              console.log('[sign-in] Callback URL received:', result.url);
              console.log('[sign-in] Expected redirect URL:', redirectTo);
              
              // Normalize the callback URL to match the redirect URL format
              // Extract just the path/query from the callback URL
              let normalizedCallbackUrl = result.url;
              try {
                // If the callback URL is a full URL, extract the relevant parts
                const callbackUrlObj = new URL(result.url);
                // Use the scheme and path from redirectTo, but keep query/hash from callback
                if (redirectTo.startsWith('travilink://')) {
                  // For deep links, reconstruct with the same scheme
                  normalizedCallbackUrl = `travilink://auth/callback${callbackUrlObj.search}${callbackUrlObj.hash}`;
                }
              } catch (e) {
                // If URL parsing fails, use the original URL
                console.warn('[sign-in] Could not parse callback URL, using as-is');
              }
              
              console.log('[sign-in] Normalized callback URL:', normalizedCallbackUrl);
              console.log('[sign-in] Passing callback URL to route...');
              router.push(`/auth/callback?url=${encodeURIComponent(normalizedCallbackUrl)}`);
              setLoading(false);
            } else if (result.type === 'cancel') {
              console.log('[sign-in] User cancelled OAuth');
              setLoading(false);
            } else {
              console.error('[sign-in] OAuth failed:', result);
              setError('Authentication was cancelled or failed');
              setLoading(false);
            }
          } catch (browserError: any) {
            console.error('[sign-in] Browser error:', browserError);
            setError(browserError.message || 'Failed to open browser');
            setLoading(false);
          }
        }
      } else {
        console.error('[sign-in] No URL returned from OAuth');
        setError('Failed to start authentication');
        setLoading(false);
      }
      
    } catch (err: any) {
      console.error('[sign-in] Microsoft login error:', err);
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    const emailLower = email.toLowerCase().trim();

    // Check if it's a student email - redirect to Microsoft Teams
    if (isStudentEmail(emailLower)) {
      Alert.alert(
        'Student Account Detected',
        'Student accounts must sign in through Microsoft Teams. Would you like to open Teams now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Teams',
            onPress: () => {
              // Try to open Teams app first, fallback to website
              const teamsAppUrl = 'msteams://teams.microsoft.com';
              const teamsWebUrl = 'https://teams.microsoft.com';
              
              RNLinking.canOpenURL(teamsAppUrl).then((supported) => {
                if (supported) {
                  RNLinking.openURL(teamsAppUrl);
                } else {
                  RNLinking.openURL(teamsWebUrl);
                }
              }).catch(() => {
                RNLinking.openURL(teamsWebUrl);
              });
            },
          },
          {
            text: 'Try OAuth',
            onPress: handleMicrosoftLogin,
          },
        ]
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signIn(emailLower, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo/Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>TL</Text>
            </View>
            <Text style={styles.title}>TraveLink</Text>
            <Text style={styles.subtitle}>Smart Campus Transport System</Text>
          </View>

          {/* Microsoft Login Button (Primary) */}
          <TouchableOpacity
            style={styles.microsoftButton}
            onPress={handleMicrosoftLogin}
            disabled={loading}
          >
            <View style={styles.microsoftLogo}>
              {/* Microsoft Logo - 4 colored squares */}
              <View style={[styles.msSquare, { backgroundColor: '#F25022' }]} />
              <View style={[styles.msSquare, { backgroundColor: '#7FBA00' }]} />
              <View style={[styles.msSquare, { backgroundColor: '#00A4EF' }]} />
              <View style={[styles.msSquare, { backgroundColor: '#FFB900' }]} />
            </View>
            <Text style={styles.microsoftButtonText}>Sign in with Microsoft</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@mseuf.edu.ph"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#999" 
                />
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              Note: Student emails (@student.mseuf.edu.ph) must sign in through Microsoft Teams
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7a0019',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7a0019',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  microsoftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  microsoftLogo: {
    width: 24,
    height: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  msSquare: {
    width: 11,
    height: 11,
  },
  microsoftButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#7a0019',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    marginTop: 16,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
