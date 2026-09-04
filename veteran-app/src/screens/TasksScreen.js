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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TasksScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      // Mock data for demo
      const mockTasks = [
        // Mental / Psychological
        {
          id: '1',
          type: 'mental',
          title: '5-4-3-2-1 Grounding Technique',
          description: 'Practice the 5-4-3-2-1 senses check during anxiety or flashbacks.',
          points: 15,
          status: 'completed',
          difficulty: 1,
          category: 'grounding',
          gps_required: false,
        },
        {
          id: '2',
          type: 'mental',
          title: 'Cognitive Reframing Exercise',
          description: 'Challenge a negative thought pattern by writing it down and reframing it.',
          points: 20,
          status: 'in_progress',
          difficulty: 2,
          category: 'cognitive',
          gps_required: false,
        },
        {
          id: '3',
          type: 'mental',
          title: 'Mindfulness Meditation (10 min)',
          description: 'Spend 10 minutes in mindfulness meditation, focusing on your breath.',
          points: 20,
          status: 'assigned',
          difficulty: 2,
          category: 'mindfulness',
          gps_required: false,
        },
        {
          id: '4',
          type: 'mental',
          title: 'Daily Mood & Trigger Journal',
          description: 'Track your moods, triggers, and progress in a journal entry.',
          points: 15,
          status: 'assigned',
          difficulty: 1,
          category: 'journaling',
          gps_required: false,
        },
        // Physical
        {
          id: '5',
          type: 'physical',
          title: 'Brisk 30-Minute Walk or Run',
          description: 'Go for a brisk walk or run to boost endorphins and clear your mind.',
          points: 25,
          status: 'assigned',
          difficulty: 2,
          category: 'cardio',
          gps_required: true,
        },
        {
          id: '6',
          type: 'physical',
          title: 'Yoga or Tai Chi Session',
          description: 'Try yoga or tai chi for movement combined with breath control.',
          points: 20,
          status: 'assigned',
          difficulty: 2,
          category: 'yoga',
          gps_required: false,
        },
        {
          id: '7',
          type: 'physical',
          title: 'Gardening or Yard Work',
          description: 'Do gardening or yard work as active, grounding movement.',
          points: 15,
          status: 'assigned',
          difficulty: 1,
          category: 'outdoor',
          gps_required: false,
        },
        // Group / Peer
        {
          id: '8',
          type: 'social',
          title: 'VA / Vet Center Peer Support Group',
          description: 'Join a VA or Vet Center PTSD peer support group.',
          points: 30,
          status: 'assigned',
          difficulty: 2,
          category: 'peer_support',
          gps_required: false,
        },
        {
          id: '9',
          type: 'social',
          title: 'Team RWB or Team Rubicon Event',
          description: 'Attend a Team RWB or Team Rubicon community event.',
          points: 30,
          status: 'assigned',
          difficulty: 2,
          category: 'community',
          gps_required: false,
        },
        {
          id: '10',
          type: 'social',
          title: 'Veteran Team Sports League',
          description: 'Participate in a team sports league with fellow veterans.',
          points: 25,
          status: 'assigned',
          difficulty: 2,
          category: 'team_sports',
          gps_required: false,
        },
      ];
      setTasks(mockTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'mental') return task.type === 'mental';
    if (activeFilter === 'physical') return task.type === 'physical';
    if (activeFilter === 'social') return task.type === 'social';
    if (activeFilter === 'completed') return task.status === 'completed';
    if (activeFilter === 'pending') return task.status !== 'completed';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#f59e0b';
      case 'assigned': return '#6b7280';
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

  const getTypeColor = (type) => {
    switch (type) {
      case 'mental': return '#8b5cf6';
      case 'physical': return '#10b981';
      case 'social': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
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
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id, task })}
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

              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
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
    color: '#9ca3af',
    marginTop: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  taskTypeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 13,
    color: '#6b7280',
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
    fontWeight: '600',
    color: '#f59e0b',
    marginRight: 12,
  },
  difficultyContainer: {
    flexDirection: 'row',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginRight: 4,
  },
  difficultyDotActive: {
    backgroundColor: '#f59e0b',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gpsBadgeText: {
    fontSize: 11,
    color: '#2563eb',
    marginLeft: 4,
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TasksScreen;
