import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Platform } from 'react-native';
import NavigationHeader from '@/components/NavigationHeader';
import CustomTabBar from '@/components/CustomTabBar';
import SignatureSettings from '@/components/SignatureSettings';

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Settings"
        showNotification={false}
        showMenu={false}
        showBack={true}
      />
    <ScrollView style={styles.scrollView}>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="person-outline" size={20} color="#6b7280" />
            <Text style={styles.settingLabel}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => {
            // TODO: Implement change password screen
            Alert.alert('Coming Soon', 'Password change feature will be available soon.');
          }}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
            <Text style={styles.settingLabel}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Digital Signature Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Digital Signature</Text>
        <View style={styles.signatureSection}>
          <SignatureSettings />
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={20} color="#6b7280" />
            <Text style={styles.settingLabel}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#d1d5db', true: '#7a0019' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="refresh-outline" size={20} color="#6b7280" />
            <Text style={styles.settingLabel}>Auto-refresh</Text>
          </View>
          <Switch
            value={autoRefreshEnabled}
            onValueChange={setAutoRefreshEnabled}
            trackColor={{ false: '#d1d5db', true: '#7a0019' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/help')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={20} color="#6b7280" />
            <Text style={styles.settingLabel}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => {
            Alert.alert('Terms & Privacy', 'Terms and Privacy policy will be available soon.');
          }}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="document-text-outline" size={20} color="#6b7280" />
            <Text style={styles.settingLabel}>Terms & Privacy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => {
            Alert.alert(
              'About TraveLink',
              'TraveLink Mobile v1.0.0\n\nSmart Campus Transport System\n\n© 2025 MSEUF'
            );
          }}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
            <Text style={styles.settingLabel}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>


      {/* Sign Out Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>TraveLink Mobile v1.0.0</Text>
      </View>
      
      {/* Bottom padding to account for navbar */}
      <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
    </ScrollView>
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
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#111827',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#fee2e2',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  versionContainer: {
    alignItems: 'center',
    padding: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  signatureSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

