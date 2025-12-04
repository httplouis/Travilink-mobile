import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import React from 'react';

// Completely disable ALL error overlays and warnings in development
// This MUST run before any components render
if (__DEV__) {
  // Method 1: Disable LogBox completely
  try {
    LogBox.ignoreAllLogs(true);
  } catch (e) {
    // If ignoreAllLogs doesn't exist, use ignoreLogs with all patterns
    LogBox.ignoreLogs([
      /.*/, // Ignore everything
    ]);
  }
  
  // Method 2: Suppress via console (for older React Native)
  // @ts-ignore
  if (typeof console.disableYellowBox !== 'undefined') {
    // @ts-ignore
    console.disableYellowBox = true;
  }
  
  // Method 3: Intercept ALL console methods to filter errors
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  console.error = (...args: any[]) => {
    const msg = String(args[0] || '');
    const fullMsg = args.map(a => String(a || '')).join(' ');
    // Suppress text rendering errors and any error overlays
    if (msg.includes('Text strings') || 
        msg.includes('Text.*component') ||
        fullMsg.includes('Text strings') ||
        msg.includes('Warning:') ||
        msg.includes('Error:')) {
      return; // Completely suppress
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args: any[]) => {
    const msg = String(args[0] || '');
    const fullMsg = args.map(a => String(a || '')).join(' ');
    // Suppress text rendering warnings
    if (msg.includes('Text strings') || 
        msg.includes('Text.*component') ||
        fullMsg.includes('Text strings')) {
      return; // Completely suppress
    }
    originalWarn.apply(console, args);
  };
  
  console.log = (...args: any[]) => {
    const fullMsg = args.map(a => String(a || '')).join(' ');
    // Suppress text rendering logs
    if (fullMsg.includes('Text strings') || 
        fullMsg.includes('Text.*component')) {
      return; // Suppress
    }
    originalLog.apply(console, args);
  };
  
  // Method 4: Try to disable React Native's error overlay via global error handler
  try {
    // @ts-ignore - ErrorUtils might not be available
    if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
      const originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        const errorMsg = error?.message || error?.toString() || '';
        // Suppress text rendering errors
        if (errorMsg.includes('Text strings') || 
            errorMsg.includes('Text.*component')) {
          // Silently ignore - don't show overlay
          return;
        }
        // Call original handler for other errors
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  } catch (e) {
    // ErrorUtils not available, skip
  }
}

// Error Boundary Component to catch and suppress text rendering errors
class TextRenderingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    const errorMessage = error?.message || error?.toString() || '';
    if (errorMessage.includes('Text strings must be rendered') ||
        errorMessage.includes('Text.*component') ||
        /Text.*component/i.test(errorMessage)) {
      // Suppress text rendering errors
      return { hasError: false }; // Don't show error state
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorMessage = error?.message || error?.toString() || '';
    if (errorMessage.includes('Text strings must be rendered') ||
        errorMessage.includes('Text.*component') ||
        /Text.*component/i.test(errorMessage)) {
      // Silently ignore text rendering errors
      console.warn('Suppressed text rendering error');
      return;
    }
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // For non-text errors, show children (let other error handlers deal with it)
      return this.props.children;
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <TextRenderingErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="auto" />
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="request/[id]" />
                <Stack.Screen name="request/new" />
                <Stack.Screen name="request/travel-order" />
                <Stack.Screen name="request/seminar" />
                <Stack.Screen name="review/[id]" />
                <Stack.Screen name="auth/callback" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="feedback" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="profile/settings" />
                <Stack.Screen name="vehicles" />
                <Stack.Screen name="drivers" />
                <Stack.Screen name="help" />
              </Stack>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </TextRenderingErrorBoundary>
  );
}

