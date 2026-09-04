/**
 * Profile Screen
 * Shows veteran profile, settings, stats, and logout with VALOR design system
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'chatbubbles',
      title: 'Clinical Counselor Chat',
      subtitle: 'Confidential channel with Dr. Ananya Nair',
      onPress: () => navigation.navigate('Chat', { counselorName: 'Dr. Ananya Nair' }),
      color: theme.colors.rust[500],
    },
    {
      icon: 'person',
      title: 'Service Profile',
      subtitle: 'Branch, deployment, and personal record',
      onPress: () => Alert.alert('Service Profile', `${user?.name || 'Veteran'} | ${user?.service_branch || 'Army'} (${user?.rank || 'Captain'})`),
    },
    {
      icon: 'notifications',
      title: 'Daily Task Reminders',
      subtitle: 'Gentle prompts for scheduled check-ins',
      rightElement: (
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: theme.colors.cream[400], true: theme.colors.peach[300] }}
          thumbColor={notificationsEnabled ? theme.colors.rust[500] : theme.colors.espresso[400]}
        />
      ),
    },
    {
      icon: 'location',
      title: 'GPS Activity Tracking',
      subtitle: 'Verified movement for recovery points',
      rightElement: (
        <Switch
          value={gpsEnabled}
          onValueChange={setGpsEnabled}
          trackColor={{ false: theme.colors.cream[400], true: theme.colors.peach[300] }}
          thumbColor={gpsEnabled ? theme.colors.rust[500] : theme.colors.espresso[400]}
        />
      ),
    },
    {
      icon: 'shield-checkmark',
      title: 'Confidentiality & Privacy',
      subtitle: 'HIPAA-aligned trauma data protection',
      onPress: () => Alert.alert('Privacy Protection', 'All assessment and GPS logs are end-to-end protected and strictly confidential.'),
    },
    {
      icon: 'help-circle',
      title: 'Clinical Support Desk',
      subtitle: 'Assistance with recovery schedules',
      onPress: () => Alert.alert('Support Desk', 'Contact clinical ops: support@sah-recovery.org'),
    },
    {
      icon: 'information-circle',
      title: 'About VALOR Protocol',
      subtitle: 'Version 2.0 (Full Integration)',
      onPress: () => Alert.alert('VALOR Protocol', 'Integrated Web & Mobile Veteran Recovery System'),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0) : 'V'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton} onPress={() => Alert.alert('Photo', 'Profile photo update coming soon.')}>
            <Ionicons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.name || 'Capt. Vikram Rathore'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'vikram@sah-veterans.org'}</Text>

        <View style={styles.serviceBadge}>
          <Ionicons name="shield" size={14} color={theme.colors.rust[300]} style={{ marginRight: 6 }} />
          <Text style={styles.serviceText}>
            {user?.service_branch || 'Army'} {user?.rank ? `• ${user.rank}` : '• Captain'}
          </Text>
        </View>
      </View>

      {/* Quick Stats Banner */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.total_points || 250}</Text>
          <Text style={styles.statLabel}>Valor Points</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.current_streak || 5} d</Text>
          <Text style={styles.statLabel}>Active Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.tasks_completed || 12}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
            onPress={item.onPress}
          >
            <View style={[styles.menuIcon, item.color && { backgroundColor: theme.colors.peach[100] }]}>
              <Ionicons name={item.icon} size={22} color={item.color || theme.colors.espresso[700]} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            {item.rightElement || (
              <Ionicons name="chevron-forward" size={18} color={theme.colors.espresso[400]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Counselor Dashboard Direct Link */}
      <TouchableOpacity
        style={styles.counselorButton}
        onPress={() => Alert.alert('Clinical Portal', 'Clinical dashboard is active on the Web portal at http://localhost:3000')}
      >
        <Ionicons name="medical" size={20} color={theme.colors.rust[500]} />
        <Text style={styles.counselorButtonText}>Clinical Provider Sync (Live)</Text>
        <Ionicons name="checkmark-circle" size={18} color={theme.colors.status.stable} />
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.status.urgent} />
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>SAH Veteran Recovery Network</Text>
        <Text style={styles.footerSub}>VALOR Protocol • Secure Client v2.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
  },
  scrollContent: {
    paddingBottom: 110,
  },
  header: {
    backgroundColor: theme.colors.espresso[900],
    padding: 24,
    paddingTop: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    ...theme.shadows.warmMd,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.cream[50],
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.espresso[800],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cream[50],
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.cream[50],
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.cream[300],
    marginBottom: 12,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  serviceText: {
    fontSize: 13,
    color: theme.colors.cream[50],
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream[50],
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    ...theme.shadows.warmMd,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.espresso[900],
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.espresso[400],
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: theme.colors.cream[300],
    alignSelf: 'center',
  },
  menuContainer: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    overflow: 'hidden',
    ...theme.shadows.warm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cream[300],
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.cream[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.espresso[900],
  },
  menuSubtitle: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    marginTop: 2,
  },
  counselorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[100],
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.peach[300],
    ...theme.shadows.warm,
  },
  counselorButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.rust[700],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cream[50],
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    ...theme.shadows.warm,
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.status.urgent,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.espresso[700],
  },
  footerSub: {
    fontSize: 11,
    color: theme.colors.espresso[400],
    marginTop: 2,
  },
});

export default ProfileScreen;
