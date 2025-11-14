import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
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
        // Use SecureStore on native
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error('Error getting item from storage:', error);
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
        // Use SecureStore on native
        // Note: SecureStore has a 2048 byte limit on iOS
        // Supabase session data can be larger, so we try SecureStore first
        // If it fails silently (value too large), the session won't persist
        // but it will still work for the current session
        try {
          if (value.length > 2048) {
            console.warn(`[Supabase Storage] Value for key "${key}" is ${value.length} bytes, exceeding SecureStore limit of 2048 bytes. Session may not persist.`);
          }
          await SecureStore.setItemAsync(key, value);
        } catch (secureStoreError: any) {
          // If SecureStore fails due to size, log but don't throw
          // The session will work but won't persist across app restarts
          console.error(`[Supabase Storage] Failed to store large value in SecureStore (${value.length} bytes):`, secureStoreError.message);
          // Session will still be available in memory for current session
        }
      }
    } catch (error) {
      console.error('Error setting item in storage:', error);
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
        // Use SecureStore on native
        await SecureStore.deleteItemAsync(key);
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

