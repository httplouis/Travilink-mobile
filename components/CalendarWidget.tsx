import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCalendar } from '@/hooks/useCalendar';

interface CalendarWidgetProps {
  userId: string;
}

export default function CalendarWidget({ userId }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const today = new Date();
  
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const { data: bookings = [] } = useCalendar(userId, monthStart, monthEnd);
  
  // Count bookings per date for capacity display
  const bookingsByDate: Record<string, number> = {};
  bookings.forEach((booking) => {
    const dateKey = booking.dateISO;
    bookingsByDate[dateKey] = (bookingsByDate[dateKey] || 0) + 1;
  });

  // Mark dates with bookings and capacity (full/partial/available)
  const markedDates: Record<string, any> = {};
  Object.keys(bookingsByDate).forEach((dateKey) => {
    const count = bookingsByDate[dateKey];
    markedDates[dateKey] = {
      marked: true,
      dotColor: count >= 5 ? '#dc2626' : count > 0 ? '#f59e0b' : '#16a34a',
      customStyles: {
        container: {
          backgroundColor: count >= 5 ? '#fee2e2' : count > 0 ? '#fef3c7' : '#d1fae5',
          borderRadius: 8,
          padding: 4,
          borderWidth: count >= 5 ? 2 : count > 0 ? 1 : 0,
          borderColor: count >= 5 ? '#dc2626' : count > 0 ? '#f59e0b' : 'transparent',
        },
        text: {
          color: count >= 5 ? '#991b1b' : count > 0 ? '#92400e' : '#166534',
          fontWeight: '700',
          fontSize: 12,
          textAlign: 'center',
          lineHeight: 16,
        },
      },
    };
  });

  // Mark today
  const todayKey = today.toISOString().split('T')[0];
  markedDates[todayKey] = {
    ...markedDates[todayKey],
    selected: true,
    selectedColor: '#7a0019',
  };
  
  // Format for Calendar component: YYYY-MM-DD (first day of month)
  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;
  
  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
  };
  
  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
  };

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [showDayDetails, setShowDayDetails] = React.useState(false);

  const handleDayPress = (day: any) => {
    const dateKey = day.dateString;
    const dayBookings = bookings.filter(b => b.dateISO === dateKey);
    setSelectedDate(dateKey);
    setShowDayDetails(true);
  };

  const handleViewYearlyCalendar = () => {
    // Pass current month as parameter so yearly calendar can scroll to it
    const currentMonthIndex = currentMonth.getMonth();
    router.push(`/(tabs)/yearly-calendar?month=${currentMonthIndex}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color="#7a0019" />
          <Text style={styles.title}>Calendar</Text>
        </View>
        <TouchableOpacity onPress={handleViewYearlyCalendar} style={styles.viewYearlyButton}>
          <Text style={styles.viewYearlyText}>Full Year View</Text>
          <Ionicons name="chevron-forward" size={16} color="#7a0019" />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color="#7a0019" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color="#7a0019" />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarWrapper}>
        <Calendar
          key={currentMonthKey} // Force re-render when month changes
          current={currentMonthKey}
          markedDates={markedDates}
          markingType="custom"
          hideExtraDays
          disableMonthChange={true}
          hideArrows={true}
          hideDayNames={false}
          onDayPress={handleDayPress}
          onMonthChange={(month) => {
            // Sync state when calendar month changes (if user swipes)
            setCurrentMonth(new Date(month.year, month.month - 1, 1));
          }}
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: '#6b7280',
            selectedDayBackgroundColor: '#7a0019',
            selectedDayTextColor: '#fff',
            todayTextColor: '#7a0019',
            dayTextColor: '#111827',
            textDisabledColor: '#d1d5db',
            dotColor: '#7a0019',
            selectedDotColor: '#fff',
            arrowColor: '#7a0019',
            monthTextColor: 'transparent', // Hide Calendar component's month text
            textDayFontWeight: '600',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 14,
            textMonthFontSize: 0, // Hide month text from Calendar component
            textDayHeaderFontSize: 12,
          }}
          style={styles.calendar}
          renderHeader={() => null} // Hide default header completely
          dayComponent={undefined} // Remove custom dayComponent - use default with customStyles
        />
        </View>
      </View>

      {/* Day Details Modal */}
      <DayDetailsModal
        date={selectedDate || ''}
        bookings={selectedDate ? bookings.filter(b => b.dateISO === selectedDate) : []}
        showDayDetails={showDayDetails}
        onClose={() => {
          setShowDayDetails(false);
          setSelectedDate(null);
        }}
      />
    </View>
  );
}

// Day Details Modal Component
function DayDetailsModal({ 
  date, 
  bookings, 
  showDayDetails,
  onClose 
}: { 
  date: string; 
  bookings: any[]; 
  showDayDetails: boolean;
  onClose: () => void;
}) {
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const getCapacityStatus = (count: number) => {
    if (count >= 5) return { label: 'Full', color: '#dc2626', bg: '#fee2e2' };
    if (count > 0) return { label: 'Partial', color: '#f59e0b', bg: '#fef3c7' };
    return { label: 'Available', color: '#16a34a', bg: '#d1fae5' };
  };

  const status = getCapacityStatus(bookings.length);

  if (!date) return null;

  return (
    <Modal
      visible={showDayDetails}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={modalStyles.overlay}
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={modalStyles.modal} onStartShouldSetResponder={() => true}>
        <View style={modalStyles.header}>
          <View>
            <Text style={modalStyles.dateText}>{formattedDate}</Text>
            <View style={[modalStyles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[modalStyles.statusText, { color: status.color }]}>
                {status.label} ({bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'})
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={modalStyles.content}>
          <View style={modalStyles.capacityInfo}>
            <View style={[modalStyles.capacityCard, { backgroundColor: status.bg, borderColor: status.color }]}>
              <Ionicons 
                name={status.label === 'Full' ? 'close-circle' : status.label === 'Partial' ? 'alert-circle' : 'checkmark-circle'} 
                size={32} 
                color={status.color} 
              />
              <Text style={[modalStyles.capacityLabel, { color: status.color }]}>
                {status.label}
              </Text>
              <Text style={modalStyles.capacityCount}>
                {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'} scheduled
              </Text>
            </View>
            <View style={modalStyles.capacityMessage}>
              <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
              <Text style={modalStyles.capacityMessageText}>
                {status.label === 'Full' 
                  ? 'This date has reached maximum capacity. Consider selecting an alternative date.'
                  : status.label === 'Partial'
                  ? 'This date has some bookings. Availability may be limited.'
                  : 'This date is available for new bookings.'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  calendarContainer: {
    marginBottom: 16,
    minHeight: 340, // Increased from 280 - better visibility
    maxHeight: 340, // Increased from 280 - better visibility
  },
  calendarWrapper: {
    height: 300, // Increased from 240 - better visibility
    overflow: 'hidden',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  calendar: {
    borderRadius: 8,
  },
  viewYearlyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewYearlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: 400,
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  capacityInfo: {
    padding: 20,
    gap: 16,
  },
  capacityCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
  },
  capacityLabel: {
    fontSize: 24,
    fontWeight: '700',
  },
  capacityCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  capacityMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  capacityMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

