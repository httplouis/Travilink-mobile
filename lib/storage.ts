import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from './supabase/client';
import { AttachmentFile } from '@/components/FileAttachmentPicker';

const STORAGE_BUCKET = 'request-attachments'; // Adjust based on your Supabase bucket name

export interface UploadedAttachment {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  uploaded_at: string;
  uploaded_by: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFileToStorage(
  file: AttachmentFile,
  userId: string,
  requestId?: string,
): Promise<UploadedAttachment> {
  try {
    // Read file as base64
    if (!file.uri) {
      throw new Error('File URI is missing');
    }
    
    // Read file as base64 - use string literal 'base64' (EncodingType may not be available)
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });

    // Generate unique file name
    const fileExtension = file.name.split('.').pop() || 'bin';
    const fileName = `${requestId || 'temp'}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    const filePath = `${STORAGE_BUCKET}/${fileName}`;

    // Convert base64 to ArrayBuffer (works in both web and React Native)
    // Using a simple base64 decode function
    const base64ToArrayBuffer = (base64: string): Uint8Array => {
      if (Platform.OS === 'web' && typeof atob !== 'undefined') {
        // Web: use atob
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      } else {
        // React Native: manual base64 decode
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let lookup: number[] = [];
        for (let i = 0; i < chars.length; i++) {
          lookup[chars.charCodeAt(i)] = i;
        }
        
        let bufferLength = base64.length * 0.75;
        if (base64[base64.length - 1] === '=') {
          bufferLength--;
          if (base64[base64.length - 2] === '=') {
            bufferLength--;
          }
        }
        
        const bytes = new Uint8Array(bufferLength);
        let p = 0;
        for (let i = 0; i < base64.length; i += 4) {
          const encoded1 = lookup[base64.charCodeAt(i)];
          const encoded2 = lookup[base64.charCodeAt(i + 1)];
          const encoded3 = lookup[base64.charCodeAt(i + 2)];
          const encoded4 = lookup[base64.charCodeAt(i + 3)];
          
          bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
          bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
          bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
        return bytes;
      }
    };
    
    const bytes = base64ToArrayBuffer(base64);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, bytes, {
        contentType: file.mime,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }

    return {
      id: file.id,
      name: file.name,
      url: urlData.publicUrl,
      mime: file.mime,
      size: file.size,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userId,
    };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Upload multiple files to Supabase Storage
 */
export async function uploadFilesToStorage(
  files: AttachmentFile[],
  userId: string,
  requestId?: string,
): Promise<UploadedAttachment[]> {
  const uploadPromises = files
    .filter((f) => !f.uploaded)
    .map((file) => uploadFileToStorage(file, userId, requestId));

  return Promise.all(uploadPromises);
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFileFromStorage(filePath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

