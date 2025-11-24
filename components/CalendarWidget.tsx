import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

  const handleCalendarPress = () => {
    router.push('/(tabs)/calendar');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleCalendarPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color="#7a0019" />
          <Text style={styles.title}>Calendar</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
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
    </TouchableOpacity>
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
});

