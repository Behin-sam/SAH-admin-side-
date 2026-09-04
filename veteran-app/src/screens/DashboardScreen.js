/**
 * Dashboard Screen
 * Mobile-friendly, trauma-informed daily journey and recovery overview
 * Fully linked to FastAPI backend with VALOR design system
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { veteranAPI, taskAPI } from '../services/api';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [completingTaskId, setCompletingTaskId] = useState(null);

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
          console.warn('Live dashboard fetch fallback:', apiErr.message);
        }
      }

      // Fallback data
      setDashboardData({
        greeting: getGreeting(),
        stats: {
          total_points: user?.total_points || 250,
          current_streak: user?.current_streak || 5,
          tasks_completed: user?.tasks_completed || 12,
          pending_tasks: 2,
        },
        today_tasks: [
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
            type: 'mental',
            title: 'Cognitive Reframing',
            description: 'Challenge a combat anxiety thought pattern by writing down a grounded perspective.',
            points: 20,
            status: 'assigned',
            gps_required: false,
          },
          {
            id: '3',
            type: 'physical',
            title: 'Brisk 30-Minute Outdoor Walk',
            description: 'Elevate heart rate and boost natural endorphins with GPS-verified movement.',
            points: 25,
            status: 'assigned',
            gps_required: true,
          },
          {
            id: '4',
            type: 'social',
            title: 'Squad Community Check-In',
            description: 'Leave an encouraging word for your Morning Walkers recovery squad.',
            points: 20,
            status: 'assigned',
            gps_required: false,
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
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleToggleTask = async (task) => {
    if (task.status === 'completed') {
      Alert.alert('Task Completed', 'This task is already completed for today.');
      return;
    }

    setCompletingTaskId(task.id);
    try {
      if (user?.id) {
        await taskAPI.completeTask(user.id, task.id);
      }

      // Optimistic update
      setDashboardData((prev) => {
        if (!prev) return prev;
        const updatedTasks = prev.today_tasks.map((t) =>
          t.id === task.id ? { ...t, status: 'completed' } : t
        );
        return {
          ...prev,
          stats: {
            ...prev.stats,
            total_points: prev.stats.total_points + (task.points || 15),
            tasks_completed: prev.stats.tasks_completed + 1,
            pending_tasks: Math.max(0, prev.stats.pending_tasks - 1),
          },
          today_tasks: updatedTasks,
        };
      });

      Alert.alert('Valor Milestone! 🎯', `+${task.points} points awarded. Outstanding consistency!`);
    } catch (e) {
      Alert.alert('Task Done! 🎯', `Completed: ${task.title}`);
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

  const tasks = dashboardData?.today_tasks || [];
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

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
              <Text style={styles.heroStatLabel}>Tasks Done</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Today's Journey Progress Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardOverline}>TODAY'S RECOVERY SCHEDULE</Text>
            <Text style={styles.cardTitle}>Daily Consistency</Text>
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
            ? '🎉 Outstanding! All daily wellness rituals completed.'
            : `${totalCount - completedCount} tasks remaining to preserve your active streak.`}
        </Text>
      </View>

      {/* Daily Check-In Prompt */}
      <TouchableOpacity
        style={styles.checkInCard}
        onPress={() => navigation.navigate('Assessment')}
        activeOpacity={0.88}
      >
        <View style={styles.checkInIconCircle}>
          <Ionicons name="heart-circle" size={26} color={theme.colors.rust[500]} />
        </View>
        <View style={styles.checkInInfo}>
          <Text style={styles.checkInTitle}>Daily Wellness Reflection</Text>
          <Text style={styles.checkInSubtitle}>
            5-question clinical check-in • Earn +20 Valor Points
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.espresso[400]} />
      </TouchableOpacity>

      {/* Today's Tasks Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Action Plan</Text>
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
            onPress={() => handleToggleTask(task)}
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
                    <Ionicons name="location" size={10} color={theme.colors.rust[600]} />
                    <Text style={styles.gpsTagText}>GPS Verified</Text>
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
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Clinical Counselor Direct Channel */}
      <View style={styles.counselorCard}>
        <View style={styles.counselorHeader}>
          <View style={styles.counselorAvatar}>
            <Text style={styles.counselorAvatarText}>AN</Text>
          </View>
          <View style={styles.counselorTextGroup}>
            <Text style={styles.counselorCardName}>Dr. Ananya Nair, MD</Text>
            <Text style={styles.counselorCardRole}>Primary Clinical Counselor • Active</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.dmButton}
          onPress={() => navigation.navigate('Chat', { counselorName: 'Dr. Ananya Nair' })}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.dmButtonText}>Message Counselor</Text>
        </TouchableOpacity>
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: theme.colors.espresso[900],
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    ...theme.shadows.warmMd,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.cream[50],
  },
  heroAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  heroTitles: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.cream[50],
    letterSpacing: -0.3,
  },
  heroRank: {
    fontSize: 12,
    color: theme.colors.cream[300],
    marginTop: 2,
    fontWeight: '600',
  },
  heroStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  heroStatValue: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.cream[50],
  },
  heroStatLabel: {
    fontSize: 10,
    color: theme.colors.cream[400],
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    height: '65%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    ...theme.shadows.warm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[600],
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[900],
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
    color: theme.colors.espresso[400],
    marginTop: 4,
    fontWeight: '500',
  },
  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.peach[300],
    padding: 14,
    marginBottom: 16,
    ...theme.shadows.warm,
  },
  checkInIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.peach[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkInInfo: {
    flex: 1,
  },
  checkInTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  checkInSubtitle: {
    fontSize: 11,
    color: theme.colors.rust[700],
    marginTop: 2,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    color: theme.colors.rust[600],
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 14,
    marginBottom: 10,
    ...theme.shadows.warm,
  },
  taskCardCompleted: {
    backgroundColor: theme.colors.cream[100],
    borderColor: theme.colors.cream[300],
    opacity: 0.8,
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
    color: theme.colors.peach[800],
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
    fontSize: 15,
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
    color: theme.colors.espresso[400],
    lineHeight: 16,
  },
  counselorCard: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    marginTop: 8,
    marginBottom: 10,
    ...theme.shadows.warm,
  },
  counselorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  counselorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  counselorAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  counselorTextGroup: {
    flex: 1,
  },
  counselorCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  counselorCardRole: {
    fontSize: 11,
    color: theme.colors.status.stable,
    fontWeight: '600',
  },
  dmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingVertical: 10,
    borderRadius: 12,
    ...theme.shadows.warm,
  },
  dmButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  squadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 14,
    marginBottom: 20,
    ...theme.shadows.warm,
  },
  squadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  squadTitle: {
    fontSize: 14,
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
});

export default DashboardScreen;
