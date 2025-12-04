import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';

export interface AttachmentFile {
  id: string;
  name: string;
  uri: string;
  mime: string;
  size: number;
  uploaded?: boolean;
  url?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

interface FileAttachmentPickerProps {
  files: AttachmentFile[];
  onChange: (files: AttachmentFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  error?: string;
  disabled?: boolean;
}

const MAX_FILES = 5;
const MAX_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export default function FileAttachmentPicker({
  files = [],
  onChange,
  maxFiles = MAX_FILES,
  maxSizeMB = MAX_SIZE_MB,
  error,
  disabled = false,
}: FileAttachmentPickerProps) {
  const [uploading, setUploading] = useState(false);

  const validateFile = (file: DocumentPicker.DocumentPickerAsset): { valid: boolean; error?: string } => {
    // Check file size
    const sizeMB = (file.size || 0) / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`,
      };
    }

    // Check file type
    if (file.mimeType && !ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      return {
        valid: false,
        error: 'Only PDF, JPG, and PNG files are allowed.',
      };
    }

    // Check file extension as fallback
    const extension = file.name?.split('.').pop()?.toLowerCase();
    if (extension && !['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
      return {
        valid: false,
        error: 'Only PDF, JPG, and PNG files are allowed.',
      };
    }

    return { valid: true };
  };

  const pickFile = async () => {
    if (disabled || uploading) return;

    if (files.length >= maxFiles) {
      Alert.alert(
        'Maximum Files Reached',
        `You can only attach up to ${maxFiles} files.`,
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      const validation = validateFile(file);

      if (!validation.valid) {
        Alert.alert('Invalid File', validation.error);
        return;
      }

      // Create attachment object
      const attachment: AttachmentFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name || 'Untitled',
        uri: file.uri,
        mime: file.mimeType || 'application/octet-stream',
        size: file.size || 0,
        uploaded: false,
      };

      onChange([...files, attachment]);
    } catch (error: any) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const removeFile = (fileId: string) => {
    if (disabled || uploading) return;
    onChange(files.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (mime: string): keyof typeof Ionicons.glyphMap => {
    if (mime === 'application/pdf') return 'document-text';
    if (mime.startsWith('image/')) return 'image';
    return 'document';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.label}>
            Attachments <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <Text style={styles.helperText}>
            PDF, JPG, or PNG files only. Max {maxSizeMB}MB per file, {maxFiles} files max.
          </Text>
        </View>
        {files.length < maxFiles && (
          <TouchableOpacity
            style={[styles.addButton, (disabled || uploading) && styles.addButtonDisabled]}
            onPress={pickFile}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#7a0019" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#7a0019" />
                <Text style={styles.addButtonText}>Add File</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {files.length > 0 && (
        <View style={styles.filesList}>
          {files.map((file) => (
            <View key={file.id} style={styles.fileItem}>
              {file.mime.startsWith('image/') ? (
                <Image source={{ uri: file.uri }} style={styles.filePreview} resizeMode="cover" />
              ) : (
                <View style={styles.fileIconContainer}>
                  <Ionicons
                    name={getFileIcon(file.mime)}
                    size={24}
                    color="#7a0019"
                  />
                </View>
              )}
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(file.size)}
                  {file.uploaded && (
                    <Text style={styles.uploadedBadge}> • Uploaded</Text>
                  )}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFile(file.id)}
                disabled={disabled || uploading}
              >
                <Ionicons name="close-circle" size={24} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {files.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No files attached</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap "Add File" to attach supporting documents
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 200,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7a0019',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  filesList: {
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  fileInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  fileSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  uploadedBadge: {
    color: '#16a34a',
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

