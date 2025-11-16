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
import { Calendar, DateData } from 'react-native-calendars';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar } from '@/hooks/useCalendar';
import { Booking } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/utils';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';

type CalendarView = 'month' | 'year';

export default function CalendarScreen() {
  const { profile, loading: authLoading } = useAuth();
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [selectedDateCount, setSelectedDateCount] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Calculate date range based on view
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (view) {
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return { start: monthStart, end: monthEnd };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        yearEnd.setHours(23, 59, 59, 999);
        return { start: yearStart, end: yearEnd };
      default:
        const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        defaultEnd.setHours(23, 59, 59, 999);
        return { start: defaultStart, end: defaultEnd };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();
  const { data: bookings = [], isLoading, refetch } = useCalendar(
    profile?.id || '', // Still pass userId but don't filter by it in hook
    startDate,
    endDate
  );

  // Refetch when view changes
  useEffect(() => {
    refetch();
  }, [view, refetch]);

  // Don't render if still loading auth or no profile
  if (authLoading || !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Group bookings by date (handle date range for multi-day trips)
  const bookingsByDate: Record<string, Booking[]> = {};
  bookings.forEach((booking) => {
    const startDate = new Date(booking.dateISO + 'T00:00:00');
    const endDateISO = (booking as any).endDateISO || booking.dateISO;
    const endDate = new Date(endDateISO + 'T23:59:59');
    
    // Mark all dates in the range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      if (!bookingsByDate[dateKey]) {
        bookingsByDate[dateKey] = [];
      }
      bookingsByDate[dateKey].push(booking);
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  // Create marked dates for calendar with capacity display (1/5, 3/5, 5/5)
  const markedDates: Record<string, any> = {};
  Object.keys(bookingsByDate).forEach((date) => {
    const count = bookingsByDate[date].length;
    const capacity = Math.min(count, 5);
    const capacityText = `${capacity}/5`;
    
    markedDates[date] = {
      marked: true,
      dotColor:
        count >= 5
          ? '#dc2626'
          : count > 0
          ? '#f59e0b'
          : '#16a34a',
      customStyles: {
        container: {
          backgroundColor:
            count >= 5
              ? '#fee2e2'
              : count > 0
              ? '#fef3c7'
              : '#d1fae5',
          borderRadius: 8,
          padding: 4,
        },
        text: {
          color:
            count >= 5
              ? '#991b1b'
              : count > 0
              ? '#92400e'
              : '#166534',
          fontWeight: '700',
          fontSize: 12,
        },
      },
      // Add custom text overlay for capacity
      selected: false,
    };
  });

  const handleDatePress = (day: DateData) => {
    const count = bookingsByDate[day.dateString]?.length || 0;
    setSelectedDate(day.dateString);
    setSelectedDateCount(count);
    setShowCapacityModal(true);
  };

  const getCapacityColor = (count: number) => {
    if (count >= 5) return '#dc2626';
    if (count > 0) return '#f59e0b';
    return '#16a34a';
  };

  const getCapacityLabel = (count: number) => {
    if (count >= 5) return '5/5 - Full';
    if (count > 0) return `${count}/5 - ${5 - count} slots available`;
    return '0/5 - Available';
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Schedule"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />
      <View style={styles.subHeader}>
        <Text style={styles.headerSubtitle}>
          Click a date to view reservations
        </Text>
      </View>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        {(['month', 'year'] as CalendarView[]).map((v) => (
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
              {v.charAt(0).toUpperCase() + v.slice(1)}
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
          {view === 'year' ? (
            // Year View - Calendar Grid (3 columns, 4 rows like screenshot)
            <View style={styles.yearViewContainer}>
              <Text style={styles.yearTitle}>{new Date().getFullYear()}</Text>
              <View style={styles.yearGrid}>
                {Array.from({ length: 12 }, (_, i) => {
                  const currentYear = new Date().getFullYear();
                  const monthDate = new Date(currentYear, i, 1);
                  const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
                  const fullMonthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
                  // Create date string for the first day of the month
                  const yearMonth = `${currentYear}-${String(i + 1).padStart(2, '0')}-01`;
                  // Count bookings for this month
                  const monthBookings = bookings.filter((booking) => {
                    const bookingDate = new Date(booking.dateISO);
                    return bookingDate.getMonth() === i && bookingDate.getFullYear() === currentYear;
                  });
                  const monthCount = monthBookings.length;
                  const isCurrentMonth = new Date().getMonth() === i;
                  
                  // Get first day of month and number of days
                  const firstDay = new Date(currentYear, i, 1).getDay();
                  const daysInMonth = new Date(currentYear, i + 1, 0).getDate();
                  
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.yearMonthGridItem,
                        isCurrentMonth && styles.yearMonthGridItemCurrent,
                      ]}
                      onPress={() => {
                        setView('month');
                        setSelectedDate(yearMonth);
                      }}
                      activeOpacity={0.7}
                    >
                      {/* Badge at top-right */}
                      {monthCount > 0 && (
                        <View style={styles.yearMonthGridBadge}>
                          <Text style={styles.yearMonthGridBadgeText}>{monthCount}</Text>
                        </View>
                      )}
                      <Text style={[
                        styles.yearMonthGridName,
                        isCurrentMonth && styles.yearMonthGridNameCurrent,
                      ]}>
                        {monthName}
                      </Text>
                      <View style={styles.yearMonthGridCalendar}>
                        {/* Day headers */}
                        <View style={styles.yearMonthGridDaysHeader}>
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                            <Text key={idx} style={styles.yearMonthGridDayHeader}>{day}</Text>
                          ))}
                        </View>
                        {/* Calendar grid */}
                        <View style={styles.yearMonthGridDays}>
                          {/* Empty cells for days before month starts */}
                          {Array.from({ length: firstDay }, (_, idx) => (
                            <View key={`empty-${idx}`} style={styles.yearMonthGridDayEmpty} />
                          ))}
                          {/* Days of the month - show first 3 weeks (21 days) */}
                          {Array.from({ length: Math.min(daysInMonth, 21) }, (_, idx) => {
                            const day = idx + 1;
                            const dayDate = `${currentYear}-${String(i + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const hasBooking = bookings.some((b) => {
                              const bDate = new Date(b.dateISO).toISOString().split('T')[0];
                              return bDate === dayDate;
                            });
                            const isToday = new Date().toDateString() === new Date(currentYear, i, day).toDateString();
                            
                            return (
                              <View
                                key={day}
                                style={[
                                  styles.yearMonthGridDay,
                                  hasBooking && styles.yearMonthGridDayBooked,
                                  isToday && styles.yearMonthGridDayToday,
                                ]}
                              >
                                <Text style={[
                                  styles.yearMonthGridDayText,
                                  hasBooking && styles.yearMonthGridDayTextBooked,
                                  isToday && styles.yearMonthGridDayTextToday,
                                ]}>
                                  {day}
                                </Text>
                              </View>
                            );
                          })}
                          {/* Fill remaining cells to complete 3 rows (21 cells total) */}
                          {Array.from({ length: Math.max(0, 21 - firstDay - Math.min(daysInMonth, 21)) }, (_, idx) => (
                            <View key={`fill-${idx}`} style={styles.yearMonthGridDayEmpty} />
                          ))}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* Legend - positioned below last 3 months (October, November, December) */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
                  <Text style={styles.legendText}>0/5 Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.legendText}>1-4/5 Partial</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
                  <Text style={styles.legendText}>5/5 Full</Text>
                </View>
              </View>
            </View>
          ) : (
            // Month View - Default
            <View style={styles.calendarContainer}>
              <Calendar
                current={selectedDate}
                onDayPress={handleDatePress}
                markedDates={markedDates}
                markingType="custom"
                enableSwipeMonths={true}
                hideExtraDays={true}
                firstDay={0}
                showWeekNumbers={false}
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
              
              {/* Legend for month view */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
                  <Text style={styles.legendText}>0/5 Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.legendText}>1-4/5 Partial</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
                  <Text style={styles.legendText}>5/5 Full</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Bottom padding to account for navbar */}
          <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
        </ScrollView>
      )}

      {/* Capacity Modal */}
      <Modal
        visible={showCapacityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCapacityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formatDate(selectedDate)}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCapacityModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.capacityCard}>
                <View style={[styles.capacityIconContainer, { backgroundColor: getCapacityColor(selectedDateCount) + '20' }]}>
                  <Ionicons 
                    name={selectedDateCount >= 5 ? "close-circle" : selectedDateCount > 0 ? "time" : "checkmark-circle"} 
                    size={48} 
                    color={getCapacityColor(selectedDateCount)} 
                  />
                </View>
                <Text style={styles.capacityValue}>
                  {selectedDateCount}/5
                </Text>
                <Text style={styles.capacityLabel}>
                  {getCapacityLabel(selectedDateCount)}
                </Text>
                
                {selectedDateCount >= 5 && (
                  <View style={styles.fullWarning}>
                    <Ionicons name="alert-circle" size={20} color="#dc2626" />
                    <Text style={styles.fullWarningText}>
                      All slots are booked for this date
                    </Text>
                  </View>
                )}
                
                {selectedDateCount > 0 && selectedDateCount < 5 && (
                  <View style={styles.partialInfo}>
                    <Ionicons name="information-circle" size={20} color="#f59e0b" />
                    <Text style={styles.partialInfoText}>
                      {5 - selectedDateCount} slot{5 - selectedDateCount !== 1 ? 's' : ''} still available
                    </Text>
                  </View>
                )}
                
                {selectedDateCount === 0 && (
                  <View style={styles.availableInfo}>
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                    <Text style={styles.availableInfoText}>
                      All 5 slots are available for booking
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  subHeader: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  yearViewContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  yearTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  yearMonthGridItem: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 130,
    position: 'relative',
  },
  yearMonthGridItemCurrent: {
    borderColor: '#7a0019',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  yearMonthGridName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  yearMonthGridNameCurrent: {
    color: '#7a0019',
    fontWeight: '700',
  },
  yearMonthGridCalendar: {
    position: 'relative',
  },
  yearMonthGridDaysHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  yearMonthGridDayHeader: {
    flex: 1,
    fontSize: 8,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  yearMonthGridDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  yearMonthGridDayEmpty: {
    width: '14.28%',
    aspectRatio: 1,
  },
  yearMonthGridDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  yearMonthGridDayBooked: {
    backgroundColor: '#fef3c7',
  },
  yearMonthGridDayToday: {
    backgroundColor: '#7a0019',
  },
  yearMonthGridDayText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6b7280',
  },
  yearMonthGridDayTextBooked: {
    color: '#92400e',
    fontWeight: '600',
  },
  yearMonthGridDayTextToday: {
    color: '#fff',
    fontWeight: '700',
  },
  yearMonthGridBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#7a0019',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
  },
  yearMonthGridBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
  capacityCard: {
    padding: 32,
    alignItems: 'center',
  },
  capacityIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  capacityValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  capacityLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  fullWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  fullWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    flex: 1,
  },
  partialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  partialInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    flex: 1,
  },
  availableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  availableInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
});

