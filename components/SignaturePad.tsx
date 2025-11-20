import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';

interface SignaturePadProps {
  height?: number;
  lineWidth?: number;
  color?: string;
  value?: string | null; // data URL
  onSave?: (dataUrl: string) => void;
  onClear?: () => void;
  onDraw?: () => void;
  onDrawingStart?: () => void; // Callback when user starts drawing
  onDrawingEnd?: () => void; // Callback when user stops drawing
  hideSaveButton?: boolean;
  disabled?: boolean;
}

export default function SignaturePad({
  height = 160,
  lineWidth = 3,
  color = '#1f2937',
  value = null,
  onSave,
  onClear,
  onDraw,
  onDrawingStart,
  onDrawingEnd,
  hideSaveButton = false,
  disabled = false,
}: SignaturePadProps) {
  const signatureRef = useRef<any>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [drewOnce, setDrewOnce] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (value) {
      setHasSignature(true);
      // Don't set drewOnce to true if value is provided, so user can still draw
      // Only set drewOnce if user actually draws
    } else {
      setHasSignature(false);
      setDrewOnce(false);
    }
  }, [value]);

  const handleOK = (signature: string) => {
    setHasSignature(true);
    setDrewOnce(true);
    onSave?.(signature);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setHasSignature(false);
    setDrewOnce(false);
    onClear?.();
  };

  const handleBegin = () => {
    setIsDrawing(true);
    onDrawingStart?.();
    if (!drewOnce) {
      setDrewOnce(true);
      onDraw?.();
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
    onDrawingEnd?.();
    // Auto-save on end
    if (drewOnce) {
      signatureRef.current?.readSignature();
    }
  };

  const style = `
    .m-signature-pad {
      background-color: white;
      border: none;
      box-shadow: none;
      width: 100%;
      height: 100%;
    }
    .m-signature-pad--body {
      border: none;
      width: 100%;
      height: 100%;
    }
    .m-signature-pad--body canvas {
      border: none;
      background-color: white;
      touch-action: none;
      width: 100% !important;
      height: 100% !important;
    }
    .m-signature-pad--body button {
      color: ${color};
    }
  `;

  return (
    <View style={styles.container}>
      <View 
        style={[styles.canvasContainer, { height }, disabled && styles.disabled]}
        onStartShouldSetResponder={() => {
          setIsDrawing(true);
          onDrawingStart?.();
          return true;
        }}
        onMoveShouldSetResponder={() => true}
        onResponderRelease={() => {
          setIsDrawing(false);
          onDrawingEnd?.();
        }}
      >
        {value && !drewOnce ? (
          <Image source={{ uri: value }} style={styles.signatureImage} resizeMode="contain" />
        ) : (
          <View 
            style={{ width: '100%', height: '100%', backgroundColor: '#fff' }}
            onStartShouldSetResponder={() => {
              setIsDrawing(true);
              onDrawingStart?.();
              return true;
            }}
            onMoveShouldSetResponder={() => true}
            onResponderRelease={() => {
              setIsDrawing(false);
              onDrawingEnd?.();
            }}
          >
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleOK}
              onBegin={handleBegin}
              onEnd={handleEnd}
              descriptionText=""
              clearText=""
              confirmText=""
              webStyle={style}
              bgWidth={400}
              bgHeight={height}
              minWidth={lineWidth}
              maxWidth={lineWidth}
              penColor={color}
              backgroundColor="white"
              imageType="image/png"
              autoClear={false}
              rotated={false}
            />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          disabled={disabled || !hasSignature}
        >
          <Text style={[styles.buttonText, (!hasSignature || disabled) && styles.buttonTextDisabled]}>
            Clear
          </Text>
        </TouchableOpacity>

        {!hideSaveButton && (
          <TouchableOpacity
            style={[styles.saveButton, (!hasSignature || disabled) && styles.saveButtonDisabled]}
            onPress={() => signatureRef.current?.readSignature()}
            disabled={disabled || !hasSignature}
          >
            <Text style={[styles.buttonText, styles.saveButtonText]}>Save signature</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.uploadButton}
          disabled={disabled}
          onPress={async () => {
            if (disabled) return;
            try {
              // Request permission first
              const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please grant permission to access your photos to upload a signature.');
                return;
              }

              // Use ImagePicker for better mobile UX
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 1],
                quality: 0.8,
                base64: true,
              });

              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.base64) {
                  const dataUrl = `data:image/${asset.uri.split('.').pop() || 'jpeg'};base64,${asset.base64}`;
                  onSave?.(dataUrl);
                  setHasSignature(true);
                  setDrewOnce(true);
                } else if (asset.uri) {
                  // Fallback: read file if base64 not available
                  try {
                    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                      encoding: FileSystem.EncodingType.Base64,
                    });
                    const dataUrl = `data:image/jpeg;base64,${base64}`;
                    onSave?.(dataUrl);
                    setHasSignature(true);
                    setDrewOnce(true);
                  } catch (readError) {
                    console.error('File read error:', readError);
                    Alert.alert('Error', 'Failed to read the image file.');
                  }
                }
              }
            } catch (error) {
              console.error('Image picker error:', error);
              Alert.alert('Error', 'Failed to pick image file. Please try again.');
            }
          }}
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#6b7280" />
          <Text style={[styles.buttonText, styles.uploadButtonText]}>Upload e-sign</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helperText}>
        Sign with finger — it auto-saves when you lift.
        {!hideSaveButton && ' You can also click Save signature or upload an image file.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  canvasContainer: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    overflow: 'hidden',
    width: '100%',
    minHeight: 160,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#7a0019',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginLeft: 'auto',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
  },
  uploadButtonText: {
    color: '#6b7280',
  },
  helperText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
});

