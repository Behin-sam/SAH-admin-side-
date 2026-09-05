/**
 * Tasks Screen
 * Shows all daily tasks with filters for type and status
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { taskAPI } from '../services/api';
import { storage } from '../services/storage';

const TasksScreen = ({ navigation }) => {
  const { user, updatePoints } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadTasks();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, [user])
  );

  const loadTasks = async () => {
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
      // 5 Curated daily recovery tasks
      const mockTasks = [
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
          category: 'cognitive',
          gps_required: false,
        },
        {
          id: '4',
          type: 'social',
          title: 'Squad Community Peer Check-In',
          description: 'Leave an encouraging word for your Morning Walkers recovery squad.',
          points: 15,
          status: 'assigned',
          difficulty: 1,
          category: 'peer_support',
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
      const checkedMockTasks = await Promise.all(
        mockTasks.map(async (t) => {
          const isDone = await storage.get(`@sah_task_done_${t.id}`);
          return isDone ? { ...t, status: 'completed' } : t;
        })
      );
      setTasks(checkedMockTasks);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickComplete = async (task) => {
    if (task.status === 'completed') return;
    if (task.gps_required) {
      navigation.navigate('GPSTracking', { taskId: task.id, task });
      return;
    }
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
      if (Platform.OS === 'web') {
        window.alert(`Task Completed! 🎉\n\n+${pts} Valor Points awarded!`);
      } else {
        Alert.alert('Task Completed! 🎉', `+${pts} Valor Points awarded!`);
      }
    } catch (e) {
      console.warn('Quick complete error:', e);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'completed') return task.status === 'completed';
    if (activeFilter === 'pending') return task.status !== 'completed';
    return task.type === activeFilter;
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'mental': return '#8b5cf6';
      case 'physical': return theme.colors.rust[500];
      case 'social': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'mental': return 'brain';
      case 'physical': return 'walk';
      case 'social': return 'people';
      default: return 'checkbox';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return theme.colors.status.stable;
      case 'in_progress': return '#3b82f6';
      case 'assigned': return theme.colors.rust[500];
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.rust[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {['all', 'mental', 'physical', 'social', 'completed', 'pending'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tasks List */}
      <ScrollView
        style={styles.tasksList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Daily 5-Questionnaire Banner */}
        <TouchableOpacity
          style={styles.checkInBanner}
          onPress={() => navigation.navigate('Assessment')}
          activeOpacity={0.85}
        >
          <View style={styles.checkInIconWrap}>
            <Ionicons name="clipboard" size={22} color={theme.colors.rust[500]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkInBannerTitle}>Daily 5-Question Wellness Check-In</Text>
            <Text style={styles.checkInBannerSub}>Harvard Trauma clinical protocol • +20 Valor Points</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.rust[600]} />
        </TouchableOpacity>

        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkbox-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No tasks found</Text>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => {
                if (task.gps_required && task.status !== 'completed') {
                  navigation.navigate('GPSTracking', { taskId: task.id, task });
                } else {
                  navigation.navigate('TaskDetail', { taskId: task.id, task });
                }
              }}
            >
              <View style={[styles.taskTypeIndicator, { backgroundColor: getTypeColor(task.type) }]} />
              
              <View style={styles.taskContent}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskTypeBadge}>
                    <Ionicons name={getTypeIcon(task.type)} size={16} color={getTypeColor(task.type)} />
                    <Text style={[styles.taskTypeText, { color: getTypeColor(task.type) }]}>
                      {task.type}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                      {task.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>

                <View style={styles.taskFooter}>
                  <View style={styles.taskMeta}>
                    <Text style={styles.taskPoints}>+{task.points} pts</Text>
                    <View style={styles.difficultyContainer}>
                      {[...Array(3)].map((_, i) => (
                        <View
                          key={i}
                          style={[styles.difficultyDot, i < task.difficulty && styles.difficultyDotActive]}
                        />
                      ))}
                    </View>
                  </View>
                  {task.gps_required && (
                    <View style={styles.gpsBadge}>
                      <Ionicons name="location" size={14} color="#2563eb" />
                      <Text style={styles.gpsBadgeText}>GPS Required</Text>
                    </View>
                  )}
                </View>
              </View>

              {task.status !== 'completed' ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: task.gps_required ? '#2563eb' : theme.colors.rust[500],
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginLeft: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    handleQuickComplete(task);
                  }}
                >
                  <Ionicons name={task.gps_required ? "navigate" : "checkmark"} size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 3 }}>
                    {task.gps_required ? 'Track' : 'Done'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ marginLeft: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Generate Tasks Button */}
      <TouchableOpacity style={styles.generateButton} onPress={loadTasks}>
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.generateButtonText}>Generate Today's Tasks</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[200],
  },
  filterContainer: {
    maxHeight: 60,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.cream[400],
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: theme.colors.rust[500],
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.espresso[900],
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tasksList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.espresso[400],
    marginTop: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    marginBottom: 12,
    ...theme.shadows.warm,
    overflow: 'hidden',
  },
  taskTypeIndicator: {
    width: 4,
    height: '100%',
  },
  taskContent: {
    flex: 1,
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.peach[800],
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.espresso[900],
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 13,
    color: theme.colors.espresso[400],
    marginBottom: 12,
    lineHeight: 18,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.rust[500],
    marginRight: 12,
  },
  difficultyContainer: {
    flexDirection: 'row',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.cream[400],
    marginRight: 4,
  },
  difficultyDotActive: {
    backgroundColor: theme.colors.rust[500],
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gpsBadgeText: {
    fontSize: 11,
    color: theme.colors.peach[800],
    marginLeft: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.rust[500],
    margin: 16,
    padding: 16,
    borderRadius: 12,
    ...theme.shadows.rustGlow,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  checkInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.rust[50],
    borderWidth: 1.5,
    borderColor: theme.colors.rust[200],
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  checkInIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.rust[200],
  },
  checkInBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    letterSpacing: 0.2,
  },
  checkInBannerSub: {
    fontSize: 11,
    color: theme.colors.rust[700],
    marginTop: 2,
    fontWeight: '600',
  },
});

export default TasksScreen;
