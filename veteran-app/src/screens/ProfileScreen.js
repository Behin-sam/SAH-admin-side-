/**
 * Profile Screen
 * Shows veteran profile, settings, stats, counselor choice, and logout with VALOR design system
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
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { COUNSELORS_LIST } from './DashboardScreen';
import { chatAPI } from '../services/api';
import { storage } from '../services/storage';

const ProfileScreen = ({ navigation }) => {
  const { user, setUser, logout } = useAuth();
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [counselorModalVisible, setCounselorModalVisible] = useState(false);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm('Are you sure you want to sign out of your account?')) {
          logout();
        }
      } else {
        logout();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
        ]
      );
    }
  };

  const handleSelectCounselor = async (counselor) => {
    try {
      if (user?.id) {
        await chatAPI.chooseCounselor(user.id, counselor.id, counselor.name).catch(() => {});
      }
    } catch (e) {
      console.warn('Counselor select api fallback:', e);
    }

    const updated = {
      ...user,
      assignedCounselorId: counselor.id,
      assignedCounselorName: counselor.name,
      assignedCounselorTitle: counselor.title,
      assignedCounselorSpecialty: counselor.specialty,
    };
    if (setUser) setUser(updated);
    try {
      await storage.set('user', JSON.stringify(updated));
    } catch (e) {}

    setCounselorModalVisible(false);
    if (Platform.OS === 'web') {
      window.alert(`Assigned to ${counselor.name}!\n\nYour clinical channel is now linked to ${counselor.institution}.`);
    } else {
      Alert.alert('Counselor Assigned! 🩺', `Your clinical channel is now linked to ${counselor.name}.`);
    }
  };

  const assignedCounselor = user?.assignedCounselorName || 'Dr. Ananya Nair, MD';

  const menuItems = [
    {
      icon: 'chatbubbles',
      title: 'Clinical Counselor Chat',
      subtitle: `Channel with ${assignedCounselor}`,
      onPress: () => navigation.navigate('Chat', { counselorName: assignedCounselor }),
      color: theme.colors.rust[500],
    },
    {
      icon: 'medical',
      title: 'Choose Clinical Counselor',
      subtitle: `${assignedCounselor} • Tap to change`,
      onPress: () => setCounselorModalVisible(true),
      color: '#0D9488',
    },
    {
      icon: 'clipboard',
      title: 'Daily 5-Questionnaire Check-In',
      subtitle: 'Harvard Trauma clinical protocol • +20 Valor Points',
      onPress: () => navigation.navigate('Assessment'),
      color: theme.colors.rust[600],
    },
    {
      icon: 'person',
      title: 'Service Profile',
      subtitle: `${user?.service_branch || 'Army'} • ${user?.rank || 'Captain'}`,
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
      icon: 'information-circle',
      title: 'About VALOR Protocol',
      subtitle: 'Version 2.0 (Integrated Web & Mobile)',
      onPress: () => Alert.alert('VALOR Protocol', 'Integrated Web & Mobile Veteran Recovery System with Harvard Trauma Questionnaire Protocol.'),
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

      {/* COUNSELOR SELECTION MODAL */}
      <Modal
        visible={counselorModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCounselorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalOverline}>CLINICAL DIRECTORY</Text>
                <Text style={styles.modalTitle}>Choose Your Counselor</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCounselorModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={theme.colors.espresso[700]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {COUNSELORS_LIST.map((c) => {
                const isSelected = assignedCounselor.includes(c.name.split(' ')[1]);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.counselorOptionCard, isSelected && styles.counselorOptionActive]}
                    onPress={() => handleSelectCounselor(c)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.counselorOptionAvatar}>
                      <Text style={styles.counselorOptionAvatarText}>{c.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.counselorOptionName}>{c.name}</Text>
                        <Text style={styles.ratingText}>⭐ {c.rating}</Text>
                      </View>
                      <Text style={styles.counselorOptionTitle}>{c.title}</Text>
                      <Text style={styles.counselorOptionInst}>{c.institution}</Text>
                      <Text style={styles.counselorOptionSpec}>Focus: {c.specialty}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setCounselorModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.espresso[900],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.rust[500],
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: theme.colors.espresso[500],
    marginBottom: 10,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.espresso[900],
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  serviceText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.peach[200],
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.espresso[500],
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: theme.colors.cream[400],
    alignSelf: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    overflow: 'hidden',
    marginBottom: 16,
    ...theme.shadows.sm,
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
    borderRadius: 12,
    backgroundColor: theme.colors.cream[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.espresso[900],
  },
  menuSubtitle: {
    fontSize: 11,
    color: theme.colors.espresso[500],
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.status.urgent,
    marginBottom: 20,
    gap: 8,
  },
  logoutButtonText: {
    color: theme.colors.status.urgent,
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.espresso[700],
  },
  footerSub: {
    fontSize: 10,
    color: theme.colors.espresso[400],
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.espresso[400],
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  counselorOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 12,
    marginBottom: 10,
  },
  counselorOptionActive: {
    backgroundColor: theme.colors.peach[100],
    borderColor: theme.colors.rust[500],
  },
  counselorOptionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.rust[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  counselorOptionAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  counselorOptionName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  counselorOptionTitle: {
    fontSize: 11,
    color: theme.colors.rust[600],
    fontWeight: '700',
    marginTop: 1,
  },
  counselorOptionInst: {
    fontSize: 11,
    color: theme.colors.espresso[600],
    marginTop: 1,
  },
  counselorOptionSpec: {
    fontSize: 10,
    color: theme.colors.espresso[400],
    marginTop: 2,
  },
  modalCancelBtn: {
    backgroundColor: theme.colors.espresso[900],
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default ProfileScreen;
