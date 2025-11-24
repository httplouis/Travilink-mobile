import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Conditionally import react-native-maps only on native platforms
// IMPORTANT: Even if require succeeds, the native module may not be available in Expo Go
// So we'll check at runtime if MapView actually works
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
let MapViewAvailable = false; // Track if MapView is actually usable

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    // Check if the module exists, but don't assume it works
    // We'll test it at runtime
    if (Maps && Maps.default) {
      MapView = Maps.default;
      Marker = Maps.Marker;
      PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
      // Don't set MapViewAvailable = true here - we'll check at runtime
    }
  } catch (error) {
    console.warn('[MapPicker] react-native-maps module not found:', error);
    MapViewAvailable = false;
  }
}

// Import WebView for Leaflet.js fallback map (works in Expo Go, completely free)
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (error) {
    console.warn('react-native-webview not available:', error);
  }
}

// Conditionally import expo-location only on native platforms
let Location: any = null;
if (Platform.OS !== 'web') {
  try {
    Location = require('expo-location');
  } catch (error) {
    console.warn('expo-location not available:', error);
  }
}

export interface PickedPlace {
  lat: number;
  lng: number;
  address: string;
}

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (place: PickedPlace) => void;
  initial?: PickedPlace | null;
}

type NominatimHit = {
  display_name: string;
  lat: string;
  lon: string;
};

// Debounce hook - fixed to prevent infinite loops
function useDebounce<T extends (...args: any[]) => void>(fn: T, delay = 400) {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const fnRef = React.useRef(fn);
  
  // Update ref when fn changes
  React.useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay] // Only depend on delay, not fn
  );
}

// Search locations using Nominatim (OpenStreetMap) - free, no API key needed
async function nominatimSearch(query: string): Promise<NominatimHit[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '8',
      dedupe: '1',
      addressdetails: '1',
      autocomplete: '1',
      countrycodes: 'ph', // Philippines
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'TraviLink-Mobile/1.0', // Required by Nominatim
        },
      }
    );
    
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}

// Reverse geocode to get address from coordinates
async function nominatimReverse(lat: number, lng: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      addressdetails: '1',
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'TraviLink-Mobile/1.0',
        },
      }
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error('Nominatim reverse error:', error);
    return null;
  }
}

// Leaflet.js WebView Map Component - Works in Expo Go, completely free, no API key needed
function LeafletMapWebView({
  mapRegion,
  selectedPlace,
  onMapClick,
}: {
  mapRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  selectedPlace: PickedPlace | null;
  onMapClick: (event: any) => void;
}) {
  const webViewRef = React.useRef<any>(null);

  // Update map when region or selected place changes
  React.useEffect(() => {
    if (webViewRef.current) {
      const script = `
        if (window.map) {
          window.map.setView([${mapRegion.latitude}, ${mapRegion.longitude}], 13);
          ${selectedPlace ? `
            if (window.selectedMarker) {
              window.map.removeLayer(window.selectedMarker);
            }
            window.selectedMarker = L.marker([${selectedPlace.lat}, ${selectedPlace.lng}]).addTo(window.map);
            window.selectedMarker.bindPopup('${selectedPlace.address.replace(/'/g, "\\'")}').openPopup();
          ` : `
            if (window.selectedMarker) {
              window.map.removeLayer(window.selectedMarker);
              window.selectedMarker = null;
            }
          `}
        }
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [mapRegion, selectedPlace]);

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
          window.map = L.map('map').setView([${mapRegion.latitude}, ${mapRegion.longitude}], 13);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(window.map);
          
          ${selectedPlace ? `
            window.selectedMarker = L.marker([${selectedPlace.lat}, ${selectedPlace.lng}]).addTo(window.map);
            window.selectedMarker.bindPopup('${selectedPlace.address.replace(/'/g, "\\'")}').openPopup();
          ` : ''}
          
          let currentMarker = null;
          window.map.on('click', function(e) {
            if (currentMarker) {
              window.map.removeLayer(currentMarker);
            }
            currentMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(window.map);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapClick',
                lat: e.latlng.lat,
                lng: e.latlng.lng
              }));
            }
          });
        </script>
      </body>
    </html>
  `;

  return (
    <WebView
      ref={webViewRef}
      style={styles.map}
      source={{ html: htmlContent }}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'mapClick') {
            onMapClick({
              nativeEvent: {
                coordinate: {
                  latitude: data.lat,
                  longitude: data.lng,
                },
              },
            });
          }
        } catch (error) {
          console.error('Error parsing map message:', error);
        }
      }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowsInlineMediaPlayback={true}
    />
  );
}

export default function MapPicker({ open, onClose, onPick, initial }: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PickedPlace | null>(
    initial || null
  );
  const [mapError, setMapError] = useState<string | null>(null);
  // Default to false - always use WebView in Expo Go (works everywhere, no native module needed)
  const [mapViewActuallyWorks, setMapViewActuallyWorks] = React.useState(false);

  // Always use WebView fallback - it works in Expo Go without native modules
  // MapView requires native build which doesn't work in Expo Go
  React.useEffect(() => {
    if (open) {
      // Always use WebView - it's safer and works everywhere
      setMapViewActuallyWorks(false);
      setMapError(null);
    }
  }, [open]);
  const [mapRegion, setMapRegion] = useState(() => {
    if (initial?.lat && initial?.lng) {
      return {
        latitude: initial.lat,
        longitude: initial.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 14.5995, // Manila default
      longitude: 120.9842,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  });
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Debounced search - use useCallback to prevent recreation
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await nominatimSearch(trimmed);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useDebounce(performSearch, 450);

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, debouncedSearch]);

  // Initialize with current location if no initial place (native only)
  useEffect(() => {
    if (open && !initial && Location && Platform.OS !== 'web') {
      Location.getCurrentPositionAsync({})
        .then((location: any) => {
          setMapRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        })
        .catch(() => {
          // Use default Manila location
        });
    }
  }, [open, initial]);

  const handleSearchResultSelect = async (hit: NominatimHit) => {
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    
    setSelectedPlace({ lat, lng, address: hit.display_name });
    setMapRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
    setSearchQuery(hit.display_name);
    setSearchResults([]);
  };

  const handleMapPress = async (event: any) => {
    if (Platform.OS === 'web' || !event?.nativeEvent?.coordinate) return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    setIsReverseGeocoding(true);
    try {
      const address = await nominatimReverse(latitude, longitude);
      const place: PickedPlace = {
        lat: latitude,
        lng: longitude,
        address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      };
      setSelectedPlace(place);
      setSearchQuery(place.address);
    } catch (error) {
      console.error('Reverse geocode error:', error);
      const place: PickedPlace = {
        lat: latitude,
        lng: longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      };
      setSelectedPlace(place);
      setSearchQuery(place.address);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleUseThisLocation = () => {
    if (selectedPlace) {
      onPick(selectedPlace);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pick Location</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location or tap on map..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#7a0019" style={styles.searchLoader} />
          )}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSearchResultSelect(item)}
                >
                  <Ionicons name="location-outline" size={20} color="#7a0019" />
                  <Text style={styles.resultText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Map - Always show map container, use WebView Leaflet.js if react-native-maps not available */}
        <View style={styles.mapContainer}>
          {Platform.OS !== 'web' && MapView && mapViewActuallyWorks ? (
            <>
              <MapView
                // Use OpenStreetMap tiles - completely free, no API key needed
                provider={undefined}
                style={styles.map}
                initialRegion={mapRegion}
                region={mapRegion}
                onRegionChangeComplete={(region) => {
                  // Only update if user manually moved map
                  if (selectedPlace) {
                    const distance = Math.sqrt(
                      Math.pow(region.latitude - selectedPlace.lat, 2) +
                      Math.pow(region.longitude - selectedPlace.lng, 2)
                    );
                    // Only update if moved significantly (more than 0.001 degrees)
                    if (distance > 0.001) {
                      setMapRegion(region);
                    }
                  } else {
                    setMapRegion(region);
                  }
                }}
                onPress={handleMapPress}
                showsUserLocation={true}
                showsMyLocationButton={true}
                mapType="standard"
                loadingEnabled={true}
                loadingIndicatorColor="#7a0019"
                loadingBackgroundColor="#f9fafb"
                onMapReady={() => {
                  console.log('[MapPicker] Map is ready!');
                  setMapError(null);
                }}
                onError={(error) => {
                  console.error('[MapPicker] Map error, falling back to WebView:', error);
                  // If MapView fails, switch to WebView
                  setMapViewActuallyWorks(false);
                }}
              >
                {/* OpenStreetMap tiles - completely free, no API key needed for both iOS and Android */}
                {(() => {
                  try {
                    const UrlTile = require('react-native-maps').UrlTile;
                    return (
                      <UrlTile
                        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maximumZ={19}
                        flipY={false}
                      />
                    );
                  } catch (error) {
                    console.warn('[MapPicker] UrlTile not available, using default tiles');
                    return null;
                  }
                })()}
                {selectedPlace && Marker && (
                  <Marker
                    coordinate={{
                      latitude: selectedPlace.lat,
                      longitude: selectedPlace.lng,
                    }}
                    title={selectedPlace.address}
                    pinColor="#7a0019"
                    draggable={true}
                    onDragEnd={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      handleMapPress({ nativeEvent: { coordinate: { latitude, longitude } } });
                    }}
                  />
                )}
              </MapView>
              
              {isReverseGeocoding && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#7a0019" />
                  <Text style={styles.loadingText}>Getting address...</Text>
                </View>
              )}
              
              {/* Only show error if map truly failed to load */}
              {mapError && (
                <View style={styles.mapErrorOverlay}>
                  <View style={styles.mapErrorContainer}>
                    <Ionicons name="warning-outline" size={24} color="#f59e0b" />
                    <Text style={styles.mapErrorText}>{mapError}</Text>
                    <Text style={styles.mapErrorSubtext}>
                      You can still search for locations above. The map will work once react-native-maps is properly configured.
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : Platform.OS !== 'web' && WebView ? (
            // Fallback: Use Leaflet.js in WebView - works in Expo Go, completely free, no API key needed
            <LeafletMapWebView
              mapRegion={mapRegion}
              selectedPlace={selectedPlace}
              onMapClick={handleMapPress}
            />
          ) : (
            // Final fallback: Show message if WebView also not available
            <View style={styles.webContainer}>
              <View style={styles.webMessage}>
                <Ionicons name="location-outline" size={48} color="#9ca3af" />
                <Text style={styles.webTitle}>Location Search</Text>
                <Text style={styles.webText}>
                  Search for a location above. Tap on a result to select it.
                </Text>
                {selectedPlace && (
                  <View style={styles.selectedPreview}>
                    <Text style={styles.selectedPreviewLabel}>Selected Location:</Text>
                    <Text style={styles.selectedPreviewAddress}>{selectedPlace.address}</Text>
                    <Text style={styles.selectedPreviewCoords}>
                      {selectedPlace.lat.toFixed(6)}, {selectedPlace.lng.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.selectedInfo}>
            {selectedPlace ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <View style={styles.selectedTextContainer}>
                  <Text style={styles.selectedLabel}>Selected:</Text>
                  <Text style={styles.selectedAddress} numberOfLines={1}>
                    {selectedPlace.address}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                <Text style={styles.placeholderText}>
                  Search or tap on map to select location
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.useButton,
              !selectedPlace && styles.useButtonDisabled,
            ]}
            onPress={handleUseThisLocation}
            disabled={!selectedPlace}
          >
            <Text style={[
              styles.useButtonText,
              !selectedPlace && styles.useButtonTextDisabled,
            ]}>
              Use This Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 8,
  },
  searchLoader: {
    marginLeft: 8,
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    minHeight: 400,
    backgroundColor: '#e5e7eb',
    width: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
    minHeight: 400,
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTextContainer: {
    flex: 1,
    gap: 2,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedAddress: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  placeholderText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  },
  useButton: {
    backgroundColor: '#7a0019',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  useButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  useButtonTextDisabled: {
    color: '#9ca3af',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  webMessage: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 400,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  webText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  selectedPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    width: '100%',
    gap: 8,
  },
  selectedPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  selectedPreviewAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 20,
  },
  selectedPreviewCoords: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mapErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mapErrorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '90%',
  },
  mapErrorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    lineHeight: 16,
  },
  mapErrorSubtext: {
    marginTop: 4,
    fontSize: 11,
    color: '#a16207',
    lineHeight: 14,
  },
});

