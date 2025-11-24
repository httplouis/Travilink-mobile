import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform, Linking } from 'react-native';
import { formatPDFFilename } from '@/lib/utils/pdf-helpers';
import { supabase } from '@/lib/supabase/client';

interface UseRequestPDFOptions {
  requestId: string;
  requestNumber?: string | null;
  requesterName?: string | null;
  requestType?: 'travel_order' | 'seminar' | string | null;
}

export function useRequestPDF({
  requestId,
  requestNumber,
  requesterName,
  requestType,
}: UseRequestPDFOptions) {
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = async () => {
    if (!requestId) {
      Alert.alert('Error', 'Request ID is required');
      return;
    }

    setDownloading(true);
    try {
      // Get session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get web app URL from environment variable
      // This should be set to your web application's base URL (e.g., https://your-app.vercel.app)
      const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;
      
      if (!webAppUrl) {
        throw new Error('Web app URL not configured. Please set EXPO_PUBLIC_WEB_APP_URL environment variable.');
      }

      // Construct PDF API endpoint URL
      // Remove trailing slash if present
      const baseUrl = webAppUrl.replace(/\/$/, '');
      const pdfUrl = `${baseUrl}/api/requests/${requestId}/pdf`;

      console.log('[useRequestPDF] Downloading from:', pdfUrl);
      console.log('[useRequestPDF] Request ID:', requestId);

      // Download PDF with authentication using legacy API
      const filename = formatPDFFilename(requestNumber, requesterName, requestType);
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      const downloadResult = await FileSystem.downloadAsync(
        pdfUrl,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (downloadResult.status !== 200) {
        console.error('[useRequestPDF] Download failed with status:', downloadResult.status);
        console.error('[useRequestPDF] Response URI:', downloadResult.uri);
        
        // If 404, provide more helpful error message
        if (downloadResult.status === 404) {
          throw new Error(
            `PDF not found (404). The request may not exist or the PDF generation endpoint may not be available. ` +
            `Please ensure EXPO_PUBLIC_WEB_APP_URL is set correctly and the web API is running.`
          );
        }
        
        throw new Error(`Failed to download PDF: HTTP ${downloadResult.status}`);
      }

      console.log('[useRequestPDF] PDF downloaded to:', downloadResult.uri);

      // On web, open in new tab
      if (Platform.OS === 'web') {
        window.open(pdfUrl, '_blank');
        Alert.alert('PDF Opened', 'PDF opened in new tab');
      } else {
        // On native, try to open with system viewer
        const canOpen = await Linking.canOpenURL(`file://${downloadResult.uri}`);
        if (canOpen) {
          await Linking.openURL(`file://${downloadResult.uri}`);
        } else {
          Alert.alert(
            'PDF Downloaded',
            `PDF saved to: ${filename}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('[useRequestPDF] Error:', error);
      console.error('[useRequestPDF] Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to download PDF. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ENOENT' || error.code === 'ENOTFOUND') {
        errorMessage = 'Cannot connect to server. Please check your internet connection and ensure EXPO_PUBLIC_WEB_APP_URL is set correctly.';
      } else if (error.status === 404) {
        errorMessage = 'PDF not found. The request may not exist or PDF generation is not available.';
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'Authentication failed. Please sign in again.';
      }
      
      Alert.alert(
        'Download Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  return {
    downloadPDF,
    downloading,
  };
}

