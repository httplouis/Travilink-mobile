import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  uploaded_at: string;
  uploaded_by: string;
}

interface FileAttachmentListProps {
  attachments: Attachment[];
  onDownload?: (attachment: Attachment) => void;
}

export default function FileAttachmentList({
  attachments,
  onDownload,
}: FileAttachmentListProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getFileIcon = (mime: string): keyof typeof Ionicons.glyphMap => {
    if (mime === 'application/pdf') return 'document-text';
    if (mime.startsWith('image/')) return 'image';
    return 'document';
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      if (onDownload) {
        onDownload(attachment);
        return;
      }

      // Default download behavior
      if (Platform.OS === 'web') {
        // Open in new tab for web
        window.open(attachment.url, '_blank');
      } else {
        // Download and share for mobile
        const fileUri = FileSystem.documentDirectory + attachment.name;
        const downloadResult = await FileSystem.downloadAsync(
          attachment.url,
          fileUri,
        );

        if (downloadResult.status === 200) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: attachment.mime,
              dialogTitle: `Share ${attachment.name}`,
            });
          } else {
            // Fallback: open URL
            await Linking.openURL(attachment.url);
          }
        }
      }
    } catch (error: any) {
      console.error('Error downloading file:', error);
      // Fallback: open URL
      try {
        await Linking.openURL(attachment.url);
      } catch (linkError) {
        console.error('Error opening URL:', linkError);
      }
    }
  };

  const handleView = async (attachment: Attachment) => {
    try {
      await Linking.openURL(attachment.url);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attachments</Text>
      <View style={styles.list}>
        {attachments.map((attachment) => (
          <View key={attachment.id} style={styles.item}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={getFileIcon(attachment.mime)}
                size={24}
                color="#7a0019"
              />
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {attachment.name}
              </Text>
              <View style={styles.meta}>
                <Text style={styles.metaText}>
                  {formatFileSize(attachment.size)}
                </Text>
                <Text style={styles.metaSeparator}>•</Text>
                <Text style={styles.metaText}>
                  {formatDate(attachment.uploaded_at)}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              {attachment.mime.startsWith('image/') && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleView(attachment)}
                >
                  <Ionicons name="eye-outline" size={20} color="#2563eb" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDownload(attachment)}
              >
                <Ionicons name="download-outline" size={20} color="#7a0019" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  metaSeparator: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});

