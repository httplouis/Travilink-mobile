import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCompletedTrips, CompletedTrip } from '@/hooks/useCompletedTrips';
import { supabase } from '@/lib/supabase/client';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';
import { formatDate } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  label: string;
}

function StarRating({ rating, onRatingChange, label }: StarRatingProps) {
  return (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? '#fbbf24' : '#d1d5db'}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingText}>{rating}/5</Text>
      )}
    </View>
  );
}

interface FeedbackModalProps {
  trip: CompletedTrip;
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function FeedbackModal({ trip, visible, onClose, onSubmit }: FeedbackModalProps) {
  const [driverRating, setDriverRating] = useState(0);
  const [vehicleRating, setVehicleRating] = useState(0);
  const [tripRating, setTripRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (driverRating === 0 || vehicleRating === 0 || tripRating === 0) {
      Alert.alert('Validation Error', 'Please rate all aspects of the trip.');
      return;
    }

    setLoading(true);
    try {
      // First, find the trip_id associated with this request
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('id, driver_id, vehicle_id')
        .eq('request_id', trip.id)
        .single();

      if (tripError || !tripData) {
        console.error('Trip lookup error:', tripError);
        Alert.alert('Error', 'Could not find trip information. Please try again.');
        return;
      }

      // Calculate average rating from the three ratings
      const averageRating = Math.round((driverRating + vehicleRating + tripRating) / 3);

      // Insert feedback into Supabase (matches actual schema)
      const { error } = await supabase.from('feedback').insert({
        user_id: trip.requester_id,
        user_name: trip.requester_name || 'Unknown',
        user_email: null, // Can be fetched if needed
        trip_id: tripData.id,
        driver_id: tripData.driver_id || trip.assigned_driver_id,
        vehicle_id: tripData.vehicle_id || trip.assigned_vehicle_id,
        rating: averageRating,
        message: comment.trim() || `Driver: ${driverRating}/5, Vehicle: ${vehicleRating}/5, Trip: ${tripRating}/5`,
        category: 'trip_feedback',
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Feedback submission error:', error);
        Alert.alert('Error', 'Failed to submit feedback. Please try again.');
        return;
      }

      Alert.alert('Success', 'Thank you for your feedback!', [
        {
          text: 'OK',
          onPress: () => {
            setDriverRating(0);
            setVehicleRating(0);
            setTripRating(0);
            setComment('');
            onSubmit();
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Feedback submission error:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Rate Your Trip</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.tripInfoCard}>
            <Text style={styles.tripInfoTitle}>{trip.purpose}</Text>
            <Text style={styles.tripInfoDestination}>{trip.destination}</Text>
            <View style={styles.tripInfoDetails}>
              <View style={styles.tripInfoDetail}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text style={styles.tripInfoText}>
                  {formatDate(trip.travel_start_date)}
                  {trip.travel_start_date !== trip.travel_end_date &&
                    ` - ${formatDate(trip.travel_end_date)}`}
                </Text>
              </View>
              {trip.assigned_driver && (
                <View style={styles.tripInfoDetail}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <Text style={styles.tripInfoText}>{trip.assigned_driver.name}</Text>
                </View>
              )}
              {trip.assigned_vehicle && (
                <View style={styles.tripInfoDetail}>
                  <Ionicons name="car-outline" size={16} color="#6b7280" />
                  <Text style={styles.tripInfoText}>
                    {trip.assigned_vehicle.vehicle_name} ({trip.assigned_vehicle.plate_number})
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.ratingsSection}>
            <StarRating
              rating={driverRating}
              onRatingChange={setDriverRating}
              label="Driver"
            />
            <StarRating
              rating={vehicleRating}
              onRatingChange={setVehicleRating}
              label="Vehicle/Bus"
            />
            <StarRating
              rating={tripRating}
              onRatingChange={setTripRating}
              label="Overall Trip"
            />
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your thoughts about the trip..."
              placeholderTextColor="#9ca3af"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

export default function FeedbackScreen() {
  const { profile } = useAuth();
  const { data: trips = [], isLoading, refetch } = useCompletedTrips(profile?.id || '');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<CompletedTrip | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const handleGiveFeedback = (trip: CompletedTrip) => {
    setSelectedTrip(trip);
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmitted = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="Feedback"
          onMenuPress={() => setSidebarVisible(true)}
          showNotification={true}
          showMenu={true}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7a0019" />
          <Text style={styles.loadingText}>Loading completed trips...</Text>
        </View>
        <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Feedback"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />

      {trips.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No completed trips</Text>
          <Text style={styles.emptyText}>
            Completed trips will appear here for feedback
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={styles.tripHeaderLeft}>
                  <Text style={styles.tripRequestNumber}>{item.request_number}</Text>
                  <View style={[
                    styles.feedbackBadge,
                    item.has_feedback ? styles.feedbackBadgeSubmitted : styles.feedbackBadgePending
                  ]}>
                    <Ionicons
                      name={item.has_feedback ? 'checkmark-circle' : 'time-outline'}
                      size={14}
                      color={item.has_feedback ? '#16a34a' : '#f59e0b'}
                    />
                    <Text style={[
                      styles.feedbackBadgeText,
                      item.has_feedback ? styles.feedbackBadgeTextSubmitted : styles.feedbackBadgeTextPending
                    ]}>
                      {item.has_feedback ? 'Feedback Submitted' : 'Pending Feedback'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.tripPurpose}>{item.purpose}</Text>
              <Text style={styles.tripDestination}>{item.destination}</Text>
              <View style={styles.tripDetails}>
                <View style={styles.tripDetail}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={styles.tripDetailText}>
                    {formatDate(item.travel_start_date)}
                    {item.travel_start_date !== item.travel_end_date &&
                      ` - ${formatDate(item.travel_end_date)}`}
                  </Text>
                </View>
                {item.assigned_driver && (
                  <View style={styles.tripDetail}>
                    <Ionicons name="person-outline" size={16} color="#6b7280" />
                    <Text style={styles.tripDetailText}>{item.assigned_driver.name}</Text>
                  </View>
                )}
                {item.assigned_vehicle && (
                  <View style={styles.tripDetail}>
                    <Ionicons name="car-outline" size={16} color="#6b7280" />
                    <Text style={styles.tripDetailText}>
                      {item.assigned_vehicle.vehicle_name}
                    </Text>
                  </View>
                )}
              </View>
              {!item.has_feedback && (
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={() => handleGiveFeedback(item)}
                >
                  <Ionicons name="star-outline" size={18} color="#7a0019" />
                  <Text style={styles.feedbackButtonText}>Give Feedback</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No completed trips</Text>
              <Text style={styles.emptyText}>
                Completed trips will appear here for feedback
              </Text>
            </View>
          }
        />
      )}

      {selectedTrip && (
        <FeedbackModal
          trip={selectedTrip}
          visible={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedTrip(null);
          }}
          onSubmit={handleFeedbackSubmitted}
        />
      )}

      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tripHeaderLeft: {
    flex: 1,
  },
  tripRequestNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7a0019',
    marginBottom: 4,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feedbackBadgeSubmitted: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  feedbackBadgePending: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  feedbackBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feedbackBadgeTextSubmitted: {
    color: '#16a34a',
  },
  feedbackBadgeTextPending: {
    color: '#f59e0b',
  },
  tripPurpose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  tripDetails: {
    gap: 8,
    marginBottom: 12,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripDetailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  feedbackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
    maxHeight: '80%',
  },
  tripInfoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tripInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  tripInfoDestination: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  tripInfoDetails: {
    gap: 8,
  },
  tripInfoDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripInfoText: {
    fontSize: 13,
    color: '#6b7280',
  },
  ratingsSection: {
    gap: 24,
    marginBottom: 24,
  },
  ratingContainer: {
    gap: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 4,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7a0019',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
