import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Missing Supabase environment variables. Please create a .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY';
  console.error(errorMsg);
  // Don't throw here to allow app to start, but auth will fail gracefully
}

// Custom storage adapter that uses SecureStore on native, localStorage on web
const storageAdapter = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } else {
        // Try SecureStore first, then AsyncStorage (for large values)
        try {
          const value = await SecureStore.getItemAsync(key);
          if (value) {
            // Debug: Log when code verifier is retrieved (but don't log the value for security)
            if (__DEV__ && key.includes('code-verifier')) {
              console.log(`[Supabase Storage] Retrieved code verifier from SecureStore for key: ${key}`);
            }
            return value;
          }
        } catch (secureStoreError) {
          // SecureStore might not have the value (or it's too large), try AsyncStorage
          if (__DEV__ && key.includes('code-verifier')) {
            console.log(`[Supabase Storage] SecureStore failed for code verifier, trying AsyncStorage...`);
          }
        }
        // Fallback to AsyncStorage (for large values stored there)
        const asyncValue = await AsyncStorage.getItem(key);
        if (asyncValue && __DEV__ && key.includes('code-verifier')) {
          console.log(`[Supabase Storage] Retrieved code verifier from AsyncStorage for key: ${key}`);
        }
        return asyncValue;
      }
    } catch (error) {
      if (__DEV__) {
        console.error(`[Supabase Storage] Error getting item "${key}" from storage:`, error);
      }
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } else {
        // On native, use AsyncStorage for large values (>2048 bytes) due to SecureStore limit
        // For smaller values, try SecureStore first, fallback to AsyncStorage
        if (value.length > 2048) {
          // Use AsyncStorage for large values (no size limit)
          if (__DEV__) {
            console.log(`[Supabase Storage] Using AsyncStorage for large value (${value.length} bytes) for key "${key}"`);
          }
          await AsyncStorage.setItem(key, value);
        } else {
          // Try SecureStore for smaller values (more secure)
          // IMPORTANT: Code verifier must be stored securely and persist across app state changes
          try {
            await SecureStore.setItemAsync(key, value);
            if (__DEV__ && key.includes('code-verifier')) {
              console.log(`[Supabase Storage] Stored code verifier in SecureStore for key: ${key}`);
            }
          } catch (secureStoreError: any) {
            // Fallback to AsyncStorage if SecureStore fails
            if (__DEV__) {
              console.warn(`[Supabase Storage] SecureStore failed for key "${key}", using AsyncStorage:`, secureStoreError.message);
            }
            await AsyncStorage.setItem(key, value);
            if (__DEV__ && key.includes('code-verifier')) {
              console.log(`[Supabase Storage] Stored code verifier in AsyncStorage for key: ${key}`);
            }
          }
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error(`[Supabase Storage] Error setting item "${key}" in storage:`, error);
      }
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        // Remove from both SecureStore and AsyncStorage (in case it's in either)
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (secureStoreError) {
          // Ignore if not in SecureStore
        }
        try {
          await AsyncStorage.removeItem(key);
        } catch (asyncStorageError) {
          // Ignore if not in AsyncStorage
        }
      }
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Only detect session in URL on web
    // Handle refresh token errors gracefully
    flowType: 'pkce', // Use PKCE flow for better security and token handling
  },
  global: {
    fetch: (url, options = {}) => {
      // Add timeout to fetch requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per request
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  },
});

// Listen for auth errors and handle refresh token failures
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('[Supabase] Token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('[Supabase] User signed out');
  }
});

