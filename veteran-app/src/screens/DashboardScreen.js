/**
 * VALOR Dashboard Screen
 * Mobile-friendly, trauma-informed daily journey and recovery overview
 * - Exactly 5 curated daily tasks per day (with GPS walking integration)
 * - Access to 5-question Daily Wellness Check-In (Harvard Trauma Protocol)
 * - Client Counselor Selector (Choose Dr. Nair, Dr. Varma, Dr. Kulkarni, Maj. Gen. Pillai)
 * - Quick Sign Out (Web & Native compatible)
 * - Squad and Rewards sync
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { veteranAPI, taskAPI, chatAPI } from '../services/api';
import { storage } from '../services/storage';

export const COUNSELORS_LIST = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Dr. Ananya Nair, MD',
    title: 'Lead Trauma Specialist',
    institution: 'Amrita Institute of Medical Sciences',
    specialty: 'Combat PTSD & Somatic Grounding',
    rating: 4.9,
    avatar: 'AN',
    badge: 'Primary Lead',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Dr. Rajesh Varma, PhD',
    title: 'Senior Defense Psychologist',
    institution: 'Armed Forces Medical College (AFMC)',
    specialty: 'Cognitive Processing & Exposure Protocol',
    rating: 4.8,
    avatar: 'RV',
    badge: 'AFMC Clinical',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Dr. Sneha Kulkarni, MS',
    title: 'Mindfulness & Sleep Coach',
    institution: 'National Institute of Mental Health',
    specialty: 'Sleep Architecture & Stress De-escalation',
    rating: 4.9,
    avatar: 'SK',
    badge: 'NIMH Specialist',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    name: 'Maj. Gen. (Retd) Dr. Ramesh Pillai',
    title: 'Combat Veteran Psychiatrist',
    institution: 'Military Wellness Council',
    specialty: 'Transition Trauma & Peer Reintegration',
    rating: 5.0,
    avatar: 'RP',
    badge: 'Combat Veteran',
  },
];

const DEFAULT_FIVE_TASKS = [
  {
    id: '1',
    type: 'mental',
    title: '5-4-3-2-1 Sensory Grounding',
    description: 'Acknowledge 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
    points: 15,
    status: 'completed',
    gps_required: false,
  },
  {
    id: '2',
    type: 'physical',
    title: 'Brisk 30-Minute Grounding Walk',
    description: 'Elevate heart rate and boost bilateral stimulation with GPS-verified movement.',
    points: 25,
    status: 'assigned',
    gps_required: true,
    gps_target_distance_meters: 1000,
  },
  {
    id: '3',
    type: 'mental',
    title: 'Cognitive Reframing Journal',
    description: 'Challenge a combat anxiety thought pattern by writing down a grounded perspective.',
    points: 20,
    status: 'assigned',
    gps_required: false,
  },
  {
    id: '4',
    type: 'social',
    title: 'Squad Community Check-In',
    description: 'Leave an encouraging word for your Morning Walkers recovery squad.',
    points: 15,
    status: 'assigned',
    gps_required: false,
  },
  {
    id: '5',
    type: 'mental',
    title: 'Box Breathing Sleep Protocol',
    description: '4-4-4-4 diaphragmatic breathing session to calm sympathetic nervous tone before bed.',
    points: 15,
    status: 'assigned',
    gps_required: false,
  },
];

const DashboardScreen = ({ navigation }) => {
  const { user, setUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [counselorModalVisible, setCounselorModalVisible] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    try {
      if (user?.id) {
        try {
          const liveData = await veteranAPI.getDashboard(user.id);
          if (liveData && liveData.stats) {
            // Ensure exactly 5 tasks
            const tasksList = (liveData.today_tasks && liveData.today_tasks.length >= 5)
              ? liveData.today_tasks.slice(0, 5)
              : (liveData.today_tasks && liveData.today_tasks.length > 0)
                ? [...liveData.today_tasks, ...DEFAULT_FIVE_TASKS.slice(liveData.today_tasks.length, 5)]
                : DEFAULT_FIVE_TASKS;

            setDashboardData({
              ...liveData,
              today_tasks: tasksList,
            });
            setLoading(false);
            setRefreshing(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Live dashboard fetch fallback:', apiErr.message);
        }
      }

      // Fallback data with exactly 5 daily tasks
      setDashboardData({
        greeting: getGreeting(),
        stats: {
          total_points: user?.total_points || 250,
          current_streak: user?.current_streak || 5,
          tasks_completed: user?.tasks_completed || 12,
          pending_tasks: 4,
        },
        today_tasks: DEFAULT_FIVE_TASKS,
        groups: [
          {
            id: 'g1',
            name: 'Morning Walkers',
            member_count: 8,
            total_points: 450,
          },
        ],
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
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
      window.alert(`Assigned to ${counselor.name}!\n\nYour clinical channel is now connected to ${counselor.institution}.`);
    } else {
      Alert.alert('Counselor Assigned! 🩺', `Your clinical channel is now connected to ${counselor.name}.`);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm('Are you sure you want to sign out of your account?')) {
          logout();
        }
      } else {
        logout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  const handleToggleTask = async (task) => {
    if (task.status === 'completed') return;

    if (task.gps_required) {
      navigation.navigate('GPSTracking', { taskId: task.id, task });
      return;
    }

    setCompletingTaskId(task.id);
    try {
      if (user?.id) {
        await taskAPI.completeTask(user.id, task.id).catch(() => {});
      }

      setDashboardData((prev) => {
        if (!prev) return prev;
        const updatedTasks = prev.today_tasks.map((t) =>
          t.id === task.id ? { ...t, status: 'completed' } : t
        );
        return {
          ...prev,
          stats: {
            ...prev.stats,
            total_points: (prev.stats?.total_points || 250) + (task.points || 15),
            tasks_completed: (prev.stats?.tasks_completed || 12) + 1,
            pending_tasks: Math.max(0, (prev.stats?.pending_tasks || 5) - 1),
          },
          today_tasks: updatedTasks,
        };
      });

      if (user && setUser) {
        setUser({
          ...user,
          total_points: (user.total_points || 250) + (task.points || 15),
          tasks_completed: (user.tasks_completed || 12) + 1,
        });
      }

      const msg = `+${task.points} Valor Points awarded. Outstanding consistency!`;
      if (Platform.OS === 'web') {
        window.alert(`Valor Milestone! 🎯\n\n${msg}`);
      } else {
        Alert.alert('Valor Milestone! 🎯', msg);
      }
    } finally {
      setCompletingTaskId(null);
    }
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.rust[500]} />
        <Text style={styles.loadingText}>Loading your daily journey...</Text>
      </View>
    );
  }

  const tasks = dashboardData?.today_tasks || DEFAULT_FIVE_TASKS;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length || 5;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const assignedCounselorName = user?.assignedCounselorName || 'Dr. Ananya Nair, MD';
  const assignedCounselorTitle = user?.assignedCounselorTitle || 'Lead Trauma Specialist • Amrita';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.rust[500]]} />}
    >
      {/* Hero Profile Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>
              {user?.name ? user.name.charAt(0) : 'V'}
            </Text>
          </View>
          <View style={styles.heroTitles}>
            <Text style={styles.heroGreeting}>
              {getGreeting()}, {user?.name?.split(' ')[1] || 'Warrior'}
            </Text>
            <Text style={styles.heroRank}>
              {user?.service_branch || 'Indian Army (Para SF)'} • {user?.rank || 'Captain'}
            </Text>
          </View>

          {/* Quick Sign Out Button in Header */}
          <TouchableOpacity
            style={styles.heroLogoutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
            <Text style={styles.heroLogoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats Bar inside Hero */}
        <View style={styles.heroStatsBar}>
          <View style={styles.heroStatItem}>
            <View style={styles.statIconBadge}>
              <Ionicons name="trophy" size={16} color="#D97706" />
            </View>
            <View>
              <Text style={styles.heroStatValue}>{dashboardData?.stats?.total_points || 250}</Text>
              <Text style={styles.heroStatLabel}>Valor Points</Text>
            </View>
          </View>

          <View style={styles.heroStatDivider} />

          <View style={styles.heroStatItem}>
            <View style={styles.statIconBadge}>
              <Ionicons name="flame" size={16} color={theme.colors.rust[500]} />
            </View>
            <View>
              <Text style={styles.heroStatValue}>{dashboardData?.stats?.current_streak || 5} d</Text>
              <Text style={styles.heroStatLabel}>Day Streak</Text>
            </View>
          </View>

          <View style={styles.heroStatDivider} />

          <View style={styles.heroStatItem}>
            <View style={styles.statIconBadge}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.status.stable} />
            </View>
            <View>
              <Text style={styles.heroStatValue}>{completedCount}/{totalCount}</Text>
              <Text style={styles.heroStatLabel}>5 Tasks Done</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Today's Journey Progress Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardOverline}>TODAY'S 5-TASK RECOVERY PLAN</Text>
            <Text style={styles.cardTitle}>Daily Discipline & Consistency</Text>
          </View>
          <View style={styles.percentBadge}>
            <Text style={styles.percentBadgeText}>{progressPercent}% Complete</Text>
          </View>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <Text style={styles.progressSubtext}>
          {completedCount === totalCount
            ? '🎉 Outstanding! All 5 daily wellness rituals completed.'
            : `${totalCount - completedCount} tasks remaining to preserve your active streak.`}
        </Text>
      </View>

      {/* Daily 5-Questionnaire Check-In Prompt */}
      <TouchableOpacity
        style={styles.checkInCard}
        onPress={() => navigation.navigate('Assessment')}
        activeOpacity={0.85}
      >
        <View style={styles.checkInIconCircle}>
          <Ionicons name="clipboard" size={22} color={theme.colors.rust[500]} />
        </View>
        <View style={styles.checkInInfo}>
          <Text style={styles.checkInOverline}>HARVARD TRAUMA CLINICAL PROTOCOL</Text>
          <Text style={styles.checkInTitle}>Daily 5-Question Check-In</Text>
          <Text style={styles.checkInSubtitle}>
            Complete your 5 daily questions • Earn +20 Valor Points
          </Text>
        </View>
        <View style={styles.takeTestBtn}>
          <Text style={styles.takeTestBtnText}>Open</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Today's Tasks Section (Exactly 5 Tasks) */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>Today's 5 Daily Tasks</Text>
          <View style={styles.fiveBadge}>
            <Text style={styles.fiveBadgeText}>5/day</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
          <Text style={styles.seeAllText}>View All Tasks</Text>
        </TouchableOpacity>
      </View>

      {tasks.map((task) => {
        const isDone = task.status === 'completed';
        const isBusy = completingTaskId === task.id;

        return (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskCard, isDone && styles.taskCardCompleted]}
            onPress={() => {
              if (task.gps_required && !isDone) {
                navigation.navigate('GPSTracking', { taskId: task.id, task });
              } else {
                handleToggleTask(task);
              }
            }}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              style={[styles.checkbox, isDone && styles.checkboxDone]}
              onPress={() => handleToggleTask(task)}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={theme.colors.rust[500]} />
              ) : isDone ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : null}
            </TouchableOpacity>

            <View style={styles.taskBody}>
              <View style={styles.taskTagRow}>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{task.type || 'Mental'}</Text>
                </View>
                {task.gps_required && (
                  <View style={styles.gpsTag}>
                    <Ionicons name="location" size={10} color="#B45309" />
                    <Text style={styles.gpsTagText}>GPS Tracking</Text>
                  </View>
                )}
                <Text style={styles.pointsTag}>+{task.points} pts</Text>
              </View>

              <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                {task.title}
              </Text>
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
              </Text>

              {task.gps_required && !isDone && (
                <TouchableOpacity
                  style={styles.gpsStartBtn}
                  onPress={() => navigation.navigate('GPSTracking', { taskId: task.id, task })}
                >
                  <Ionicons name="navigate" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.gpsStartBtnText}>Start GPS Walk (1.0 km)</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Clinical Counselor Direct Channel with Change Counselor Button */}
      <View style={styles.counselorCard}>
        <View style={styles.counselorHeader}>
          <View style={styles.counselorAvatar}>
            <Text style={styles.counselorAvatarText}>
              {assignedCounselorName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </Text>
          </View>
          <View style={styles.counselorTextGroup}>
            <Text style={styles.counselorCardName}>{assignedCounselorName}</Text>
            <Text style={styles.counselorCardRole}>{assignedCounselorTitle}</Text>
          </View>
        </View>

        <View style={styles.counselorBtnRow}>
          <TouchableOpacity
            style={styles.dmButton}
            onPress={() => navigation.navigate('Chat', { counselorName: assignedCounselorName })}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.dmButtonText}>Message Counselor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeCounselorBtn}
            onPress={() => setCounselorModalVisible(true)}
          >
            <Ionicons name="swap-horizontal" size={16} color={theme.colors.rust[600]} style={{ marginRight: 4 }} />
            <Text style={styles.changeCounselorBtnText}>Change Counselor</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Squads Quick Access */}
      <View style={styles.squadCard}>
        <View style={styles.squadInfo}>
          <Ionicons name="people" size={24} color={theme.colors.rust[500]} style={{ marginRight: 10 }} />
          <View>
            <Text style={styles.squadTitle}>Morning Walkers Squad</Text>
            <Text style={styles.squadSub}>8 comrades • 450 squad points</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.squadLink}
          onPress={() => navigation.navigate('Groups')}
        >
          <Text style={styles.squadLinkText}>Squad Hub</Text>
          <Ionicons name="arrow-forward" size={14} color={theme.colors.rust[600]} />
        </TouchableOpacity>
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

            <ScrollView style={{ maxHeight: 420 }}>
              {COUNSELORS_LIST.map((c) => {
                const isSelected = assignedCounselorName.includes(c.name.split(' ')[1]);
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
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[200],
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.espresso[500],
    fontSize: 14,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: theme.colors.espresso[900],
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.warm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.rust[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...theme.shadows.sm,
  },
  heroAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  heroTitles: {
    flex: 1,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  heroRank: {
    color: theme.colors.rust[300],
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  heroLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  heroLogoutText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroStatsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: theme.colors.espresso[300],
    fontSize: 10,
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    marginBottom: 14,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.espresso[400],
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginTop: 2,
  },
  percentBadge: {
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  percentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.rust[700],
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.cream[300],
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.rust[500],
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    color: theme.colors.espresso[500],
    marginTop: 4,
    fontWeight: '500',
  },
  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[100],
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.peach[300],
    padding: 14,
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  checkInIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkInInfo: {
    flex: 1,
  },
  checkInOverline: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.rust[600],
    letterSpacing: 1,
  },
  checkInTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginTop: 1,
  },
  checkInSubtitle: {
    fontSize: 11,
    color: theme.colors.espresso[500],
    marginTop: 2,
  },
  takeTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  takeTestBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  fiveBadge: {
    backgroundColor: theme.colors.rust[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[600],
  },
  seeAllText: {
    fontSize: 12,
    color: theme.colors.rust[600],
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 14,
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  taskCardCompleted: {
    backgroundColor: theme.colors.cream[100],
    opacity: 0.85,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: theme.colors.status.stable,
    borderColor: theme.colors.status.stable,
  },
  taskBody: {
    flex: 1,
  },
  taskTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  categoryTag: {
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.rust[700],
    textTransform: 'uppercase',
  },
  gpsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  gpsTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  pointsTag: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.rust[600],
    marginLeft: 'auto',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.espresso[900],
    marginBottom: 2,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.espresso[400],
  },
  taskDescription: {
    fontSize: 12,
    color: theme.colors.espresso[500],
    lineHeight: 16,
  },
  gpsStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  gpsStartBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  counselorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    marginTop: 8,
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  counselorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  counselorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  counselorAvatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  counselorTextGroup: {
    flex: 1,
  },
  counselorCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  counselorCardRole: {
    fontSize: 11,
    color: theme.colors.espresso[500],
    marginTop: 1,
  },
  counselorBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dmButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingVertical: 10,
    borderRadius: 12,
  },
  dmButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  changeCounselorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cream[100],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    paddingVertical: 10,
    borderRadius: 12,
  },
  changeCounselorBtnText: {
    color: theme.colors.rust[600],
    fontSize: 12,
    fontWeight: '700',
  },
  squadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 14,
    marginBottom: 20,
    ...theme.shadows.sm,
  },
  squadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  squadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.espresso[900],
  },
  squadSub: {
    fontSize: 11,
    color: theme.colors.espresso[400],
    marginTop: 1,
  },
  squadLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  squadLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.rust[700],
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

export default DashboardScreen;
