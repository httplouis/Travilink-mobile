import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapPicker, { PickedPlace } from './MapPicker';

interface LocationFieldProps {
  value: string;
  onChange: ({ address, geo }: { address: string; geo?: { lat: number; lng: number } | null }) => void;
  geo?: { lat: number; lng: number } | null;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  inputId?: string;
  showMapPreview?: boolean; // Option to hide map preview (for custom placement)
}

export default function LocationField({
  value,
  onChange,
  geo,
  label = 'Location',
  placeholder = 'Type address or pick on map…',
  required = false,
  error,
  disabled = false,
  inputId,
  showMapPreview = true, // Default to showing map preview
}: LocationFieldProps) {
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const handleChange = (text: string) => {
    onChange({ address: text, geo: geo || null });
  };

  const handleMapPick = (place: PickedPlace) => {
    onChange({
      address: place.address,
      geo: { lat: place.lat, lng: place.lng },
    });
    setIsMapPickerOpen(false);
  };

  const initialPlace: PickedPlace | null = geo
    ? { lat: geo.lat, lng: geo.lng, address: value }
    : null;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        <Ionicons name="location-outline" size={20} color="#6b7280" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={handleChange}
          editable={!disabled}
          multiline
          numberOfLines={2}
        />
        {!disabled && (
          <TouchableOpacity
            onPress={() => setIsMapPickerOpen(true)}
            style={styles.mapButton}
          >
            <Ionicons name={Platform.OS === 'web' ? 'search-outline' : 'map-outline'} size={18} color="#7a0019" />
          </TouchableOpacity>
        )}
      </View>
      {/* Map Preview - Use WebView Leaflet.js (works everywhere, no native module) */}
      {showMapPreview && geo?.lat != null && geo?.lng != null && (() => {
        let WebView: any = null;
        if (Platform.OS !== 'web') {
          try {
            WebView = require('react-native-webview').WebView;
          } catch (error) {
            console.warn('react-native-webview not available');
          }
        }

        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
              <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
              <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body, html { width: 100%; height: 100%; overflow: hidden; }
                #map { width: 100%; height: 100%; }
              </style>
            </head>
            <body>
              <div id="map"></div>
              <script>
                const map = L.map('map').setView([${geo.lat}, ${geo.lng}], 15);
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  attribution: '© OpenStreetMap contributors',
                  maxZoom: 19
                }).addTo(map);
                L.marker([${geo.lat}, ${geo.lng}]).addTo(map)
                  .bindPopup('${(value || 'Selected location').replace(/'/g, "\\'")}')
                  .openPopup();
              </script>
            </body>
          </html>
        `;

        return (
          <View style={styles.mapPreviewContainer}>
            <Text style={styles.mapPreviewLabel}>📍 Selected Location</Text>
            <View style={styles.mapPreview}>
              {Platform.OS !== 'web' && WebView ? (
                <WebView
                  style={styles.mapPreviewMap}
                  source={{ html: htmlContent }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  scrollEnabled={false}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.mapPreviewFallback}>
                  <Ionicons name="map-outline" size={32} color="#7a0019" />
                  <Text style={styles.mapPreviewCoords}>
                    {geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })()}
      
      {/* Map Picker Modal - Only render when open to prevent infinite loops */}
      {isMapPickerOpen && (
        <MapPicker
          open={isMapPickerOpen}
          onClose={() => setIsMapPickerOpen(false)}
          onPick={handleMapPick}
          initial={initialPlace}
        />
      )}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  required: {
    color: '#dc2626',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainerError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  inputContainerDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    paddingVertical: 0,
    paddingRight: 8,
    textAlignVertical: 'top',
    minHeight: 40,
  },
  mapButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  geoText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  errorContainer: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
  },
  mapPreviewContainer: {
    marginTop: 8,
    gap: 6,
  },
  mapPreviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  mapPreview: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapPreviewMap: {
    width: '100%',
    height: '100%',
  },
  mapPreviewFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  mapPreviewCoords: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

