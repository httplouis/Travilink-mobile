import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar } from '@/hooks/useCalendar';
import { useLocalSearchParams } from 'expo-router';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';

export default function YearlyCalendarScreen() {
  const { profile, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ month?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // If month param is provided, use it; otherwise use current month
    if (params.month) {
      return parseInt(params.month, 10);
    }
    return new Date().getMonth();
  });
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Fetch all bookings for the entire year
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  
  const { data: bookings = [], isLoading } = useCalendar(
    profile?.id || '',
    yearStart,
    yearEnd
  );

  // Count bookings per date
  const bookingsByDate: Record<string, number> = {};
  bookings.forEach((booking) => {
    const dateKey = booking.dateISO;
    bookingsByDate[dateKey] = (bookingsByDate[dateKey] || 0) + 1;
  });

  // Create marked dates for all months
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
        },
      },
    };
  });

  // Mark today
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  markedDates[todayKey] = {
    ...markedDates[todayKey],
    selected: true,
    selectedColor: '#7a0019',
  };

  const handlePrevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const handleNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Scroll to current month when component mounts or month param changes
  useEffect(() => {
    if (!isLoading && scrollViewRef.current) {
      // Calculate approximate scroll position for the month
      // Each month container is roughly 320px tall (280px calendar + padding)
      const monthHeight = 320;
      const scrollPosition = selectedMonth * monthHeight;
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scrollPosition,
          animated: true,
        });
      }, 300); // Small delay to ensure calendar is rendered
    }
  }, [selectedMonth, isLoading]);

  // Update selectedMonth when month param changes
  useEffect(() => {
    if (params.month) {
      const monthIndex = parseInt(params.month, 10);
      if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex <= 11) {
        setSelectedMonth(monthIndex);
      }
    }
  }, [params.month]);

  if (authLoading || !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7a0019" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Yearly Calendar"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Year Navigation */}
        <View style={styles.yearHeader}>
          <TouchableOpacity onPress={handlePrevYear} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#7a0019" />
          </TouchableOpacity>
          <Text style={styles.yearText}>{currentYear}</Text>
          <TouchableOpacity onPress={handleNextYear} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#7a0019" />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#d1fae5', borderColor: '#16a34a' }]} />
            <Text style={styles.legendText}>Available (0 bookings)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1 }]} />
            <Text style={styles.legendText}>Partial (1-4 bookings)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#fee2e2', borderColor: '#dc2626', borderWidth: 2 }]} />
            <Text style={styles.legendText}>Full (5+ bookings)</Text>
          </View>
        </View>

        {/* Monthly Calendars */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7a0019" />
            <Text style={styles.loadingText}>Loading calendar...</Text>
          </View>
        ) : (
          <View style={styles.monthsContainer}>
            {months.map((monthName, monthIndex) => {
              const monthKey = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;
              return (
                <View key={monthIndex} style={styles.monthContainer}>
                  <Text style={styles.monthTitle}>{monthName}</Text>
                  <View style={styles.calendarWrapper}>
                    <Calendar
                      key={monthKey}
                      current={monthKey}
                      markedDates={markedDates}
                      markingType="custom"
                      hideExtraDays
                      disableMonthChange={true}
                      hideArrows={true}
                      hideDayNames={false}
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
                        monthTextColor: 'transparent',
                        textDayFontWeight: '600',
                        textMonthFontWeight: '700',
                        textDayHeaderFontWeight: '600',
                        textDayFontSize: 12,
                        textMonthFontSize: 0,
                        textDayHeaderFontSize: 11,
                      }}
                      style={styles.calendar}
                      renderHeader={() => null}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>

      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  yearText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  monthsContainer: {
    padding: 16,
    gap: 24,
  },
  monthContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendarWrapper: {
    height: 280,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 8,
  },
});

