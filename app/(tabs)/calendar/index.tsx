import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar } from '@/hooks/useCalendar';
import { Booking } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/utils';

type CalendarView = 'week' | 'month' | '2month' | 'year';

export default function CalendarScreen() {
  const { profile, loading: authLoading } = useAuth();
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<Booking[]>([]);

  // Calculate date range based on view
  const now = new Date();
  const getDateRange = () => {
    switch (view) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        return { start: weekStart, end: weekEnd };
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
      case '2month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 2, 0),
        };
      case 'year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31),
        };
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();
  const { data: bookings = [], isLoading, refetch } = useCalendar(
    profile?.id || '',
    startDate,
    endDate
  );

  // Refetch when view changes
  useEffect(() => {
    if (profile?.id) {
      refetch();
    }
  }, [view, profile?.id, refetch]);

  // Don't render if still loading auth or no profile
  if (authLoading || !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Group bookings by date
  const bookingsByDate: Record<string, Booking[]> = {};
  bookings.forEach((booking) => {
    if (!bookingsByDate[booking.dateISO]) {
      bookingsByDate[booking.dateISO] = [];
    }
    bookingsByDate[booking.dateISO].push(booking);
  });

  // Create marked dates for calendar
  const markedDates: Record<string, any> = {};
  Object.keys(bookingsByDate).forEach((date) => {
    const count = bookingsByDate[date].length;
    let status: 'available' | 'partial' | 'full' = 'available';
    if (count >= 5) status = 'full';
    else if (count > 0) status = 'partial';

    markedDates[date] = {
      marked: true,
      dotColor:
        status === 'full'
          ? '#dc2626'
          : status === 'partial'
          ? '#f59e0b'
          : '#16a34a',
      customStyles: {
        container: {
          backgroundColor:
            status === 'full'
              ? '#fee2e2'
              : status === 'partial'
              ? '#fef3c7'
              : '#d1fae5',
        },
        text: {
          color:
            status === 'full'
              ? '#991b1b'
              : status === 'partial'
              ? '#92400e'
              : '#166534',
          fontWeight: '600',
        },
      },
    };
  });

  const handleDatePress = (day: DateObject) => {
    const dateBookings = bookingsByDate[day.dateString] || [];
    setSelectedDate(day.dateString);
    setSelectedBookings(dateBookings);
    setShowBookingsModal(true);
  };

  const getStatusColor = (count: number) => {
    if (count >= 5) return '#dc2626';
    if (count > 0) return '#f59e0b';
    return '#16a34a';
  };

  const getStatusLabel = (count: number) => {
    if (count >= 5) return 'Full';
    if (count > 0) return `${5 - count} left`;
    return 'Available';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <Text style={styles.headerSubtitle}>
          Click a date to view reservations
        </Text>
      </View>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        {(['week', 'month', '2month', 'year'] as CalendarView[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewButton, view === v && styles.viewButtonActive]}
            onPress={() => setView(v)}
          >
            <Text
              style={[
                styles.viewButtonText,
                view === v && styles.viewButtonTextActive,
              ]}
            >
              {v === '2month' ? '2-Month' : v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Calendar */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7a0019" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.calendarContainer}>
            <Calendar
              current={selectedDate}
              onDayPress={handleDatePress}
              markedDates={markedDates}
              markingType="custom"
              enableSwipeMonths={true}
              hideExtraDays={true}
              disableMonthChange={false}
              firstDay={0}
              showWeekNumbers={false}
              onMonthChange={(month) => {
                // Handle month change if needed
              }}
              theme={{
                backgroundColor: '#fff',
                calendarBackground: '#fff',
                textSectionTitleColor: '#6b7280',
                selectedDayBackgroundColor: '#7a0019',
                selectedDayTextColor: '#fff',
                todayTextColor: '#7a0019',
                dayTextColor: '#111827',
                textDisabledColor: '#d1d5db',
                dotColor: '#7a0019',
                selectedDotColor: '#fff',
                arrowColor: '#7a0019',
                monthTextColor: '#111827',
                textDayFontWeight: '600',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 12,
              }}
              style={styles.calendar}
            />
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.legendText}>Partial</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
              <Text style={styles.legendText}>Full</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Bookings Modal */}
      <Modal
        visible={showBookingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formatDate(selectedDate)}
              </Text>
              <TouchableOpacity
                onPress={() => setShowBookingsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {selectedBookings.length === 0 ? (
                <View style={styles.emptyBookings}>
                  <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyBookingsText}>
                    No reservations for this date
                  </Text>
                </View>
              ) : (
                <View style={styles.bookingsList}>
                  {selectedBookings.map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingHeader}>
                        <Text style={styles.bookingPurpose}>
                          {booking.purpose}
                        </Text>
                        <View
                          style={[
                            styles.bookingStatus,
                            {
                              backgroundColor: getStatusColor(1) + '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.bookingStatusText,
                              { color: getStatusColor(1) },
                            ]}
                          >
                            {getStatusLabel(1)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.bookingDepartment}>
                        {booking.department}
                      </Text>
                      <View style={styles.bookingDetails}>
                        <View style={styles.bookingDetail}>
                          <Ionicons name="location-outline" size={16} color="#6b7280" />
                          <Text style={styles.bookingDetailText}>
                            {booking.destination}
                          </Text>
                        </View>
                        <View style={styles.bookingDetail}>
                          <Ionicons name="car-outline" size={16} color="#6b7280" />
                          <Text style={styles.bookingDetailText}>
                            {booking.vehicle} - {booking.vehicleName}
                          </Text>
                        </View>
                        <View style={styles.bookingDetail}>
                          <Ionicons name="person-outline" size={16} color="#6b7280" />
                          <Text style={styles.bookingDetailText}>
                            {booking.driver}
                          </Text>
                        </View>
                        <View style={styles.bookingDetail}>
                          <Ionicons name="time-outline" size={16} color="#6b7280" />
                          <Text style={styles.bookingDetailText}>
                            {booking.departAt} → {booking.returnAt}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  viewSelector: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  viewButtonActive: {
    backgroundColor: '#7a0019',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  viewButtonTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  calendarContainer: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calendar: {
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    maxHeight: 500,
  },
  emptyBookings: {
    padding: 48,
    alignItems: 'center',
  },
  emptyBookingsText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  bookingsList: {
    padding: 16,
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingPurpose: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  bookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookingDepartment: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  bookingDetails: {
    gap: 8,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#374151',
  },
});

