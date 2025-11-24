import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';

interface PDFDownloadButtonProps {
  requestId: string;
  fileCode?: string | null;
  requestNumber?: string;
  disabled?: boolean;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export default function PDFDownloadButton({
  requestId,
  fileCode,
  requestNumber,
  disabled = false,
}: PDFDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = async () => {
    if (disabled || downloading) return;

    setDownloading(true);

    try {
      // Construct PDF API URL
      // Assuming the web app is hosted and we can access the API
      // For now, we'll use a relative path that should work if web app is on same domain
      // Or use the full web app URL if known
      const webAppUrl = SUPABASE_URL.replace('.supabase.co', '');
      const pdfUrl = `${webAppUrl}/api/requests/${requestId}/pdf`;
      
      // Alternative: If web app has a known URL, use that
      // const pdfUrl = `https://your-web-app-domain.com/api/requests/${requestId}/pdf`;

      // For mobile, we'll try to download from the URL
      // If it's a Supabase function or web API, we need the full URL
      const fileName = fileCode 
        ? `${fileCode}.pdf` 
        : requestNumber 
        ? `${requestNumber}.pdf`
        : `request-${requestId}.pdf`;

      if (Platform.OS === 'web') {
        // For web, open in new tab
        window.open(pdfUrl, '_blank');
        setDownloading(false);
        return;
      }

      // For mobile, download and share
      const fileUri = FileSystem.documentDirectory + fileName;
      
      const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri);

      if (downloadResult.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Share ${fileName}`,
          });
        } else {
          Alert.alert(
            'Download Complete',
            `PDF saved to: ${downloadResult.uri}`,
            [{ text: 'OK' }],
          );
        }
      } else {
        throw new Error('Failed to download PDF');
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      
      // Fallback: Try opening the URL directly
      try {
        const webAppUrl = SUPABASE_URL.replace('.supabase.co', '');
        const pdfUrl = `${webAppUrl}/api/requests/${requestId}/pdf`;
        await Linking.openURL(pdfUrl);
      } catch (linkError) {
        Alert.alert(
          'Download Failed',
          'Unable to download PDF. Please try again later or download from the web app.',
          [{ text: 'OK' }],
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={downloadPDF}
      disabled={disabled || downloading}
    >
      {downloading ? (
        <>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.buttonText}>Downloading...</Text>
        </>
      ) : (
        <>
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={styles.buttonText}>Download PDF</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#7a0019',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

