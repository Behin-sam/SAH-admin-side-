/**
 * Dashboard Screen
 * Shows today's overview, tasks, stats, and groups
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
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { veteranAPI } from '../services/api';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    try {
      if (user?.id) {
        try {
          const liveData = await veteranAPI.getDashboard(user.id);
          if (liveData && liveData.stats) {
            setDashboardData(liveData);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Live dashboard fetch failed, falling back to mock:', apiErr.message);
        }
      }
      // Mock data for demo
      const mockData = {
        greeting: getGreeting(),
        stats: {
          total_points: 250,
          current_streak: 5,
          tasks_completed: 12,
          pending_tasks: 3,
        },
        today_tasks: [
          {
            id: '1',
            type: 'mental',
            title: '5-4-3-2-1 Grounding Technique',
            description: 'Practice the 5-4-3-2-1 senses check during anxiety or flashbacks.',
            points: 15,
            status: 'assigned',
            gps_required: false,
            difficulty: 1,
            category: 'grounding',
          },
          {
            id: '2',
            type: 'mental',
            title: 'Cognitive Reframing Exercise',
            description: 'Challenge a negative thought pattern by writing it down and reframing it.',
            points: 20,
            status: 'in_progress',
            gps_required: false,
            difficulty: 2,
            category: 'cognitive',
          },
          {
            id: '3',
            type: 'physical',
            title: 'Brisk 30-Minute Walk or Run',
            description: 'Go for a brisk 30-minute walk or run to boost endorphins.',
            points: 25,
            status: 'assigned',
            gps_required: true,
            difficulty: 2,
            category: 'cardio',
          },
          {
            id: '4',
            type: 'social',
            title: 'VA / Vet Center Peer Support Group',
            description: 'Join a VA or Vet Center PTSD peer support group.',
            points: 30,
            status: 'assigned',
            gps_required: false,
            difficulty: 2,
            category: 'peer_support',
          },
        ],
        groups: [
          {
            id: 'g1',
            name: 'Morning Walkers',
            member_count: 8,
            total_points: 450,
          },
        ],
      };
      setDashboardData(mockData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, warrior! ☀️';
    if (hour < 17) return 'Good afternoon, warrior! 🌤️';
    return 'Good evening, warrior! 🌙';
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>{dashboardData?.greeting}</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardPoints]}>
          <Ionicons name="trophy" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{dashboardData?.stats.total_points}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
        <View style={[styles.statCard, styles.statCardStreak]}>
          <Ionicons name="flame" size={24} color="#ef4444" />
          <Text style={styles.statValue}>{dashboardData?.stats.current_streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={[styles.statCard, styles.statCardTasks]}>
          <Ionicons name="checkbox" size={24} color="#10b981" />
          <Text style={styles.statValue}>{dashboardData?.stats.tasks_completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Today's Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {dashboardData?.today_tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
          >
            <View style={styles.taskIcon}>
              <Ionicons
                name={task.type === 'mental' ? 'brain' : 'walk'}
                size={24}
                color={task.type === 'mental' ? '#8b5cf6' : '#10b981'}
              />
            </View>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDescription} numberOfLines={1}>
                {task.description}
              </Text>
              <View style={styles.taskMeta}>
                <Text style={styles.taskPoints}>+{task.points} pts</Text>
                {task.gps_required && (
                  <View style={styles.gpsBadge}>
                    <Ionicons name="location" size={12} color="#2563eb" />
                    <Text style={styles.gpsBadgeText}>GPS</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.taskStatus, task.status === 'completed' && styles.taskStatusCompleted]}>
              <Ionicons
                name={task.status === 'completed' ? 'checkmark-circle' : 'arrow-forward'}
                size={20}
                color={task.status === 'completed' ? '#10b981' : '#6b7280'}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Ionicons name="add-circle" size={32} color="#2563eb" />
            <Text style={styles.actionText}>New Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Groups')}
          >
            <Ionicons name="people" size={32} color="#8b5cf6" />
            <Text style={styles.actionText}>Find Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Chat', { counselorName: 'Dr. Sarah Mitchell' })}
          >
            <Ionicons name="chatbubbles" size={32} color="#10b981" />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Crisis')}
          >
            <Ionicons name="warning" size={32} color="#ef4444" />
            <Text style={styles.actionText}>Crisis Help</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Points')}
          >
            <Ionicons name="gift" size={32} color="#f59e0b" />
            <Text style={styles.actionText}>Rewards</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Groups */}
      <View style={[styles.section, styles.sectionLast]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Groups</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {dashboardData?.groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={styles.groupCard}
            onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
          >
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupMeta}>
                {group.member_count} members • {group.total_points} pts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
  greetingContainer: {
    padding: 22,
    backgroundColor: theme.colors.espresso[900],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    color: theme.colors.peach[200],
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    ...theme.shadows.warm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.espresso[900],
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionLast: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.espresso[900],
  },
  seeAll: {
    fontSize: 14,
    color: theme.colors.rust[500],
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.warm,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.peach[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
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
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskPoints: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.rust[500],
    marginRight: 10,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gpsBadgeText: {
    fontSize: 10,
    color: theme.colors.peach[800],
    marginLeft: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  taskStatus: {
    marginLeft: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
  },
  actionText: {
    fontSize: 12,
    color: theme.colors.espresso[900],
    marginTop: 8,
    fontWeight: '600',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.warm,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.peach[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.espresso[900],
    marginBottom: 4,
  },
  groupMeta: {
    fontSize: 13,
    color: theme.colors.espresso[400],
  },
});

export default DashboardScreen;
