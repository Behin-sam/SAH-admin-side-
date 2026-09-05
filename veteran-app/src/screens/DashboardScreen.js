/**
 * VALOR Headquarters (Dashboard Screen)
 * Complete Mobile Front-End Remake
 * - Tactical Commander Status Bar with Crisis SOS
 * - Daily Recovery Readiness Dial & 3-Metric Bar
 * - Harvard Trauma Protocol Daily Check-In Launchpad
 * - 5 Curated Tactical Missions with GPS Movement Integration
 * - Encrypted Clinical Channel with Assigned Specialist
 * - Immediate 5-4-3-2-1 Sensory Grounding Quick Action
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
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
    name: 'Dr. Maya Kulkarni, MD',
    title: 'Clinical Neuropsychiatrist',
    institution: 'NIMHANS Trauma Recovery Unit',
    specialty: 'Sleep Dysregulation & Flashback Recovery',
    rating: 4.9,
    avatar: 'MK',
    badge: 'Neuro-Trauma',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    name: 'Maj. Gen. (Retd.) K. Pillai',
    title: 'Veteran Peer Liaison & Counselor',
    institution: 'Armed Forces Veteran Support Command',
    specialty: 'Combat Transition & Moral Injury',
    rating: 4.95,
    avatar: 'KP',
    badge: 'Veteran Peer',
  },
];

export const DEFAULT_FIVE_TASKS = [
  {
    id: '1',
    type: 'mental',
    title: '5-4-3-2-1 Sensory Grounding',
    description: 'Acknowledge 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
    points: 15,
    status: 'assigned',
    difficulty: 1,
    category: 'grounding',
    gps_required: false,
  },
  {
    id: '2',
    type: 'physical',
    title: 'Brisk 30-Minute Grounding Walk',
    description: 'Elevate heart rate and boost bilateral stimulation with GPS-verified movement.',
    points: 25,
    status: 'assigned',
    difficulty: 2,
    category: 'cardio',
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
    difficulty: 2,
    category: 'reframing',
    gps_required: false,
  },
  {
    id: '4',
    type: 'social',
    title: 'Squad Community Check-In',
    description: 'Leave an encouraging word for your Morning Walkers recovery squad.',
    points: 15,
    status: 'assigned',
    difficulty: 1,
    category: 'social',
    gps_required: false,
  },
  {
    id: '5',
    type: 'mental',
    title: 'Box Breathing Sleep Protocol',
    description: '4-4-4-4 diaphragmatic breathing session to calm sympathetic nervous tone before bed.',
    points: 15,
    status: 'assigned',
    difficulty: 1,
    category: 'breathing',
    gps_required: false,
  },
];

const DashboardScreen = ({ navigation }) => {
  const { user, setUser, logout, updatePoints } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [counselorModalVisible, setCounselorModalVisible] = useState(false);
  const [counselorsList, setCounselorsList] = useState(COUNSELORS_LIST);
  const [groundingModalVisible, setGroundingModalVisible] = useState(false);
  const [groundingStep, setGroundingStep] = useState(5);

  const loadCounselors = async () => {
    try {
      const res = await chatAPI.listCounselors();
      if (res?.counselors && res.counselors.length > 0) {
        setCounselorsList(res.counselors);
      }
    } catch (e) {
      console.warn('Counselors directory fetch fallback:', e);
    }
  };

  const loadDashboard = useCallback(async () => {
    try {
      if (user?.id) {
        try {
          const liveData = await veteranAPI.getDashboard(user.id);
          if (liveData && liveData.stats) {
            const rawTasks = (liveData.today_tasks && liveData.today_tasks.length >= 5)
              ? liveData.today_tasks.slice(0, 5)
              : (liveData.today_tasks && liveData.today_tasks.length > 0)
                ? [...liveData.today_tasks, ...DEFAULT_FIVE_TASKS.slice(liveData.today_tasks.length, 5)]
                : DEFAULT_FIVE_TASKS;

            const checkedTasks = await Promise.all(
              rawTasks.map(async (t) => {
                const isDone = await storage.get(`@sah_task_done_${t.id}`);
                return isDone ? { ...t, status: 'completed' } : t;
              })
            );

            setDashboardData({
              ...liveData,
              today_tasks: checkedTasks,
            });
            setLoading(false);
            setRefreshing(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Live dashboard fallback:', apiErr.message);
        }
      }

      const checkedFallbackTasks = await Promise.all(
        DEFAULT_FIVE_TASKS.map(async (t) => {
          const isDone = await storage.get(`@sah_task_done_${t.id}`);
          return isDone ? { ...t, status: 'completed' } : t;
        })
      );

      setDashboardData({
        stats: {
          total_points: user?.total_points || 250,
          current_streak: user?.current_streak || 5,
          tasks_completed: user?.tasks_completed || 12,
          pending_tasks: checkedFallbackTasks.filter((t) => t.status !== 'completed').length,
        },
        today_tasks: checkedFallbackTasks,
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
    loadCounselors();
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      loadCounselors();
    }, [loadDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
    loadCounselors();
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
      await storage.set(`@sah_task_done_${task.id}`, 'true');

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

      if (updatePoints) {
        await updatePoints(task.points || 15);
      } else if (user && setUser) {
        setUser({
          ...user,
          total_points: (user.total_points || 250) + (task.points || 15),
          tasks_completed: (user.tasks_completed || 12) + 1,
        });
      }

      const msg = `+${task.points} Valor Points awarded. Outstanding consistency!`;
      if (Platform.OS === 'web') {
        window.alert(`Drill Completed! 🎖️\n\n${msg}`);
      } else {
        Alert.alert('Drill Completed! 🎖️', msg);
      }
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleSelectCounselor = async (counselor) => {
    try {
      if (user?.id) {
        await chatAPI.chooseCounselor(user.id, counselor.id, counselor.name);
      }
    } catch (e) {
      console.warn('Counselor select api error:', e);
    }

    const updated = {
      ...user,
      assignedCounselorId: counselor.id,
      assignedCounselorName: counselor.name,
      assignedCounselorTitle: counselor.title,
      assignedCounselorSpecialty: counselor.specialty,
    };
    if (setUser) setUser(updated);
    await storage.set('user', JSON.stringify(updated));

    setCounselorModalVisible(false);
    if (Platform.OS === 'web') {
      window.alert(`Assigned to ${counselor.name}!\n\nYour clinical channel is now linked to ${counselor.institution}.`);
    } else {
      Alert.alert('Counselor Assigned! 🩺', `Your clinical channel is now linked to ${counselor.name}.`);
    }
  };

  const tasks = dashboardData?.today_tasks || DEFAULT_FIVE_TASKS;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length || 5;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const assignedCounselorName = user?.assignedCounselorName || 'Dr. Ananya Nair, MD';
  const assignedCounselorTitle = user?.assignedCounselorTitle || 'Lead Trauma Specialist • Amrita';

  const getTypeTheme = (type) => {
    switch (type) {
      case 'physical':
        return { border: '#D96B27', bg: '#FFF7ED', icon: 'walk', label: 'Physical GPS', color: '#D96B27' };
      case 'social':
        return { border: '#059669', bg: '#F0FDF4', icon: 'people', label: 'Social Squad', color: '#059669' };
      case 'mental':
      default:
        return { border: '#6366F1', bg: '#EEF2FF', icon: 'brain', label: 'Mental Grounding', color: '#6366F1' };
    }
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8C4A1E" />
        <Text style={styles.loadingText}>Loading headquarters command center...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C4A1E']} />}
    >
      {/* 1. COMMANDER STATUS BAR */}
      <View style={styles.statusBarCard}>
        <TouchableOpacity
          style={styles.profileTap}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <View style={styles.commanderAvatar}>
            <Text style={styles.commanderAvatarText}>
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'VR'}
            </Text>
            <View style={styles.avatarOnlineDot} />
          </View>
          <View>
            <Text style={styles.commanderGreeting}>WELCOME BACK, {user?.rank ? user.rank.toUpperCase() : 'WARRIOR'}</Text>
            <Text style={styles.commanderName}>{user?.name || 'Vikramaditya Rathore'}</Text>
            <Text style={styles.commanderUnit}>{user?.service_branch || 'Indian Army (Para SF)'}</Text>
          </View>
        </TouchableOpacity>

        {/* SOS Crisis Beacon */}
        <TouchableOpacity
          style={styles.crisisBeaconBtn}
          onPress={() => navigation.navigate('Crisis')}
          activeOpacity={0.85}
        >
          <Ionicons name="shield" size={16} color="#FFFFFF" />
          <Text style={styles.crisisBeaconText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* 2. READINESS DIAL & 3-METRIC SUMMARY */}
      <View style={styles.readinessCard}>
        <View style={styles.readinessTopRow}>
          <View>
            <Text style={styles.readinessOverline}>DAILY RECOVERY PROTOCOL</Text>
            <Text style={styles.readinessTitle}>Readiness & Rituals</Text>
          </View>
          <View style={styles.readinessPercentBadge}>
            <Text style={styles.readinessPercentText}>{progressPercent}%</Text>
          </View>
        </View>

        {/* Progress Track */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <Text style={styles.readinessSub}>
          {completedCount === totalCount
            ? '🎖️ Mission accomplished! All 5 recovery drills completed today.'
            : `${totalCount - completedCount} drills remaining to preserve your 100% daily readiness score.`}
        </Text>

        {/* 3 Metric Chips */}
        <View style={styles.metricChipsRow}>
          <View style={styles.metricChip}>
            <View style={[styles.metricChipIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trophy" size={16} color="#D97706" />
            </View>
            <View>
              <Text style={styles.metricChipVal}>{dashboardData?.stats?.total_points || user?.total_points || 250}</Text>
              <Text style={styles.metricChipLbl}>Valor XP</Text>
            </View>
          </View>

          <View style={styles.metricChip}>
            <View style={[styles.metricChipIcon, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="flame" size={16} color="#EA580C" />
            </View>
            <View>
              <Text style={styles.metricChipVal}>{dashboardData?.stats?.current_streak || user?.current_streak || 5} d</Text>
              <Text style={styles.metricChipLbl}>Streak</Text>
            </View>
          </View>

          <View style={styles.metricChip}>
            <View style={[styles.metricChipIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-done-circle" size={16} color="#059669" />
            </View>
            <View>
              <Text style={styles.metricChipVal}>{completedCount}/{totalCount}</Text>
              <Text style={styles.metricChipLbl}>Done</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. HARVARD TRAUMA CLINICAL PROTOCOL BANNER */}
      <TouchableOpacity
        style={styles.harvardCard}
        onPress={() => navigation.navigate('Assessment')}
        activeOpacity={0.85}
      >
        <View style={styles.harvardIconWrap}>
          <Ionicons name="pulse" size={24} color="#8C4A1E" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.harvardTagRow}>
            <Text style={styles.harvardOverline}>HARVARD TRAUMA PROTOCOL</Text>
            <View style={styles.clinicalBadge}>
              <Text style={styles.clinicalBadgeText}>Clinical Grade</Text>
            </View>
          </View>
          <Text style={styles.harvardTitle}>Daily 5-Question Wellness Check-In</Text>
          <Text style={styles.harvardDesc}>
            Confidential trauma evaluation with encrypted counselor routing • +20 XP
          </Text>
        </View>
        <View style={styles.harvardArrowBtn}>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* 4. TODAY'S 5 TACTICAL MISSIONS */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="flash" size={18} color="#8C4A1E" />
          <Text style={styles.sectionHeaderTitle}>Today's 5 Recovery Drills</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
          <Text style={styles.sectionHeaderLink}>Full Roster →</Text>
        </TouchableOpacity>
      </View>

      {tasks.map((task) => {
        const isDone = task.status === 'completed';
        const isBusy = completingTaskId === task.id;
        const themeInfo = getTypeTheme(task.type);

        return (
          <View
            key={task.id}
            style={[
              styles.missionCard,
              { borderLeftColor: isDone ? '#059669' : themeInfo.border },
              isDone && styles.missionCardDone,
            ]}
          >
            <View style={styles.missionHeaderRow}>
              <View style={[styles.missionTypePill, { backgroundColor: themeInfo.bg }]}>
                <Ionicons name={themeInfo.icon} size={12} color={themeInfo.color} style={{ marginRight: 4 }} />
                <Text style={[styles.missionTypePillText, { color: themeInfo.color }]}>
                  {themeInfo.label}
                </Text>
              </View>

              <View style={styles.missionPointsPill}>
                <Ionicons name="trophy" size={11} color="#D97706" style={{ marginRight: 3 }} />
                <Text style={styles.missionPointsText}>+{task.points} XP</Text>
              </View>
            </View>

            <Text style={[styles.missionTitle, isDone && styles.missionTitleDone]}>{task.title}</Text>
            <Text style={styles.missionDesc} numberOfLines={2}>{task.description}</Text>

            {/* Action Bar */}
            <View style={styles.missionFooterRow}>
              {task.gps_required ? (
                <View style={styles.gpsInfoChip}>
                  <Ionicons name="navigate" size={12} color="#D96B27" style={{ marginRight: 4 }} />
                  <Text style={styles.gpsInfoChipText}>
                    {task.gps_target_distance_meters || 1000}m GPS Walk Target
                  </Text>
                </View>
              ) : (
                <View style={styles.gpsInfoChip}>
                  <Ionicons name="sparkles" size={12} color="#6366F1" style={{ marginRight: 4 }} />
                  <Text style={[styles.gpsInfoChipText, { color: '#4F46E5' }]}>Verified Somatic Ritual</Text>
                </View>
              )}

              {isDone ? (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.doneBadgeText}>Completed</Text>
                </View>
              ) : task.gps_required ? (
                <TouchableOpacity
                  style={styles.deployGpsBtn}
                  onPress={() => navigation.navigate('GPSTracking', { taskId: task.id, task })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.deployGpsBtnText}>Deploy Walk</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.completeDrillBtn}
                  onPress={() => handleToggleTask(task)}
                  disabled={isBusy}
                  activeOpacity={0.85}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.completeDrillBtnText}>Complete</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {/* 5. ENCRYPTED CLINICAL CHANNEL CARD */}
      <View style={styles.counselorBannerCard}>
        <View style={styles.counselorHeaderRow}>
          <View style={styles.counselorAvatarCircle}>
            <Ionicons name="medkit" size={20} color="#0D9488" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.counselorNameText}>{assignedCounselorName}</Text>
              <View style={styles.encryptedPill}>
                <Ionicons name="lock-closed" size={10} color="#059669" />
                <Text style={styles.encryptedPillText}>Encrypted</Text>
              </View>
            </View>
            <Text style={styles.counselorSpecialtyText}>{assignedCounselorTitle}</Text>
          </View>
        </View>

        <View style={styles.counselorActionRow}>
          <TouchableOpacity
            style={styles.changeDocBtn}
            onPress={() => setCounselorModalVisible(true)}
          >
            <Text style={styles.changeDocBtnText}>Change Specialist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.openCommsBtn}
            onPress={() => navigation.navigate('Chat', { counselorName: assignedCounselorName })}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubbles" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.openCommsBtnText}>Open Secure Comms</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 6. RAPID SENSORY GROUNDING LAUNCHER */}
      <TouchableOpacity
        style={styles.rapidGroundingBtn}
        onPress={() => setGroundingModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="shield-checkmark" size={18} color="#8C4A1E" style={{ marginRight: 8 }} />
        <Text style={styles.rapidGroundingText}>Feeling Tension? Launch 5-4-3-2-1 Grounding</Text>
      </TouchableOpacity>

      {/* MODAL 1: SENSORY GROUNDING WALKTHROUGH */}
      <Modal visible={groundingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.groundingSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.groundingModalTitle}>5-4-3-2-1 Somatic Grounding</Text>
              <TouchableOpacity onPress={() => setGroundingModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.groundingModalDesc}>
              Combat anxiety, triggers, or emotional flashbacks by bringing your sensory awareness to the present room.
            </Text>

            <View style={styles.groundingStepBox}>
              <Text style={styles.groundingStepBig}>👀 5 Things You See</Text>
              <Text style={styles.groundingStepSub}>Look around you right now. Notice 5 distinct colors, shapes, or objects.</Text>
            </View>

            <View style={styles.groundingStepBox}>
              <Text style={styles.groundingStepBig}>✋ 4 Things You Can Touch</Text>
              <Text style={styles.groundingStepSub}>Feel your feet on the ground, your uniform/shirt, a cool surface, or ring.</Text>
            </View>

            <View style={styles.groundingStepBox}>
              <Text style={styles.groundingStepBig}>👂 3 Things You Hear</Text>
              <Text style={styles.groundingStepSub}>Notice 3 sounds: a fan, distant traffic, or your own slow breath.</Text>
            </View>

            <TouchableOpacity
              style={styles.closeGroundingBtn}
              onPress={() => setGroundingModalVisible(false)}
            >
              <Text style={styles.closeGroundingBtnText}>I am Grounded & Present</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CLINICAL SPECIALIST SELECTION */}
      <Modal visible={counselorModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.counselorSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.groundingModalTitle}>Assign Clinical Lead</Text>
              <TouchableOpacity onPress={() => setCounselorModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.groundingModalDesc}>
              Select your accredited military trauma psychiatrist or clinical recovery officer.
            </Text>

            <ScrollView style={{ maxHeight: 360, marginTop: 10 }}>
              {counselorsList.map((c) => {
                const isSelected = assignedCounselorName === c.name;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.counselorPickCard, isSelected && styles.counselorPickCardSelected]}
                    onPress={() => handleSelectCounselor(c)}
                  >
                    <View style={styles.counselorPickAvatar}>
                      <Text style={styles.counselorPickAvatarText}>{c.avatar || 'CL'}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.counselorPickName}>{c.name}</Text>
                      <Text style={styles.counselorPickTitle}>{c.title}</Text>
                      <Text style={styles.counselorPickInst}>{c.institution || c.specialty || c.specialization}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color="#0D9488" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 13,
    color: '#786F68',
    marginTop: 12,
    fontWeight: '600',
  },

  /* 1. Status Bar */
  statusBarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DCCE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#282524',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileTap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commanderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7DFCC',
    borderWidth: 2,
    borderColor: '#8C4A1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  commanderAvatarText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#8C4A1E',
  },
  avatarOnlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#059669',
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  commanderGreeting: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C4A1E',
    letterSpacing: 1,
  },
  commanderName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 1,
  },
  commanderUnit: {
    fontSize: 11,
    color: '#786F68',
  },
  crisisBeaconBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  crisisBeaconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },

  /* 2. Readiness Card */
  readinessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8DCCE',
    marginBottom: 14,
    shadowColor: '#282524',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  readinessTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  readinessOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C4A1E',
    letterSpacing: 1.1,
  },
  readinessTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 2,
  },
  readinessPercentBadge: {
    backgroundColor: '#F7DFCC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readinessPercentText: {
    color: '#8C4A1E',
    fontSize: 16,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#EFE8DE',
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D96B27',
    borderRadius: 5,
  },
  readinessSub: {
    fontSize: 12,
    color: '#786F68',
    lineHeight: 16,
    marginBottom: 14,
  },
  metricChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricChip: {
    flex: 1,
    backgroundColor: '#FDF6EE',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8DCCE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricChipVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1C1917',
  },
  metricChipLbl: {
    fontSize: 10,
    color: '#786F68',
    fontWeight: '700',
  },

  /* 3. Harvard Trauma Banner */
  harvardCard: {
    backgroundColor: '#FAF3EC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#D96B27',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#D96B27',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  harvardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  harvardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  harvardOverline: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8C4A1E',
    letterSpacing: 1,
  },
  clinicalBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  clinicalBadgeText: {
    fontSize: 9,
    color: '#0369A1',
    fontWeight: '700',
  },
  harvardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 2,
  },
  harvardDesc: {
    fontSize: 11,
    color: '#786F68',
    marginTop: 2,
    lineHeight: 15,
  },
  harvardArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8C4A1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  /* 4. Missions List */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
  },
  sectionHeaderLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C4A1E',
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DCCE',
    borderLeftWidth: 5,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  missionCardDone: {
    backgroundColor: '#F9FAFB',
    opacity: 0.85,
  },
  missionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  missionTypePillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  missionPointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  missionPointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  missionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
  },
  missionTitleDone: {
    textDecorationLine: 'line-through',
    color: '#786F68',
  },
  missionDesc: {
    fontSize: 12,
    color: '#786F68',
    lineHeight: 16,
    marginBottom: 12,
  },
  missionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  gpsInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsInfoChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  deployGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D96B27',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  deployGpsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  completeDrillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C4A1E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  completeDrillBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },

  /* 5. Clinical Counselor Banner */
  counselorBannerCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 6,
    marginBottom: 12,
  },
  counselorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counselorAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counselorNameText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F766E',
  },
  encryptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },
  encryptedPillText: {
    fontSize: 9,
    color: '#065F46',
    fontWeight: '700',
  },
  counselorSpecialtyText: {
    fontSize: 11,
    color: '#115E59',
    marginTop: 2,
  },
  counselorActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#CCFBF1',
  },
  changeDocBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  changeDocBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  openCommsBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 8,
    borderRadius: 10,
  },
  openCommsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* 6. Rapid Grounding Launcher */
  rapidGroundingBtn: {
    backgroundColor: '#FDF6EE',
    borderWidth: 1,
    borderColor: '#E8DCCE',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  rapidGroundingText: {
    color: '#8C4A1E',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  groundingSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groundingModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
  },
  groundingModalDesc: {
    fontSize: 12,
    color: '#786F68',
    lineHeight: 16,
    marginBottom: 14,
  },
  groundingStepBox: {
    backgroundColor: '#FDF6EE',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8DCCE',
    marginBottom: 10,
  },
  groundingStepBig: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8C4A1E',
  },
  groundingStepSub: {
    fontSize: 11,
    color: '#786F68',
    marginTop: 2,
  },
  closeGroundingBtn: {
    backgroundColor: '#8C4A1E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeGroundingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  /* Counselor Selection Sheet */
  counselorSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  counselorPickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  counselorPickCardSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  counselorPickAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counselorPickAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  counselorPickName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  counselorPickTitle: {
    fontSize: 11,
    color: '#4B5563',
  },
  counselorPickInst: {
    fontSize: 10,
    color: '#786F68',
    marginTop: 1,
  },
});

export default DashboardScreen;
