import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NavigationHeader from '@/components/NavigationHeader';
import SidebarMenu from '@/components/SidebarMenu';
import CustomTabBar from '@/components/CustomTabBar';

export default function HelpScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@mseuf.edu.ph?subject=TraviLink Mobile Support');
  };

  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const helpSections = [
    {
      title: 'Getting Started',
      items: [
        {
          icon: 'document-text-outline',
          title: 'How to Create a Request',
          description: 'Learn how to submit a transportation request',
          detailedContent: `Creating a request is easy:

1. Tap the "Request" tab in the bottom navigation
2. Choose between "Travel Order" or "Seminar Application"
3. Fill in all required information:
   - Travel dates and destination
   - Purpose of travel
   - Department and participants
   - Vehicle preferences (if applicable)
4. Review your request details
5. Submit for approval

Your request will go through an approval workflow based on your role and department.`,
        },
        {
          icon: 'calendar-outline',
          title: 'Viewing Schedule',
          description: 'Check available dates and times',
          detailedContent: `The Calendar view shows all approved and pending requests:

• Month View: See all bookings in the current month
• Year View: Overview of the entire year with booking counts
• Tap any date to see capacity (0/5, 1-4/5, or 5/5)
• Green = Available, Yellow = Partial, Red = Full

Use the calendar to plan your trips and avoid fully booked dates.`,
        },
        {
          icon: 'list-outline',
          title: 'Tracking Requests',
          description: 'Monitor your request status',
          detailedContent: `Track your requests in the "Requests" tab:

• See all your submitted requests
• Filter by status (Pending, Approved, Rejected)
• Search by destination, request number, or purpose
• View detailed tracking timeline
• See who approved or rejected your request

Request statuses:
- Pending: Waiting for approval
- Approved: Ready to proceed
- Rejected: Review reason and resubmit if needed`,
        },
      ],
    },
    {
      title: 'Account & Settings',
      items: [
        {
          icon: 'person-outline',
          title: 'Edit Profile',
          description: 'Update your personal information',
        },
        {
          icon: 'notifications-outline',
          title: 'Notification Settings',
          description: 'Manage your notification preferences',
        },
        {
          icon: 'settings-outline',
          title: 'App Settings',
          description: 'Configure app preferences',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'mail-outline',
          title: 'Contact Support',
          description: 'Email us for assistance',
          action: handleContactSupport,
        },
      ],
    },
  ];

  const faqs = [
    {
      question: 'How long does it take for a request to be approved?',
      answer: 'Approval time varies based on the type of request and approval chain. Travel orders typically take 2-5 business days, while seminar applications may take 3-7 business days depending on the approval level required.',
    },
    {
      question: 'Can I edit or cancel a submitted request?',
      answer: 'Once submitted, requests cannot be edited. You can cancel a pending request by contacting your department head or the admin office. Approved requests may require additional steps to cancel.',
    },
    {
      question: 'What if my preferred date is already fully booked?',
      answer: 'If a date shows "5/5 Full", you\'ll need to choose an alternative date. We recommend checking the calendar before submitting to find available slots.',
    },
    {
      question: 'How do I know when my request is approved?',
      answer: 'You\'ll receive a notification when your request status changes. You can also check the "Requests" tab to see real-time status updates.',
    },
    {
      question: 'Can I request a specific driver or vehicle?',
      answer: 'Yes! When creating a Travel Order, you can specify preferred drivers and vehicles in the School Service section. However, final assignments are subject to availability.',
    },
    {
      question: 'What is the difference between Travel Order and Seminar Application?',
      answer: 'Travel Orders are for official university business trips requiring transportation. Seminar Applications are specifically for training, seminars, or educational events that may require approval and funding.',
    },
    {
      question: 'How do I set my availability status?',
      answer: 'Tap your profile icon in the top left to open the sidebar, then use the "Set availability" picker to choose Online, Busy, Off Work, or On Leave.',
    },
    {
      question: 'Where can I view available vehicles and drivers?',
      answer: 'Available vehicles are shown on your Dashboard. For a complete list, tap "View All" or go to Vehicles/Drivers from the sidebar menu.',
    },
  ];

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Help & Support"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {helpSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex}>
                <TouchableOpacity
                  style={styles.helpItem}
                  onPress={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.detailedContent) {
                      // Toggle: if already expanded, collapse it; otherwise expand
                      const currentKey = sectionIndex * 100 + itemIndex;
                      setExpandedFAQ(expandedFAQ === currentKey ? null : currentKey);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.helpItemLeft}>
                    <View style={styles.helpIconContainer}>
                      <Ionicons name={item.icon as any} size={24} color="#7a0019" />
                    </View>
                    <View style={styles.helpItemContent}>
                      <Text style={styles.helpItemTitle}>{item.title}</Text>
                      <Text style={styles.helpItemDescription}>{item.description}</Text>
                    </View>
                  </View>
                  {item.detailedContent && (
                    <Ionicons 
                      name={expandedFAQ === sectionIndex * 100 + itemIndex ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#d1d5db" 
                    />
                  )}
                  {!item.detailedContent && !item.action && (
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                  )}
                </TouchableOpacity>
                {item.detailedContent && expandedFAQ === sectionIndex * 100 + itemIndex && (
                  <View style={styles.detailedContent}>
                    <Text style={styles.detailedText}>{item.detailedContent}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* FAQs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === index ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#7a0019"
                />
              </View>
              {expandedFAQ === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Ionicons name="mail" size={48} color="#7a0019" />
          <Text style={styles.contactTitle}>Need More Help?</Text>
          <Text style={styles.contactText}>
            Contact our support team for assistance
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactSupport}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>
      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <CustomTabBar />
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  helpIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpItemContent: {
    flex: 1,
    minWidth: 0,
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  helpItemDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  contactSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7a0019',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailedContent: {
    backgroundColor: '#f9fafb',
    padding: 16,
    marginTop: -8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailedText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    whiteSpace: 'pre-line',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

