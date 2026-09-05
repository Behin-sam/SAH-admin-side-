/**
 * VALOR Tasks Screen (Recovery Drills & Missions)
 * Complete Mobile Front-End Remake
 * - Tactical Category Filters (Mental, Physical GPS, Social Squad, Completed)
 * - Harvard Trauma Protocol Daily Banner
 * - Enhanced Mission Cards with GPS Target verification
 * - Dynamic XP & Streak Synchronization
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { taskAPI } from '../services/api';
import { storage } from '../services/storage';

const DEFAULT_MOCK_TASKS = [
  {
    id: '1',
    type: 'mental',
    title: '5-4-3-2-1 Grounding Technique',
    description: 'Practice the 5-4-3-2-1 senses check during anxiety, tension, or combat flashbacks.',
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

const FILTERS = [
  { id: 'all', label: 'All Drills', icon: 'apps' },
  { id: 'mental', label: 'Mental Grounding', icon: 'brain' },
  { id: 'physical', label: 'Physical GPS', icon: 'walk' },
  { id: 'social', label: 'Social Squad', icon: 'people' },
  { id: 'completed', label: 'Completed', icon: 'checkmark-circle' },
  { id: 'pending', label: 'Pending', icon: 'time' },
];

const TasksScreen = ({ navigation }) => {
  const { user, updatePoints } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [completingId, setCompletingId] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      if (user?.id) {
        try {
          const liveTasks = await taskAPI.getTasks(user.id);
          if (liveTasks && liveTasks.length > 0) {
            const mapped = await Promise.all(
              liveTasks.map(async (t) => {
                const isDone = await storage.get(`@sah_task_done_${t.id}`);
                return {
                  id: t.id,
                  type: t.task_type || t.type,
                  title: t.title,
                  description: t.description,
                  points: t.points,
                  status: isDone ? 'completed' : t.status,
                  difficulty: t.difficulty || 1,
                  category: t.category || 'wellness',
                  gps_required: t.gps_required,
                  gps_target_distance_meters: t.gps_target_distance_meters || 1000,
                };
              })
            );
            setTasks(mapped);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Live task fetch fallback:', apiErr.message);
        }
      }

      const checkedMockTasks = await Promise.all(
        DEFAULT_MOCK_TASKS.map(async (t) => {
          const isDone = await storage.get(`@sah_task_done_${t.id}`);
          return isDone ? { ...t, status: 'completed' } : t;
        })
      );
      setTasks(checkedMockTasks);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleQuickComplete = async (task) => {
    if (task.status === 'completed') return;

    if (task.gps_required) {
      navigation.navigate('GPSTracking', { taskId: task.id, task });
      return;
    }

    setCompletingId(task.id);
    const pts = task.points || 15;
    try {
      if (user?.id) {
        await taskAPI.completeTask(user.id, task.id).catch(() => {});
      }
      await storage.set(`@sah_task_done_${task.id}`, 'true');

      if (updatePoints) {
        await updatePoints(pts);
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'completed' } : t))
      );

      const msg = `+${pts} Valor Points awarded! Great job staying committed.`;
      if (Platform.OS === 'web') {
        window.alert(`Drill Completed! 🎖️\n\n${msg}`);
      } else {
        Alert.alert('Drill Completed! 🎖️', msg);
      }
    } catch (e) {
      console.warn('Quick complete error:', e);
    } finally {
      setCompletingId(null);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'completed') return task.status === 'completed';
    if (activeFilter === 'pending') return task.status !== 'completed';
    return task.type === activeFilter;
  });

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

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length || 5;

  return (
    <View style={styles.container}>
      {/* Header Summary Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerOverline}>DAILY RECOVERY PROGRAM</Text>
          <Text style={styles.headerTitle}>Active Missions & Rituals</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{completedCount}/{totalCount} Completed</Text>
        </View>
      </View>

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : '#786F68'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.tasksList}
        contentContainerStyle={styles.tasksListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C4A1E']} />}
      >
        {/* Harvard Daily Wellness Card */}
        <TouchableOpacity
          style={styles.harvardBanner}
          onPress={() => navigation.navigate('Assessment')}
          activeOpacity={0.85}
        >
          <View style={styles.harvardIconBadge}>
            <Ionicons name="pulse" size={22} color="#8C4A1E" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.harvardBadgeRow}>
              <Text style={styles.harvardBadgeText}>Harvard Protocol</Text>
              <Text style={styles.harvardPointsBadge}>+20 XP</Text>
            </View>
            <Text style={styles.harvardTitle}>Daily 5-Question Check-In</Text>
            <Text style={styles.harvardSub}>Clinical evaluation for PTSD symptom tracking</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8C4A1E" />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#8C4A1E" />
            <Text style={styles.loadingBoxText}>Syncing daily missions...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkbox-outline" size={54} color="#D1D5DB" />
            <Text style={styles.emptyBoxTitle}>No drills found</Text>
            <Text style={styles.emptyBoxSub}>No tasks match this filter category.</Text>
          </View>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            const isBusy = completingId === task.id;
            const themeInfo = getTypeTheme(task.type);

            return (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.card,
                  { borderLeftColor: isDone ? '#059669' : themeInfo.border },
                  isDone && styles.cardDone,
                ]}
                onPress={() => {
                  if (task.gps_required && !isDone) {
                    navigation.navigate('GPSTracking', { taskId: task.id, task });
                  } else {
                    navigation.navigate('TaskDetail', { taskId: task.id, task });
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: themeInfo.bg }]}>
                    <Ionicons name={themeInfo.icon} size={12} color={themeInfo.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.typeBadgeText, { color: themeInfo.color }]}>
                      {themeInfo.label}
                    </Text>
                  </View>

                  <View style={styles.xpBadge}>
                    <Ionicons name="trophy" size={11} color="#D97706" style={{ marginRight: 3 }} />
                    <Text style={styles.xpBadgeText}>+{task.points} XP</Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, isDone && styles.cardTitleDone]}>{task.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{task.description}</Text>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.metaRow}>
                    {task.gps_required ? (
                      <View style={styles.gpsTargetChip}>
                        <Ionicons name="navigate" size={11} color="#D96B27" style={{ marginRight: 3 }} />
                        <Text style={styles.gpsTargetChipText}>
                          {task.gps_target_distance_meters || 1000}m GPS Movement
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.difficultyDots}>
                        {[...Array(3)].map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.diffDot,
                              i < (task.difficulty || 1) && styles.diffDotActive,
                            ]}
                          />
                        ))}
                        <Text style={styles.diffLabel}>
                          {task.difficulty === 3 ? 'Advanced' : task.difficulty === 2 ? 'Moderate' : 'Standard'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  {isDone ? (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 4 }} />
                      <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                  ) : task.gps_required ? (
                    <TouchableOpacity
                      style={styles.gpsDeployBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('GPSTracking', { taskId: task.id, task });
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="navigate" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.gpsDeployBtnText}>Deploy Walk</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.quickDoneBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleQuickComplete(task);
                      }}
                      disabled={isBusy}
                      activeOpacity={0.85}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.quickDoneBtnText}>Complete</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCCE',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C4A1E',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#F7DFCC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#8C4A1E',
    fontSize: 12,
    fontWeight: '800',
  },
  filterWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#8C4A1E',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tasksList: {
    flex: 1,
  },
  tasksListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  harvardBanner: {
    backgroundColor: '#FAF3EC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#D96B27',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  harvardIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  harvardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  harvardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C4A1E',
    letterSpacing: 0.8,
  },
  harvardPointsBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  harvardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 2,
  },
  harvardSub: {
    fontSize: 11,
    color: '#786F68',
    marginTop: 1,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingBoxText: {
    fontSize: 13,
    color: '#786F68',
    marginTop: 10,
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBoxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
    marginTop: 12,
  },
  emptyBoxSub: {
    fontSize: 12,
    color: '#786F68',
    marginTop: 4,
  },
  card: {
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
  cardDone: {
    backgroundColor: '#F9FAFB',
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: '#786F68',
  },
  cardDesc: {
    fontSize: 12,
    color: '#786F68',
    lineHeight: 16,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsTargetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gpsTargetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D96B27',
  },
  difficultyDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diffDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  diffDotActive: {
    backgroundColor: '#8C4A1E',
  },
  diffLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  gpsDeployBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D96B27',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
  },
  gpsDeployBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  quickDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C4A1E',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
  },
  quickDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default TasksScreen;
