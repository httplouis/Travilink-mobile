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
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (error) {
    console.warn('react-native-maps not available:', error);
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

// Debounce hook
function useDebounce<T extends (...args: any[]) => void>(fn: T, delay = 400) {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
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

export default function MapPicker({ open, onClose, onPick, initial }: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PickedPlace | null>(
    initial || null
  );
  const [mapRegion, setMapRegion] = useState({
    latitude: initial?.lat || 14.5995, // Manila default
    longitude: initial?.lng || 120.9842,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(async (query: string) => {
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
  }, 450);

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
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Map - Only on native platforms */}
        {Platform.OS !== 'web' && MapView ? (
          <View style={styles.mapContainer}>
            <MapView
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={styles.map}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {selectedPlace && Marker && (
                <Marker
                  coordinate={{
                    latitude: selectedPlace.lat,
                    longitude: selectedPlace.lng,
                  }}
                  title={selectedPlace.address}
                />
              )}
            </MapView>
            
            {isReverseGeocoding && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#7a0019" />
                <Text style={styles.loadingText}>Getting address...</Text>
              </View>
            )}
          </View>
        ) : (
          // Web fallback: Search-only mode
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
  },
  map: {
    width: '100%',
    height: '100%',
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
});

